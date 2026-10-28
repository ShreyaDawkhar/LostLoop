/**
 * LostLoop Intelligent Rule-Based Matching Engine
 * 
 * Features:
 * - Core item noun/type taxonomy (prevents cross-object mismatch)
 * - Category compatibility checking (blocks incompatible categories)
 * - Brand intelligence (matches identical brands, blocks conflicting brands, treats missing neutrally)
 * - Color intelligence (matches color families, flags conflicting colors, treats missing neutrally)
 * - Distinguishing feature detection (identifies rare stickers, engravings, dents, model numbers)
 * - Location hierarchy (same campus zone vs adjacent facility)
 * - Timeline feasibility (found on or after lost date)
 * - Strict relevance threshold (prevents forcing irrelevant suggestions; returns 'No strong matches yet')
 * - Transparent, explainable reasons (zero fake AI probability percentages)
 */

// 1. Common English Stopwords & Generic Lost/Found Verbs
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
  "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", 
  "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", 
  "left", "lost", "found", "me", "more", "most", "my", "myself", "near", "no", "nor", "not", 
  "now", "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", 
  "over", "own", "please", "same", "she", "should", "so", "some", "such", "than", "that", 
  "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", 
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", 
  "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", 
  "you", "your", "yours", "yourself", "yourselves", "item", "items", "side", "small", "large",
  "one", "two", "back", "front", "help", "reward", "turned", "dropped", "missing", "misplaced",
  "forgot", "somewhere", "around", "inside", "pocket", "table", "desk", "bench", "floor", "room"
]);

// 1b. Common Campus Synonyms for Canonical Keyword Extraction
const KEYWORD_SYNONYMS = {
  "earphones": "headphones",
  "earbuds": "headphones",
  "airpods": "headphones",
  "headset": "headphones",
  "bottle": "flask",
  "hydroflask": "flask",
  "tumbler": "flask",
  "canteen": "flask",
  "grey": "gray",
  "jacket": "coat",
  "hoodie": "coat",
  "fob": "key",
  "keys": "key",
  "keychain": "lanyard",
  "tag": "lanyard",
  "calculator": "calc",
  "ti84": "calc",
  "card": "id",
  "badge": "id"
};
const ITEM_TYPES = {
  HEADPHONES: "headphones",
  WATER_BOTTLE: "water_bottle",
  KEY: "key",
  ID_CARD: "id_card",
  CALCULATOR: "calculator",
  BACKPACK: "backpack",
  CLOTHING: "clothing",
  EYEWEAR: "eyewear",
  LAPTOP_TABLET: "laptop_tablet",
  PHONE: "phone",
  WALLET: "wallet",
  BOOK: "book"
};

// Patterns to detect primary item type from text (Title prioritized)
const ITEM_TYPE_PATTERNS = [
  { type: ITEM_TYPES.HEADPHONES, words: ["headphones", "headphone", "earphones", "earphone", "earbuds", "earbud", "airpods", "airpod", "headset"] },
  { type: ITEM_TYPES.WATER_BOTTLE, words: ["hydroflask", "flask", "bottle", "tumbler", "canteen", "thermos", "mug", "waterbottle"] },
  { type: ITEM_TYPES.KEY, words: ["key", "keys", "fob", "keychain", "keyring", "lanyard"] },
  { type: ITEM_TYPES.ID_CARD, words: ["card", "id", "badge", "license", "pass"] },
  { type: ITEM_TYPES.CALCULATOR, words: ["calculator", "ti-84", "ti84", "ti-83", "ti83", "calc"] },
  { type: ITEM_TYPES.BACKPACK, words: ["backpack", "bookbag", "bag", "rucksack", "tote", "duffel"] },
  { type: ITEM_TYPES.CLOTHING, words: ["jacket", "coat", "hoodie", "sweater", "fleece", "outerwear", "raincoat", "scarf", "gloves", "hat", "cap"] },
  { type: ITEM_TYPES.EYEWEAR, words: ["glasses", "sunglasses", "eyewear", "spectacles", "frames"] },
  { type: ITEM_TYPES.LAPTOP_TABLET, words: ["ipad", "tablet", "laptop", "macbook", "chromebook", "surface"] },
  { type: ITEM_TYPES.PHONE, words: ["iphone", "phone", "smartphone", "android", "galaxy", "pixel"] },
  { type: ITEM_TYPES.WALLET, words: ["wallet", "purse", "billfold", "cardholder"] },
  { type: ITEM_TYPES.BOOK, words: ["textbook", "notebook", "book", "binder", "journal"] }
];

