/**
 * LostLoop AI Recovery Assistant (Client-Side Smart NLP & Conversational Engine)
 * 
 * Capabilities:
 * - Natural language entity extraction (item type, brand, color, location, features, date)
 * - Safe conversational matching with explainable reasons (zero fake AI percentages)
 * - Calibrated labels ("Strong candidate", "Possible match", "Weak match")
 * - Smart interactive action triggers (View Item, Track Timeline, Claim, Draft Report)
 * - Privacy protection: never exposes private verification secrets
 * - Works 100% offline with optional external LLM proxy support
 */

class LostLoopAssistant {
  constructor() {
    this.history = [];
    this.extractedDraft = null;
  }

  /**
   * Natural Language Entity Extractor
   * Parses free-form student text into structured belongings metadata
   */
  extractEntities(text) {
    if (!text || typeof text !== "string") return null;

    const lower = text.toLowerCase();
    const entities = {
      rawQuery: text,
      intent: "general", // 'search_lost', 'search_found', 'claim_help', 'describe_help', 'status_help'
      itemType: null,
      category: null,
      brand: null,
      colors: [],
      features: [],
      location: null,
      timeframe: null
    };

    // 1. Detect Intent
    if (lower.includes("claim") || lower.includes("how do i claim") || lower.includes("get my item back")) {
      entities.intent = "claim_help";
    } else if (lower.includes("describe") || lower.includes("better description") || lower.includes("how to describe")) {
      entities.intent = "describe_help";
    } else if (lower.includes("status") || lower.includes("track") || lower.includes("where is my")) {
      entities.intent = "status_help";
    } else if (lower.includes("found a") || lower.includes("found someone") || lower.includes("turned in")) {
      entities.intent = "search_found";
    } else if (lower.includes("lost") || lower.includes("missing") || lower.includes("left my") || lower.includes("find my") || lower.includes("help me find")) {
      entities.intent = "search_lost";
    } else {
      entities.intent = "search_lost";
    }

    // 2. Extract Core Item Type
    const typeMap = [
      { type: "headphones", category: "Electronics & Tech", triggers: ["headphones", "headphone", "earbuds", "earbud", "earphones", "airpods", "airpod", "headset"] },
      { type: "water_bottle", category: "Bottles & Tumblers", triggers: ["hydroflask", "flask", "bottle", "water bottle", "tumbler", "canteen", "thermos", "mug", "stanley", "yeti"] },
      { type: "key", category: "Keys & Lanyards", triggers: ["key", "keys", "car key", "fob", "keychain", "keyring", "lanyard"] },
      { type: "id_card", category: "IDs & Campus Cards", triggers: ["id", "id card", "student id", "campus card", "badge", "license", "pass"] },
      { type: "calculator", category: "Electronics & Tech", triggers: ["calculator", "ti-84", "ti84", "graphing calc", "ti-83", "calc"] },
      { type: "backpack", category: "Backpacks & Bags", triggers: ["backpack", "bag", "bookbag", "tote", "duffel", "purse"] },
      { type: "clothing", category: "Clothing & Outerwear", triggers: ["jacket", "coat", "hoodie", "sweater", "fleece", "raincoat", "scarf", "gloves", "hat", "cap"] },
      { type: "eyewear", category: "Eyewear & Accessories", triggers: ["glasses", "sunglasses", "specs", "eyewear", "frames"] },
      { type: "laptop_tablet", category: "Electronics & Tech", triggers: ["ipad", "tablet", "laptop", "macbook", "computer", "surface"] },
      { type: "phone", category: "Electronics & Tech", triggers: ["phone", "iphone", "smartphone", "android", "galaxy"] }
    ];

    for (const item of typeMap) {
      for (const trig of item.triggers) {
        const regex = new RegExp(`\\b${trig}\\b`, "i");
        if (regex.test(lower)) {
          entities.itemType = item.type;
          entities.category = item.category;
          break;
        }
      }
      if (entities.itemType) break;
    }

    // 3. Extract Brand
    const knownBrands = [
      "sony", "apple", "hydro flask", "hydroflask", "subaru", "patagonia", "nike", "adidas",
      "texas instruments", "bose", "sennheiser", "beats", "yeti", "stanley", "contigo",
      "honda", "toyota", "ford", "north face", "lululemon", "jansport", "samsung", "anker"
    ];

    for (const b of knownBrands) {
      const regex = new RegExp(`\\b${b}\\b`, "i");
      if (regex.test(lower)) {
        if (b === "hydroflask" || b === "hydro flask") {
          entities.brand = "Hydro Flask";
        } else if (b === "texas instruments") {
          entities.brand = "Texas Instruments";
        } else if (b === "north face") {
          entities.brand = "North Face";
        } else {
          entities.brand = b.charAt(0).toUpperCase() + b.slice(1);
        }
        break;
      }
    }

    // 4. Extract Colors
    const colorLexicon = ["black", "blue", "navy", "silver", "gray", "grey", "white", "red", "green", "purple", "pink", "teal", "yellow", "gold", "orange", "brown"];
    for (const c of colorLexicon) {
      const regex = new RegExp(`\\b${c}\\b`, "i");
      if (regex.test(lower)) {
        entities.colors.push(c);
      }
    }

    // 5. Extract Distinguishing Features
    const featureTriggers = [
      "sticker", "stickers", "nasa", "golden retriever", "retriever", "puppy", "dog",
      "atom", "cat", "pin", "paracord", "braided", "dent", "dented", "scratch", "scratched",
      "engraving", "case", "mesh pocket", "charm", "cable", "zipper"
    ];
    for (const f of featureTriggers) {
      if (lower.includes(f)) {
        entities.features.push(f);
      }
    }

    // 6. Extract Location Keywords
    if (lower.includes("library")) entities.location = "Main Library";
    else if (lower.includes("union") || lower.includes("dining") || lower.includes("food")) entities.location = "Student Union";
    else if (lower.includes("science") || lower.includes("engineering")) entities.location = "Science & Engineering Hall";
    else if (lower.includes("rec") || lower.includes("gym")) entities.location = "Campus Recreation Center / Gym";
    else if (lower.includes("quad") || lower.includes("lawn")) entities.location = "North Quad & Campus Lawn";
    else if (lower.includes("bus") || lower.includes("transit")) entities.location = "Bus Terminal & Transit Hub";
    else if (lower.includes("lab") || lower.includes("computer")) entities.location = "University Computer Lab (B10)";

    // 7. Extract Temporal Context
    if (lower.includes("yesterday")) entities.timeframe = "Yesterday";
    else if (lower.includes("today") || lower.includes("this morning")) entities.timeframe = "Today";
    else if (lower.includes("last week")) entities.timeframe = "Last Week";
    else if (lower.includes("afternoon")) entities.timeframe = "Afternoon";

    return entities;
  }

