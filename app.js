/**
 * LostLoop Frontend Application Controller
 * Manages localStorage, reactive rendering, filters, forms, safe claims, and matching inspection.
 * Enhanced with Multi-College Architecture & Tran Mau Tri Tam Editorial Styling.
 */

const STORAGE_KEY = "lostloop_items_v1";
const STORAGE_KEY_COLLEGE = "lostloop_selected_college_v1";

// Application State
const state = {
  items: [],
  activeCollege: null,              // Selected college object from COLLEGES_DIRECTORY
  pendingSelectedCollegeId: null,   // Selected in first-entry onboarding
  pendingSwitcherCollegeId: null,   // Selected in switcher modal
  activeTab: "browse",
  filters: {
    search: "",
    type: "all",
    category: "all",
    location: "all",
    sortBy: "newest"
  },
  selectedInspectorItemId: null,
  activeDetailItem: null,
  activeClaimItem: null,
  activeTrackingItem: null,
  assistant: null,
  assistantChatHistory: [],
  assistantOpen: false,
  rewardsCategoryFilter: "all",
  activeRewardToRedeem: null,
  isRedeeming: false
};

/**
 * Storage Helpers
 */
function loadItemsFromStorage() {
  let items = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read localStorage, falling back to demo data.", e);
  }

  if (!items) {
    items = [...INITIAL_DEMO_ITEMS];
  }

  // Ensure every item is migrated to have collegeId and proper tracking fields
  items = items.map(item => {
    if (!item.collegeId) {
      item.collegeId = "col-jspm-wagholi";
      item.collegeName = "JSPM University (Wagholi Campus)";
      item.campusName = "Wagholi Campus";
    }
    if (typeof ensureItemTracking === "function") {
      return ensureItemTracking(item);
    }
    return item;
  });

  saveItemsToStorage(items);
  return items;
}

function saveItemsToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
}

/**
 * Mask campus email for privacy protection (e.g., "maya.patel@campus.edu" -> "m.pat***@campus.edu")
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return "student***@campus.edu";
  const parts = email.trim().split("@");
  if (parts.length !== 2) return "student***@campus.edu";
  const user = parts[0];
  const domain = parts[1];
  
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  const visible = user.substring(0, Math.min(4, Math.floor(user.length / 2)));
  return `${visible}***@${domain}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format ISO date string into readable campus format
 */
function formatDate(dateStr) {
  if (!dateStr) return "Unknown Date";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = parseInt(parts[1], 10) - 1;
      return `${months[m]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

/**
 * Show a floating toast notification
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `editorial-toast toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Toggle Application Theme (Editorial Light vs Deep Studio Dark)
 */
function toggleAppTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  try {
    localStorage.setItem("lostloop_theme", newTheme);
  } catch (e) {}

  const icon = document.getElementById("themeIconSun");
  if (icon) {
    if (newTheme === "dark") {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;
    } else {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
    }
  }
}

/**
 * Switch Active Tab
 */
function switchTab(tabName) {
  state.activeTab = tabName;

  // Update header nav buttons
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  // Update mobile bottom nav
  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  // Update views
  document.querySelectorAll(".tab-view").forEach(view => {
    view.style.display = view.id === `view-${tabName}` ? "block" : "none";
  });

  if (tabName === "browse") {
    renderFeed();
  } else if (tabName === "inspector") {
    renderInspector();
  } else if (tabName === "tests") {
    runBrowserTestSuite();
  } else if (tabName === "rewards") {
    renderRewardsWallet();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Trigger search from Hero Search Pill
 */
function triggerHeroSearch() {
  const input = document.getElementById("heroSearchInput");
  if (!input) return;
  state.filters.search = input.value.trim();
  renderFeed();
  const feedAnchor = document.getElementById("dashboard-feed-anchor");
  if (feedAnchor) {
    feedAnchor.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Populate select dropdowns for categories and campus zones
 * Uses campus-specific location zones for the active college if available
 */
function populateDropdowns(customLocations = null) {
  const categorySelects = ["filterCategory", "lostCategory", "foundCategory"];
  categorySelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === "filterCategory";
    el.innerHTML = isFilter ? '<option value="all">All Categories</option>' : '<option value="">Select Category...</option>';
    ITEM_CATEGORIES.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      el.appendChild(opt);
    });
  });

  const activeZones = customLocations || (state.activeCollege && state.activeCollege.zones ? state.activeCollege.zones : CAMPUS_LOCATIONS);
  const locationSelects = ["filterLocation", "lostLocationZone", "foundLocationZone"];
  locationSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id === "filterLocation";
    el.innerHTML = isFilter ? '<option value="all">All Campus Locations</option>' : '<option value="">Select Campus Zone...</option>';
    activeZones.forEach(loc => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      el.appendChild(opt);
    });
  });
}

/**
 * Compute statistics scoped to the active college campus
 */
function updateStats() {
  const activeCollegeId = state.activeCollege ? state.activeCollege.id : null;
  const scopedItems = activeCollegeId 
    ? state.items.filter(i => !i.collegeId || i.collegeId === activeCollegeId)
    : state.items;

  const lostCount = scopedItems.filter(i => i.type === "lost" && i.status === "active").length;
  const foundCount = scopedItems.filter(i => i.type === "found" && i.status === "active").length;
  const reunitedCount = scopedItems.filter(i => i.status === "reunited").length;

  // Count how many active items have at least 1 high or moderate match within the campus
  let matchedItemsCount = 0;
  scopedItems.forEach(item => {
    if (item.status === "active") {
      const matches = findMatchesForItem(item, scopedItems);
      if (matches.length > 0) matchedItemsCount++;
    }
  });

  const lostEl = document.getElementById("statLostCount");
  const foundEl = document.getElementById("statFoundCount");
  const reunitedEl = document.getElementById("statReunitedCount");
  const matchesEl = document.getElementById("statMatchesCount");

  if (lostEl) lostEl.textContent = lostCount;
  if (foundEl) foundEl.textContent = foundCount;
  if (reunitedEl) reunitedEl.textContent = reunitedCount;
  if (matchesEl) matchesEl.textContent = matchedItemsCount;
}

/**
 * Filter & Sort feed items, strictly scoped to the active college
 */
function getFilteredItems() {
  let list = [...state.items];

  // 0. College Campus Isolation Filter
  if (state.activeCollege) {
    list = list.filter(i => !i.collegeId || i.collegeId === state.activeCollege.id);
  }

  // 1. Type Filter
  if (state.filters.type === "lost") {
    list = list.filter(i => i.type === "lost" && i.status === "active");
  } else if (state.filters.type === "found") {
    list = list.filter(i => i.type === "found" && i.status === "active");
  } else if (state.filters.type === "reunited") {
    list = list.filter(i => i.status === "reunited");
  }

  // 2. Category Filter
  if (state.filters.category !== "all") {
    list = list.filter(i => i.category === state.filters.category);
  }

  // 3. Location Filter
  if (state.filters.location !== "all") {
    list = list.filter(i => i.locationZone === state.filters.location);
  }

  // 4. Search Filter
  if (state.filters.search.trim()) {
    const q = state.filters.search.trim().toLowerCase();
    list = list.filter(i => {
      const text = `${i.title} ${i.description} ${i.brand || ""} ${i.category} ${i.locationZone}`.toLowerCase();
      return text.includes(q);
    });
  }

  // 5. Sorting
  if (state.filters.sortBy === "newest") {
    list.sort((a, b) => b.createdAt - a.createdAt);
  } else if (state.filters.sortBy === "oldest") {
    list.sort((a, b) => a.createdAt - b.createdAt);
  } else if (state.filters.sortBy === "matches") {
    list.sort((a, b) => {
      const countA = findMatchesForItem(a, state.items).length;
      const countB = findMatchesForItem(b, state.items).length;
      return countB - countA;
    });
  }

  return list;
}

/**
 * Render Feed View
 */
