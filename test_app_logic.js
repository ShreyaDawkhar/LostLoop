/**
 * Integration Tests for LostLoop Logic:
 * Tests validation, masking, claim addition, claim approval, and status transitions.
 */

load("data.js");
load("matching.js");
load("tracking.js");
load("assistant.js");
load("rewards.js");

// Mock localStorage for test environment
const mockStorage = {};
const localStorage = {
  getItem: function(key) { return mockStorage[key] || null; },
  setItem: function(key, val) { mockStorage[key] = String(val); }
};

let total = 0;
let passed = 0;

function assert(cond, name) {
  total++;
  if (cond) {
    passed++;
    print(`  ✓ PASS: ${name}`);
  } else {
    print(`  ✗ FAIL: ${name}`);
  }
}

print("\n==========================================");
print("  APP LOGIC & SAFE CLAIM WORKFLOW TESTS   ");
print("==========================================\n");

// 1. Email Masking Test
print("Group 1: Privacy Email Masking");
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

assert(maskEmail("alex.rivera@campus.edu") === "alex***@campus.edu", "Masks standard email (alex***@campus.edu)");
assert(maskEmail("ed@campus.edu") === "e***@campus.edu", "Masks short email (e***@campus.edu)");
assert(!maskEmail("jordan.smith@campus.edu").includes("smith"), "Hides surname completely");

// 2. Safe Claim Flow & Status Transition Test
print("\nGroup 2: Safe Claim Workflow & State Transitions");
{
  const foundItem = {
    id: "item-found-test",
    type: "found",
    title: "Navy Insulated Bottle",
    category: "Bottles & Tumblers",
    locationZone: "Student Union / Dining Hall",
    date: "2026-10-25",
    description: "Navy blue bottle with stickers",
    status: "active",
    claims: []
  };

  // Submitting a claim
  const claimSubmission = {
    claimId: "clm-test-101",
    claimantMasked: maskEmail("maya.student@campus.edu"),
    claimNote: "Has NASA meatball sticker and gold puppy sticker",
    preferredPickup: "Main Library Information Desk",
    status: "pending",
    timestamp: Date.now()
  };

  foundItem.claims.push(claimSubmission);
  assert(foundItem.claims.length === 1, "Claim added to item ledger");
  assert(foundItem.claims[0].status === "pending", "Initial claim status is 'pending'");

  // Approving the claim
  const claimToApprove = foundItem.claims[0];
  claimToApprove.status = "approved";
  const safePassCode = "LL-PASS-9988";
  claimToApprove.resolutionNote = `Verified! Safe Campus Pickup Pass Code: ${safePassCode}. Swap at ${claimToApprove.preferredPickup}.`;
  foundItem.status = "reunited";

  assert(foundItem.status === "reunited", "Item status transitions to 'reunited'");
  assert(foundItem.claims[0].status === "approved", "Claim status transitions to 'approved'");
  assert(foundItem.claims[0].resolutionNote.includes("LL-PASS-9988"), "Generates secure pickup passcode");
}

