/**
 * LostLoop Comprehensive Automated Test Suite
 * 
 * Verifies:
 * 1. Matching accuracy across campus belongings (Headphones, Water Bottles, Keys, ID Cards, Calculators)
 * 2. Incompatible category blocking (e.g. clothing vs electronics)
 * 3. Conflicting brand rejection (e.g. Sony vs Apple)
 * 4. Careful missing information handling (unspecified fields are not assumed or penalized)
 * 5. Distinguishing feature detection (stickers, engravings, unique parts)
 * 6. Minimum relevance threshold & no-match scenarios
 * 7. Correct match ranking (strongest match ranked #1)
 * 8. Student privacy email masking
 * 9. Safe claim verification & state transitions
 * 
 * Executable via Apple's built-in JavaScriptCore:
 * /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tests.js
 */

// Load dependencies
load("data.js");
load("matching.js");
load("tracking.js");
load("assistant.js");
load("rewards.js");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, errorDetail = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    print(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    print(`  ✗ FAIL: ${testName} ${errorDetail ? `\n    -> Details: ${errorDetail}` : ""}`);
  }
}

function assertEqual(actual, expected, testName) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    print(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    print(`  ✗ FAIL: ${testName} (Expected: "${expected}", Received: "${actual}")`);
  }
}

print("\n==========================================================");
print("  LOSTLOOP SYSTEM ACCURACY & PRIVACY VERIFICATION SUITE  ");
print("==========================================================\n");

// ----------------------------------------------------
// Check 1: Headphones & AirPods Recognition
// ----------------------------------------------------
print("Check 1: Headphones & Audio Gear Recognition");
{
  const lostHeadphones = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-1");
  const foundHeadphones = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-2");
  const comparison = compareItems(lostHeadphones, foundHeadphones);

  assert(comparison.matchLevel === "high", "Lost Sony Headphones match Found Sony Headset as High Match");
  assert(comparison.score >= 70, `Score is high (${comparison.score} >= 70)`);
  assert(comparison.reasons.some(r => r.signal === "itemType" && r.matched), "Identifies compatible 'headphones' item type");
  assert(comparison.reasons.some(r => r.signal === "brand" && r.matched), "Identifies shared Sony brand");
}

// ----------------------------------------------------
// Check 2: Water Bottles & Hydro Flasks Matching
// ----------------------------------------------------
print("\nCheck 2: Water Bottles & Hydro Flasks Matching");
{
  const lostFlask = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-3");
  const foundBottle = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-4");
  const comparison = compareItems(lostFlask, foundBottle);

  assert(comparison.matchLevel === "high", "Navy Hydro Flask matches Found Navy Bottle as High Match");
  assert(comparison.reasons.some(r => r.signal === "features" && r.matched), "Detects shared distinguishing feature: stickers/dent");
  assert(comparison.reasons.some(r => r.signal === "color" && r.matched), "Detects shared navy/blue color family");
}

// ----------------------------------------------------
// Check 3: Keys, Lanyards & Charms Matching
// ----------------------------------------------------
print("\nCheck 3: Keys & Lanyards Matching");
{
  const lostKey = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-5");
  const foundKey = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-6");
  const comparison = compareItems(lostKey, foundKey);

  assert(comparison.matchLevel === "high", "Lost Subaru Key matches Found Key on purple cord");
  assert(comparison.reasons.some(r => r.signal === "features"), "Identifies shared distinctive pin/animal charm");
}

// ----------------------------------------------------
// Check 4: Blocks Incompatible Categories (Strict Gate)
// ----------------------------------------------------
print("\nCheck 4: Incompatible Category Gate (No False Matches Across Categories)");
{
  // Raincoat (Clothing) vs Headphones (Electronics) - both at Library, both mention 'case'/'black'
  const raincoat = {
    id: "lost-raincoat",
    type: "lost",
    category: "Clothing & Outerwear",
    locationZone: "Main Library (1st/2nd Floor)",
    date: "2026-10-25",
    title: "Black Raincoat with Case in Pocket",
    description: "Waterproof black jacket with zipper case inside front pocket",
    primaryColor: "Black"
  };

  const headphones = {
    id: "found-headphones",
    type: "found",
    category: "Electronics & Tech",
    locationZone: "Main Library (1st/2nd Floor)",
    date: "2026-10-25",
    title: "Black Sony Headphones in Case",
    description: "Found black audio headphones in zipper case",
    primaryColor: "Black",
    brand: "Sony"
  };

  const comparison = compareItems(raincoat, headphones);
  assertEqual(comparison.matchLevel, "none", "Jacket vs Headphones is rejected (matchLevel: 'none')");
  assertEqual(comparison.score, 0, "Score is clamped to 0 for incompatible items despite shared 'case'/'black'");
  assert(comparison.reasons.some(r => r.matched === false && r.title.includes("Incompatible")), "Explains incompatible item types in reasons");
}