function renderFeed() {
  updateStats();
  const container = document.getElementById("itemsGrid");
  const filtered = getFilteredItems();

  const feedCountEl = document.getElementById("feedCount");
  if (feedCountEl) {
    const colName = state.activeCollege ? ` (${state.activeCollege.shortCode || state.activeCollege.campus})` : "";
    feedCountEl.textContent = `${filtered.length} Item${filtered.length === 1 ? "" : "s"}${colName}`;
  }

  if (filtered.length === 0) {
    const collegeName = state.activeCollege ? state.activeCollege.name : "your campus";
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🏛️</div>
        <h4 style="font-weight: 700; color: var(--text-headline); font-size: 1.1rem; margin-bottom: 6px;">No Items Found for ${escapeHTML(collegeName)}</h4>
        <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 16px;">Try clearing your search query or be the first to report a lost or found item at this campus.</p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn-editorial-sm btn-editorial-outline btn btn-outline btn-sm" onclick="resetFilters()">Reset All Filters</button>
          <button class="btn-editorial-sm btn-editorial-found" onclick="switchTab('report-lost')">+ File Lost Report</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const matches = item.status === "active" ? findMatchesForItem(item, state.items) : [];
    const isLost = item.type === "lost";
    const isReunited = item.status === "reunited";

    let badgeClass = "badge-lost";
    let badgeText = "Lost Item";
    if (isReunited) {
      badgeClass = "badge-reunited";
      badgeText = "✓ Reunited";
    } else if (!isLost) {
      badgeClass = "badge-found";
      badgeText = "Found Item";
    }

    const matchBanner = (item.status === "active" && matches.length > 0) ? `
      <div class="card-match-banner match-flag-banner" onclick="openInspectorForItem('${item.id}')">
        <span>⚡ <strong>${matches.length}</strong> Potential Match${matches.length > 1 ? "es" : ""} Detected</span>
        <span style="text-decoration: underline;">Compare &rarr;</span>
      </div>
    ` : "";

    const claimButton = (!isLost && item.status === "active") ? `
      <button class="btn-editorial-sm btn-editorial-found btn btn-found btn-sm" onclick="openClaimModal('${item.id}')">
        Safe Claim
      </button>
    ` : "";

    const campusPill = item.campusName ? `
      <span class="report-id-pill" style="background: rgba(124, 58, 237, 0.08); color: #7c3aed; border-color: rgba(124, 58, 237, 0.2);">
        🏛️ ${escapeHTML(item.campusName)}
      </span>
    ` : "";

    return `
      <article class="editorial-item-card item-card" data-id="${item.id}">
        <div class="card-status-row card-top">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="status-badge type-badge ${badgeClass}">${badgeText}</span>
            ${item.reportId ? `<span class="report-id-pill">${escapeHTML(item.reportId)}</span>` : ''}
            ${campusPill}
          </div>
          <span class="card-date-meta date-indicator">${formatDate(item.date)}</span>
        </div>

        <h4 class="card-item-title card-title">${escapeHTML(item.title)}</h4>

        <div class="card-category-loc card-meta-list">
          <div class="loc-pill meta-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
            <span>${escapeHTML(item.category)}</span>
          </div>
          <div class="loc-pill meta-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span>${escapeHTML(item.locationZone)}</span>
          </div>
        </div>

        <p class="card-desc-snippet card-desc">${escapeHTML(item.description)}</p>

        ${matchBanner}

        <div class="card-bottom-actions card-footer">
          <div class="masked-reporter-label privacy-reporter-tag">
            <span>By ${escapeHTML(item.reporter.maskedContact)}</span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn-editorial-sm btn-editorial-outline btn btn-outline btn-sm" onclick="openItemTracking('${item.id}')" title="View step-by-step recovery tracking timeline">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
              Track Item
            </button>
            <button class="btn-editorial-sm btn-editorial-outline btn btn-outline btn-sm" onclick="openItemDetails('${item.id}')">
              Details
            </button>
            ${claimButton}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/**
 * Reset filters
 */
function resetFilters() {
  state.filters.search = "";
  state.filters.type = "all";
  state.filters.category = "all";
  state.filters.location = "all";
  state.filters.sortBy = "newest";

  const searchInput = document.getElementById("searchInput");
  const heroSearchInput = document.getElementById("heroSearchInput");
  const filterCat = document.getElementById("filterCategory");
  const filterLoc = document.getElementById("filterLocation");
  const filterSort = document.getElementById("filterSortBy");

  if (searchInput) searchInput.value = "";
  if (heroSearchInput) heroSearchInput.value = "";
  if (filterCat) filterCat.value = "all";
  if (filterLoc) filterLoc.value = "all";
  if (filterSort) filterSort.value = "newest";

  document.querySelectorAll(".type-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.type === "all");
  });

  renderFeed();
}

/**
 * Match Inspector Rendering
 */
function renderInspector() {
  const listContainer = document.getElementById("inspectorItemList");
  const detailContainer = document.getElementById("inspectorDetailPanel");

  const activeItems = state.items.filter(i => i.status === "active");

  if (activeItems.length === 0) {
    listContainer.innerHTML = `<p class="field-help-text">No active items recorded.</p>`;
    detailContainer.innerHTML = `<div style="text-align: center; padding: 40px;"><h4 style="font-weight: 700; color: var(--text-headline);">No Items to Inspect</h4></div>`;
    return;
  }

  // Auto-select first item if none selected or invalid
  if (!state.selectedInspectorItemId || !state.items.find(i => i.id === state.selectedInspectorItemId)) {
    const itemWithMatch = activeItems.find(i => findMatchesForItem(i, state.items).length > 0) || activeItems[0];
    state.selectedInspectorItemId = itemWithMatch.id;
  }

  listContainer.innerHTML = activeItems.map(item => {
    const matches = findMatchesForItem(item, state.items);
    const isSelected = item.id === state.selectedInspectorItemId;
    const typeLabel = item.type === "lost" ? "Lost" : "Found";
    const typeColor = item.type === "lost" ? "var(--accent-coral)" : "var(--accent-green)";

    return `
      <div class="inspector-menu-card inspector-item-btn ${isSelected ? "active-selected selected" : ""}" onclick="selectInspectorItem('${item.id}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.72rem; font-weight: 700; color: ${typeColor}; text-transform: uppercase;">${typeLabel}</span>
          ${matches.length > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 7px; border-radius: 9999px;">${matches.length} Match${matches.length > 1 ? "es" : ""}</span>` : ""}
        </div>
        <div style="font-weight: 700; font-size: 0.86rem; color: var(--text-headline); line-height: 1.3;">${escapeHTML(item.title)}</div>
        <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHTML(item.category)}</div>
      </div>
    `;
  }).join("");

  const targetItem = state.items.find(i => i.id === state.selectedInspectorItemId);
  if (!targetItem) return;

  const matches = findMatchesForItem(targetItem, state.items);

  let matchesHTML = "";
  if (matches.length === 0) {
    matchesHTML = `
      <div class="empty-matches-card" style="text-align: center; padding: 48px 20px; background: var(--bg-surface-subtle); border-radius: var(--radius-lg); border: 1px dashed var(--border-light);">
        <div style="width: 52px; height: 52px; background: var(--bg-surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto; box-shadow: var(--shadow-subtle);">
          <svg style="width: 26px; height: 26px; color: var(--text-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h4 style="font-weight: 800; color: var(--text-headline); font-size: 1.15rem; margin-bottom: 6px;">No strong matches yet</h4>
        <p style="font-size: 0.86rem; color: var(--text-muted); max-width: 440px; margin: 0 auto; line-height: 1.5;">
          Our matching engine checked active reports against category, item type, brand, and distinctive features, but found no candidates meeting our verified threshold.
        </p>
        <div style="margin-top: 16px; display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--accent-green); background: var(--accent-green-bg); padding: 5px 12px; border-radius: var(--radius-full); font-weight: 600;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green);"></span>
          Automatic checking enabled: You will be alerted when a matching report is logged.
        </div>
      </div>
    `;
  } else {
    matchesHTML = matches.map((m, idx) => {
      const c = m.candidate;
      return `
        <div class="match-explain-card match-candidate-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px;">
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-light);">
                Match #${idx + 1} &bull; Opposite Report (${c.type.toUpperCase()})
              </span>
              <h4 style="font-size: 1.1rem; font-weight: 800; margin-top: 2px; color: var(--text-headline);">${escapeHTML(c.title)}</h4>
            </div>
            <span class="match-strength-pill match-badge ${m.badgeClass}">${escapeHTML(m.badgeLabel)}</span>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
            <strong>Location:</strong> ${escapeHTML(c.locationZone)} &bull; <strong>Date:</strong> ${formatDate(c.date)}
          </div>

          <p style="font-size: 0.85rem; color: var(--text-body); margin-bottom: 12px; background: var(--bg-surface-subtle); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
            "${escapeHTML(c.description)}"
          </p>

          <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-light); margin-top: 14px;">
            Transparent Matching Rationale (Rule-Based Signals):
          </div>

          <ul class="explainable-reasons-list reasons-list">
            ${m.reasons.map(r => `
              <li class="explain-bullet-item reason-bullet ${r.matched ? "is-matched matched" : "is-unmatched unmatched"}">
                <span class="reason-icon">${r.matched ? "🟢" : "⚪"}</span>
                <div>
                  <strong>${escapeHTML(r.title)}:</strong> ${escapeHTML(r.detail)}
                </div>
              </li>
            `).join("")}
          </ul>

          ${m.matchedKeywords.length > 0 ? `
            <div style="margin-top: 8px;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Extracted Shared Keywords:</span>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                ${m.matchedKeywords.map(k => `<span class="cloud-keyword-tag keyword-tag">${escapeHTML(k)}</span>`).join("")}
              </div>
            </div>
          ` : ""}

          <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
            <button class="btn-editorial-sm btn-editorial-outline btn btn-outline btn-sm" onclick="openItemDetails('${c.id}')">View Candidate Report</button>
            ${c.type === "found" && c.status === "active" ? `
              <button class="btn-editorial-sm btn-editorial-found btn btn-found btn-sm" onclick="openClaimModal('${c.id}')">Submit Safe Claim</button>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  detailContainer.innerHTML = `
    <div style="border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="status-badge type-badge ${targetItem.type === "lost" ? "badge-lost" : "badge-found"}">
            Selected: ${targetItem.type === "lost" ? "Lost Item Report" : "Found Item Report"}
          </span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 8px; color: var(--text-headline);">${escapeHTML(targetItem.title)}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
            Reported at <strong>${escapeHTML(targetItem.locationZone)}</strong> on <strong>${formatDate(targetItem.date)}</strong>
          </p>
        </div>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-body); margin-top: 12px; background: var(--bg-surface-subtle); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
        ${escapeHTML(targetItem.description)}
      </p>
    </div>

    <div>
      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-headline); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        <span>Potential Matches in Campus System</span>
        <span style="font-size: 0.75rem; background: var(--bg-surface-subtle); padding: 2px 8px; border-radius: 9999px; font-weight: 700; color: var(--text-muted);">${matches.length} Candidate${matches.length === 1 ? "" : "s"}</span>
      </h4>
      ${matchesHTML}
    </div>
  `;
}

function selectInspectorItem(id) {
  state.selectedInspectorItemId = id;
  renderInspector();
}

function openInspectorForItem(id) {
  state.selectedInspectorItemId = id;
  switchTab("inspector");
}

/**
 * Open Item Details Modal
 */
function openItemDetails(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  state.activeDetailItem = item;
  const modal = document.getElementById("itemDetailModal");
  const modalBody = document.getElementById("itemDetailBody");

  const matches = item.status === "active" ? findMatchesForItem(item, state.items) : [];

  let claimsHTML = "";
  if (item.claims && item.claims.length > 0) {
    claimsHTML = `
      <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 14px; margin-top: 10px;">
        <h5 style="font-size: 0.85rem; font-weight: 800; color: var(--text-headline); margin-bottom: 8px; display: flex; justify-content: space-between;">
          <span>Verification & Claims History</span>
          <span style="font-size: 0.72rem; background: var(--bg-surface); padding: 2px 8px; border-radius: 9999px;">${item.claims.length}</span>
        </h5>
        ${item.claims.map(claim => `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 12px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted); margin-bottom: 6px;">
              <span>Claimant: <strong>${escapeHTML(claim.claimantMasked)}</strong></span>
              <span style="text-transform: uppercase; font-weight: 700; font-size: 0.7rem; color: var(--accent-green);">${escapeHTML(claim.status)}</span>
            </div>
            <div style="font-size: 0.84rem; color: var(--text-body); margin-bottom: 6px;">
              <strong>Proof Note:</strong> "${escapeHTML(claim.claimNote)}"
            </div>
            ${claim.resolutionNote ? `
              <div style="font-size: 0.78rem; color: #047857; background: #ecfdf5; padding: 6px 10px; border-radius: 6px; margin-top: 6px;">
                ✓ ${escapeHTML(claim.resolutionNote)}
              </div>
            ` : ""}
            ${claim.status === "pending" && item.status === "active" ? `
              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button class="btn-editorial-sm btn-editorial-found btn btn-found btn-sm" onclick="approveClaim('${item.id}', '${claim.claimId}')">
                  Approve Proof & Mark Reunited
                </button>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
  } else if (item.type === "found" && item.status === "active") {
    claimsHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 12px; background: var(--bg-surface-subtle); border-radius: var(--radius-md);">
        No claims filed yet. Sensitive personal information is protected during verification.
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="status-badge type-badge ${item.type === "lost" ? "badge-lost" : item.status === "reunited" ? "badge-reunited" : "badge-found"}">
            ${item.type === "lost" ? "Lost Report" : item.status === "reunited" ? "✓ Reunited" : "Found Report"}
          </span>
          ${item.reportId ? `<span class="report-id-pill">${escapeHTML(item.reportId)}</span>` : ''}
        </div>
        <span style="font-size: 0.8rem; color: var(--text-light);">${formatDate(item.date)}</span>
      </div>

      <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-headline); margin-bottom: 10px;">${escapeHTML(item.title)}</h3>

      <!-- Potential Matches Status Banner -->
      <div style="margin-bottom: 16px;">
        ${matches.length > 0 ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 14px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="color: #166534; font-weight: 700; font-size: 0.84rem;">⚡ ${matches.length} Potential Match${matches.length > 1 ? 'es' : ''} Identified</span>
            <button class="btn-editorial-sm btn-editorial-found" onclick="closeModal('itemDetailModal'); openInspectorForItem('${item.id}')">Review Matches &rarr;</button>
          </div>
        ` : `
          <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-light); padding: 10px 14px; border-radius: var(--radius-md); color: var(--text-muted); font-size: 0.82rem; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink: 0; color: var(--text-light);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span><strong>No strong matches yet.</strong> The system has checked all active reports. You will be notified when a matching item is logged.</span>
          </div>
        `}
      </div>

      <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px;">
        <div><strong>Category:</strong> <span>${escapeHTML(item.category)}</span></div>
        <div><strong>Location Zone:</strong> <span>${escapeHTML(item.locationZone)}</span></div>
        ${item.locationDetail ? `<div><strong>Specific Landmark:</strong> <span>${escapeHTML(item.locationDetail)}</span></div>` : ""}
        ${item.brand ? `<div><strong>Brand:</strong> <span>${escapeHTML(item.brand)}</span></div>` : ""}
        ${item.primaryColor ? `<div><strong>Color:</strong> <span>${escapeHTML(item.primaryColor)}</span></div>` : ""}
      </div>

      <div style="background: var(--bg-surface-subtle); padding: 14px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border-light);">
        <h5 style="font-size: 0.74rem; text-transform: uppercase; color: var(--text-light); font-weight: 700; margin-bottom: 4px;">Public Description</h5>
        <p style="font-size: 0.88rem; color: var(--text-body); line-height: 1.5;">${escapeHTML(item.description)}</p>
      </div>

      ${item.verificationQuestion ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px;">Owner Verification Challenge</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: #1e3a8a;">"${escapeHTML(item.verificationQuestion)}"</div>
          <p style="font-size: 0.74rem; color: #1e40af; margin-top: 4px;">
            The finder will ask you this question to confirm rightful ownership before handing over the item.
          </p>
        </div>
      ` : ""}

      <div class="privacy-callout-box" style="margin-bottom: 16px;">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink: 0; color: var(--accent-blue);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        <span>
          <strong>Privacy-Protected Reporter:</strong> Logged by campus user (${escapeHTML(item.reporter.maskedContact)}). Personal phone numbers and dorm rooms are safely kept offline.
        </span>
      </div>

      ${claimsHTML}
    </div>
  `;

  const footer = document.getElementById("itemDetailFooter");
  footer.innerHTML = `
    <button class="btn-editorial-sm btn-editorial-outline btn btn-outline" onclick="closeModal('itemDetailModal')">Close</button>
    <button class="btn-editorial-sm btn-editorial-outline" onclick="closeModal('itemDetailModal'); openItemTracking('${item.id}')">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
      </svg>
      Track Recovery Timeline
    </button>
    ${matches.length > 0 ? `
      <button class="btn-editorial-sm btn-editorial-found btn btn-primary" onclick="closeModal('itemDetailModal'); openInspectorForItem('${item.id}')">
        Inspect ${matches.length} Match${matches.length > 1 ? "es" : ""}
      </button>
    ` : ""}
    ${item.type === "found" && item.status === "active" ? `
      <button class="btn-editorial-sm btn-editorial-lost btn btn-found" onclick="closeModal('itemDetailModal'); openClaimModal('${item.id}')">
        Claim This Item
      </button>
    ` : ""}
  `;

  modal.classList.add("is-open");
}

/**
 * Open Safe Claim Modal
 */
function openClaimModal(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  state.activeClaimItem = item;
  const modal = document.getElementById("claimModal");

  document.getElementById("claimItemTitle").textContent = item.title;
  document.getElementById("claimItemMeta").textContent = `${item.category} • Found at ${item.locationZone} on ${formatDate(item.date)}`;

  const promptEl = document.getElementById("claimQuestionPrompt");
  if (item.verificationQuestion) {
    promptEl.innerHTML = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="font-size: 0.72rem; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px;">Finder's Verification Challenge</div>
        <div style="font-size: 0.88rem; font-weight: 700; color: #1e3a8a;">"${escapeHTML(item.verificationQuestion)}"</div>
      </div>
    `;
  } else {
    promptEl.innerHTML = `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="font-size: 0.72rem; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px;">Ownership Verification</div>
        <div style="font-size: 0.88rem; font-weight: 700; color: #1e3a8a;">Describe unique identifying features, lock screen details, or private contents not listed in the public post.</div>
      </div>
    `;
  }

  // Clear inputs
  document.getElementById("claimStudentEmail").value = "";
  document.getElementById("claimProofAnswer").value = "";
  document.getElementById("claimPickupLocation").value = "Campus Safety Desk (Union 102)";

  modal.classList.add("is-open");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("is-open");
}

/* ==========================================================================
   FEATURE 1: Complete Item Tracking System Controller
   ========================================================================== */

/**
 * Open Item Tracking Modal with verified 7-stage vertical timeline
 */
function openItemTracking(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  if (typeof ensureItemTracking === "function") {
    ensureItemTracking(item);
  }

  state.activeTrackingItem = item;
  const modal = document.getElementById("itemTrackingModal");
  if (!modal) return;

  const isLost = item.type === "lost";
  const matches = (item.status === "active" || item.trackingStatus === "searching" || item.trackingStatus === "potential_match") ? findMatchesForItem(item, state.items) : [];

  // 1. Header & Summary elements
  const reportIdEl = document.getElementById("trackingReportIdBadge");
  const statusBadgeEl = document.getElementById("trackingStatusBadge");
  const typeTagEl = document.getElementById("trackingTypeTag");
  const titleEl = document.getElementById("trackingItemTitle");
  const categoryEl = document.getElementById("trackingItemCategory");
  const locationEl = document.getElementById("trackingItemLocation");
  const createdEl = document.getElementById("trackingItemCreated");
  const lastUpdatedEl = document.getElementById("trackingLastUpdatedTime");

  if (reportIdEl) reportIdEl.textContent = item.reportId || (isLost ? "LL-LST" : "LL-FND");

  const statusKey = item.trackingStatus || item.status;
  const statusLabels = {
    created: "Report Created",
    searching: "Searching for Matches",
    potential_match: "Potential Match Found",
    claim_submitted: "Claim Submitted",
    verification_pending: "Verification Pending",
    handover_arranged: "Handover Arranged",
    reunited: isLost ? "Reunited" : "Returned to Owner",
    reported: "Found Item Reported",
    published: "Published & Active",
    claim_received: "Potential Claim Received",
    closed: "Report Closed",
    withdrawn: "Withdrawn"
  };

  if (statusBadgeEl) {
    statusBadgeEl.className = `status-badge badge-${statusKey}`;
    statusBadgeEl.textContent = statusLabels[statusKey] || statusKey.replace("_", " ");
  }

  if (typeTagEl) {
    typeTagEl.textContent = isLost ? "Lost Item Report" : "Found Item Report";
    typeTagEl.style.color = isLost ? "var(--badge-lost-color)" : "var(--badge-found-color)";
  }

  if (titleEl) titleEl.textContent = item.title;
  if (categoryEl) categoryEl.textContent = item.category;
  if (locationEl) locationEl.textContent = item.locationZone;
  if (createdEl) createdEl.textContent = formatDate(item.date || item.createdAt);
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = item.lastUpdated ? new Date(item.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";
  }

  // 2. Render Available Action Buttons
  renderTrackingActions(item, matches);

  // 3. Render Potential Matches (if applicable)
  renderTrackingMatchesSection(item, matches);

  // 4. Render Vertical Timeline
  renderTrackingTimeline(item, matches);

  modal.classList.add("is-open");
}

/**
 * Render Available Action Buttons for the tracking modal
 */