// Mapping of Category to default compatible core types
const CATEGORY_DEFAULT_TYPES = {
  "Electronics & Tech": new Set([ITEM_TYPES.HEADPHONES, ITEM_TYPES.CALCULATOR, ITEM_TYPES.LAPTOP_TABLET, ITEM_TYPES.PHONE]),
  "Bottles & Tumblers": new Set([ITEM_TYPES.WATER_BOTTLE]),
  "IDs & Campus Cards": new Set([ITEM_TYPES.ID_CARD]),
  "Keys & Lanyards": new Set([ITEM_TYPES.KEY]),
  "Backpacks & Bags": new Set([ITEM_TYPES.BACKPACK, ITEM_TYPES.WALLET]),
  "Books & Notebooks": new Set([ITEM_TYPES.BOOK]),
  "Clothing & Outerwear": new Set([ITEM_TYPES.CLOTHING]),
  "Eyewear & Accessories": new Set([ITEM_TYPES.EYEWEAR, ITEM_TYPES.WALLET])
};

// Officially compatible categories
const COMPATIBLE_CATEGORIES = {
  "Keys & Lanyards": new Set(["IDs & Campus Cards"]),
  "IDs & Campus Cards": new Set(["Keys & Lanyards"]),
  "Backpacks & Bags": new Set(["Electronics & Tech", "Books & Notebooks"]),
  "Electronics & Tech": new Set(["Backpacks & Bags"])
};

// Common Brand Lexicon
const KNOWN_BRANDS = [
  "sony", "apple", "hydro flask", "hydroflask", "subaru", "patagonia", "nike", "adidas", 
  "texas instruments", "bose", "sennheiser", "beats", "yeti", "stanley", "contigo", "honda", 
  "toyota", "ford", "north face", "lululemon", "jansport", "herschel", "samsung", "anker", "ray-ban"
];

// Color Family Normalizer
const COLOR_FAMILIES = {
  blue: ["blue", "navy", "royal", "sky", "teal", "cyan", "cobalt"],
  black: ["black", "dark", "charcoal", "obsidian"],
  gray: ["gray", "grey", "silver", "graphite", "metallic", "aluminum"],
  white: ["white", "ivory", "cream", "pearl"],
  purple: ["purple", "violet", "lilac", "lavender", "plum"],
  red: ["red", "maroon", "burgundy", "crimson", "scarlet"],
  green: ["green", "mint", "olive", "emerald", "sage"],
  pink: ["pink", "rose", "coral"],
  yellow: ["yellow", "gold", "golden", "amber"],
  orange: ["orange", "peach"],
  brown: ["brown", "tan", "camel", "beige", "khaki"]
};

/**
 * Normalizes text string for comparison
 */
function normalizeStr(str) {
  return (str || "").trim().toLowerCase();
}

/**
 * Tokenizes text into a clean set of meaningful keyword stems
 */
function extractKeywords(text) {
  if (!text || typeof text !== "string") return new Set();

  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ");

  const rawTokens = cleaned.split(/\s+/).filter(token => token.length >= 3);
  const result = new Set();

  for (const token of rawTokens) {
    if (!STOP_WORDS.has(token)) {
      const canonical = KEYWORD_SYNONYMS[token] || token;
      result.add(canonical);
      if (canonical !== token) result.add(token);
    }
  }

  return result;
}

/**
 * Detects the primary item type from item title, category, and description
 */
function detectItemType(item) {
  if (!item) return null;

  // Title has the strongest signal
  const titleClean = normalizeStr(item.title);
  for (const pattern of ITEM_TYPE_PATTERNS) {
    for (const w of pattern.words) {
      const regex = new RegExp(`\\b${w}\\b`, "i");
      if (regex.test(titleClean)) {
        return pattern.type;
      }
    }
  }

  // Category fallback
  const cat = item.category || "";
  const catDefaults = CATEGORY_DEFAULT_TYPES[cat];
  if (catDefaults && catDefaults.size === 1) {
    return Array.from(catDefaults)[0];
  }

  // Description scan
  const descClean = normalizeStr(item.description);
  for (const pattern of ITEM_TYPE_PATTERNS) {
    for (const w of pattern.words) {
      const regex = new RegExp(`\\b${w}\\b`, "i");
      if (regex.test(descClean)) {
        return pattern.type;
      }
    }
  }

  return null;
}