  /**
   * Searches the active report registry using extracted entities and returns calibrated candidates
   * Strictly scopes search to the student's authorized college campus
   */
  searchReports(entities, itemsList, searchOppositeType = "found", activeCollegeId = null) {
    if (!entities || !Array.isArray(itemsList)) return [];

    const activeCollege = activeCollegeId || (typeof state !== "undefined" && state.activeCollege ? state.activeCollege.id : null);

    // Synthesize a query item
    const queryItem = {
      id: "query-assistant",
      type: searchOppositeType === "found" ? "lost" : "found",
      title: `${entities.colors.join(" ")} ${entities.brand || ""} ${entities.itemType || "item"}`.trim(),
      category: entities.category || "Electronics & Tech",
      locationZone: entities.location || "",
      brand: entities.brand || "",
      primaryColor: entities.colors[0] || "",
      description: entities.rawQuery,
      status: "active",
      collegeId: activeCollege
    };

    const candidates = [];

    for (const item of itemsList) {
      if (item.type !== searchOppositeType) continue;
      if (item.status !== "active") continue;

      // Enforce campus isolation: only search items belonging to the active college
      if (activeCollege && item.collegeId && item.collegeId !== activeCollege) {
        continue;
      }

      // Evaluate match using our deterministic engine
      const evalResult = compareItems(queryItem, item);

      // Only recommend items with honest plausibility
      if (evalResult.matchLevel === "high" || evalResult.matchLevel === "moderate") {
        let calibratedLabel = "Possible match";
        let labelClass = "badge-moderate";

        if (evalResult.matchLevel === "high") {
          calibratedLabel = "Strong candidate";
          labelClass = "badge-high";
        }

        candidates.push({
          item,
          score: evalResult.score,
          calibratedLabel,
          labelClass,
          reasons: evalResult.reasons,
          matchedKeywords: evalResult.matchedKeywords
        });
      }
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Responds to student queries with natural advice, structured cards, and next actions
   */
  processMessage(userText, appState) {
    const raw = (userText || "").trim();
    if (!raw) return null;

    const entities = this.extractEntities(raw);
    const items = appState.items || [];

    // Response structure
    const reply = {
      id: "bot-" + Date.now(),
      sender: "assistant",
      timestamp: Date.now(),
      text: "",
      extractedCard: null,
      candidates: [],
      suggestedActions: [],
      quickPrompts: []
    };

    // INTENT: Claim Help
    if (entities.intent === "claim_help") {
      reply.text = `**How to Safely Claim an Item on LostLoop:**\n\n` +
        `1. **Browse Found Items**: Find the item in the campus feed.\n` +
        `2. **Click "Safe Claim"**: Open the claim modal on the report.\n` +
        `3. **Answer the Verification Challenge**: Describe unique details only the true owner would know (e.g. sticker design, lock screen art, or specific scratches).\n` +
        `4. **Protected Privacy**: Your phone number is never exposed. Your email is masked (e.g. \`s.pat***@campus.edu\`).\n` +
        `5. **Campus Handover**: Once the finder approves your proof, a secure **one-time pickup pass code** is generated for exchange at an official campus desk!`;
      reply.quickPrompts = [
        "I lost my headphones. Can you help me?",
        "Help me describe my lost item.",
        "What should I do if no match is found?"
      ];
      return reply;
    }

    // INTENT: Description Help
    if (entities.intent === "describe_help") {
      reply.text = `**How to Write an Effective Item Description:**\n\n` +
        `The more distinctive details you provide, the faster our matching engine connects you:\n\n` +
        `• **Mention Distinctive Marks**: Stickers, decals, dents, cracks, or engravings.\n` +
        `• **Specify Exact Colors & Brands**: Say *"Navy Blue Hydro Flask"* instead of just *"water bottle"*.\n` +
        `• **Note Hidden Secret Features**: Save a private detail (like serial number ending or lock screen image) for the verification challenge.\n` +
        `• **Pinpoint the Location**: Mention specific rooms, floors, or tables.\n\n` +
        `*Would you like me to help draft a description for your lost item? Tell me what you lost!*`;
      reply.quickPrompts = [
        "I lost my navy Hydro Flask at the Student Union.",
        "I lost my Sony headphones in the library.",
        "How do I claim an item?"
      ];
      return reply;
    }

    // INTENT: Search for Lost / Found items
    if (entities.itemType || entities.brand || entities.location || entities.colors.length > 0) {
      // Find candidate matches in registry (scoped to active campus)
      const oppositeType = entities.intent === "search_found" ? "lost" : "found";
      const activeColId = appState && appState.activeCollege ? appState.activeCollege.id : null;
      const candidates = this.searchReports(entities, items, oppositeType, activeColId);

      const typeLabel = entities.itemType ? entities.itemType.replace("_", " ") : "item";
      const colorStr = entities.colors.length > 0 ? entities.colors.join("/") : "";
      const brandStr = entities.brand ? entities.brand : "";

      let summaryPhrase = [colorStr, brandStr, typeLabel].filter(Boolean).join(" ");
      if (entities.location) summaryPhrase += ` near ${entities.location}`;

      reply.extractedCard = {
        title: summaryPhrase.charAt(0).toUpperCase() + summaryPhrase.slice(1),
        itemType: entities.itemType,
        brand: entities.brand || "Unspecified",
        colors: entities.colors.length > 0 ? entities.colors.join(", ") : "Unspecified",
        location: entities.location || "Any campus zone",
        features: entities.features.length > 0 ? entities.features.join(", ") : "None specified"
      };

      if (candidates.length > 0) {
        reply.text = `I searched active campus reports for **${summaryPhrase}** and found **${candidates.length} candidate${candidates.length > 1 ? 's' : ''}** matching your criteria:`;
        reply.candidates = candidates.slice(0, 3);
        reply.suggestedActions = [
          { label: "View All Reports in Feed", action: "switch_tab", payload: "browse" },
          { label: "Inspect Matches in Engine", action: "switch_tab", payload: "inspector" }
        ];
      } else {
        reply.text = `I searched active campus records for **${summaryPhrase}**, but **no strong matches have been turned in yet**.\n\n` +
          `Here is what you should do next:\n` +
          `1. **Publish a Lost Report**: This logs your item in the registry so you'll be immediately alerted when someone turns it in.\n` +
          `2. **Check Campus Desks**: Visit the Information Desk at ${entities.location || "the Student Union or Library"}.\n` +
          `3. **Keep Distinguishing Marks Handy**: Make sure your report notes your unique details!`;
        reply.suggestedActions = [
          { label: "+ File a Lost Report", action: "switch_tab", payload: "report-lost" },
          { label: "Browse All Recent Found Items", action: "filter_found", payload: "found" }
        ];
      }

      reply.quickPrompts = [
        "How do I claim an item?",
        "Help me describe my lost item.",
        "What should I do if no match is found?"
      ];

      return reply;
    }

    // Default Fallback
    reply.text = `I'm here to help you recover lost belongings on campus!\n\n` +
      `Try asking me something like:\n` +
      `• *"I lost my black Sony headphones in the library yesterday afternoon."*\n` +
      `• *"I left my navy blue Hydro Flask with stickers at the Student Union."*\n` +
      `• *"How do I verify ownership and claim a found item?"*`;
    reply.quickPrompts = [
      "I lost my headphones. Can you help me?",
      "Find similar found items.",
      "How do I claim an item?",
      "What should I do if no match is found?"
    ];
    return reply;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LostLoopAssistant
  };
}