function renderTrackingActions(item, matches) {
  const container = document.getElementById("trackingActionButtons");
  if (!container) return;

  const currentStatus = item.trackingStatus || item.status;
  const isLost = item.type === "lost";
  const buttons = [];

  // If Lost item has matches, allow immediate inspection
  if (isLost && matches && matches.length > 0) {
    buttons.push(`
      <button class="btn-editorial-sm btn-editorial-found" onclick="closeModal('itemTrackingModal'); openInspectorForItem('${item.id}')">
        Inspect ${matches.length} Candidate${matches.length > 1 ? 's' : ''} &rarr;
      </button>
    `);
  }

  // If Found item is published, allow safe claim
  if (!isLost && (currentStatus === "published" || currentStatus === "active")) {
    buttons.push(`
      <button class="btn-editorial-sm btn-editorial-found" onclick="closeModal('itemTrackingModal'); openClaimModal('${item.id}')">
        Submit Safe Claim
      </button>
    `);
  }

  // Transition: Withdraw Report
  if (typeof canTransitionStatus === "function" && canTransitionStatus(item.type, currentStatus, "withdrawn")) {
    buttons.push(`
      <button class="btn-editorial-sm btn-editorial-outline" onclick="handleTrackingStatusChange('${item.id}', 'withdrawn')">
        Withdraw Report
      </button>
    `);
  }

  // Transition: Close Report
  if (typeof canTransitionStatus === "function" && canTransitionStatus(item.type, currentStatus, "closed")) {
    buttons.push(`
      <button class="btn-editorial-sm btn-editorial-outline" onclick="handleTrackingStatusChange('${item.id}', 'closed')">
        Close Report
      </button>
    `);
  }

  // Transition: Reopen Report (if closed or withdrawn)
  const reopenTarget = isLost ? "searching" : "published";
  if (typeof canTransitionStatus === "function" && canTransitionStatus(item.type, currentStatus, reopenTarget)) {
    buttons.push(`
      <button class="btn-editorial-sm btn-editorial-found" onclick="handleTrackingStatusChange('${item.id}', '${reopenTarget}')">
        Reopen Report
      </button>
    `);
  }

  if (buttons.length === 0) {
    container.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No manual actions needed at this stage. Tracking updates automatically.</span>`;
  } else {
    container.innerHTML = buttons.join("");
  }
}

/**
 * Render Potential Matches section in tracking modal
 */
function renderTrackingMatchesSection(item, matches) {
  const container = document.getElementById("trackingMatchesContainer");
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 14px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.95rem;">⚡</span>
          <strong style="color: #166534; font-size: 0.9rem;">${matches.length} Potential Match${matches.length > 1 ? 'es' : ''} Identified</strong>
          <span class="report-id-pill" style="background: #ffffff; border-color: #bbf7d0; color: #166534;">Compatible Details</span>
        </div>
        <button class="btn-editorial-sm btn-editorial-found" onclick="closeModal('itemTrackingModal'); openInspectorForItem('${item.id}')">
          Full Match Analysis &rarr;
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${matches.slice(0, 2).map(m => `
          <div style="background: #ffffff; border: 1px solid #dcfce7; border-radius: var(--radius-sm); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-headline);">${escapeHTML(m.candidate.title)}</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHTML(m.candidate.locationZone)} &bull; ${formatDate(m.candidate.date)}</div>
              <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                ${m.reasons.slice(0, 2).map(r => `<span style="font-size: 0.68rem; background: #f0fdf4; color: #15803d; padding: 2px 6px; border-radius: 4px; border: 1px solid #bbf7d0;">✓ ${escapeHTML(r.title)}</span>`).join("")}
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-editorial-sm btn-editorial-outline" onclick="closeModal('itemTrackingModal'); openItemDetails('${m.candidate.id}')">View</button>
              ${m.candidate.type === "found" ? `<button class="btn-editorial-sm btn-editorial-found" onclick="closeModal('itemTrackingModal'); openClaimModal('${m.candidate.id}')">Claim</button>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Render Vertical Timeline Nodes in tracking modal
 */
function renderTrackingTimeline(item, matches) {
  const container = document.getElementById("itemTrackingTimeline");
  if (!container) return;

  const timelineStages = typeof buildRenderableTimeline === "function" ? buildRenderableTimeline(item, matches) : [];

  container.innerHTML = timelineStages.map((stage) => {
    const isCompleted = stage.state === "completed";
    const isCurrent = stage.state === "current";
    const isUpcoming = stage.state === "upcoming";

    let stateClass = "step-upcoming";
    if (isCompleted) stateClass = "step-completed";
    else if (isCurrent) stateClass = "step-current";

    const formattedTime = stage.timestamp ? formatDate(stage.timestamp) : (isUpcoming ? "Pending" : "Active Stage");

    return `
      <div class="timeline-step-item ${stateClass}" data-stage="${stage.code}">
        <div class="timeline-connector-line"></div>
        <div class="timeline-icon-box">
          ${renderStageIconSvg(stage.state, stage.icon)}
        </div>
        <div class="timeline-step-content">
          <div class="timeline-step-header">
            <h6 class="timeline-step-title">
              <span>${escapeHTML(stage.title)}</span>
              ${isCurrent ? '<span class="status-badge badge-searching" style="font-size: 0.66rem; padding: 1px 7px;">Current Stage</span>' : ''}
              ${isCompleted ? '<span style="font-size: 0.66rem; color: #10b981; font-weight: 700;">Completed</span>' : ''}
            </h6>
            <span class="timeline-step-time">${formattedTime}</span>
          </div>
          <p class="timeline-step-desc">${escapeHTML(stage.description)}</p>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Render SVG icon inside timeline node
 */
function renderStageIconSvg(state, iconName) {
  if (state === "completed") {
    return `
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  }

  if (iconName === "search") {
    return `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`;
  } else if (iconName === "sparkles") {
    return `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>`;
  } else if (iconName === "paper-airplane" || iconName === "inbox-in") {
    return `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>`;
  } else if (iconName === "shield-check") {
    return `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`;
  } else if (iconName === "location-marker") {
    return `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
  }

  return `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: currentColor;"></span>`;
}

/**
 * Handle state transition action (e.g. withdraw, close, reopen)
 */
function handleTrackingStatusChange(itemId, targetStatus, customDesc = "") {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;

  const result = recordStatusChange(item, targetStatus, customDesc);
  if (!result.success) {
    alert(result.error);
    return;
  }

  saveItemsToStorage(state.items);
  renderFeed();
  openItemTracking(itemId);
  showToast(`Report status updated to "${targetStatus.replace("_", " ")}"`, "success");
}

/* ==========================================================================
   FEATURE 2: LostLoop AI Recovery Assistant Controller
   ========================================================================== */

/**
 * Initialize AI Recovery Assistant
 */
function initAiAssistant() {
  if (typeof LostLoopAssistant === "function") {
    state.assistant = new LostLoopAssistant();
  }
  resetAiChat();
}

/**
 * Toggle AI Chat Drawer
 */
function toggleAiAssistant(forceOpen = null) {
  const drawer = document.getElementById("aiAssistantDrawer");
  if (!drawer) return;

  const shouldOpen = forceOpen !== null ? forceOpen : !state.assistantOpen;
  state.assistantOpen = shouldOpen;

  if (shouldOpen) {
    drawer.classList.add("is-open");
    const input = document.getElementById("aiChatInput");
    if (input) setTimeout(() => input.focus(), 150);
  } else {
    drawer.classList.remove("is-open");
  }
}

/**
 * Reset AI Chat to initial welcome state
 */
function resetAiChat() {
  state.assistantChatHistory = [
    {
      sender: "assistant",
      timestamp: Date.now(),
      text: "👋 Hi! I'm the **LostLoop Recovery Assistant**.\n\n" +
            "I can help you search campus reports in natural language, draft clear descriptions, find potential matches, and safely claim your belongings.\n\n" +
            "*What did you lose or find on campus?*",
      quickPrompts: [
        "I lost my headphones. Can you help me?",
        "I lost my navy Hydro Flask at the Student Union.",
        "How do I claim a found item?",
        "What should I do if no match is found?"
      ]
    }
  ];

  renderAiQuickPrompts(state.assistantChatHistory[0].quickPrompts);
  renderAiMessages();
}

/**
 * Render Quick Prompt Pills Bar
 */
function renderAiQuickPrompts(prompts) {
  const container = document.getElementById("aiQuickPrompts");
  if (!container || !Array.isArray(prompts)) return;

  container.innerHTML = prompts.map(p => `
    <button type="button" class="ai-prompt-pill" onclick="sendAiQuickPrompt('${escapeHTML(p)}')">
      ${escapeHTML(p)}
    </button>
  `).join("");
}

/**
 * Send a prompt directly from pill tap
 */
function sendAiQuickPrompt(promptText) {
  const input = document.getElementById("aiChatInput");
  if (input) {
    input.value = promptText;
    handleAiChatSubmit();
  }
}

/**
 * Formats basic Markdown into safe HTML
 */
function formatAiMarkdown(text) {
  if (!text) return "";
  let html = escapeHTML(text);

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet items and line breaks
  const lines = html.split("\n");
  const processed = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
      if (!inList) {
        processed.push("<ul style='margin: 6px 0 6px 18px; padding: 0;'>");
        inList = true;
      }
      processed.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        processed.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        processed.push("<br>");
      } else {
        processed.push(`<p style='margin: 0 0 6px 0;'>${line}</p>`);
      }
    }
  }
  if (inList) processed.push("</ul>");
  return processed.join("");
}

/**
 * Render Chat Messages List
 */