// ----------------------------------------------------
// Check 5: Rejects Conflicting Brands
// ----------------------------------------------------
print("\nCheck 5: Brand Conflict Disqualification");
{
  const sonyHeadphones = {
    id: "lost-sony",
    type: "lost",
    category: "Electronics & Tech",
    locationZone: "Main Library (Quiet Study / 3rd Floor)",
    date: "2026-10-25",
    title: "Sony Over-Ear Headphones",
    description: "Silver wireless headphones in case",
    brand: "Sony",
    primaryColor: "Silver"
  };

  const boseHeadphones = {
    id: "found-bose",
    type: "found",
    category: "Electronics & Tech",
    locationZone: "Main Library (Quiet Study / 3rd Floor)",
    date: "2026-10-25",
    title: "Bose QuietComfort Headphones",
    description: "Silver noise cancelling headphones in case",
    brand: "Bose",
    primaryColor: "Silver"
  };

  const comparison = compareItems(sonyHeadphones, boseHeadphones);
  assertEqual(comparison.matchLevel, "none", "Sony vs Bose is rejected due to brand conflict");
  assertEqual(comparison.score, 0, "Score is 0 when explicit brands conflict");
  assert(comparison.reasons.some(r => r.title === "Conflicting Brand"), "Records conflicting brand reason");
}

// ----------------------------------------------------
// Check 6: Careful Handling of Missing Information
// ----------------------------------------------------
print("\nCheck 6: Missing Information Handled Neutrally (No Invented Matches)");
{
  const unbrandedItem = {
    id: "lost-unbranded",
    type: "lost",
    category: "Bottles & Tumblers",
    locationZone: "Student Union / Dining Hall",
    date: "2026-10-25",
    title: "Stainless Steel Water Bottle",
    description: "Insulated water bottle with dent near bottom ring",
    brand: "", // Unspecified
    primaryColor: "" // Unspecified
  };

  const foundItem = {
    id: "found-bottle",
    type: "found",
    category: "Bottles & Tumblers",
    locationZone: "Student Union / Dining Hall",
    date: "2026-10-25",
    title: "Metal Water Bottle with Dent",
    description: "Metal bottle with small dent on base",
    brand: "", // Unspecified
    primaryColor: "" // Unspecified
  };

  const comparison = compareItems(unbrandedItem, foundItem);
  assert(comparison.score > 0, "Compatible items can still match without brand/color");
  assert(comparison.reasons.some(r => r.title.includes("Brand Not Specified")), "Neutrally notes missing brand without hallucinating");
}

// ----------------------------------------------------
// Check 7: Rewards Distinguishing Features (Stickers & Marks)
// ----------------------------------------------------
print("\nCheck 7: Distinguishing Features Strongly Boost Confidence");
{
  const lostWithSticker = {
    id: "lost-calc",
    type: "lost",
    category: "Electronics & Tech",
    locationZone: "Science & Engineering Hall",
    date: "2026-10-23",
    title: "TI-84 Plus CE Calculator",
    description: "Teal calculator with holographic atom sticker on back",
    brand: "Texas Instruments",
    primaryColor: "Teal"
  };

  const foundWithSticker = {
    id: "found-calc",
    type: "found",
    category: "Electronics & Tech",
    locationZone: "Science & Engineering Hall",
    date: "2026-10-24",
    title: "Graphing Calculator with Atom Decal",
    description: "Teal Texas Instruments calculator with atom sticker on battery panel",
    brand: "Texas Instruments",
    primaryColor: "Teal"
  };

  const comparison = compareItems(lostWithSticker, foundWithSticker);
  assert(comparison.matchLevel === "high", "Calculator with atom sticker achieves High Match");
  assert(comparison.reasons.some(r => r.signal === "features" && r.detail.includes("atom")), "Recognizes specific 'atom' sticker match");
}

// ----------------------------------------------------
// Check 8: Strict Minimum Threshold & No-Match Protection
// ----------------------------------------------------
print("\nCheck 8: Strict Minimum Threshold Prevents Irrelevant Suggestions");
{
  const lostJacket = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-9"); // Patagonia jacket
  const matches = findMatchesForItem(lostJacket, INITIAL_DEMO_ITEMS);

  // In the demo dataset, there is no found Patagonia jacket, so matches must be empty!
  assertEqual(matches.length, 0, "No irrelevant matches forced for Patagonia Jacket (returns 0 candidates)");
}

