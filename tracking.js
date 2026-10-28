/**
 * LostLoop Item Tracking & Lifecycle State Machine
 * 
 * Provides:
 * - Deterministic, valid state transitions for Lost and Found reports
 * - Vertical recovery timeline generator (Completed, Current, Upcoming)
 * - Persistent audit trail of status changes with timestamps
 * - Prevention of invalid jumps, duplicate events, and state mixing
 */

// Official Lifecycle Statuses for Lost Reports
const LOST_STATUSES = {
  CREATED: "created",                     // 1. Report Created
  SEARCHING: "searching",                 // 2. Searching for Matches
  POTENTIAL_MATCH: "potential_match",     // 3. Potential Match Found
  CLAIM_SUBMITTED: "claim_submitted",     // 4. Claim Submitted
  VERIFICATION_PENDING: "verification_pending", // 5. Verification Pending
  HANDOVER_ARRANGED: "handover_arranged", // 6. Handover Arranged
  REUNITED: "reunited",                   // 7. Reunited
  CLOSED: "closed",                       // Terminal: Closed by user
  WITHDRAWN: "withdrawn"                  // Terminal: Withdrawn by user
};

// Official Lifecycle Statuses for Found Reports
const FOUND_STATUSES = {
  REPORTED: "reported",                   // 1. Found Item Reported
  PUBLISHED: "published",                 // 2. Report Published / Awaiting Owner
  CLAIM_RECEIVED: "claim_received",       // 3. Potential Claim Received
  VERIFICATION_PENDING: "verification_pending", // 4. Verification Pending
  HANDOVER_ARRANGED: "handover_arranged", // 5. Handover Arranged
  REUNITED: "reunited",                   // 6. Returned to Owner / Reunited
  CLOSED: "closed",                       // Terminal: Closed
  WITHDRAWN: "withdrawn"                  // Terminal: Withdrawn
};

// Valid Forward & Reopen Transitions for Lost Reports
const LOST_TRANSITIONS = {
  [LOST_STATUSES.CREATED]: [LOST_STATUSES.SEARCHING, LOST_STATUSES.POTENTIAL_MATCH, LOST_STATUSES.WITHDRAWN],
  [LOST_STATUSES.SEARCHING]: [LOST_STATUSES.POTENTIAL_MATCH, LOST_STATUSES.CLAIM_SUBMITTED, LOST_STATUSES.WITHDRAWN, LOST_STATUSES.CLOSED],
  [LOST_STATUSES.POTENTIAL_MATCH]: [LOST_STATUSES.SEARCHING, LOST_STATUSES.CLAIM_SUBMITTED, LOST_STATUSES.WITHDRAWN, LOST_STATUSES.CLOSED],
  [LOST_STATUSES.CLAIM_SUBMITTED]: [LOST_STATUSES.VERIFICATION_PENDING, LOST_STATUSES.SEARCHING, LOST_STATUSES.WITHDRAWN],
  [LOST_STATUSES.VERIFICATION_PENDING]: [LOST_STATUSES.HANDOVER_ARRANGED, LOST_STATUSES.SEARCHING, LOST_STATUSES.WITHDRAWN],
  [LOST_STATUSES.HANDOVER_ARRANGED]: [LOST_STATUSES.REUNITED, LOST_STATUSES.SEARCHING, LOST_STATUSES.WITHDRAWN],
  [LOST_STATUSES.REUNITED]: [LOST_STATUSES.SEARCHING], // Can reopen if verified error
  [LOST_STATUSES.CLOSED]: [LOST_STATUSES.SEARCHING],   // Can reopen
  [LOST_STATUSES.WITHDRAWN]: [LOST_STATUSES.SEARCHING] // Can reopen
};

// Valid Forward & Reopen Transitions for Found Reports
const FOUND_TRANSITIONS = {
  [FOUND_STATUSES.REPORTED]: [FOUND_STATUSES.PUBLISHED, FOUND_STATUSES.WITHDRAWN],
  [FOUND_STATUSES.PUBLISHED]: [FOUND_STATUSES.CLAIM_RECEIVED, FOUND_STATUSES.WITHDRAWN, FOUND_STATUSES.CLOSED],
  [FOUND_STATUSES.CLAIM_RECEIVED]: [FOUND_STATUSES.VERIFICATION_PENDING, FOUND_STATUSES.PUBLISHED, FOUND_STATUSES.WITHDRAWN],
  [FOUND_STATUSES.VERIFICATION_PENDING]: [FOUND_STATUSES.HANDOVER_ARRANGED, FOUND_STATUSES.PUBLISHED, FOUND_STATUSES.WITHDRAWN],
  [FOUND_STATUSES.HANDOVER_ARRANGED]: [FOUND_STATUSES.REUNITED, FOUND_STATUSES.PUBLISHED, FOUND_STATUSES.WITHDRAWN],
  [FOUND_STATUSES.REUNITED]: [FOUND_STATUSES.PUBLISHED], // Can reopen if error
  [FOUND_STATUSES.CLOSED]: [FOUND_STATUSES.PUBLISHED],   // Can reopen
  [FOUND_STATUSES.WITHDRAWN]: [FOUND_STATUSES.PUBLISHED] // Can reopen
};