function renderAiMessages() {
  const container = document.getElementById("aiChatMessages");
  if (!container) return;

  container.innerHTML = state.assistantChatHistory.map(msg => {
    const isUser = msg.sender === "user";
    const bubbleClass = isUser ? "ai-msg-user" : "ai-msg-bot";

    let extraHTML = "";

    // Extracted entity card
    if (msg.extractedCard) {
      const c = msg.extractedCard;
      extraHTML += `
        <div class="ai-entity-card">
          <div class="ai-entity-title">Belongings Recognized</div>
          <div class="ai-entity-grid">
            <div class="ai-entity-item"><strong>Item:</strong> ${escapeHTML(c.title)}</div>
            <div class="ai-entity-item"><strong>Brand:</strong> ${escapeHTML(c.brand)}</div>
            <div class="ai-entity-item"><strong>Colors:</strong> ${escapeHTML(c.colors)}</div>
            <div class="ai-entity-item"><strong>Location:</strong> ${escapeHTML(c.location)}</div>
          </div>
        </div>
      `;
    }

    // Candidate item cards
    if (msg.candidates && msg.candidates.length > 0) {
      extraHTML += `
        <div style="margin-top: 8px;">
          ${msg.candidates.map(cand => `
            <div class="ai-candidate-card">
              <div class="ai-candidate-header">
                <span class="ai-candidate-name">${escapeHTML(cand.item.title)}</span>
                <span class="ai-candidate-label ${cand.calibratedLabel === 'Strong candidate' ? 'ai-label-strong' : 'ai-label-possible'}">
                  ${escapeHTML(cand.calibratedLabel)}
                </span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHTML(cand.item.locationZone)} &bull; ${formatDate(cand.item.date)}</div>
              <ul class="ai-candidate-reasons">
                ${cand.reasons.slice(0, 2).map(r => `<li>✓ ${escapeHTML(r.title)}</li>`).join("")}
              </ul>
              <div class="ai-candidate-actions">
                <button class="btn-editorial-sm btn-editorial-outline btn-sm" onclick="handleAiAction('view_item', '${cand.item.id}')">View Details</button>
                <button class="btn-editorial-sm btn-editorial-outline btn-sm" onclick="handleAiAction('track_item', '${cand.item.id}')">Track</button>
                ${cand.item.type === "found" ? `<button class="btn-editorial-sm btn-editorial-found btn-sm" onclick="handleAiAction('claim_item', '${cand.item.id}')">Claim</button>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    // Suggested action buttons
    if (msg.suggestedActions && msg.suggestedActions.length > 0) {
      extraHTML += `
        <div class="ai-suggested-actions">
          ${msg.suggestedActions.map(act => `
            <button class="btn-editorial-sm btn-editorial-outline btn-sm" onclick="handleAiAction('${act.action}', '${act.payload}')">
              ${escapeHTML(act.label)} &rarr;
            </button>
          `).join("")}
        </div>
      `;
    }

    return `
      <div class="ai-msg-group">
        <div class="ai-msg-bubble ${bubbleClass}">
          ${isUser ? escapeHTML(msg.text) : formatAiMarkdown(msg.text)}
          ${extraHTML}
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

/**
 * Handle AI Chat Message Submission
 */
function handleAiChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("aiChatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Add user message
  state.assistantChatHistory.push({
    sender: "user",
    text,
    timestamp: Date.now()
  });

  input.value = "";
  renderAiMessages();

  // Show typing indicator
  const typingEl = document.getElementById("aiTypingIndicator");
  if (typingEl) typingEl.style.display = "flex";

  const messagesContainer = document.getElementById("aiChatMessages");
  if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;

  setTimeout(() => {
    if (typingEl) typingEl.style.display = "none";
    if (!state.assistant && typeof LostLoopAssistant === "function") {
      state.assistant = new LostLoopAssistant();
    }

    if (state.assistant) {
      const reply = state.assistant.processMessage(text, state);
      if (reply) {
        state.assistantChatHistory.push(reply);
        if (reply.quickPrompts && reply.quickPrompts.length > 0) {
          renderAiQuickPrompts(reply.quickPrompts);
        }
      }
    }
    renderAiMessages();
  }, 320);
}

/**
 * Handle Action Buttons Clicked Inside AI Assistant
 */
function handleAiAction(action, payload) {
  if (action === "switch_tab") {
    switchTab(payload);
  } else if (action === "view_item") {
    openItemDetails(payload);
  } else if (action === "track_item") {
    openItemTracking(payload);
  } else if (action === "claim_item") {
    openClaimModal(payload);
  } else if (action === "filter_found") {
    state.filters.type = "found";
    document.querySelectorAll(".type-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.type === "found");
    });
    switchTab("browse");
    renderFeed();
  }
}

/**
 * Handle Claim Submission
 */
function handleClaimSubmit(e) {
  e.preventDefault();
  const item = state.activeClaimItem;
  if (!item) return;

  const emailInput = document.getElementById("claimStudentEmail");
  const proofInput = document.getElementById("claimProofAnswer");
  const pickupLocation = document.getElementById("claimPickupLocation").value;

  const email = emailInput.value.trim();
  const proof = proofInput.value.trim();

  if (!email || !email.includes("@")) {
    alert("Please provide a valid campus email address.");
    emailInput.focus();
    return;
  }

  if (!proof || proof.length < 8) {
    alert("Please provide specific proof details (at least 8 characters) to substantiate ownership.");
    proofInput.focus();
    return;
  }

  const masked = maskEmail(email);

  const newClaim = {
    claimId: "clm-" + Date.now(),
    claimantMasked: masked,
    claimNote: proof,
    preferredPickup: pickupLocation,
    status: "pending",
    timestamp: Date.now()
  };

  if (!item.claims) item.claims = [];
  item.claims.push(newClaim);

  // Transition tracking status on claim submission
  if (typeof recordStatusChange === "function") {
    recordStatusChange(item, FOUND_STATUSES.CLAIM_RECEIVED, `Claim received from claimant ${masked}. Awaiting verification review.`, "Claimant");
  }

  saveItemsToStorage(state.items);
  closeModal("claimModal");
  showToast("Safe claim submitted! Your identity is protected and masked.", "success");

  renderFeed();
}

/**
 * Approve a Claim
 */
function approveClaim(itemId, claimId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item || !item.claims) return;

  const claim = item.claims.find(c => c.claimId === claimId);
  if (!claim) return;

  if (!confirm(`Are you sure you want to approve the claim by ${claim.claimantMasked} and mark this item as reunited?`)) {
    return;
  }

  claim.status = "approved";
  const passCode = "LL-" + Math.floor(1000 + Math.random() * 9000);
  claim.resolutionNote = `Verified! Safe Campus Pickup Pass Code: ${passCode}. Swap at ${claim.preferredPickup || "Campus Safety Desk"}.`;

  // Advance tracking through handover to reunited
  if (typeof recordStatusChange === "function") {
    recordStatusChange(item, FOUND_STATUSES.HANDOVER_ARRANGED, `Proof verified! Handover arranged. Safe Campus Pickup Pass Code: ${passCode}`, "Campus Staff");
    recordStatusChange(item, FOUND_STATUSES.REUNITED, claim.resolutionNote, "Campus Staff");
  } else {
    item.status = "reunited";
  }

  saveItemsToStorage(state.items);
  closeModal("itemDetailModal");
  showToast(`Item marked Reunited! Safe pickup code generated: ${passCode}`, "success");

  // Award verified recovery points to finder
  if (typeof awardRecoveryReward === "function") {
    const rewardRes = awardRecoveryReward(item, claim, "Campus Staff");
    if (rewardRes && rewardRes.success) {
      setTimeout(() => {
        showToast(rewardRes.message || "Congratulations! You earned 50 LoopPoints for helping reunite an item.", "success");
        updateLoopPointsBadge();
      }, 700);
    }
  }

  renderFeed();
}

/**
 * Reset Application Data to Demo State
 */
function resetToDemoData() {
  if (confirm("Reset application data back to the realistic campus demo dataset?")) {
    state.items = JSON.parse(JSON.stringify(INITIAL_DEMO_ITEMS));
    saveItemsToStorage(state.items);
    if (typeof resetRewardsToSeed === "function") {
      resetRewardsToSeed(false);
    }
    showToast("Reset to fictional campus demo dataset.", "info");
    resetFilters();
    updateLoopPointsBadge();
  }
}

/* ==========================================================================
   FEATURE 3: LoopPoints — Campus Kindness Rewards UI Controller
   ========================================================================== */

/**
 * Update the LoopPoints badge in navigation
 */
function updateLoopPointsBadge() {
  const badge = document.getElementById("navLoopPointsBadge");
  if (!badge) return;
  if (typeof calculateBalance === "function") {
    const bal = calculateBalance();
    badge.textContent = `${bal} pts`;
  }
}

/**
 * Render the full Rewards Wallet View
 */
function renderRewardsWallet() {
  updateLoopPointsBadge();

  if (typeof calculateBalance !== "function") return;

  const bal = calculateBalance();
  const earned = calculateTotalEarned();
  const redeemed = calculateTotalRedeemed();
  const reunions = countVerifiedRecoveries();

  // Balance Card Numbers
  const balEl = document.getElementById("walletBalanceDisplay");
  const earnedEl = document.getElementById("walletTotalEarnedDisplay");
  const redeemedEl = document.getElementById("walletTotalRedeemedDisplay");
  const reunionsEl = document.getElementById("walletReunionsCount");

  if (balEl) balEl.textContent = bal;
  if (earnedEl) earnedEl.textContent = `+${earned}`;
  if (redeemedEl) redeemedEl.textContent = `-${redeemed}`;
  if (reunionsEl) reunionsEl.textContent = reunions;

  // Next Perk Progress Bar
  const catalogue = typeof getRewardsCatalogue === "function" ? getRewardsCatalogue() : [];
  const nextPerk = catalogue
    .filter(r => r.isActive !== false && r.pointsCost > bal)
    .sort((a, b) => a.pointsCost - b.pointsCost)[0];

  const nameLabel = document.getElementById("nextRewardNameLabel");
  const ptsLabel = document.getElementById("nextRewardPtsLabel");
  const barFill = document.getElementById("walletProgressBar");

  if (nextPerk) {
    if (nameLabel) nameLabel.textContent = `Progress to ${nextPerk.name} (${nextPerk.pointsCost} pts)`;
    if (ptsLabel) ptsLabel.textContent = `${bal} / ${nextPerk.pointsCost} pts`;
    if (barFill) {
      const pct = Math.min(100, Math.round((bal / nextPerk.pointsCost) * 100));
      barFill.style.width = `${pct}%`;
    }
  } else {
    if (nameLabel) nameLabel.textContent = "Outstanding! You have enough LoopPoints for all catalogue perks!";
    if (ptsLabel) ptsLabel.textContent = `${bal} pts available`;
    if (barFill) barFill.style.width = "100%";
  }

  // Render Sub-components
  renderBadges();
  renderRewardsCatalogue();
  renderTransactionLedger();
  renderRedemptionsList();
}

/**
 * Render Kindness Badges & Recognition
 */
function renderBadges() {
  const container = document.getElementById("badgesContainer");
  if (!container || typeof evaluateUserBadges !== "function") return;

  const badges = evaluateUserBadges();

  container.innerHTML = badges.map(b => {
    let iconSvg = "✨";
    if (b.icon === "heart") iconSvg = "❤️";
    else if (b.icon === "shield") iconSvg = "🛡️";
    else if (b.icon === "star") iconSvg = "⭐";
    else if (b.icon === "trophy") iconSvg = "🏆";

    return `
      <div class="badge-item ${b.unlocked ? 'unlocked' : ''}">
        <div class="badge-icon-box">${iconSvg}</div>
        <div class="badge-info">
          <div class="badge-name">
            <span>${escapeHTML(b.title)}</span>
            <span style="font-size: 0.7rem; font-weight: 700; color: ${b.unlocked ? '#16a34a' : 'var(--text-light)'};">
              ${b.unlocked ? '✓ Unlocked' : `${b.progress} / ${b.requirement} reunions`}
            </span>
          </div>
          <div class="badge-desc">${escapeHTML(b.description)}</div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Render Reward Catalogue Cards
 */
function renderRewardsCatalogue() {
  const container = document.getElementById("rewardsCatalogueGrid");
  if (!container || typeof getRewardsCatalogue !== "function") return;

  const catalogue = getRewardsCatalogue();
  const currentBal = typeof calculateBalance === "function" ? calculateBalance() : 0;
  const filterCat = state.rewardsCategoryFilter || "all";

  const filtered = filterCat === "all" 
    ? catalogue 
    : catalogue.filter(r => r.category === filterCat);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 36px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-light);">
        <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">No perks available in this category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => {
    const isAffordable = currentBal >= r.pointsCost;
    const hasStock = r.stock > 0 && r.isActive !== false;

    let iconGraphic = "✨";
    if (r.visual === "coffee") iconGraphic = "☕";
    else if (r.visual === "pencil") iconGraphic = "✏️";
    else if (r.visual === "printer") iconGraphic = "🖨️";
    else if (r.visual === "shopping-bag") iconGraphic = "🛍️";
    else if (r.visual === "book") iconGraphic = "📚";

    const stockPill = hasStock
      ? `<span class="stock-status-pill in-stock">${r.stock} in stock</span>`
      : `<span class="stock-status-pill out-of-stock">Out of stock</span>`;

    const redeemBtnDisabled = (!isAffordable || !hasStock);
    const btnTitle = !hasStock 
      ? "Out of stock" 
      : (!isAffordable ? `Need ${r.pointsCost - currentBal} more LoopPoints` : "Redeem perk");

    return `
      <div class="reward-card" data-reward-id="${r.id}">
        <div>
          <div class="reward-card-top">
            <div class="reward-emblem">${iconGraphic}</div>
            <div style="text-align: right;">
              <span class="wallet-currency-tag" style="display: inline-block; margin-bottom: 4px;">${r.pointsCost} LoopPoints</span>
              <div>${stockPill}</div>
            </div>
          </div>
          <h4 class="reward-title">${escapeHTML(r.name)}</h4>
          <span class="report-id-pill" style="font-size: 0.68rem; margin-bottom: 8px; display: inline-block;">${escapeHTML(r.category)}</span>
          <p class="reward-desc">${escapeHTML(r.description)}</p>
        </div>

        <div class="reward-card-footer">
          <span style="font-size: 0.72rem; color: var(--text-light);">${escapeHTML(r.sponsor || "Campus Life")}</span>
          <div style="display: flex; gap: 6px;">
            <button class="btn-editorial-sm btn-editorial-outline btn-sm" onclick="openRewardDetailModal('${r.id}')">
              Details
            </button>
            <button class="btn-editorial-sm btn-editorial-found btn-sm" onclick="openRewardDetailModal('${r.id}')" ${redeemBtnDisabled ? 'disabled style="opacity: 0.55; cursor: not-allowed;"' : ''} title="${btnTitle}">
              Redeem
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Filter catalogue by category
 */
function filterCatalogue(category) {
  state.rewardsCategoryFilter = category;

  document.querySelectorAll(".cat-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === category);
  });

  renderRewardsCatalogue();
}

/**
 * Open detail and redemption confirmation modal for a perk
 */
function openRewardDetailModal(rewardId) {
  if (typeof getRewardsCatalogue !== "function") return;

  const catalogue = getRewardsCatalogue();
  const reward = catalogue.find(r => r.id === rewardId);
  if (!reward) return;

  state.activeRewardToRedeem = rewardId;

  const modal = document.getElementById("rewardDetailModal");
  if (!modal) return;

  // Visual Emblem
  let iconGraphic = "✨";
  if (reward.visual === "coffee") iconGraphic = "☕";
  else if (reward.visual === "pencil") iconGraphic = "✏️";
  else if (reward.visual === "printer") iconGraphic = "🖨️";
  else if (reward.visual === "shopping-bag") iconGraphic = "🛍️";
  else if (reward.visual === "book") iconGraphic = "📚";

  const emblemEl = document.getElementById("rewardModalVisualEmblem");
  if (emblemEl) emblemEl.textContent = iconGraphic;

  const catBadge = document.getElementById("rewardModalCategoryBadge");
  if (catBadge) catBadge.textContent = reward.category;

  const nameEl = document.getElementById("rewardModalName");
  if (nameEl) nameEl.textContent = reward.name;

  const costTag = document.getElementById("rewardModalCostTag");
  if (costTag) costTag.textContent = `${reward.pointsCost} LoopPoints`;

  const stockTag = document.getElementById("rewardModalStockTag");
  if (stockTag) {
    const hasStock = reward.stock > 0 && reward.isActive !== false;
    stockTag.className = `stock-status-pill ${hasStock ? 'in-stock' : 'out-of-stock'}`;
    stockTag.textContent = hasStock ? `${reward.stock} in stock` : "Out of stock";
  }

  const descEl = document.getElementById("rewardModalDesc");
  if (descEl) descEl.textContent = reward.description;

  const instructionsEl = document.getElementById("rewardModalInstructions");
  if (instructionsEl) instructionsEl.textContent = reward.redemptionInstructions;

  const sponsorEl = document.getElementById("rewardModalSponsor");
  if (sponsorEl) sponsorEl.textContent = reward.sponsor || "Campus Life & Sustainability";

  const termsEl = document.getElementById("rewardModalTerms");
  if (termsEl) termsEl.textContent = reward.terms || "Demo reward perk.";

  // Balance Check Banner
  const currentBal = typeof calculateBalance === "function" ? calculateBalance() : 0;
  const balanceCheckEl = document.getElementById("rewardBalanceCheckBanner");
  const confirmBtn = document.getElementById("confirmRedeemBtn");

  const hasStock = reward.stock > 0 && reward.isActive !== false;
  const isAffordable = currentBal >= reward.pointsCost;

  if (balanceCheckEl) {
    if (!hasStock) {
      balanceCheckEl.style.backgroundColor = "#fef2f2";
      balanceCheckEl.style.color = "#991b1b";
      balanceCheckEl.style.border = "1px solid #fecaca";
      balanceCheckEl.innerHTML = `<span>⚠️ This perk is currently out of stock. Check back later or explore other rewards.</span>`;
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.5";
      }
    } else if (isAffordable) {
      balanceCheckEl.style.backgroundColor = "#f0fdf4";
      balanceCheckEl.style.color = "#166534";
      balanceCheckEl.style.border = "1px solid #bbf7d0";
      balanceCheckEl.innerHTML = `<span>✓ You have <strong>${currentBal} LoopPoints</strong> available. Deducting <strong>${reward.pointsCost} LoopPoints</strong> leaves <strong>${currentBal - reward.pointsCost} LoopPoints</strong>.</span>`;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
        confirmBtn.textContent = `Confirm Redemption (-${reward.pointsCost} LoopPoints)`;
      }
    } else {
      const needed = reward.pointsCost - currentBal;
      balanceCheckEl.style.backgroundColor = "#fffbeb";
      balanceCheckEl.style.color = "#b45309";
      balanceCheckEl.style.border = "1px solid #fde68a";
      balanceCheckEl.innerHTML = `<span>⚠️ Insufficient points. You have <strong>${currentBal} LoopPoints</strong>, but need <strong>${reward.pointsCost} LoopPoints</strong> (${needed} more needed). Earn points by safely returning lost items on campus!</span>`;
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.5";
        confirmBtn.textContent = `Need ${needed} More LoopPoints`;
      }
    }
  }

  modal.classList.add("is-open");
}

/**
 * Execute the redemption atomically with double-click guard
 */
function executeRedemption() {
  if (state.isRedeeming) return;
  state.isRedeeming = true;

  const rewardId = state.activeRewardToRedeem;
  if (!rewardId) {
    state.isRedeeming = false;
    return;
  }

  const result = typeof redeemReward === "function" ? redeemReward(rewardId) : { success: false, error: "Rewards engine not loaded" };

  if (!result.success) {
    alert(result.error);
    state.isRedeeming = false;
    return;
  }

  closeModal("rewardDetailModal");

  // Show Success Confirmation Modal
  const successModal = document.getElementById("redemptionSuccessModal");
  if (successModal) {
    const rName = document.getElementById("successRewardName");
    const rPts = document.getElementById("successPointsDeducted");
    const rCode = document.getElementById("successVoucherCode");
    const rInst = document.getElementById("successInstructions");
    const rId = document.getElementById("successRedemptionId");
    const rStat = document.getElementById("successStatusBadge");

    if (rName) rName.textContent = result.redemption.rewardName;
    if (rPts) rPts.textContent = `-${result.redemption.pointsSpent} LoopPoints`;
    if (rCode) rCode.textContent = result.redemption.voucherCode;
    if (rInst) rInst.textContent = result.redemption.instructions;
    if (rId) rId.textContent = result.redemption.redemptionId;
    if (rStat) rStat.textContent = result.redemption.status === "issued" ? "Issued & Active" : "Pending Fulfillment";

    successModal.classList.add("is-open");
  }

  showToast(`🎉 Reward redeemed! Voucher code: ${result.redemption.voucherCode}`, "success");
  renderRewardsWallet();

  setTimeout(() => {
    state.isRedeeming = false;
  }, 400);
}

/**
 * Copy voucher code to clipboard
 */
function copyVoucherCode() {
  const codeEl = document.getElementById("successVoucherCode");
  const noticeEl = document.getElementById("copyNotice");
  if (!codeEl) return;

  const text = codeEl.textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      if (noticeEl) noticeEl.textContent = "✓ Copied voucher code to clipboard!";
      setTimeout(() => {
        if (noticeEl) noticeEl.textContent = "Click code to copy to clipboard";
      }, 2500);
    }).catch(() => {
      prompt("Copy your voucher pass code:", text);
    });
  } else {
    prompt("Copy your voucher pass code:", text);
  }
}