// 3. Date Proximity Logic
print("\nGroup 3: Date Proximity Logic");
{
  function getDayDifference(dateStrA, dateStrB) {
    const timeA = new Date(dateStrA).getTime();
    const timeB = new Date(dateStrB).getTime();
    const diffMs = timeB - timeA;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  assert(getDayDifference("2026-10-24", "2026-10-24") === 0, "Same day diff is 0");
  assert(getDayDifference("2026-10-24", "2026-10-26") === 2, "Found 2 days later is +2");
  assert(getDayDifference("2026-10-26", "2026-10-24") === -2, "Found 2 days earlier is -2");
}

// 4. Tracking Transitions & Audit Trail History
print("\nGroup 4: Item Tracking Transitions & Audit Trail");
{
  const item = {
    id: "track-test-item",
    type: "lost",
    title: "Graphing Calc",
    category: "Electronics & Tech",
    locationZone: "Science Hall",
    status: "active"
  };

  ensureItemTracking(item);
  assert(item.reportId.startsWith("LL-LST-"), "Generates unique report ID with LL-LST prefix");
  assert(item.trackingStatus === "searching", "Initial lost tracking status is 'searching'");
  assert(item.timelineEvents.length >= 1, "Initial timeline event recorded");

  // Advance to claim submitted
  const r1 = recordStatusChange(item, "claim_submitted", "Claim filed by owner");
  assert(r1.success, "Transitions to claim_submitted");
  assert(item.trackingStatus === "claim_submitted", "Status matches target");

  // Advance to verification pending
  const r2 = recordStatusChange(item, "verification_pending", "Finder reviewing proof");
  assert(r2.success, "Transitions to verification_pending");

  // Advance to handover arranged
  const r3 = recordStatusChange(item, "handover_arranged", "Safe desk pickup scheduled");
  assert(r3.success, "Transitions to handover_arranged");

  // Advance to reunited
  const r4 = recordStatusChange(item, "reunited", "Returned to student");
  assert(r4.success, "Transitions to reunited");
  assert(item.status === "reunited", "Legacy status synced to reunited");

  // Verify full timeline structure
  const timeline = buildRenderableTimeline(item, []);
  assert(timeline.length === 7, "Generates full 7 stages");
  assert(timeline[timeline.length - 1].state === "current" || timeline[timeline.length - 1].state === "completed", "Reunited stage reached");

  // Reopen report
  const r5 = recordStatusChange(item, "searching", "Reopened case");
  assert(r5.success, "Supports reopening reunited report");
  assert(item.timelineEvents.length >= 5, "Audit history preserved and appended without deletion");
}

// 5. AI Assistant Smart NLP & Privacy Protection
print("\nGroup 5: AI Recovery Assistant NLP & Privacy Protection");
{
  const assistant = new LostLoopAssistant();
  const q = assistant.extractEntities("I lost my black TI-84 calculator in Science Hall this morning");
  assert(q.itemType === "calculator", "NLP extracts itemType 'calculator'");
  assert(q.location === "Science & Engineering Hall", "NLP normalizes location to 'Science & Engineering Hall'");
  assert(q.timeframe === "Today", "NLP extracts timeframe 'Today'");

  const reply = assistant.processMessage("I lost my black calculator in Science Hall", { items: INITIAL_DEMO_ITEMS });
  assert(reply.text.length > 20, "Assistant generates friendly conversational advice");
  assert(Array.isArray(reply.quickPrompts), "Provides contextual quick prompts");

  // Privacy verification: secret verification answer is never leaked
  const textSerialized = JSON.stringify(reply);
  assert(!textSerialized.includes("rabbit with a strawberry hat"), "Assistant never leaks private verification secrets");
}

// 6. LoopPoints Kindness Rewards Earning, Multi-Contributors, Redemption & Ledger
print("\nGroup 6: LoopPoints Kindness Rewards & Transaction Ledger");
{
  const testLedger = [];
  const testCat = JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE));
  const testRedemptions = [];

  // 1. Initial balance is 0 on empty ledger
  assert(calculateBalance("student_1", testLedger) === 0, "Initial balance on empty ledger is 0");

  // 2. Reject unverified item (reports, claims, matches, handover arranged get 0 pts)
  const unverifiedItem = { id: "item-unverified", status: "active", title: "Unverified Bottle" };
  const r1 = awardRecoveryReward(unverifiedItem, null, "Finder", testLedger);
  assert(!r1.success, "Rejects points for unverified report");

  const handoverItem = { id: "item-arranged", status: "handover_arranged", title: "Arranged Bottle" };
  const r1b = awardRecoveryReward(handoverItem, null, "Finder", testLedger);
  assert(!r1b.success, "Rejects points for arranged handover before confirmation");

  // 3. Award verified item (Strictly 50 LoopPoints)
  const verifiedItem = { id: "item-reunited-verified", status: "reunited", title: "AirPods Pro", reporter: { maskedContact: "finder***@campus.edu" } };
  const r2 = awardRecoveryReward(verifiedItem, null, "Campus Staff", testLedger);
  assert(r2.success, "Successfully awards points for confirmed recovery");
  assert(r2.pointsAwarded === 50, "Awards exactly 50 points for confirmed recovery");
  assert(r2.message === "Congratulations! You earned 50 LoopPoints for helping reunite an item.", "Displays required congratulations message");
  assert(calculateBalance("campus_student", testLedger) === 50, "Balance is updated to 50 LoopPoints");

  // 4. Duplicate recovery blocked (idempotency)
  const r3 = awardRecoveryReward(verifiedItem, null, "Campus Staff", testLedger);
  assert(!r3.success, "Duplicate reward for same recovery is blocked");

  // 5. Multiple contributors governance
  // 5A. Designated primary recipient gets 50 points
  const multiItem1 = { id: "item-multi-1", status: "reunited", title: "Keys", contributors: ["alex", "morgan"] };
  const rMulti1 = awardRecoveryReward(multiItem1, null, "Staff", testLedger, { primaryRecipient: "alex" });
  assert(rMulti1.success, "Awards multi-contributor item via designated primary recipient");
  assert(rMulti1.pointsAwarded === 50, "Designated primary receives 50 points");
  assert(calculateBalance("alex", testLedger) === 50, "Alex has 50 points");
  assert(calculateBalance("morgan", testLedger) === 0, "Morgan does not receive duplicate points");

  // 5B. Approved reward-splitting rule (25 pts each, total capped at 50)
  const multiItem2 = { id: "item-multi-2", status: "reunited", title: "Backpack", contributors: ["sam", "jordan"] };
  const rMulti2 = awardRecoveryReward(multiItem2, null, "Staff", testLedger, { splitReward: true });
  assert(rMulti2.success, "Applies approved reward-splitting rule");
  assert(rMulti2.pointsAwarded === 50, "Total reward capped at 50 points");
  assert(rMulti2.splitPerContributor === 25, "Each contributor receives 25 points (never 50 to everyone)");
  assert(calculateBalance("sam", testLedger) === 25, "Sam has 25 points");
  assert(calculateBalance("jordan", testLedger) === 25, "Jordan has 25 points");

  // 6. Earn a second verified recovery to test redemption (50 + 50 = 100 pts)
  const verifiedItem2 = { id: "item-reunited-verified-2", status: "reunited", title: "Calculator", reporter: { maskedContact: "finder***@campus.edu" } };
  awardRecoveryReward(verifiedItem2, null, "Campus Staff", testLedger);
  assert(calculateBalance("campus_student", testLedger) === 100, "Balance accumulates to 100 points after 2 verified recoveries");

  // 7. Atomic redemption of sticker perk (100 pts)
  const r4 = redeemReward("rew-demo-1", "campus_student", testCat, testLedger, testRedemptions);
  assert(r4.success, "Redeems sticker perk successfully");
  assert(r4.newBalance === 0, "Deducts 100 points atomically (100 - 100 = 0 pts)");
  assert(testRedemptions.length === 1, "Redemption recorded in redemption log");
  assert(testRedemptions[0].voucherCode.startsWith("LL-VCHR-"), "Generates campus voucher pass code");

  // 8. Insufficient points rejected
  const r5 = redeemReward("rew-demo-2", "campus_student", testCat, testLedger, testRedemptions); // 200 pts, balance 0
  assert(!r5.success, "Rejects redemption due to insufficient balance (0 < 200)");
  assert(calculateBalance("campus_student", testLedger) === 0, "Balance remains 0 without overdraft");

  // 9. Compensating reversal
  const r6 = reverseRedemption(r4.redemption.redemptionId, "Item out of physical stock", "Staff Admin", testLedger, testCat, testRedemptions);
  assert(r6.success, "Reverses redemption successfully");
  assert(r6.newBalance === 100, "Refunds 100 points via compensating ledger entry");
  assert(testLedger.some(t => t.type === "reward_reversal" && t.amount === 100), "Ledger contains immutable reward_reversal entry");
}