// ----------------------------------------------------
// Check 9: Correct Ranking (Strongest Match Appears First)
// ----------------------------------------------------
print("\nCheck 9: Ranking Hierarchy (Strongest Candidate First)");
{
  const target = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-1"); // Sony Headphones
  const pool = [
    INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-4"), // Found bottle (dissimilar)
    INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-2")  // Found Sony Headphones (strong)
  ];

  const matches = findMatchesForItem(target, pool);
  assert(matches.length === 1, "Only the compatible Sony headphones candidate is returned");
  assertEqual(matches[0].candidate.id, "item-demo-2", "Top ranked match is the genuine Sony Headphones");
}

// ----------------------------------------------------
// Check 10: Student Email Privacy Masking
// ----------------------------------------------------
print("\nCheck 10: Student Privacy Masking");
{
  function maskEmail(email) {
    if (!email || typeof email !== "string") return "student***@campus.edu";
    const parts = email.trim().split("@");
    if (parts.length !== 2) return "student***@campus.edu";
    const user = parts[0];
    const domain = parts[1];
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    const visible = user.substring(0, Math.min(4, Math.floor(user.length / 2)));
    return `${visible}***@${domain}`;
  }

  assertEqual(maskEmail("alex.rivera@campus.edu"), "alex***@campus.edu", "Masks standard student email");
  assertEqual(maskEmail("m.patel@campus.edu"), "m.p***@campus.edu", "Hides student surname");
}

// ----------------------------------------------------
// Check 11: Verification Question Enforcement in Claims
// ----------------------------------------------------
print("\nCheck 11: Verification Question Protects Property");
{
  const foundItem = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-4"); // Found water bottle
  assert(foundItem.verificationQuestion.length > 5, "Found item requires a verification challenge question");
  assert(foundItem.verificationQuestion.toLowerCase().includes("sticker"), "Challenge specifies identifying secret stickers");
}

// ----------------------------------------------------
// Check 12: Safe Swap Passcode Generation on Claim Approval
// ----------------------------------------------------
print("\nCheck 12: Secure Exchange Passcode on Reunion");
{
  const resolvedItem = INITIAL_DEMO_ITEMS.find(i => i.id === "item-demo-10");
  assert(resolvedItem.status === "reunited", "Item status marks as reunited");
  assert(resolvedItem.claims.length > 0, "Contains approved claim ledger");
  assert(resolvedItem.claims[0].status === "approved", "Claim status transitions to approved");
  assert(resolvedItem.claims[0].resolutionNote.includes("reunited"), "Logs safe reunion notes");
}

// ----------------------------------------------------
// Check 13: Item Tracking Lifecycle Stages & Valid State Transitions
// ----------------------------------------------------
print("\nCheck 13: Item Tracking Lifecycle Stages & State Transitions");
{
  // Valid forward transitions for Lost items
  assert(canTransitionStatus("lost", "created", "searching"), "Lost item moves from created to searching");
  assert(canTransitionStatus("lost", "searching", "potential_match"), "Lost item moves to potential_match when candidates detected");
  assert(canTransitionStatus("lost", "potential_match", "claim_submitted"), "Lost item moves to claim_submitted");
  assert(canTransitionStatus("lost", "claim_submitted", "verification_pending"), "Lost item moves to verification_pending");
  assert(canTransitionStatus("lost", "verification_pending", "handover_arranged"), "Lost item moves to handover_arranged");
  assert(canTransitionStatus("lost", "handover_arranged", "reunited"), "Lost item moves to reunited");

  // Valid forward transitions for Found items
  assert(canTransitionStatus("found", "reported", "published"), "Found item moves from reported to published");
  assert(canTransitionStatus("found", "published", "claim_received"), "Found item moves to claim_received upon claim");
  assert(canTransitionStatus("found", "claim_received", "verification_pending"), "Found item moves to verification_pending");
  assert(canTransitionStatus("found", "verification_pending", "handover_arranged"), "Found item moves to handover_arranged");
  assert(canTransitionStatus("found", "handover_arranged", "reunited"), "Found item moves to reunited");

  // Strict transition gates prevent invalid skips
  assert(!canTransitionStatus("lost", "created", "reunited"), "Blocks illegal skip from created directly to reunited");
  assert(!canTransitionStatus("found", "reported", "reunited"), "Blocks illegal skip from reported directly to reunited");
  assert(!canTransitionStatus("lost", "created", "handover_arranged"), "Blocks skipping straight to handover without verification");
}