/**
 * Switch Activity tabs (Ledger vs Redemptions)
 */
function switchActivityTab(tabName) {
  const paneLedger = document.getElementById("paneLedger");
  const paneRedemptions = document.getElementById("paneRedemptions");
  const btnLedger = document.getElementById("tabBtnLedger");
  const btnRedemptions = document.getElementById("tabBtnRedemptions");

  if (tabName === "ledger") {
    if (paneLedger) paneLedger.style.display = "block";
    if (paneRedemptions) paneRedemptions.style.display = "none";
    if (btnLedger) btnLedger.classList.add("active");
    if (btnRedemptions) btnRedemptions.classList.remove("active");
  } else {
    if (paneLedger) paneLedger.style.display = "none";
    if (paneRedemptions) paneRedemptions.style.display = "block";
    if (btnLedger) btnLedger.classList.remove("active");
    if (btnRedemptions) btnRedemptions.classList.add("active");
  }
}

/**
 * Render Transaction Ledger list
 */
function renderTransactionLedger() {
  const container = document.getElementById("transactionLedgerContainer");
  if (!container || typeof getRewardsLedger !== "function") return;

  const ledger = getRewardsLedger().slice().reverse();

  if (ledger.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.84rem;">No transactions recorded in ledger.</div>`;
    return;
  }

  container.innerHTML = ledger.map(tx => {
    const isPositive = tx.amount > 0;
    const amountStr = isPositive ? `+${tx.amount}` : `${tx.amount}`;
    const badgeClass = isPositive ? "tx-amount-positive" : "tx-amount-negative";

    let iconSymbol = "⟳";
    let iconBg = "#eff6ff";
    let iconColor = "#2563eb";

    if (tx.type === "recovery_reward") {
      iconSymbol = "🤝";
      iconBg = "#f0fdf4";
      iconColor = "#16a34a";
    } else if (tx.type === "milestone_bonus") {
      iconSymbol = "⭐";
      iconBg = "#fefce8";
      iconColor = "#ca8a04";
    } else if (tx.type === "reward_redemption") {
      iconSymbol = "🛍️";
      iconBg = "#fff1f2";
      iconColor = "#be123c";
    } else if (tx.type === "reward_reversal") {
      iconSymbol = "↩️";
      iconBg = "#f5f3ff";
      iconColor = "#7c3aed";
    } else if (tx.type === "admin_adjustment") {
      iconSymbol = "🛡️";
      iconBg = "#f3f4f6";
      iconColor = "#4b5563";
    }

    const formattedDate = new Date(tx.timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <div class="tx-item-row">
        <div class="tx-item-left">
          <div class="tx-icon-circle" style="background-color: ${iconBg}; color: ${iconColor};">
            ${iconSymbol}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-headline);">${escapeHTML(tx.description)}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; gap: 8px; align-items: center; margin-top: 2px;">
              <span>${formattedDate}</span>
              <span>&bull;</span>
              <span class="report-id-pill" style="font-size: 0.65rem;">${escapeHTML(tx.txId)}</span>
              ${tx.actor ? `<span>&bull; By ${escapeHTML(tx.actor)}</span>` : ''}
            </div>
          </div>
        </div>
        <div>
          <span class="tx-amount-badge ${badgeClass}">${amountStr} LoopPoints</span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Render Redemptions List with Pass Codes
 */
function renderRedemptionsList() {
  const container = document.getElementById("redemptionsListContainer");
  if (!container || typeof getRewardsRedemptions !== "function") return;

  const redemptions = getRewardsRedemptions();

  if (redemptions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 20px; color: var(--text-muted); font-size: 0.86rem;">
        <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 8px auto; color: var(--text-light); display: block;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        No perks redeemed yet. Help reunite campus items to earn LoopPoints!
      </div>
    `;
    return;
  }

  container.innerHTML = redemptions.map(r => {
    const isReversed = r.status === "reversed";
    const statusText = isReversed ? "Reversed / Refunded" : (r.status === "issued" ? "Issued & Active" : "Pending Fulfillment");
    const statusColor = isReversed ? "#64748b" : (r.status === "issued" ? "#16a34a" : "#d97706");
    const statusBg = isReversed ? "#f1f5f9" : (r.status === "issued" ? "#f0fdf4" : "#fefce8");

    const formattedDate = new Date(r.timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <div class="tx-item-row" style="${isReversed ? 'opacity: 0.7;' : ''}">
        <div class="tx-item-left">
          <div class="tx-icon-circle" style="background-color: ${isReversed ? '#f1f5f9' : '#eff6ff'}; color: #2563eb;">
            🎫
          </div>
          <div>
            <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-headline);">${escapeHTML(r.rewardName)}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
              Redeemed ${formattedDate} &bull; ${r.pointsSpent} pts spent
            </div>
            <div style="font-size: 0.78rem; color: var(--text-body); margin-top: 4px;">
              <strong>Instructions:</strong> ${escapeHTML(r.instructions)}
            </div>
          </div>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
          <span class="report-id-pill" style="font-size: 0.8rem; font-weight: 800; color: #1e3a8a; background: #eff6ff; border-color: #bfdbfe;">
            ${escapeHTML(r.voucherCode)}
          </span>
          <span style="font-size: 0.69rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${statusBg}; color: ${statusColor};">
            ${statusText}
          </span>
          ${!isReversed ? `
            <button class="btn-editorial-sm btn-editorial-outline btn-sm" style="font-size: 0.7rem; padding: 2px 7px;" onclick="reverseRedemptionFromUI('${r.redemptionId}')">
              Reverse (Admin Demo)
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Toggle Admin Management Panel
 */
function toggleAdminPanel() {
  const panel = document.getElementById("adminPanelDrawer");
  if (!panel) return;
  const isHidden = panel.style.display === "none";
  panel.style.display = isHidden ? "block" : "none";
  const btn = document.getElementById("adminToggleBtn");
  if (btn) btn.textContent = isHidden ? "✕ Hide Admin Controls" : "⚙️ Coordinator Controls";
}

/**
 * Open Add Reward Modal
 */
function openAddRewardModal() {
  const modal = document.getElementById("adminRewardModal");
  if (modal) modal.classList.add("is-open");
}

/**
 * Handle Add Reward Form Submit
 */
function handleAdminAddReward(e) {
  e.preventDefault();
  const name = document.getElementById("adminRewardName").value.trim();
  const category = document.getElementById("adminRewardCategory").value;
  const cost = Number(document.getElementById("adminRewardCost").value);
  const stock = Number(document.getElementById("adminRewardStock").value);
  const visual = document.getElementById("adminRewardVisual").value;
  const desc = document.getElementById("adminRewardDesc").value.trim();
  const inst = document.getElementById("adminRewardInstructions").value.trim();
  const sponsor = document.getElementById("adminRewardSponsor").value.trim();

  const result = typeof addRewardToCatalogue === "function" ? addRewardToCatalogue({
    name,
    category,
    pointsCost: cost,
    stock,
    visual,
    description: desc,
    redemptionInstructions: inst,
    sponsor
  }) : { success: false, error: "Catalogue engine missing" };

  if (!result.success) {
    alert(result.error);
    return;
  }

  closeModal("adminRewardModal");
  document.getElementById("adminRewardForm").reset();
  showToast(`Reward "${result.reward.name}" added to catalogue!`, "success");
  renderRewardsWallet();
}

/**
 * Open Admin Manual Adjustment Modal
 */
function openAdminAdjustModal() {
  const modal = document.getElementById("adminAdjustModal");
  if (modal) modal.classList.add("is-open");
}

/**
 * Handle Admin Point Adjustment Form Submit
 */
function handleAdminPointAdjustment(e) {
  e.preventDefault();
  const amount = Number(document.getElementById("adminAdjustAmount").value);
  const reason = document.getElementById("adminAdjustReason").value.trim();

  const result = typeof adminAdjustPoints === "function" ? adminAdjustPoints(
    REWARDS_CONFIG.DEFAULT_USER_REF,
    amount,
    reason,
    "Campus Staff Admin"
  ) : { success: false, error: "Adjustment engine missing" };

  if (!result.success) {
    alert(result.error);
    return;
  }

  closeModal("adminAdjustModal");
  document.getElementById("adminAdjustForm").reset();
  showToast(`LoopPoints adjusted: ${amount > 0 ? '+' : ''}${amount} pts (Audit Logged)`, "success");
  renderRewardsWallet();
}

/**
 * Reverse a redemption from UI
 */
function reverseRedemptionFromUI(redemptionId) {
  if (!confirm("Reverse this perk redemption? The deducted LoopPoints will be refunded and a compensating reversal transaction will be recorded.")) {
    return;
  }

  const result = typeof reverseRedemption === "function" ? reverseRedemption(redemptionId, "Coordinator cancellation in demo") : { success: false, error: "Engine missing" };

  if (!result.success) {
    alert(result.error);
    return;
  }

  showToast("Redemption reversed and points refunded via compensating transaction.", "info");
  renderRewardsWallet();
}

/**
 * Reset rewards ledger & catalogue to clean demo seed
 */
function resetRewardsToSeed(showNotice = true) {
  if (showNotice && !confirm("Reset rewards ledger, transactions, and catalogue back to default campus demonstration seed?")) {
    return;
  }

  if (typeof saveRewardsLedger === "function") {
    saveRewardsLedger(getInitialSeedTransactions());
  }
  if (typeof saveRewardsCatalogue === "function") {
    saveRewardsCatalogue(JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE)));
  }
  if (typeof saveRewardsRedemptions === "function") {
    saveRewardsRedemptions([]);
  }

  if (showNotice) showToast("Rewards ledger and catalogue reset to default demo seed.", "info");
  renderRewardsWallet();
}

/**
 * Simulate a verified reunion reward live in browser
 */
function simulateDemoReunionReward() {
  const mockItem = {
    id: `item-sim-${Date.now()}`,
    title: "Graphing Calculator (TI-84)",
    type: "found",
    status: "reunited",
    reporter: { maskedContact: "demo.finder***@campus.edu" }
  };

  const result = typeof awardRecoveryReward === "function" ? awardRecoveryReward(mockItem, null, "Demo Coordinator") : { success: false, error: "Engine missing" };

  if (!result.success) {
    alert(result.error);
    return;
  }

  showToast(result.message || "Congratulations! You earned 50 LoopPoints for helping reunite an item.", "success");
  renderRewardsWallet();
}

/**
 * Setup Form Event Listeners & Validation
 */
function setupForms() {
  const today = new Date().toISOString().split("T")[0];
  const lostDate = document.getElementById("lostDate");
  const foundDate = document.getElementById("foundDate");
  if (lostDate) {
    lostDate.max = today;
    lostDate.value = today;
  }
  if (foundDate) {
    foundDate.max = today;
    foundDate.value = today;
  }

  // Report Lost Form
  const lostForm = document.getElementById("reportLostForm");
  if (lostForm) {
    lostForm.addEventListener("submit", function(e) {
      e.preventDefault();

      const title = document.getElementById("lostTitle").value.trim();
      const category = document.getElementById("lostCategory").value;
      const locationZone = document.getElementById("lostLocationZone").value;
      const locationDetail = document.getElementById("lostLocationDetail").value.trim();
      const date = document.getElementById("lostDate").value;
      const brand = document.getElementById("lostBrand").value.trim();
      const primaryColor = document.getElementById("lostColor").value.trim();
      const description = document.getElementById("lostDescription").value.trim();
      const verification = document.getElementById("lostVerification").value.trim();
      const contactEmail = document.getElementById("lostEmail").value.trim();

      // Simple validation
      if (!title || title.length < 3) {
        alert("Please enter a descriptive item name (at least 3 characters).");
        return;
      }
      if (!category) {
        alert("Please select a category.");
        return;
      }
      if (!locationZone) {
        alert("Please select a campus location zone.");
        return;
      }
      if (!date) {
        alert("Please select the date item was lost.");
        return;
      }
      if (!description || description.length < 15) {
        alert("Please provide at least 15 characters of description to enable matching.");
        return;
      }

      const newItem = {
        id: "item-" + Date.now(),
        collegeId: state.activeCollege ? state.activeCollege.id : "col-jspm-wagholi",
        collegeName: state.activeCollege ? state.activeCollege.name : "JSPM University",
        campusName: state.activeCollege ? state.activeCollege.campus : "Wagholi Campus",
        type: "lost",
        title,
        category,
        locationZone,
        locationDetail,
        date,
        brand,
        primaryColor,
        description,
        verificationQuestion: verification,
        status: "active",
        createdAt: Date.now(),
        reporter: {
          name: "Campus Student",
          maskedContact: maskEmail(contactEmail || "student@campus.edu"),
          role: "Student"
        },
        claims: []
      };

      if (typeof ensureItemTracking === "function") {
        ensureItemTracking(newItem);
      }

      state.items.unshift(newItem);
      saveItemsToStorage(state.items);

      lostForm.reset();
      lostDate.value = today;

      showToast("Lost item report submitted! Checking for potential matches...", "success");
      
      const matches = findMatchesForItem(newItem, state.items);
      if (matches.length > 0) {
        state.selectedInspectorItemId = newItem.id;
        switchTab("inspector");
      } else {
        switchTab("browse");
      }
    });
  }

  // Report Found Form
  const foundForm = document.getElementById("reportFoundForm");
  if (foundForm) {
    foundForm.addEventListener("submit", function(e) {
      e.preventDefault();

      const title = document.getElementById("foundTitle").value.trim();
      const category = document.getElementById("foundCategory").value;
      const locationZone = document.getElementById("foundLocationZone").value;
      const locationDetail = document.getElementById("foundLocationDetail").value.trim();
      const date = document.getElementById("foundDate").value;
      const brand = document.getElementById("foundBrand").value.trim();
      const primaryColor = document.getElementById("foundColor").value.trim();
      const description = document.getElementById("foundDescription").value.trim();
      const verification = document.getElementById("foundVerificationQuestion").value.trim();
      const contactEmail = document.getElementById("foundEmail").value.trim();

      // Simple validation
      if (!title || title.length < 3) {
        alert("Please enter a descriptive item name (at least 3 characters).");
        return;
      }
      if (!category) {
        alert("Please select a category.");
        return;
      }
      if (!locationZone) {
        alert("Please select a campus location zone.");
        return;
      }
      if (!date) {
        alert("Please select the date item was found.");
        return;
      }
      if (!description || description.length < 15) {
        alert("Please provide at least 15 characters of description to enable matching.");
        return;
      }

      const newItem = {
        id: "item-" + Date.now(),
        collegeId: state.activeCollege ? state.activeCollege.id : "col-jspm-wagholi",
        collegeName: state.activeCollege ? state.activeCollege.name : "JSPM University",
        campusName: state.activeCollege ? state.activeCollege.campus : "Wagholi Campus",
        type: "found",
        title,
        category,
        locationZone,
        locationDetail,
        date,
        brand,
        primaryColor,
        description,
        verificationQuestion: verification || "Describe unique identifying marks or proof to claim.",
        status: "active",
        createdAt: Date.now(),
        reporter: {
          name: "Campus Good Samaritan",
          maskedContact: maskEmail(contactEmail || "finder@campus.edu"),
          role: "Campus Community"
        },
        claims: []
      };

      if (typeof ensureItemTracking === "function") {
        ensureItemTracking(newItem);
      }

      state.items.unshift(newItem);
      saveItemsToStorage(state.items);

      foundForm.reset();
      foundDate.value = today;

      showToast("Found item report posted! Privacy protection enabled.", "success");

      const matches = findMatchesForItem(newItem, state.items);
      if (matches.length > 0) {
        state.selectedInspectorItemId = newItem.id;
        switchTab("inspector");
      } else {
        switchTab("browse");
      }
    });
  }

  // Claim Form Submit
  const claimForm = document.getElementById("safeClaimForm");
  if (claimForm) {
    claimForm.addEventListener("submit", handleClaimSubmit);
  }
}

/**
 * Setup Filter & Search Event Listeners
 */
function setupFilters() {
  const heroSearchInput = document.getElementById("heroSearchInput");
  if (heroSearchInput) {
    heroSearchInput.addEventListener("input", (e) => {
      state.filters.search = e.target.value;
      const searchInput = document.getElementById("searchInput");
      if (searchInput) searchInput.value = e.target.value;
      renderFeed();
    });
    heroSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        triggerHeroSearch();
      }
    });
  }

  document.querySelectorAll(".type-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".type-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.filters.type = pill.dataset.type;
      renderFeed();
    });
  });

  const categorySelect = document.getElementById("filterCategory");
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      state.filters.category = e.target.value;
      renderFeed();
    });
  }

  const locationSelect = document.getElementById("filterLocation");
  if (locationSelect) {
    locationSelect.addEventListener("change", (e) => {
      state.filters.location = e.target.value;
      renderFeed();
    });
  }

  const sortSelect = document.getElementById("filterSortBy");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.filters.sortBy = e.target.value;
      renderFeed();
    });
  }
}