/**
 * Standard Lost Item Journey Stage Metadata
 */
const LOST_JOURNEY_STAGES = [
  {
    id: "stage_created",
    code: LOST_STATUSES.CREATED,
    title: "Report Created",
    shortDesc: "Your lost report is registered and active in the campus directory.",
    icon: "document-text"
  },
  {
    id: "stage_searching",
    code: LOST_STATUSES.SEARCHING,
    title: "Searching for Matches",
    shortDesc: "System is continuously cross-referencing found items across campus zones.",
    icon: "search"
  },
  {
    id: "stage_match_found",
    code: LOST_STATUSES.POTENTIAL_MATCH,
    title: "Potential Match Found",
    shortDesc: "Relevant found items meeting safety criteria have been detected.",
    icon: "sparkles"
  },
  {
    id: "stage_claim_submitted",
    code: LOST_STATUSES.CLAIM_SUBMITTED,
    title: "Claim Submitted",
    shortDesc: "Ownership proof submitted to the finder without exposing private contact info.",
    icon: "paper-airplane"
  },
  {
    id: "stage_verification_pending",
    code: LOST_STATUSES.VERIFICATION_PENDING,
    title: "Verification Pending",
    shortDesc: "Finder or campus administrator is reviewing your distinctive proof details.",
    icon: "shield-check"
  },
  {
    id: "stage_handover_arranged",
    code: LOST_STATUSES.HANDOVER_ARRANGED,
    title: "Handover Arranged",
    shortDesc: "Safe campus swap location and one-time verification passcode issued.",
    icon: "location-marker"
  },
  {
    id: "stage_reunited",
    code: LOST_STATUSES.REUNITED,
    title: "Reunited",
    shortDesc: "Item verified and successfully returned to owner. Case closed happily!",
    icon: "check-circle"
  }
];

/**
 * Standard Found Item Journey Stage Metadata
 */
const FOUND_JOURNEY_STAGES = [
  {
    id: "stage_found_reported",
    code: FOUND_STATUSES.REPORTED,
    title: "Found Item Reported",
    shortDesc: "Found belonging recorded with protective verification prompt.",
    icon: "clipboard-list"
  },
  {
    id: "stage_published",
    code: FOUND_STATUSES.PUBLISHED,
    title: "Published & Awaiting Owner",
    shortDesc: "Active on campus registry. Searchable by students who lost their belongings.",
    icon: "globe"
  },
  {
    id: "stage_claim_received",
    code: FOUND_STATUSES.CLAIM_RECEIVED,
    title: "Potential Claim Received",
    shortDesc: "A student submitted an ownership claim with secret proof details.",
    icon: "inbox-in"
  },
  {
    id: "stage_verification_pending",
    code: FOUND_STATUSES.VERIFICATION_PENDING,
    title: "Verification Pending",
    shortDesc: "Awaiting your review of claimant's answers to confirm rightful ownership.",
    icon: "shield-check"
  },
  {
    id: "stage_handover_arranged",
    code: FOUND_STATUSES.HANDOVER_ARRANGED,
    title: "Handover Arranged",
    shortDesc: "Campus exchange station selected with one-time verification passcode.",
    icon: "location-marker"
  },
  {
    id: "stage_reunited",
    code: FOUND_STATUSES.REUNITED,
    title: "Returned to Owner / Reunited",
    shortDesc: "Item safely handed over and reunited with verified owner.",
    icon: "check-circle"
  }
];

/**
 * Validates whether a state transition is legal
 */