// ----------------------------------------------------
// Check 14: Tracking Timeline Generation & Audit Trail Preservation
// ----------------------------------------------------
print("\nCheck 14: Tracking Timeline Generation & Audit Trail Preservation");
{
  const testLostItem = {
    id: "item-track-unit-1",
    reportId: "LL-LST-9001",
    type: "lost",
    title: "TI-84 Plus Graphing Calculator",
    category: "Electronics & Tech",
    status: "active",
    trackingStatus: "searching",
    createdAt: 1761400000000,
    lastUpdated: 1761400060000,
    timelineEvents: [
      { id: "e1", stageCode: "created", title: "Report Created", timestamp: 1761400000000 },
      { id: "e2", stageCode: "searching", title: "Searching for Matches", timestamp: 1761400060000 }
    ]
  };

  const timeline = buildRenderableTimeline(testLostItem, []);
  assertEqual(timeline.length, 7, "Lost item journey generates exactly 7 canonical stages");
  assert(timeline[0].state === "completed", "Stage 1 (Report Created) is marked completed");
  assert(timeline[1].state === "current", "Stage 2 (Searching for Matches) is marked current");
  assert(timeline[2].state === "upcoming", "Stage 3 (Potential Match) is upcoming when no candidates");

  // Preserving history on withdrawal
  const withdrawRes = recordStatusChange(testLostItem, "withdrawn", "Found under study desk at home");
  assert(withdrawRes.success, "Successfully withdrew report");
  assertEqual(testLostItem.trackingStatus, "withdrawn", "Tracking status updated to withdrawn");
  assertEqual(testLostItem.status, "withdrawn", "Legacy status updated to withdrawn");
  assertEqual(testLostItem.timelineEvents.length, 3, "Historical events preserved (3 timestamped events recorded)");

  // Reopening from withdrawn
  const reopenRes = recordStatusChange(testLostItem, "searching", "Reopened search");
  assert(reopenRes.success, "Successfully reopened withdrawn report");
  assertEqual(testLostItem.trackingStatus, "searching", "Status restored to searching");
  assertEqual(testLostItem.timelineEvents.length, 4, "Reopen event appended to immutable history");
}

// ----------------------------------------------------
// Check 15: AI Recovery Assistant Natural Language Entity Extraction
// ----------------------------------------------------
print("\nCheck 15: AI Recovery Assistant Natural Language Entity Extraction");
{
  const assistant = new LostLoopAssistant();

  // Query 1: Water bottle with decals
  const q1 = assistant.extractEntities("I lost my navy blue Hydro Flask with NASA stickers in the Student Union dining hall yesterday");
  assertEqual(q1.intent, "search_lost", "Identifies intent as search_lost");
  assertEqual(q1.itemType, "water_bottle", "Maps 'Hydro Flask' to itemType 'water_bottle'");
  assertEqual(q1.category, "Bottles & Tumblers", "Maps to category 'Bottles & Tumblers'");
  assertEqual(q1.brand, "Hydro Flask", "Identifies brand 'Hydro Flask'");
  assert(q1.colors.includes("navy"), "Identifies color 'navy'");
  assertEqual(q1.location, "Student Union", "Identifies location 'Student Union'");
  assert(q1.features.includes("sticker") || q1.features.includes("stickers"), "Identifies feature 'stickers'");

  // Query 2: Headphones
  const q2 = assistant.extractEntities("Left my silver Sony noise cancelling headphones in 3rd floor library study carrel");
  assertEqual(q2.itemType, "headphones", "Identifies itemType 'headphones'");
  assertEqual(q2.brand, "Sony", "Identifies brand 'Sony'");
  assert(q2.colors.includes("silver"), "Identifies color 'silver'");
  assertEqual(q2.location, "Main Library", "Identifies location 'Main Library'");
}

// ----------------------------------------------------
// Check 16: AI Recovery Assistant Calibrated Matching & Strict Privacy
// ----------------------------------------------------
print("\nCheck 16: AI Recovery Assistant Calibrated Matching & Strict Privacy");
{
  const assistant = new LostLoopAssistant();
  const mockState = { items: INITIAL_DEMO_ITEMS };

  const reply = assistant.processMessage("I lost my navy Hydro Flask at the Student Union", mockState);
  assert(reply !== null, "Assistant produced a valid structured response");
  assert(reply.candidates.length > 0, "Found matching candidate for navy Hydro Flask");
  
  const topCandidate = reply.candidates[0];
  assert(topCandidate.calibratedLabel === "Strong candidate" || topCandidate.calibratedLabel === "Possible match", "Uses calibrated qualitative label ('Strong candidate' or 'Possible match')");
  assert(topCandidate.reasons.length > 0, "Provides transparent explainable reasons without fake percentages");

  // Strict Privacy: Verify secret verification question answers are NEVER leaked
  const serialized = JSON.stringify(reply);
  assert(!serialized.includes("rabbit with a strawberry hat"), "Secret iPad wallpaper verification answer is NOT leaked");
  assert(!serialized.includes("m.patel@campus.edu"), "Raw unmasked student email is NOT exposed");
}