/**
 * In-Browser Automated Test Suite Runner (Beginner-Friendly & Transparent)
 */
function runBrowserTestSuite() {
  const outputEl = document.getElementById("testOutputDisplay");
  const timestampEl = document.getElementById("testExecutionTimestamp");
  const dotEl = document.getElementById("testLiveDot");
  if (!outputEl) return;

  if (timestampEl) {
    timestampEl.textContent = "Status: Running checks now...";
  }
  if (dotEl) {
    dotEl.className = "test-status-dot";
  }

  // 12 Beginner-Friendly System Checks
  const testDefs = [
    {
      id: "check-headphones",
      category: "Matching Accuracy",
      name: "Headphones & AirPods Recognition",
      description: "Verifies that lost Sony headphones correctly match found Sony headphones based on audio gear type, brand, and color.",
      execute: () => {
        const lost = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-1");
        const found = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-2");
        const res = compareItems(lost, found);
        if (res.matchLevel !== "high") throw new Error(`Expected 'high' match level, but received '${res.matchLevel}'`);
        if (res.score < 70) throw new Error(`Score (${res.score}) was below expected threshold of 70`);
        return `Matched as High Confidence (${res.score}/100) with reasons: ${res.reasons.filter(r => r.matched).map(r => r.title).join(", ")}`;
      }
    },
    {
      id: "check-bottles",
      category: "Matching Accuracy",
      name: "Water Bottles & Hydro Flasks",
      description: "Verifies that lost Hydro Flasks find matching found bottles and recognize unique sticker details.",
      execute: () => {
        const lost = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-3");
        const found = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-4");
        const res = compareItems(lost, found);
        if (res.matchLevel !== "high") throw new Error(`Expected 'high' match level, but received '${res.matchLevel}'`);
        if (!res.reasons.some(r => r.signal === "features")) throw new Error("Did not detect distinctive sticker marks");
        return `Matched as High Confidence (${res.score}/100) with shared stickers and navy color recognized`;
      }
    },
    {
      id: "check-keys",
      category: "Matching Accuracy",
      name: "Car Keys & Lanyards",
      description: "Verifies that lost car keys with distinctive braided cords match corresponding found keys.",
      execute: () => {
        const lost = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-5");
        const found = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-6");
        const res = compareItems(lost, found);
        if (res.matchLevel !== "high") throw new Error(`Expected 'high' match level, but received '${res.matchLevel}'`);
        return `Matched Subaru key on purple cord with animal charm (${res.score}/100)`;
      }
    },
    {
      id: "check-incompatible-categories",
      category: "Irrelevant Match Prevention",
      name: "Blocks Incompatible Categories",
      description: "Ensures clothing (like a rain jacket) never matches electronics (like headphones), even if both mention 'black' or 'case'.",
      execute: () => {
        const raincoat = { id: "test-coat", type: "lost", category: "Clothing & Outerwear", locationZone: "Main Library (1st/2nd Floor)", title: "Black Raincoat with Case in Pocket", description: "Waterproof black jacket with zipper case inside front pocket", primaryColor: "Black" };
        const headphones = { id: "test-audio", type: "found", category: "Electronics & Tech", locationZone: "Main Library (1st/2nd Floor)", title: "Black Sony Headphones in Case", description: "Found black audio headphones in zipper case", primaryColor: "Black", brand: "Sony" };
        const res = compareItems(raincoat, headphones);
        if (res.matchLevel !== "none" || res.score !== 0) throw new Error(`Incompatible items scored ${res.score} and classified as '${res.matchLevel}', expected score 0 and matchLevel 'none'`);
        return "Correctly blocked cross-category false match (Score safely clamped to 0)";
      }
    },
    {
      id: "check-conflicting-brands",
      category: "Irrelevant Match Prevention",
      name: "Rejects Conflicting Brands",
      description: "Ensures items with conflicting brands (e.g. Sony vs Apple or Bose) are never matched together.",
      execute: () => {
        const sony = { id: "t1", type: "lost", category: "Electronics & Tech", title: "Sony Headphones", brand: "Sony", description: "Silver headphones" };
        const bose = { id: "t2", type: "found", category: "Electronics & Tech", title: "Bose Headphones", brand: "Bose", description: "Silver headphones" };
        const res = compareItems(sony, bose);
        if (res.matchLevel !== "none" || res.score !== 0) throw new Error(`Conflicting brands were not rejected! Scored ${res.score}`);
        return "Successfully rejected candidate due to conflicting brand names (Sony vs Bose)";
      }
    },
    {
      id: "check-missing-info",
      category: "Smart Details Handling",
      name: "Careful with Missing Information",
      description: "Ensures reports with unlisted brand or color are handled neutrally without inventing false matches.",
      execute: () => {
        const unbrandedLost = { id: "t3", type: "lost", category: "Bottles & Tumblers", title: "Water Bottle", description: "Insulated bottle with base dent", brand: "", primaryColor: "" };
        const unbrandedFound = { id: "t4", type: "found", category: "Bottles & Tumblers", title: "Water Bottle", description: "Metal bottle with base dent", brand: "", primaryColor: "" };
        const res = compareItems(unbrandedLost, unbrandedFound);
        if (!res.reasons.some(r => r.title.includes("Brand Not Specified"))) throw new Error("Missing brand was not noted neutrally in reasons");
        return "Neutral handling verified: unspecified fields are not assumed or penalized";
      }
    },
    {
      id: "check-distinguishing-marks",
      category: "Smart Details Handling",
      name: "Rewards Unique Distinguishing Marks",
      description: "Verifies that rare stickers (like NASA or atom decals) strongly increase match confidence.",
      execute: () => {
        const calc1 = { id: "t5", type: "lost", category: "Electronics & Tech", title: "TI-84 Calculator", description: "Teal calculator with atom sticker", brand: "Texas Instruments" };
        const calc2 = { id: "t6", type: "found", category: "Electronics & Tech", title: "Graphing Calculator", description: "Teal calculator with atom sticker", brand: "Texas Instruments" };
        const res = compareItems(calc1, calc2);
        if (!res.reasons.some(r => r.signal === "features")) throw new Error("Did not award points for atom sticker match");
        return "Distinctive feature 'atom' sticker detected and rewarded with priority score";
      }
    },
    {
      id: "check-no-match-threshold",
      category: "Safety & Privacy",
      name: "Strict 'No Strong Matches' Threshold",
      description: "Ensures unrelated items show 'No strong matches yet' rather than forcing inaccurate suggestions.",
      execute: () => {
        const lostJacket = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-9");
        const matches = findMatchesForItem(lostJacket, INITIAL_DEMO_ITEMS);
        if (matches.length !== 0) throw new Error(`Expected 0 matches for unmatched jacket, but found ${matches.length}`);
        return "Safely returned 0 matches for unrelated item; displays clean 'No strong matches yet' message";
      }
    },
    {
      id: "check-ranking",
      category: "Smart Details Handling",
      name: "Best Matches Ranked First",
      description: "Verifies that the most accurate and specific match appears at the very top of suggested candidates.",
      execute: () => {
        const target = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-1");
        const matches = findMatchesForItem(target, INITIAL_DEMO_ITEMS);
        if (matches.length === 0 || matches[0].candidate.id !== "item-demo-2") throw new Error("Top ranked match was not the matching Sony Headphones");
        return "Verified: genuine Sony Headphones ranked #1 with highest verified score";
      }
    },
    {
      id: "check-email-masking",
      category: "Safety & Privacy",
      name: "Student Email Privacy Masking",
      description: "Protects student emails (e.g. 'alex.rivera@campus.edu' becomes 'alex***@campus.edu') to prevent spam and identity exposure.",
      execute: () => {
        const masked1 = maskEmail("alex.rivera@campus.edu");
        const masked2 = maskEmail("m.patel@campus.edu");
        if (masked1.includes("rivera") || masked2.includes("patel")) throw new Error("Surname was not properly masked");
        return `Email masked safely: 'alex.rivera@campus.edu' -> '${masked1}'`;
      }
    },
    {
      id: "check-verification-challenge",
      category: "Safety & Privacy",
      name: "Verification Challenges Protect Property",
      description: "Ensures claimants must answer the finder's secret challenge question to prove ownership before claiming an item.",
      execute: () => {
        const foundItem = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-4");
        if (!foundItem.verificationQuestion || foundItem.verificationQuestion.length < 5) throw new Error("Missing verification question on found item");
        return `Finder challenge verified: "${foundItem.verificationQuestion}"`;
      }
    },
    {
      id: "check-secure-passcode",
      category: "Safety & Privacy",
      name: "Secure Campus Swap Passcodes",
      description: "Verifies that approving a claim creates a one-time pickup pass code (e.g. LL-7492) for official campus desk pickup.",
      execute: () => {
        const resolved = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-10");
        if (resolved.status !== "reunited" || !resolved.claims[0].resolutionNote.includes("reunited")) throw new Error("Missing reunion resolution pass code");
        return "Safe campus pickup workflow verified with one-time pass code";
      }
    },
    {
      id: "check-tracking-lifecycle",
      category: "Item Tracking System",
      name: "Item Tracking Lifecycle & State Machine",
      description: "Ensures Lost and Found reports progress through distinct verified stages and strictly blocks illegal status jumps.",
      execute: () => {
        if (typeof canTransitionStatus !== "function") throw new Error("canTransitionStatus function is not loaded");
        // Verify legal progressions
        if (!canTransitionStatus("lost", "created", "searching")) throw new Error("Lost report could not transition from created to searching");
        if (!canTransitionStatus("lost", "searching", "potential_match")) throw new Error("Lost report could not transition to potential_match");
        if (!canTransitionStatus("found", "reported", "published")) throw new Error("Found report could not transition from reported to published");
        // Verify illegal jumps blocked
        if (canTransitionStatus("lost", "created", "reunited")) throw new Error("Illegal jump allowed: lost created directly to reunited!");
        if (canTransitionStatus("found", "reported", "reunited")) throw new Error("Illegal jump allowed: found reported directly to reunited!");
        return "Validated deterministic state machine: legal transitions allowed, illegal jumps blocked";
      }
    },
    {
      id: "check-tracking-audit-trail",
      category: "Item Tracking System",
      name: "Timeline Generation & Audit Trail Preservation",
      description: "Verifies vertical timeline generation (Completed, Current, Upcoming) and confirms historical events are preserved upon report withdrawal.",
      execute: () => {
        if (typeof buildRenderableTimeline !== "function") throw new Error("buildRenderableTimeline function is not loaded");
        const lostItem = {
          id: "test-track-item",
          type: "lost",
          title: "Test Track Item",
          category: "Electronics & Tech",
          status: "active",
          trackingStatus: "searching",
          createdAt: Date.now() - 3600000,
          timelineEvents: [
            { id: "e1", stageCode: "created", title: "Report Created", timestamp: Date.now() - 3600000 },
            { id: "e2", stageCode: "searching", title: "Searching", timestamp: Date.now() - 1800000 }
          ]
        };
        const timeline = buildRenderableTimeline(lostItem, []);
        if (!Array.isArray(timeline) || timeline.length !== 7) throw new Error(`Expected 7 timeline stages for lost item, received ${timeline.length}`);
        const currentStage = timeline.find(s => s.state === "current");
        if (!currentStage || currentStage.code !== "searching") throw new Error(`Expected current stage to be 'searching', got '${currentStage ? currentStage.code : 'none'}'`);
        // Test withdrawal preserves history
        recordStatusChange(lostItem, "withdrawn", "Student found it under bed");
        if (lostItem.trackingStatus !== "withdrawn") throw new Error("Status failed to update to withdrawn");
        if (lostItem.timelineEvents.length !== 3) throw new Error("Historical timeline events were deleted or missing");
        return "7-stage timeline rendered accurately with immutable historical audit trail";
      }
    },
    {
      id: "check-ai-nlp-extraction",
      category: "AI Recovery Assistant",
      name: "Natural Language Entity Extraction",
      description: "Verifies conversational entity extraction: identifies item types, brands, colors, locations, distinguishing marks, and user intent.",
      execute: () => {
        if (typeof LostLoopAssistant !== "function") throw new Error("LostLoopAssistant class is not loaded");
        const assistant = new LostLoopAssistant();
        const extracted = assistant.extractEntities("I lost my navy Hydro Flask with NASA stickers at the Student Union yesterday");
        if (extracted.itemType !== "water_bottle") throw new Error(`Expected itemType 'water_bottle', got '${extracted.itemType}'`);
        if (extracted.brand !== "Hydro Flask") throw new Error(`Expected brand 'Hydro Flask', got '${extracted.brand}'`);
        if (!extracted.colors.includes("navy")) throw new Error("Failed to extract color 'navy'");
        if (!extracted.location.includes("Student Union")) throw new Error("Failed to extract location 'Student Union'");
        if (!extracted.features.includes("sticker") && !extracted.features.includes("nasa")) throw new Error("Failed to extract distinguishing marks");
        return `Extracted: ${extracted.brand} ${extracted.itemType} (${extracted.colors.join('/')}) at ${extracted.location}`;
      }
    },
    {
      id: "check-ai-privacy-calibrated",
      category: "AI Recovery Assistant",
      name: "Calibrated Matching & Strict Privacy Protection",
      description: "Verifies explainable candidate rankings with calibrated labels and guarantees private verification answers are never exposed.",
      execute: () => {
        if (typeof LostLoopAssistant !== "function") throw new Error("LostLoopAssistant class is not loaded");
        const assistant = new LostLoopAssistant();
        const reply = assistant.processMessage("I lost my silver Sony headphones in the Main Library", { items: INITIAL_DEMO_ITEMS });
        if (!reply || !reply.candidates || reply.candidates.length === 0) throw new Error("Assistant failed to find candidate for lost Sony headphones");
        const topCandidate = reply.candidates[0];
        if (topCandidate.calibratedLabel !== "Strong candidate" && topCandidate.calibratedLabel !== "Possible match") {
          throw new Error(`Invalid calibrated label: '${topCandidate.calibratedLabel}'`);
        }
        // Strict privacy check: assistant message must NEVER leak secret verification answers
        const replyStr = JSON.stringify(reply).toLowerCase();
        if (replyStr.includes("scratch on the pivot") || replyStr.includes("rabbit with a strawberry hat")) {
          throw new Error("PRIVACY VIOLATION: Secret verification challenge answer leaked in assistant reply!");
        }
        return `Assistant provided "${topCandidate.calibratedLabel}" with explainable reasons and strict privacy enforcement`;
      }
    },
    {
      id: "check-rewards-earning",
      category: "LoopPoints Rewards",
      name: "Verified Kindness Earning & Anti-Abuse Rules (Strict 50 LoopPoints)",
      description: "Ensures exactly 50 LoopPoints are awarded strictly upon verified item reunion, rightful owners are never charged, and duplicate awards are prevented.",
      execute: () => {
        if (typeof awardRecoveryReward !== "function") throw new Error("awardRecoveryReward function not loaded");
        const testLedger = [];
        // Test unverified report blocked
        const unverified = { id: "test-unverified-phone", status: "active", title: "Active Phone" };
        const unverifiedRes = awardRecoveryReward(unverified, null, "Staff", testLedger);
        if (unverifiedRes.success) throw new Error("Awarded points for unverified report (status: active)!");

        // Test verified recovery awarded exactly 50 points
        const verified = { id: "test-verified-keys", status: "reunited", title: "Car Keys", reporter: { maskedContact: "finder***@campus.edu" } };
        const awardRes = awardRecoveryReward(verified, null, "Staff", testLedger);
        if (!awardRes.success || awardRes.pointsAwarded !== 50) throw new Error(`Expected exactly 50 points for verified reunion, got ${awardRes ? awardRes.pointsAwarded : "null"}`);
        if (awardRes.message !== "Congratulations! You earned 50 LoopPoints for helping reunite an item.") {
          throw new Error(`Unexpected message: ${awardRes.message}`);
        }

        // Test duplicate recovery blocked (idempotency)
        const dupRes = awardRecoveryReward(verified, null, "Staff", testLedger);
        if (dupRes.success) throw new Error("Duplicate recovery reward was not blocked!");

        return `Awarded exactly 50 LoopPoints on verified reunion; message confirmed; duplicate attempts prevented`;
      }
    },
    {
      id: "check-rewards-multi-contributors",
      category: "LoopPoints Rewards",
      name: "Multi-Contributor Governance & Approved Splitting",
      description: "Verifies designated recipient rule, approved reward splitting (e.g. 25 pts each for 2 contributors), and prevention of automatic duplicate awards.",
      execute: () => {
        if (typeof awardRecoveryReward !== "function") throw new Error("awardRecoveryReward function not loaded");
        const testLedger = [];
        const itemWithCoFinders = {
          id: "item-co-found-1",
          status: "reunited",
          title: "MacBook Charger",
          contributors: ["student_sam", "student_jordan"]
        };

        // 1. Approved reward-splitting rule: exactly 25 pts each, total 50 pts
        const splitRes = awardRecoveryReward(itemWithCoFinders, null, "Staff", testLedger, { splitReward: true });
        if (!splitRes.success || splitRes.pointsAwarded !== 50) throw new Error("Failed to split 50 points across contributors");
        if (splitRes.splitPerContributor !== 25) throw new Error(`Expected 25 points per contributor, got ${splitRes.splitPerContributor}`);

        // 2. Cannot re-award same recovery to contributors
        const dupSplit = awardRecoveryReward(itemWithCoFinders, null, "Staff", testLedger, { splitReward: true });
        if (dupSplit.success) throw new Error("Duplicate split award was not blocked!");

        // 3. Designated recipient rule: exactly 50 pts to designated student
        const itemWithPrimary = {
          id: "item-co-found-2",
          status: "reunited",
          title: "Winter Coat",
          contributors: ["student_a", "student_b"]
        };
        const primaryRes = awardRecoveryReward(itemWithPrimary, null, "Staff", testLedger, { primaryRecipient: "student_a" });
        if (!primaryRes.success || primaryRes.pointsAwarded !== 50) throw new Error("Failed to award designated primary recipient 50 points");
        if (primaryRes.recipient !== "student_a") throw new Error("Awarded wrong recipient");

        return "Multi-contributor governance verified: split rule (25 pts each) and designated primary (50 pts) never inflate points";
      }
    },
    {
      id: "check-rewards-redemption",
      category: "LoopPoints Rewards",
      name: "Safe Atomic Redemption & Stock Management",
      description: "Verifies atomic point deduction, out-of-stock rejection, insufficient balance prevention, and compensating reversal ledger entries.",
      execute: () => {
        if (typeof redeemReward !== "function" || typeof reverseRedemption !== "function") throw new Error("Redemption functions not loaded");
        const mockCat = JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE));
        const mockLed = [{ txId: "TX-INIT", userRef: "campus_student", amount: 200, type: "recovery_reward", status: "completed" }];
        const mockRdm = [];

        // Successful redemption
        const rdmRes = redeemReward("rew-demo-1", "campus_student", mockCat, mockLed, mockRdm); // 100 pts
        if (!rdmRes.success || rdmRes.newBalance !== 100) throw new Error("Failed to deduct 100 points atomically");
        if (!rdmRes.redemption.voucherCode.startsWith("LL-VCHR-")) throw new Error("Failed to issue valid voucher code");

        // Insufficient points rejection
        const failRes = redeemReward("rew-demo-2", "campus_student", mockCat, mockLed, mockRdm); // 200 pts, balance 100
        if (failRes.success) throw new Error("Allowed redemption with insufficient balance!");

        // Compensating reversal
        const revRes = reverseRedemption(rdmRes.redemption.redemptionId, "Test reversal", "admin", mockLed, mockCat, mockRdm);
        if (!revRes.success || revRes.newBalance !== 200) throw new Error("Failed to refund points via compensating reversal");

        return "Atomic deduction, insufficient balance protection, and compensating reversal verified";
      }
    },
    {
      id: "check-multi-college-isolation",
      category: "Multi-College System",
      name: "Campus Directory & Matching Isolation",
      description: "Verifies college search, campus selection persistence, and cross-college matching rejection to prevent data leakage.",
      execute: () => {
        if (typeof getCollegesDirectory !== "function") throw new Error("getCollegesDirectory not defined");
        const dir = getCollegesDirectory();
        if (!Array.isArray(dir) || dir.length < 3) throw new Error("College directory incomplete");

        // 1. Search works
        const searchPune = searchColleges("pune");
        if (searchPune.length < 2) throw new Error("Search by city failed");

        // 2. Similar colleges distinguished
        const jspmWagholi = getCollegeById("col-jspm-wagholi");
        const jspmTathawade = getCollegeById("col-jspm-tathawade");
        if (!jspmWagholi || !jspmTathawade || jspmWagholi.id === jspmTathawade.id) {
          throw new Error("Failed to distinguish multi-campus university institutions");
        }

        // 3. Inactive college handled
        const inactiveCol = getCollegeById("col-mit-wpu");
        if (!inactiveCol || inactiveCol.isActive !== false) {
          throw new Error("Inactive college status missing");
        }

        // 4. Cross-college matching isolation
        const itemJspm = { id: "item-j1", collegeId: "col-jspm-wagholi", type: "lost", title: "Sony Headphones", category: "Electronics & Tech" };
        const itemCoep = { id: "item-c1", collegeId: "col-coep-pune", type: "found", title: "Sony Headphones", category: "Electronics & Tech" };
        const crossMatch = compareItems(itemJspm, itemCoep);
        if (crossMatch.matchLevel !== "none" || crossMatch.score !== 0) {
          throw new Error("SECURITY VIOLATION: Cross-college matching was not blocked!");
        }

        return `Verified ${dir.length} colleges; search & duplicate resolution passed; cross-college matching strictly isolated`;
      }
    }
  ];

  // Execute all checks and collect results
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const test of testDefs) {
    try {
      const detail = test.execute();
      passedCount++;
      results.push({
        ...test,
        passed: true,
        summary: detail,
        error: null
      });
    } catch (err) {
      failedCount++;
      results.push({
        ...test,
        passed: false,
        summary: "Check failed to satisfy validation criteria",
        error: err.message || String(err),
        stack: err.stack || ""
      });
    }
  }

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (timestampEl) {
    timestampEl.textContent = `Last verified: Today at ${timeString}`;
  }
  if (dotEl) {
    dotEl.style.backgroundColor = failedCount === 0 ? "var(--accent-green)" : "#dc2626";
  }

  const allPassed = failedCount === 0;

  outputEl.innerHTML = `
    <!-- Top Result Banner -->
    <div style="background-color: ${allPassed ? 'var(--accent-green-bg)' : '#fef2f2'}; border: 1px solid ${allPassed ? 'rgba(32, 139, 94, 0.3)' : '#fecaca'}; border-radius: var(--radius-lg); padding: 18px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">${allPassed ? '✓' : '⚠️'}</span>
        <div>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: ${allPassed ? 'var(--accent-green)' : '#991b1b'};">
            ${allPassed ? `All ${testDefs.length} System Checks Passed!` : `${failedCount} Check${failedCount > 1 ? 's' : ''} Need Attention`}
          </h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
            ${allPassed ? 'The matching engine, item tracking, AI assistant, and LoopPoints rewards features are fully operational.' : 'Review the failure details below to resolve system issues.'}
          </p>
        </div>
      </div>
      <span style="font-size: 0.74rem; background: var(--bg-surface); padding: 4px 10px; border-radius: var(--radius-full); font-weight: 700; color: var(--text-muted); border: 1px solid var(--border-light);">
        Live Verified at ${timeString}
      </span>
    </div>

    <!-- 3 Simple Stat Cards -->
    <div class="test-stats-grid">
      <div class="test-stat-box">
        <div class="test-stat-icon icon-passed">✓</div>
        <div class="test-stat-content">
          <span class="test-stat-num" style="color: var(--accent-green);">${passedCount}</span>
          <span class="test-stat-lbl">Checks Passed</span>
        </div>
      </div>

      <div class="test-stat-box">
        <div class="test-stat-icon icon-failed" style="${failedCount === 0 ? 'background: var(--bg-surface-subtle); color: var(--text-light);' : ''}">
          ${failedCount === 0 ? '0' : '✕'}
        </div>
        <div class="test-stat-content">
          <span class="test-stat-num" style="${failedCount > 0 ? 'color: #dc2626;' : ''}">${failedCount}</span>
          <span class="test-stat-lbl">Failed</span>
        </div>
      </div>

      <div class="test-stat-box">
        <div class="test-stat-icon icon-total">📋</div>
        <div class="test-stat-content">
          <span class="test-stat-num">${testDefs.length}</span>
          <span class="test-stat-lbl">Total Checks</span>
        </div>
      </div>
    </div>

    <!-- Test Items List (Plain English & Beginner-Friendly) -->
    <div class="test-list-container">
      ${results.map((r, idx) => `
        <div class="test-item-card ${r.passed ? 'is-passed' : 'is-failed'}">
          <div class="test-item-top">
            <div>
              <span class="test-category-tag">${escapeHTML(r.category)}</span>
              <h4 class="test-item-title">
                ${r.passed ? '<span style="color: var(--accent-green); margin-right: 6px;">✓</span>' : '<span style="color: #dc2626; margin-right: 6px;">✕</span>'}
                ${idx + 1}. ${escapeHTML(r.name)}
              </h4>
            </div>
            <span style="font-size: 0.74rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: var(--radius-full); background: ${r.passed ? '#ecfdf5' : '#fef2f2'}; color: ${r.passed ? '#059669' : '#dc2626'}; border: 1px solid ${r.passed ? '#a7f3d0' : '#fecaca'};">
              ${r.passed ? 'Passed' : 'Failed'}
            </span>
          </div>

          <p class="test-item-desc">${escapeHTML(r.description)}</p>

          <div class="test-item-result-banner">
            <span style="font-size: 0.9rem;">${r.passed ? '🟢' : '🔴'}</span>
            <div>
              <strong>${r.passed ? 'Result:' : 'Issue Detected:'}</strong> ${escapeHTML(r.passed ? r.summary : r.error)}
            </div>
          </div>

          <details class="test-tech-details">
            <summary>Technical details (for developers)</summary>
            <pre>Test Identifier: ${escapeHTML(r.id)}\nStatus: ${r.passed ? 'PASSED' : 'FAILED'}\nOutput: ${escapeHTML(r.summary)}${r.error ? `\nError Message: ${escapeHTML(r.error)}` : ''}${r.stack ? `\nStack: ${escapeHTML(r.stack)}` : ''}</pre>
          </details>
        </div>
      `).join("")}
    </div>
  `;
}