/**
 * Extracts and normalizes brand from explicit field or free text
 */
function detectBrand(item) {
  if (!item) return null;
  const explicit = normalizeStr(item.brand);
  if (explicit) {
    if (explicit === "hydroflask") return "hydro flask";
    if (explicit === "ti") return "texas instruments";
    return explicit;
  }

  const fullText = `${item.title} ${item.description}`.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${b}\\b`, "i");
    if (regex.test(fullText)) {
      if (b === "hydroflask") return "hydro flask";
      return b;
    }
  }
  return null;
}

/**
 * Detects color families associated with an item
 */
function detectColorFamilies(item) {
  const detected = new Set();
  const text = `${item.primaryColor || ""} ${item.title} ${item.description}`.toLowerCase();

  for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
    for (const m of members) {
      const regex = new RegExp(`\\b${m}\\b`, "i");
      if (regex.test(text)) {
        detected.add(family);
        break;
      }
    }
  }
  return detected;
}

/**
 * Extracts specific distinguishing tokens (stickers, engravings, model numbers, unique parts)
 */
function extractDistinguishingFeatures(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const featurePatterns = [
    "nasa", "retriever", "golden retriever", "puppy", "dog", "atom", "anime", 
    "cat", "pin", "paracord", "braided", "barcode", "dent", "dented", "scratch", 
    "scratched", "engraving", "engraved", "wh-1000xm4", "xm4", "ti-84", "plus ce", 
    "carabiner", "charm", "mesh pocket", "smart folio", "rabbit"
  ];

  const found = new Set();
  for (const p of featurePatterns) {
    if (text.includes(p)) {
      found.add(p);
    }
  }
  return found;
}

/**
 * Calculates day difference (DateB - DateA)
 */
function getDayDifference(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return null;
  const timeA = new Date(dateStrA).getTime();
  const timeB = new Date(dateStrB).getTime();
  if (isNaN(timeA) || isNaN(timeB)) return null;
  const diffMs = timeB - timeA;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Compares two items and returns a transparent match assessment.
 * Rejects obviously incompatible items even if they share incidental words.
 * Scopes matches strictly within the same college campus by default.
 */
function compareItems(itemA, itemB, options = {}) {
  // 1. Same-type reports (e.g. Lost vs Lost) cannot match
  if (itemA.type === itemB.type) {
    return {
      isOppositeType: false,
      score: 0,
      matchLevel: "none",
      badgeLabel: "No Match",
      badgeClass: "badge-low",
      reasons: [],
      matchedKeywords: []
    };
  }

  // 1b. College Campus Isolation Gate
  // By default, reports from different colleges cannot match.
  const collegeA = itemA.collegeId;
  const collegeB = itemB.collegeId;

  if (collegeA && collegeB && collegeA !== collegeB) {
    const isSameUniversity = options.allowCrossCampus && 
      ((collegeA.includes("jspm") && collegeB.includes("jspm")) || 
       (itemA.universityId && itemA.universityId === itemB.universityId));

    if (!options.allowCrossCollege && !isSameUniversity) {
      return {
        isOppositeType: true,
        score: 0,
        matchLevel: "none",
        badgeLabel: "Different College",
        badgeClass: "badge-low",
        reasons: [{
          signal: "college",
          matched: false,
          title: "Different College Campus",
          detail: `Reports belong to different institutions (${itemA.collegeName || collegeA} vs ${itemB.collegeName || collegeB}). Matching is strictly scoped within the same college by default.`
        }],
        matchedKeywords: []
      };
    }
  }

  const reasons = [];
  let score = 0;

  // 2. Core Item Type Detection & Compatibility Gate
  const typeA = detectItemType(itemA);
  const typeB = detectItemType(itemB);

  // If both have clear distinct types and they are incompatible, immediately disqualify
  if (typeA && typeB && typeA !== typeB) {
    const isLanyardIDCombo = (typeA === ITEM_TYPES.KEY && typeB === ITEM_TYPES.ID_CARD) || 
                             (typeA === ITEM_TYPES.ID_CARD && typeB === ITEM_TYPES.KEY);
    const isBagContainerCombo = (typeA === ITEM_TYPES.BACKPACK && [ITEM_TYPES.LAPTOP_TABLET, ITEM_TYPES.BOOK, ITEM_TYPES.CALCULATOR].includes(typeB)) ||
                                (typeB === ITEM_TYPES.BACKPACK && [ITEM_TYPES.LAPTOP_TABLET, ITEM_TYPES.BOOK, ITEM_TYPES.CALCULATOR].includes(typeA));

    if (!isLanyardIDCombo && !isBagContainerCombo) {
      reasons.push({
        signal: "itemType",
        matched: false,
        title: "Incompatible Item Types",
        detail: `Item appears to be a ${typeA.replace('_', ' ')} while candidate is a ${typeB.replace('_', ' ')}`
      });
      return {
        isOppositeType: true,
        score: 0,
        matchLevel: "none",
        badgeLabel: "Incompatible Item",
        badgeClass: "badge-low",
        reasons,
        matchedKeywords: []
      };
    }
  }

  if (typeA && typeB && typeA === typeB) {
    score += 30;
    reasons.push({
      signal: "itemType",
      matched: true,
      title: "Compatible Item Type",
      detail: `Both items identified as ${typeA.replace('_', ' ')}`
    });
  }

  // 3. Category Alignment
  const catA = itemA.category || "";
  const catB = itemB.category || "";
  const exactCategory = catA && catB && catA === catB;
  const isCompatibleCat = COMPATIBLE_CATEGORIES[catA] && COMPATIBLE_CATEGORIES[catA].has(catB);

  if (exactCategory) {
    score += 25;
    reasons.push({
      signal: "category",
      matched: true,
      title: "Direct Category Match",
      detail: `Both filed under "${catA}"`
    });
  } else if (isCompatibleCat) {
    score += 15;
    reasons.push({
      signal: "category",
      matched: true,
      title: "Compatible Category",
      detail: `Related campus categories: "${catA}" and "${catB}"`
    });
  } else {
    // If categories are completely different and item types don't match, disqualify!
    if (!typeA || !typeB || typeA !== typeB) {
      reasons.push({
        signal: "category",
        matched: false,
        title: "Incompatible Category",
        detail: `Filed under unrelated categories ("${catA}" vs "${catB}")`
      });
      return {
        isOppositeType: true,
        score: 0,
        matchLevel: "none",
        badgeLabel: "Category Mismatch",
        badgeClass: "badge-low",
        reasons,
        matchedKeywords: []
      };
    } else {
      reasons.push({
        signal: "category",
        matched: false,
        title: "Category Difference",
        detail: `Differently categorized ("${catA}" vs "${catB}"), but item nouns appear compatible`
      });
    }
  }

  // 4. Brand Intelligence (Matches, Conflicts, or Neutral Missing)
  const brandA = detectBrand(itemA);
  const brandB = detectBrand(itemB);

  if (brandA && brandB) {
    if (brandA === brandB) {
      score += 25;
      reasons.push({
        signal: "brand",
        matched: true,
        title: "Matching Brand",
        detail: `Both identified as "${brandA.toUpperCase()}"`
      });
    } else {
      // Direct brand conflict is an immediate disqualifier!
      reasons.push({
        signal: "brand",
        matched: false,
        title: "Conflicting Brand",
        detail: `Reported brands conflict ("${brandA}" vs "${brandB}")`
      });
      return {
        isOppositeType: true,
        score: 0,
        matchLevel: "none",
        badgeLabel: "Brand Mismatch",
        badgeClass: "badge-low",
        reasons,
        matchedKeywords: []
      };
    }
  } else {
    // Missing brand information - treat carefully and neutrally!
    const missingWho = !brandA && !brandB ? "both reports" : (!brandA ? "lost report" : "found report");
    reasons.push({
      signal: "brand",
      matched: false,
      title: "Brand Not Specified",
      detail: `Brand information omitted on ${missingWho} (treated neutrally, not assumed to match)`
    });
  }

  // 5. Color Family Alignment
  const colorsA = detectColorFamilies(itemA);
  const colorsB = detectColorFamilies(itemB);

  if (colorsA.size > 0 && colorsB.size > 0) {
    const sharedColors = [...colorsA].filter(c => colorsB.has(c));
    if (sharedColors.length > 0) {
      score += 15;
      reasons.push({
        signal: "color",
        matched: true,
        title: "Color Tone Match",
        detail: `Matching color family: ${sharedColors.join(", ")}`
      });
    } else {
      // Clear color discrepancy penalty
      score = Math.max(0, score - 20);
      reasons.push({
        signal: "color",
        matched: false,
        title: "Color Discrepancy",
        detail: `Reported color families differ ([${[...colorsA].join(", ")}] vs [${[...colorsB].join(", ")}])`
      });
    }
  } else {
    reasons.push({
      signal: "color",
      matched: false,
      title: "Color Information Incomplete",
      detail: `Color not fully specified on one or both reports (treated neutrally)`
    });
  }

  // 6. Specific Distinguishing Features (High Importance: stickers, dents, model numbers)
  const featuresA = extractDistinguishingFeatures(itemA);
  const featuresB = extractDistinguishingFeatures(itemB);
  const matchedFeatures = [...featuresA].filter(f => featuresB.has(f));

  if (matchedFeatures.length > 0) {
    const featureScore = Math.min(30, matchedFeatures.length * 15);
    score += featureScore;
    reasons.push({
      signal: "features",
      matched: true,
      title: "Specific Distinguishing Details",
      detail: `Unique identifying matches: ${matchedFeatures.map(f => `"${f}"`).join(", ")}`
    });
  }

  // 7. General Description Keyword Overlap (Weighted cautiously)
  const keywordsA = extractKeywords(`${itemA.title} ${itemA.description}`);
  const keywordsB = extractKeywords(`${itemB.title} ${itemB.description}`);
  const matchedKeywords = [...keywordsA].filter(k => keywordsB.has(k));

  // Filter out keywords that were already accounted for in type/brand/color/features
  const matchedFeaturesSet = new Set(matchedFeatures);
  const filteredKeywords = matchedKeywords.filter(k => 
    !matchedFeaturesSet.has(k) && k !== brandA && k !== brandB
  );

  if (filteredKeywords.length >= 2) {
    const kwScore = Math.min(15, filteredKeywords.length * 3);
    score += kwScore;
    reasons.push({
      signal: "keywords",
      matched: true,
      title: "Shared Description Keywords",
      detail: `Supporting terms: ${filteredKeywords.slice(0, 5).join(", ")}`
    });
  }

  // 8. Campus Location Alignment
  const locA = normalizeStr(itemA.locationZone);
  const locB = normalizeStr(itemB.locationZone);

  if (locA && locB && locA === locB) {
    score += 15;
    reasons.push({
      signal: "location",
      matched: true,
      title: "Exact Campus Location",
      detail: `Both reported at "${itemA.locationZone}"`
    });
  } else {
    const locKeywordsA = extractKeywords(locA + " " + (itemA.locationDetail || ""));
    const locKeywordsB = extractKeywords(locB + " " + (itemB.locationDetail || ""));
    const sharedLocWords = [...locKeywordsA].filter(k => locKeywordsB.has(k) && !["hall", "building", "floor", "center"].includes(k));

    if (sharedLocWords.length > 0) {
      score += 8;
      reasons.push({
        signal: "location",
        matched: true,
        title: "Nearby Campus Facility",
        detail: `Related area mentioned: ${sharedLocWords.join(", ")}`
      });
    } else {
      reasons.push({
        signal: "location",
        matched: false,
        title: "Different Campus Area",
        detail: `Reported at "${itemA.locationZone}" vs "${itemB.locationZone}"`
      });
    }
  }

  // 9. Timeline & Date Feasibility
  const lostItem = itemA.type === "lost" ? itemA : itemB;
  const foundItem = itemA.type === "found" ? itemA : itemB;
  const dayDiff = getDayDifference(lostItem.date, foundItem.date);

  if (dayDiff !== null) {
    if (dayDiff === 0) {
      score += 10;
      reasons.push({
        signal: "timeline",
        matched: true,
        title: "Exact Date Match",
        detail: `Found on the same date reported lost (${lostItem.date})`
      });
    } else if (dayDiff > 0 && dayDiff <= 3) {
      score += 8;
      reasons.push({
        signal: "timeline",
        matched: true,
        title: "Close Timeline",
        detail: `Found ${dayDiff} day${dayDiff > 1 ? "s" : ""} after reported lost (${foundItem.date})`
      });
    } else if (dayDiff > 3 && dayDiff <= 14) {
      score += 4;
      reasons.push({
        signal: "timeline",
        matched: true,
        title: "Plausible Timeline",
        detail: `Found ${dayDiff} days after reported lost`
      });
    } else if (dayDiff === -1) {
      reasons.push({
        signal: "timeline",
        matched: true,
        title: "Timeline Note",
        detail: `Logged 1 day prior (acceptable reporting estimate variance)`
      });
    } else if (dayDiff < -1) {
      score = Math.max(0, score - 25);
      reasons.push({
        signal: "timeline",
        matched: false,
        title: "Chronological Anomaly",
        detail: `Found date (${foundItem.date}) is ${Math.abs(dayDiff)} days earlier than lost date (${lostItem.date})`
      });
    }
  }

  // Final score clamping (0 to 100)
  const finalScore = Math.min(100, Math.max(0, score));

  // 10. Strict Relevance Thresholding
  // Never present similarity as a verified probability
  let matchLevel = "none";
  let badgeLabel = "No Strong Match";
  let badgeClass = "badge-low";

  // High Match requirement:
  // Must have score >= 65, compatible category, and at least 2 strong matching signals (brand/specifics/color)
  const strongSignalsCount = (exactCategory ? 1 : 0) + 
                             (brandA && brandA === brandB ? 1 : 0) + 
                             (matchedFeatures.length > 0 ? 1 : 0) + 
                             (typeA && typeA === typeB ? 1 : 0);

  if (finalScore >= 65 && (exactCategory || isCompatibleCat) && strongSignalsCount >= 2) {
    matchLevel = "high";
    badgeLabel = "High Match (Multiple verified signals)";
    badgeClass = "badge-high";
  } else if (finalScore >= 45 && (exactCategory || isCompatibleCat) && typeA === typeB) {
    matchLevel = "moderate";
    badgeLabel = "Possible Match (Compatible item & details)";
    badgeClass = "badge-moderate";
  }

  return {
    isOppositeType: true,
    score: finalScore,
    matchLevel,
    badgeLabel,
    badgeClass,
    reasons,
    matchedKeywords: Array.from(new Set([...matchedFeatures, ...filteredKeywords]))
  };
}

/**
 * Finds all potential matches for a given item from the candidate list
 * Enforces minimum relevance threshold: items below threshold are excluded
 * Scopes matches to the same college campus by default unless options.allowCrossCollege is true
 * Returns matches sorted descending by score and specificity
 */
function findMatchesForItem(targetItem, allItems, options = {}) {
  if (!targetItem || !Array.isArray(allItems)) return [];

  const matches = [];

  for (const candidate of allItems) {
    if (candidate.id === targetItem.id) continue;
    if (candidate.type === targetItem.type) continue;
    if (candidate.status !== "active") continue;

    // College scoping check: by default, skip candidates from different colleges unless cross-college is enabled
    if (targetItem.collegeId && candidate.collegeId && targetItem.collegeId !== candidate.collegeId && !options.allowCrossCollege) {
      continue;
    }

    const evaluation = compareItems(targetItem, candidate, options);

    // Strict threshold: Only return if there is genuine compatibility
    if (evaluation.matchLevel === "high" || evaluation.matchLevel === "moderate") {
      matches.push({
        candidate,
        score: evaluation.score,
        matchLevel: evaluation.matchLevel,
        badgeLabel: evaluation.badgeLabel,
        badgeClass: evaluation.badgeClass,
        reasons: evaluation.reasons,
        matchedKeywords: evaluation.matchedKeywords
      });
    }
  }

  // Sort descending by score; if tied, sort by keyword/feature specificity
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.matchedKeywords?.length || 0) - (a.matchedKeywords?.length || 0);
  });

  return matches;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STOP_WORDS,
    ITEM_TYPES,
    KNOWN_BRANDS,
    COLOR_FAMILIES,
    extractKeywords,
    detectItemType,
    detectBrand,
    detectColorFamilies,
    extractDistinguishingFeatures,
    compareItems,
    findMatchesForItem
  };
}