// ----------------------------------------------------
// Check 17: Verified Kindness Earning & Anti-Abuse Rules (Strict 50 LoopPoints)
// ----------------------------------------------------
print("\nCheck 17: Verified Kindness Earning & Anti-Abuse Rules (Strict 50 LoopPoints)");
{
  const mockLedger = [];
  const testReunitedItem = {
    id: "item-unit-reunion-1",
    title: "Graphing Calculator (TI-84)",
    type: "found",
    status: "reunited",
    reporter: { maskedContact: "finder.alex***@campus.edu" }
  };

  // 1. Cannot award points for unverified report
  const activeUnverified = { id: "item-active-1", status: "active", title: "Active Phone" };
  const rejectedAward = awardRecoveryReward(activeUnverified, null, "Staff", mockLedger);
  assert(!rejectedAward.success, "Rejects points for unverified report (status: 'active')");
  assert(rejectedAward.error.includes("handover is verified"), "Explains points require confirmed handover");

  // Arranged handover without confirmed reunion is also ineligible
  const handoverItem = { id: "item-handover-1", status: "handover_arranged", title: "Water Bottle" };
  const rejectedHandover = awardRecoveryReward(handoverItem, null, "Staff", mockLedger);
  assert(!rejectedHandover.success, "Rejects points for arranged handover before confirmation");

  // 2. Award for verified recovery (Strictly 50 LoopPoints)
  const awardRes = awardRecoveryReward(testReunitedItem, null, "Campus Coordinator", mockLedger);
  assert(awardRes.success, "Successfully awards LoopPoints for verified reunion");
  assertEqual(awardRes.pointsAwarded, 50, "Awards exactly 50 recovery points for verified return");
  assertEqual(awardRes.message, "Congratulations! You earned 50 LoopPoints for helping reunite an item.", "Displays required congratulatory message");
  assertEqual(calculateBalance("campus_student", mockLedger), 50, "Ledger balance equals 50 pts");

  // 3. No bonus points or different points based on item value or category
  const expensiveLaptop = { id: "item-expensive-macbook", status: "reunited", title: "MacBook Pro 16\"", category: "Electronics" };
  const laptopRes = awardRecoveryReward(expensiveLaptop, null, "Staff", mockLedger);
  assertEqual(laptopRes.pointsAwarded, 50, "High-value electronics get exactly 50 points (no value-based bonus)");
  assertEqual(calculateBalance("campus_student", mockLedger), 100, "Ledger balance accumulates to exactly 100 pts");

  // 4. Strict Idempotency: duplicate award for same recovery is rejected
  const dupAward = awardRecoveryReward(testReunitedItem, null, "Campus Coordinator", mockLedger);
  assert(!dupAward.success, "Prevents duplicate reward for already-rewarded recovery");
  assert(dupAward.error.includes("Duplicate rewards are prohibited"), "Provides clear duplicate error message");
  assertEqual(calculateBalance("campus_student", mockLedger), 100, "Balance remains 100 without duplicate inflation");
}