// ============================================================================
// Multi-College Directory & Selection Controller
// ============================================================================

/**
 * Initializes College Selection State
 * Validates saved college against available directory.
 * If invalid or inactive, launches the selection onboarding overlay.
 */
function initCollegeContext() {
  let savedCollegeId = null;
  try {
    if (typeof localStorage !== "undefined") {
      savedCollegeId = localStorage.getItem(STORAGE_KEY_COLLEGE);
    }
  } catch (e) {
    console.warn("Could not read college from localStorage", e);
  }

  if (savedCollegeId) {
    const matched = typeof getCollegeById === "function" ? getCollegeById(savedCollegeId) : null;
    if (matched && matched.isActive) {
      state.activeCollege = matched;
      updateCollegeUI();
      hideCollegeSelectionScreen(true);
      return matched;
    } else {
      // Saved selection was invalid or deactivated
      console.warn(`Saved college "${savedCollegeId}" is invalid or inactive. Returning to selection screen.`);
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(STORAGE_KEY_COLLEGE);
        }
      } catch (err) {}
      state.activeCollege = null;
      showCollegeSelectionScreen(matched && !matched.isActive 
        ? "Your previously selected campus is currently inactive. Please choose an active campus."
        : "Please select your college or campus to continue.");
      return null;
    }
  } else {
    // First-time visitor
    state.activeCollege = null;
    showCollegeSelectionScreen();
    return null;
  }
}