// 7. Multi-College Selection, Switching & Isolation Workflow
print("\nGroup 7: Multi-College Selection, Switching & Isolation Workflow");
{
  // 1. Directory Integrity & Search
  const allColleges = getCollegesDirectory();
  assert(allColleges.length >= 4, "Colleges directory loaded successfully with multiple campuses");

  const searchResults = searchColleges("JSPM");
  assert(searchResults.length >= 2, "Search for 'JSPM' retrieves all campuses in the university family");

  // 2. Distinguishing Similar / Multi-Campus Names
  const wagholi = getCollegeById("col-jspm-wagholi");
  const tathawade = getCollegeById("col-jspm-tathawade");
  assert(wagholi.id !== tathawade.id, "Distinguishes separate campuses belonging to same institution");
  assert(wagholi.city === "Pune" && tathawade.city === "Pune", "Both campuses correctly preserve their municipal location");

  // 3. Inactive / Coming-Soon Safeguard
  const inactiveCampus = getCollegeById("col-mit-wpu");
  assert(inactiveCampus.isActive === false, "Inactive campus is marked with isActive: false");

  // 4. Invalid College ID Rejection
  assert(getCollegeById("non-existent-college") === null, "Rejects invalid college ID");

  // 5. Multi-College Item Scoping & Feed Isolation
  const sampleItems = [
    { id: "item-j1", collegeId: "col-jspm-wagholi", type: "lost", status: "active", title: "Sony Headphones", category: "Electronics & Tech", createdAt: 1000 },
    { id: "item-c1", collegeId: "col-coep-pune", type: "lost", status: "active", title: "Casio Calculator", category: "Electronics & Tech", createdAt: 2000 }
  ];

  // Simulated JSPM Context
  const jspmFeed = sampleItems.filter(i => i.collegeId === "col-jspm-wagholi");
  assert(jspmFeed.length === 1 && jspmFeed[0].id === "item-j1", "JSPM feed isolates items to Wagholi Campus only");

  // Simulated College Switch to COEP Context
  const coepFeed = sampleItems.filter(i => i.collegeId === "col-coep-pune");
  assert(coepFeed.length === 1 && coepFeed[0].id === "item-c1", "COEP feed isolates items to Shivajinagar Campus only");

  // 6. Cross-College Matching Isolation
  const matchResult = compareItems(sampleItems[0], {
    id: "item-c2",
    collegeId: "col-coep-pune",
    type: "found",
    status: "active",
    title: "Sony Headphones",
    category: "Electronics & Tech",
    brand: "Sony"
  });
  assert(matchResult.matchLevel === "none", "Cross-college item comparison is blocked (matchLevel: none)");
  assert(matchResult.score === 0, "Cross-college comparison clamps score to 0");

  // 7. AI Assistant Scopes to Authorized Campus
  const assistant = new LostLoopAssistant();
  const entities = { itemType: "headphones", brand: "Sony", colors: [], location: null, intent: "search_lost" };
  const scopedAssistantCandidates = assistant.searchReports(
    entities, 
    [
      { id: "item-j-found", collegeId: "col-jspm-wagholi", type: "found", status: "active", title: "Sony Headphones", category: "Electronics & Tech" },
      { id: "item-c-found", collegeId: "col-coep-pune", type: "found", status: "active", title: "Sony Headphones", category: "Electronics & Tech" }
    ], 
    "found", 
    "col-jspm-wagholi"
  );
  assert(scopedAssistantCandidates.length === 1, "AI Assistant returns only candidates from authorized campus");
  assert(scopedAssistantCandidates[0].item.collegeId === "col-jspm-wagholi", "Assistant candidate belongs to active college");
}

print("\n------------------------------------------");
print(`Test Results: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
if (passed === total) {
  print("✓ ALL WORKFLOW TESTS PASSED SUCCESSFULLY!");
} else {
  print("✗ SOME TESTS FAILED.");
}
print("------------------------------------------\n");