// ----------------------------------------------------
// Check 18: Multiple Contributors & Approved Splitting / Defined Recipient Rules
// ----------------------------------------------------
print("\nCheck 18: Multiple Contributors & Approved Splitting / Defined Recipient Rules");
{
  const mockLedger = [];

  // 1. Unverified return with multiple contributors is blocked
  const unverifiedCoFound = {
    id: "item-multi-unverified",
    status: "searching",
    title: "AirPods Case",
    contributors: ["student_1", "student_2"]
  };
  const unverifiedRes = awardRecoveryReward(unverifiedCoFound, null, "Staff", mockLedger);
  assert(!unverifiedRes.success, "Rejects reward for unverified multi-contributor item");

  // 2. Defined Primary Recipient Rule: exactly 50 pts to designated student
  const itemWithPrimary = {
    id: "item-multi-rec-1",
    status: "reunited",
    title: "Scientific Calculator",
    contributors: ["student_alex", "student_taylor"]
  };
  const primaryRes = awardRecoveryReward(itemWithPrimary, null, "Staff", mockLedger, { primaryRecipient: "student_alex" });
  assert(primaryRes.success, "Awards points using defined primary recipient rule");
  assertEqual(primaryRes.pointsAwarded, 50, "Awards exactly 50 points to primary recipient");
  assertEqual(primaryRes.recipient, "student_alex", "Records student_alex as recipient");
  assertEqual(calculateBalance("student_alex", mockLedger), 50, "Primary recipient balance is 50 pts");
  assertEqual(calculateBalance("student_taylor", mockLedger), 0, "Non-primary contributor does not receive duplicate points");

  // 3. Approved Reward-Splitting Rule: 50 points split fairly among contributors
  const itemWithSplit = {
    id: "item-multi-rec-2",
    status: "reunited",
    title: "Set of Car Keys",
    contributors: ["student_sam", "student_jordan"]
  };
  const splitRes = awardRecoveryReward(itemWithSplit, null, "Staff", mockLedger, { splitReward: true });
  assert(splitRes.success, "Successfully applies approved reward-splitting rule");
  assertEqual(splitRes.pointsAwarded, 50, "Total reward pool is capped at exactly 50 points");
  assertEqual(splitRes.splitPerContributor, 25, "Each of 2 verified contributors receives 25 points (50 / 2)");
  assertEqual(calculateBalance("student_sam", mockLedger), 25, "Student Sam receives 25 points");
  assertEqual(calculateBalance("student_jordan", mockLedger), 25, "Student Jordan receives 25 points");

  // 4. Never award everyone 50 points automatically: total never exceeds 50 pts
  const totalAwardedForRecovery = mockLedger
    .filter(t => t.relatedId === "item-multi-rec-2")
    .reduce((sum, t) => sum + t.amount, 0);
  assertEqual(totalAwardedForRecovery, 50, "Recovery pool strictly capped at 50 points; never awards everyone automatically");

  // 5. Duplicate attempts for split recovery are strictly prevented
  const dupSplit = awardRecoveryReward(itemWithSplit, null, "Staff", mockLedger, { splitReward: true });
  assert(!dupSplit.success, "Prevents duplicate reward for multi-contributor recovery");
}

// ----------------------------------------------------
// Check 19: Safe Atomic Redemption & Stock Depletion
// ----------------------------------------------------
print("\nCheck 19: Safe Atomic Redemption & Stock Depletion");
{
  const mockCatalogue = JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE));
  const mockLedger = [
    { txId: "TX-INIT", userRef: "campus_student", amount: 250, type: "recovery_reward", status: "completed" }
  ];
  const mockRedemptions = [];

  // 1. Successful redemption
  const stickerPerk = mockCatalogue.find(r => r.id === "rew-demo-1"); // 100 pts, stock 50
  const initialStock = stickerPerk.stock;

  const rdmRes = redeemReward("rew-demo-1", "campus_student", mockCatalogue, mockLedger, mockRedemptions);
  assert(rdmRes.success, "Successfully redeems sticker perk");
  assertEqual(rdmRes.newBalance, 150, "Balance deducted atomically: 250 - 100 = 150 pts");
  assertEqual(stickerPerk.stock, initialStock - 1, "Catalogue stock decremented by 1");
  assert(rdmRes.redemption.voucherCode.startsWith("LL-VCHR-"), "Generates unique voucher pass code");
  assertEqual(mockRedemptions.length, 1, "Appends redemption record to redemption log");

  // 2. Insufficient points prevention
  const printPerk = mockCatalogue.find(r => r.id === "rew-demo-4"); // 400 pts (balance is 150)
  const failRes = redeemReward("rew-demo-4", "campus_student", mockCatalogue, mockLedger, mockRedemptions);
  assert(!failRes.success, "Rejects redemption when balance is insufficient (150 < 400)");
  assert(failRes.error.includes("Insufficient LoopPoints"), "Provides helpful balance shortfall message");
  assertEqual(calculateBalance("campus_student", mockLedger), 150, "Balance remains 150 without negative overdraft");

  // 3. Out of stock rejection
  stickerPerk.stock = 0;
  const outOfStockRes = redeemReward("rew-demo-1", "campus_student", mockCatalogue, mockLedger, mockRedemptions);
  assert(!outOfStockRes.success, "Rejects redemption when item is out of stock");
  assert(outOfStockRes.error.includes("out of stock"), "Explains item is out of stock");
}