function canTransitionStatus(reportType, currentStatus, targetStatus) {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true; // Idempotent

  const transitions = reportType === "lost" ? LOST_TRANSITIONS : FOUND_TRANSITIONS;
  const allowed = transitions[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
}

/**
 * Ensures an item has a properly initialized tracking history
 */
function ensureItemTracking(item) {
  if (!item) return null;

  if (!item.reportId) {
    // Generate clean unique human-readable report ID
    const prefix = item.type === "lost" ? "LST" : "FND";
    const rand = Math.floor(1000 + Math.random() * 9000);
    item.reportId = `LL-${prefix}-${rand}`;
  }

  if (!item.lastUpdated) {
    item.lastUpdated = item.createdAt || Date.now();
  }

  // Initialize tracking events array if not present
  if (!Array.isArray(item.timelineEvents)) {
    item.timelineEvents = [];
    
    // Add initial event
    if (item.type === "lost") {
      item.timelineEvents.push({
        id: "evt-init-" + item.id,
        stageCode: LOST_STATUSES.CREATED,
        title: "Report Created",
        description: `Lost report logged for "${item.title}". Campus scanning initiated.`,
        timestamp: item.createdAt || Date.now(),
        actor: "System"
      });

      if (item.status === "reunited") {
        item.timelineEvents.push({
          id: "evt-reun-" + item.id,
          stageCode: LOST_STATUSES.REUNITED,
          title: "Reunited",
          description: "Verified ownership and item successfully returned to owner.",
          timestamp: (item.createdAt || Date.now()) + 86400000,
          actor: "Campus Staff"
        });
      }
    } else {
      item.timelineEvents.push({
        id: "evt-init-" + item.id,
        stageCode: FOUND_STATUSES.REPORTED,
        title: "Found Item Reported",
        description: `Found item "${item.title}" logged in ${item.locationZone}.`,
        timestamp: item.createdAt || Date.now(),
        actor: "Finder"
      });
      item.timelineEvents.push({
        id: "evt-pub-" + item.id,
        stageCode: FOUND_STATUSES.PUBLISHED,
        title: "Report Published",
        description: "Public listing active with protected verification challenge.",
        timestamp: (item.createdAt || Date.now()) + 60000,
        actor: "System"
      });

      if (item.claims && item.claims.length > 0) {
        const approvedClaim = item.claims.find(c => c.status === "approved");
        if (approvedClaim) {
          item.timelineEvents.push({
            id: "evt-clm-" + approvedClaim.claimId,
            stageCode: FOUND_STATUSES.CLAIM_RECEIVED,
            title: "Claim Submitted & Verified",
            description: `Claim from ${approvedClaim.claimantMasked} reviewed and accepted.`,
            timestamp: approvedClaim.timestamp || Date.now(),
            actor: "Campus Staff"
          });
          item.timelineEvents.push({
            id: "evt-reun-" + item.id,
            stageCode: FOUND_STATUSES.REUNITED,
            title: "Returned to Owner",
            description: approvedClaim.resolutionNote || "Item reunited safely at campus desk.",
            timestamp: (approvedClaim.timestamp || Date.now()) + 3600000,
            actor: "Campus Staff"
          });
        }
      }
    }
  }

  // Derive explicit current status if using legacy "active" / "reunited"
  if (!item.trackingStatus) {
    if (item.status === "reunited") {
      item.trackingStatus = "reunited";
    } else if (item.status === "closed") {
      item.trackingStatus = "closed";
    } else if (item.status === "withdrawn") {
      item.trackingStatus = "withdrawn";
    } else {
      // For active items
      if (item.type === "lost") {
        if (item.claims && item.claims.some(c => c.status === "pending")) {
          item.trackingStatus = LOST_STATUSES.VERIFICATION_PENDING;
        } else {
          item.trackingStatus = LOST_STATUSES.SEARCHING;
        }
      } else {
        if (item.claims && item.claims.some(c => c.status === "pending")) {
          item.trackingStatus = FOUND_STATUSES.VERIFICATION_PENDING;
        } else if (item.claims && item.claims.length > 0) {
          item.trackingStatus = FOUND_STATUSES.CLAIM_RECEIVED;
        } else {
          item.trackingStatus = FOUND_STATUSES.PUBLISHED;
        }
      }
    }
  }

  return item;
}

/**
 * Transitions an item's status, validating the jump and recording audit history
 */
function recordStatusChange(item, targetStatus, customDescription = "", actor = "User") {
  if (!item) return { success: false, error: "Item not provided" };

  ensureItemTracking(item);

  const current = item.trackingStatus;
  const isLost = item.type === "lost";

  // Prevent illegal transitions
  if (!canTransitionStatus(item.type, current, targetStatus)) {
    return {
      success: false,
      error: `Invalid transition from "${current}" to "${targetStatus}" for ${item.type} report.`
    };
  }

  const now = Date.now();
  item.trackingStatus = targetStatus;
  item.lastUpdated = now;

  // Sync legacy status field
  if (targetStatus === "reunited") {
    item.status = "reunited";
  } else if (targetStatus === "closed") {
    item.status = "closed";
  } else if (targetStatus === "withdrawn") {
    item.status = "withdrawn";
  } else {
    item.status = "active";
  }

  // Create human-readable title & description for timeline
  let title = "Status Updated";
  let description = customDescription;

  if (isLost) {
    const stage = LOST_JOURNEY_STAGES.find(s => s.code === targetStatus);
    if (stage) {
      title = stage.title;
      if (!description) description = stage.shortDesc;
    }
  } else {
    const stage = FOUND_JOURNEY_STAGES.find(s => s.code === targetStatus);
    if (stage) {
      title = stage.title;
      if (!description) description = stage.shortDesc;
    }
  }

  if (targetStatus === "closed") {
    title = "Report Closed";
    if (!description) description = "Report concluded by campus coordinator.";
  } else if (targetStatus === "withdrawn") {
    title = "Report Withdrawn";
    if (!description) description = "Withdrawn by reporter (e.g. found at home).";
  }

  // Prevent duplicate consecutive timeline events with exact same status within 2 seconds
  const lastEvent = item.timelineEvents[item.timelineEvents.length - 1];
  if (!lastEvent || lastEvent.stageCode !== targetStatus || (now - lastEvent.timestamp > 2000)) {
    item.timelineEvents.push({
      id: `evt-${targetStatus}-${now}`,
      stageCode: targetStatus,
      title,
      description,
      timestamp: now,
      actor
    });
  }

  return { success: true, item };
}

/**
 * Computes the complete 7-stage vertical timeline for any report,
 * marking each stage as 'completed', 'current', or 'upcoming'.
 */
function buildRenderableTimeline(item, candidateMatches = []) {
  ensureItemTracking(item);

  const isLost = item.type === "lost";
  const stages = isLost ? LOST_JOURNEY_STAGES : FOUND_JOURNEY_STAGES;
  const currentStatus = item.trackingStatus;

  // Map of historical events by stageCode
  const historicalByStage = {};
  for (const evt of item.timelineEvents) {
    historicalByStage[evt.stageCode] = evt;
  }

  // Determine active stage index
  let currentIndex = stages.findIndex(s => s.code === currentStatus);
  
  // Dynamic handling: if Lost item is in SEARCHING stage but has potential matches,
  // surface POTENTIAL_MATCH as current or completed
  if (isLost && currentStatus === LOST_STATUSES.SEARCHING && candidateMatches.length > 0) {
    currentIndex = stages.findIndex(s => s.code === LOST_STATUSES.POTENTIAL_MATCH);
  }

  // If status is closed or withdrawn, completed stages remain up to the point of closure
  const isTerminal = currentStatus === "closed" || currentStatus === "withdrawn";

  return stages.map((stage, idx) => {
    let state = "upcoming";
    let eventTime = null;
    let desc = stage.shortDesc;

    const historical = historicalByStage[stage.code];

    if (isTerminal) {
      if (historical) {
        state = "completed";
        eventTime = historical.timestamp;
        desc = historical.description || desc;
      } else {
        state = "upcoming";
      }
    } else {
      if (idx < currentIndex) {
        state = "completed";
        eventTime = historical ? historical.timestamp : (item.createdAt || Date.now());
        if (historical && historical.description) desc = historical.description;
      } else if (idx === currentIndex) {
        state = "current";
        eventTime = item.lastUpdated || (historical ? historical.timestamp : Date.now());
        if (historical && historical.description) desc = historical.description;
        
        // Provide context-aware descriptions for current stage
        if (stage.code === LOST_STATUSES.POTENTIAL_MATCH) {
          desc = `${candidateMatches.length} potential matching candidate${candidateMatches.length > 1 ? 's' : ''} detected on campus. Review and verify details.`;
        } else if (stage.code === LOST_STATUSES.SEARCHING) {
          desc = "Actively scanning new found reports logged across campus. No strong match yet.";
        } else if (stage.code === FOUND_STATUSES.PUBLISHED) {
          desc = "Published in campus directory. Waiting for rightful owner to submit a claim.";
        }
      } else {
        state = "upcoming";
        eventTime = null;
      }
    }

    return {
      stageId: stage.id,
      code: stage.code,
      title: stage.title,
      description: desc,
      icon: stage.icon,
      timestamp: eventTime,
      state // 'completed' | 'current' | 'upcoming'
    };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LOST_STATUSES,
    FOUND_STATUSES,
    LOST_TRANSITIONS,
    FOUND_TRANSITIONS,
    LOST_JOURNEY_STAGES,
    FOUND_JOURNEY_STAGES,
    canTransitionStatus,
    ensureItemTracking,
    recordStatusChange,
    buildRenderableTimeline
  };
}