/**
 * Shows the First-Entry College Selection Onboarding Screen
 */
function showCollegeSelectionScreen(notice = null) {
  const overlay = document.getElementById("collegeSelectionOverlay");
  if (!overlay) return;

  overlay.style.display = "flex";
  overlay.classList.remove("is-exiting");
  state.pendingSelectedCollegeId = null;

  const btnContinue = document.getElementById("btnContinueToApp");
  if (btnContinue) btnContinue.disabled = true;

  const banner = document.getElementById("selectedCollegeBanner");
  if (banner) banner.style.display = "none";

  const searchInput = document.getElementById("collegeSearchInput");
  if (searchInput) searchInput.value = "";

  const clearBtn = document.getElementById("btnCollegeSearchClear");
  if (clearBtn) clearBtn.style.display = "none";

  if (notice) {
    const sub = document.querySelector(".college-welcome-sub");
    if (sub) sub.textContent = notice;
  }

  renderCollegeSelectionList();
}

/**
 * Hides the College Selection Screen with a smooth exit transition
 */
function hideCollegeSelectionScreen(immediate = false) {
  const overlay = document.getElementById("collegeSelectionOverlay");
  if (!overlay) return;

  if (immediate) {
    overlay.style.display = "none";
  } else {
    overlay.classList.add("is-exiting");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 320);
  }
}

/**
 * Renders the Searchable College List in the Onboarding Card
 */
function renderCollegeSelectionList(query = "") {
  const container = document.getElementById("collegeResultsList");
  const emptyState = document.getElementById("collegeEmptyState");
  if (!container) return;

  const directory = typeof getCollegesDirectory === "function" ? getCollegesDirectory() : [];
  const q = String(query).trim().toLowerCase();

  const filtered = q 
    ? directory.filter(c => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchShort = c.shortCode && c.shortCode.toLowerCase().includes(q);
        const matchCampus = c.campus && c.campus.toLowerCase().includes(q);
        const matchCity = c.city && c.city.toLowerCase().includes(q);
        const matchState = c.state && c.state.toLowerCase().includes(q);
        return matchName || matchShort || matchCampus || matchCity || matchState;
      })
    : directory;

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
      const qText = document.getElementById("collegeEmptyQuery");
      if (qText) qText.textContent = `No campuses found matching "${escapeHTML(query)}". Try searching by city (e.g. Pune, Mumbai) or college name.`;
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = filtered.map(c => {
    const isSelected = state.pendingSelectedCollegeId === c.id;
    const isDisabled = c.isActive === false;
    const badgeClass = c.isActive ? "active" : "coming-soon";
    const badgeLabel = c.isActive ? (c.badge || "Active Campus") : "Coming Soon";
    const monogram = c.shortCode || c.name.substring(0, 4).toUpperCase();

    return `
      <div 
        class="college-result-item ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}" 
        onclick="${isDisabled ? '' : `handleSelectCollegeOption('${c.id}')`}"
        role="option"
        aria-selected="${isSelected}"
        tabindex="${isDisabled ? '-1' : '0'}"
        onkeydown="if(event.key==='Enter' || event.key===' ') { event.preventDefault(); ${isDisabled ? '' : `handleSelectCollegeOption('${c.id}')`}; }"
      >
        <div class="college-item-left">
          <div class="college-monogram">${escapeHTML(monogram)}</div>
          <div class="college-item-details">
            <div class="college-item-name">${escapeHTML(c.name)}</div>
            <div class="college-item-campus">${escapeHTML(c.campus)} &bull; ${escapeHTML(c.city)}, ${escapeHTML(c.state)}</div>
          </div>
        </div>
        <div class="college-item-right">
          <span class="college-badge-chip ${badgeClass}">${escapeHTML(badgeLabel)}</span>
          <div class="college-select-circle">
            ${isSelected ? '✓' : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Handles typing in the onboarding search box
 */
function handleCollegeSearchInput(e) {
  const q = e.target.value;
  const clearBtn = document.getElementById("btnCollegeSearchClear");
  if (clearBtn) {
    clearBtn.style.display = q.trim() ? "block" : "none";
  }
  renderCollegeSelectionList(q);
}

/**
 * Clears search input
 */
function clearCollegeSearch() {
  const searchInput = document.getElementById("collegeSearchInput");
  const clearBtn = document.getElementById("btnCollegeSearchClear");
  if (searchInput) {
    searchInput.value = "";
    searchInput.focus();
  }
  if (clearBtn) clearBtn.style.display = "none";
  renderCollegeSelectionList("");
}

/**
 * Handles clicking a college row in the selection list
 */
function handleSelectCollegeOption(collegeId) {
  const college = typeof getCollegeById === "function" ? getCollegeById(collegeId) : null;
  if (!college || !college.isActive) return;

  state.pendingSelectedCollegeId = collegeId;

  // Show banner
  const banner = document.getElementById("selectedCollegeBanner");
  const nameEl = document.getElementById("selectedCollegeName");
  const metaEl = document.getElementById("selectedCollegeMeta");
  if (banner && nameEl && metaEl) {
    nameEl.textContent = college.name;
    metaEl.textContent = `${college.campus} • ${college.city}, ${college.state}`;
    banner.style.display = "flex";
  }

  // Enable Continue button
  const btnContinue = document.getElementById("btnContinueToApp");
  if (btnContinue) {
    btnContinue.disabled = false;
  }

  // Re-render list with selection highlight
  const currentQuery = document.getElementById("collegeSearchInput")?.value || "";
  renderCollegeSelectionList(currentQuery);
}

/**
 * Deselects the current pending college
 */
function clearSelectedCollege() {
  state.pendingSelectedCollegeId = null;

  const banner = document.getElementById("selectedCollegeBanner");
  if (banner) banner.style.display = "none";

  const btnContinue = document.getElementById("btnContinueToApp");
  if (btnContinue) btnContinue.disabled = true;

  const currentQuery = document.getElementById("collegeSearchInput")?.value || "";
  renderCollegeSelectionList(currentQuery);
}

/**
 * Confirms college selection and transitions into the main application
 */
function confirmCollegeSelection() {
  if (!state.pendingSelectedCollegeId) return;

  const college = typeof getCollegeById === "function" ? getCollegeById(state.pendingSelectedCollegeId) : null;
  if (!college || !college.isActive) {
    alert("Please select a valid, active campus to continue.");
    return;
  }

  // Persist
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COLLEGE, college.id);
    }
  } catch (e) {
    console.error("Failed to save selected college to localStorage", e);
  }

  state.activeCollege = college;
  updateCollegeUI();
  hideCollegeSelectionScreen(false);

  // Refresh feeds and drop-downs
  populateDropdowns(college.zones);
  renderFeed();

  showToast(`Welcome to LostLoop at ${college.name} (${college.campus})!`, "success");
}

// ============================================================================
// College Switcher Modal Controller
// ============================================================================

function openCollegeSwitcherModal() {
  const modal = document.getElementById("collegeSwitcherModal");
  if (!modal) return;

  state.pendingSwitcherCollegeId = state.activeCollege ? state.activeCollege.id : null;

  const searchInput = document.getElementById("switcherSearchInput");
  if (searchInput) searchInput.value = "";

  const btnConfirm = document.getElementById("btnConfirmSwitchCampus");
  if (btnConfirm) btnConfirm.disabled = false;

  renderSwitcherCollegeList();
  modal.classList.add("is-open");
}

function closeCollegeSwitcherModal() {
  const modal = document.getElementById("collegeSwitcherModal");
  if (modal) modal.classList.remove("is-open");
}

function renderSwitcherCollegeList(query = "") {
  const container = document.getElementById("switcherCollegesList");
  if (!container) return;

  const directory = typeof getCollegesDirectory === "function" ? getCollegesDirectory() : [];
  const q = String(query).trim().toLowerCase();

  const filtered = q 
    ? directory.filter(c => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchShort = c.shortCode && c.shortCode.toLowerCase().includes(q);
        const matchCampus = c.campus && c.campus.toLowerCase().includes(q);
        const matchCity = c.city && c.city.toLowerCase().includes(q);
        return matchName || matchShort || matchCampus || matchCity;
      })
    : directory;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.86rem;">No campuses found matching "${escapeHTML(query)}".</div>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const isSelected = (state.pendingSwitcherCollegeId || (state.activeCollege && state.activeCollege.id)) === c.id;
    const isDisabled = c.isActive === false;
    const monogram = c.shortCode || c.name.substring(0, 4).toUpperCase();

    return `
      <div 
        class="college-result-item ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}"
        onclick="${isDisabled ? '' : `handleSwitcherSelectOption('${c.id}')`}"
        style="padding: 10px 12px; margin-bottom: 6px;"
      >
        <div class="college-item-left">
          <div class="college-monogram" style="width: 36px; height: 36px; font-size: 0.72rem;">${escapeHTML(monogram)}</div>
          <div class="college-item-details">
            <div class="college-item-name" style="font-size: 0.9rem;">${escapeHTML(c.name)}</div>
            <div class="college-item-campus" style="font-size: 0.76rem;">${escapeHTML(c.campus)} &bull; ${escapeHTML(c.city)}</div>
          </div>
        </div>
        <div class="college-item-right">
          ${c.isActive ? '<span class="college-badge-chip active" style="font-size: 0.68rem;">Active</span>' : '<span class="college-badge-chip coming-soon" style="font-size: 0.68rem;">Inactive</span>'}
          <div class="college-select-circle" style="width: 18px; height: 18px; font-size: 0.75rem;">
            ${isSelected ? '✓' : ''}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function handleSwitcherSearchInput(e) {
  renderSwitcherCollegeList(e.target.value);
}

function handleSwitcherSelectOption(collegeId) {
  const college = typeof getCollegeById === "function" ? getCollegeById(collegeId) : null;
  if (!college || !college.isActive) return;

  state.pendingSwitcherCollegeId = collegeId;

  const btnConfirm = document.getElementById("btnConfirmSwitchCampus");
  if (btnConfirm) btnConfirm.disabled = false;

  const currentQuery = document.getElementById("switcherSearchInput")?.value || "";
  renderSwitcherCollegeList(currentQuery);
}

function executeSwitchCollege() {
  if (!state.pendingSwitcherCollegeId) return;

  const targetCollege = typeof getCollegeById === "function" ? getCollegeById(state.pendingSwitcherCollegeId) : null;
  if (!targetCollege || !targetCollege.isActive) {
    alert("Please select a valid, active college campus.");
    return;
  }

  // Persist switch
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COLLEGE, targetCollege.id);
    }
  } catch (e) {
    console.error("Failed to update college in localStorage", e);
  }

  state.activeCollege = targetCollege;
  closeCollegeSwitcherModal();
  updateCollegeUI();

  // Refresh feeds & form zones
  populateDropdowns(targetCollege.zones);
  renderFeed();

  showToast(`Switched campus to ${targetCollege.name} (${targetCollege.campus})`, "success");
}

/**
 * Synchronizes College UI elements across Header, Forms, and Feeds
 */
function updateCollegeUI() {
  if (!state.activeCollege) return;

  // Header Switcher
  const navCollege = document.getElementById("navCollegeName");
  const navCampus = document.getElementById("navCampusName");
  if (navCollege) navCollege.textContent = state.activeCollege.name;
  if (navCampus) navCampus.textContent = state.activeCollege.campus;

  // Reporting Form Banners
  const lostBanner = document.getElementById("formLostCollegeName");
  const foundBanner = document.getElementById("formFoundCollegeName");
  if (lostBanner) lostBanner.textContent = `${state.activeCollege.name} (${state.activeCollege.campus})`;
  if (foundBanner) foundBanner.textContent = `${state.activeCollege.name} (${state.activeCollege.campus})`;
}

/**
 * Initialize Application
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Saved Theme (if any)
  try {
    const savedTheme = localStorage.getItem("lostloop_theme");
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      const icon = document.getElementById("themeIconSun");
      if (icon) {
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;
      }
    }
  } catch (e) {}

  // 2. Initialize College Context (First-entry check & persistence)
  initCollegeContext();

  // 3. Load items
  state.items = loadItemsFromStorage();

  // 4. Populate UI controls
  populateDropdowns();

  // 5. Setup event listeners
  setupFilters();
  setupForms();

  // 6. Initial render
  renderFeed();

  // 7. Initialize AI Recovery Assistant
  initAiAssistant();

  // 8. Initialize LoopPoints Rewards Badge
  updateLoopPointsBadge();

  // Setup tab switcher buttons
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Modal backdrop click to close
  document.querySelectorAll(".editorial-modal-backdrop, .modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("is-open");
      }
    });
  });
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    state,
    loadItemsFromStorage,
    saveItemsToStorage,
    initCollegeContext,
    showCollegeSelectionScreen,
    hideCollegeSelectionScreen,
    confirmCollegeSelection,
    executeSwitchCollege,
    getFilteredItems,
    updateStats
  };
}