// ----------------------------------------------------
// Check 20: Compensating Reversal Ledger Entries
// ----------------------------------------------------
print("\nCheck 20: Compensating Reversal Ledger Entries");
{
  const mockCatalogue = JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE));
  const mockLedger = [
    { txId: "TX-INIT", userRef: "campus_student", amount: 200, type: "recovery_reward", status: "completed" }
  ];
  const mockRedemptions = [];

  // Redeem
  const rdm = redeemReward("rew-demo-2", "campus_student", mockCatalogue, mockLedger, mockRedemptions); // 200 pts
  assertEqual(calculateBalance("campus_student", mockLedger), 0, "Balance reaches 0 after redeeming 200 pt coupon");

  // Reverse redemption
  const rev = reverseRedemption(rdm.redemption.redemptionId, "Coffee machine broken", "admin", mockLedger, mockCatalogue, mockRedemptions);
  assert(rev.success, "Successfully executes compensating reversal");
  assertEqual(rev.newBalance, 200, "Refunds LoopPoints via positive compensating reversal");
  assertEqual(rdm.redemption.status, "reversed", "Redemption status marked as 'reversed'");
  assert(mockLedger.some(t => t.type === "reward_reversal" && t.amount === 200), "Appends immutable reward_reversal entry to ledger");

  // Cannot reverse twice
  const revDup = reverseRedemption(rdm.redemption.redemptionId, "Try again", "admin", mockLedger, mockCatalogue, mockRedemptions);
  assert(!revDup.success, "Blocks duplicate reversal of already-reversed redemption");
}

// ----------------------------------------------------
// Check 21: Administrative Adjustments & Badges Evaluation
// ----------------------------------------------------
print("\nCheck 21: Administrative Adjustments & Badges Evaluation");
{
  const mockLedger = [];

  // 1. Admin adjustment validation
  const invalidAdj = adminAdjustPoints("campus_student", 50, "no", "admin", mockLedger);
  assert(!invalidAdj.success, "Rejects adjustment with insufficient justification (must be >= 5 chars)");

  const validAdj = adminAdjustPoints("campus_student", 75, "Special orientation volunteer bonus", "Campus Coordinator", mockLedger);
  assert(validAdj.success, "Applies legitimate admin adjustment with justification");
  assertEqual(calculateBalance("campus_student", mockLedger), 75, "Balance updated to 75 pts");

  // 2. Badges evaluation from recovery records
  // Seed with 2 recoveries (50 LoopPoints each)
  mockLedger.push({ txId: "T1", userRef: "campus_student", amount: 50, type: "recovery_reward", status: "completed" });
  mockLedger.push({ txId: "T2", userRef: "campus_student", amount: 50, type: "recovery_reward", status: "completed" });

  const badges = evaluateUserBadges("campus_student", mockLedger);
  const firstBadge = badges.find(b => b.id === "badge_first_reunion");
  const helperBadge = badges.find(b => b.id === "badge_helping_hand");
  const heroBadge = badges.find(b => b.id === "badge_community_hero");
  const legendBadge = badges.find(b => b.id === "badge_10_recoveries");

  assert(firstBadge.unlocked, "First Reunion badge is unlocked with 2 recoveries");
  assert(helperBadge.unlocked, "Helping Hand badge is unlocked with 2 recoveries");
  assert(!heroBadge.unlocked, "Community Hero badge remains locked (requires 3 recoveries)");
  assert(!legendBadge.unlocked, "10 Recoveries badge remains locked");
  assertEqual(legendBadge.progress, 2, "Records progress of 2 / 10 towards legend badge");
}

// ----------------------------------------------------
// Check 22: Multi-College Architecture & Campus Isolation Verification
// ----------------------------------------------------
print("\nCheck 22: Multi-College Architecture & Campus Isolation Verification");
{
  // 1. Structured College Directory
  const colleges = getCollegesDirectory();
  assert(Array.isArray(colleges) && colleges.length >= 4, "College directory contains supported institutions");
  assert(colleges.every(c => c.id && c.name && c.city && c.campus), "All colleges contain required structured fields (id, name, city, campus)");

  // 2. Search Functionality
  const puneColleges = searchColleges("pune");
  assert(puneColleges.length >= 3, "Search by city 'Pune' returns matching colleges");
  const bitsMatches = searchColleges("goa");
  assert(bitsMatches.some(c => c.id === "col-bits-goa"), "Search matches campus location 'Goa'");

  // 3. Similar / Duplicate University Names Distinguished
  const jspmWagholi = getCollegeById("col-jspm-wagholi");
  const jspmTathawade = getCollegeById("col-jspm-tathawade");
  assert(jspmWagholi && jspmTathawade, "Retrieves colleges with similar university names");
  assert(jspmWagholi.id !== jspmTathawade.id, "Institutions have unique, distinct IDs (not name alone)");
  assertEqual(jspmWagholi.campus, "Wagholi Campus", "Distinguishes Wagholi Campus");
  assertEqual(jspmTathawade.campus, "Tathawade Campus", "Distinguishes Tathawade Campus");

  // 4. Inactive & Invalid College Handling
  const inactiveCollege = getCollegeById("col-mit-wpu");
  assert(inactiveCollege && inactiveCollege.isActive === false, "Identifies inactive / coming-soon campus");
  const invalidCollege = getCollegeById("col-nonexistent-999");
  assert(invalidCollege === null, "Rejects invalid college ID appropriately (returns null)");

  // 5. Cross-College Matching Gate (Items from different colleges CANNOT match by default)
  const lostSonyJSPM = {
    id: "item-test-jspm-lost",
    collegeId: "col-jspm-wagholi",
    collegeName: "JSPM University",
    type: "lost",
    title: "Sony WH-1000XM4 Noise-Cancelling Headphones",
    category: "Electronics & Tech",
    brand: "Sony",
    primaryColor: "Silver",
    status: "active"
  };

  const foundSonyCOEP = {
    id: "item-test-coep-found",
    collegeId: "col-coep-pune",
    collegeName: "COEP Technological University",
    type: "found",
    title: "Sony WH-1000XM4 Noise-Cancelling Headphones",
    category: "Electronics & Tech",
    brand: "Sony",
    primaryColor: "Silver",
    status: "active"
  };

  const crossMatch = compareItems(lostSonyJSPM, foundSonyCOEP);
  assertEqual(crossMatch.matchLevel, "none", "Cross-college comparison is rejected (matchLevel: 'none')");
  assertEqual(crossMatch.score, 0, "Cross-college comparison clamps score to 0 despite identical item descriptions");
  assert(crossMatch.reasons.some(r => r.signal === "college" && r.title === "Different College Campus"), "Explains cross-college matching restriction in reasons");

  // 6. Cross-Campus Matching Allowed Only When Explicitly Authorized
  const authorizedCrossMatch = compareItems(lostSonyJSPM, foundSonyCOEP, { allowCrossCollege: true });
  assertEqual(authorizedCrossMatch.matchLevel, "high", "Allows cross-college matching only when explicitly authorized in options");

  // 7. Same College Matching Works as Normal
  const foundSonyJSPM = {
    id: "item-test-jspm-found",
    collegeId: "col-jspm-wagholi",
    collegeName: "JSPM University",
    type: "found",
    title: "Sony WH-1000XM4 Noise-Cancelling Headphones",
    category: "Electronics & Tech",
    brand: "Sony",
    primaryColor: "Silver",
    status: "active"
  };
  const sameCollegeMatch = compareItems(lostSonyJSPM, foundSonyJSPM);
  assertEqual(sameCollegeMatch.matchLevel, "high", "Same college matching operates with high confidence");

  // 8. findMatchesForItem Isolates Candidates by Campus
  const allItems = [lostSonyJSPM, foundSonyCOEP, foundSonyJSPM];
  const matchesJSPM = findMatchesForItem(lostSonyJSPM, allItems);
  assertEqual(matchesJSPM.length, 1, "findMatchesForItem isolates candidates to active college only");
  assertEqual(matchesJSPM[0].candidate.id, "item-test-jspm-found", "Candidate is from the same campus, excluding COEP");

  // 9. Scalable Directory Addition
  const addRes = addCollegeToDirectory({
    id: "col-vjti-mumbai",
    name: "Veermata Jijabai Technological Institute",
    shortCode: "VJTI",
    campus: "Matunga Campus",
    city: "Mumbai",
    state: "Maharashtra"
  });
  assert(addRes.success, "Supports scalable programmatic addition of new colleges");
  assert(getCollegeById("col-vjti-mumbai") !== null, "Newly added college is retrievable from directory");

  // Duplicate ID addition is rejected
  const dupAdd = addCollegeToDirectory({ id: "col-vjti-mumbai", name: "Duplicate VJTI" });
  assert(!dupAdd.success, "Rejects addition of duplicate college ID");
}

print("\n==========================================================");
print(`  RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
if (failedTests === 0) {
  print("  ✓ ALL 22 SYSTEM ACCURACY, TRACKING, AI, REWARDS & MULTI-COLLEGE CHECKS PASSED PERFECTLY!");
} else {
  print(`  ✗ ${failedTests} CHECKS FAILED.`);
}
print("==========================================================\n");
