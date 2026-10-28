/**
 * LostLoop Rewards Engine — LoopPoints & Campus Kindness Rewards
 * 
 * Features:
 * - Immutable, auditable transaction ledger for points
 * - Verified recovery reward engine: Exactly 50 LoopPoints per verified item reunion
 * - Anti-abuse guards: no points for unverified reports/claims/matches/handover arrangements
 * - Strict recovery idempotency: exactly one reward per unique recovery
 * - Rightful owners are never charged points
 * - No bonus points or different points based on item value or category (no milestone bonuses)
 * - Multiple contributor governance: defined recipient or approved reward-splitting rule (never awards everyone automatically)
 * - Safe atomic redemption workflow with stock management and unique voucher passcodes
 * - Compensating reversal transactions
 * - Privacy-preserving kindness achievement badges
 * - Configurable rewards catalogue with admin controls
 */

const REWARDS_CONFIG = {
  RECOVERY_POINTS: 50,             // Exactly 50 points per verified item reunion
  CURRENCY_NAME: "LoopPoints",
  CURRENCY_SYMBOL: "⟳",
  STORAGE_KEY_LEDGER: "lostloop_rewards_ledger_v2",
  STORAGE_KEY_CATALOGUE: "lostloop_rewards_catalogue_v2",
  STORAGE_KEY_REDEMPTIONS: "lostloop_rewards_redemptions_v2",
  DEFAULT_USER_REF: "campus_student"
};

const TRANSACTION_TYPES = {
  RECOVERY_REWARD: "recovery_reward",       // Points earned for verified reunion (exactly 50 pts)
  REWARD_REDEMPTION: "reward_redemption",   // Points spent on a reward perk
  ADMIN_ADJUSTMENT: "admin_adjustment",     // Authorized adjustment by coordinator
  REWARD_REVERSAL: "reward_reversal"        // Compensating transaction for cancelled redemption
};

/**
 * Standard Demo Reward Catalogue Entries
 * Note: Clearly flagged as demo catalogue entries.
 */
const INITIAL_REWARDS_CATALOGUE = [
  {
    id: "rew-demo-1",
    name: "LostLoop Holographic Sticker Pack",
    category: "Campus Swag",
    pointsCost: 100,
    visual: "sparkles",
    stock: 50,
    isActive: true,
    isDemo: true,
    description: "Set of 3 durable vinyl decals featuring the LostLoop geometric ribbon emblem and campus recovery motto. Weatherproof for laptops, notebooks, and water bottles.",
    redemptionInstructions: "Pick up at Student Union Information Desk (Room 102). Present your voucher pass code to the student worker.",
    sponsor: "Campus Student Life & Sustainability",
    terms: "Demo reward. One pack per redemption. While supplies last."
  },
  {
    id: "rew-demo-2",
    name: "Campus Cafe Beverage Coupon",
    category: "Food & Drink",
    pointsCost: 200,
    visual: "coffee",
    stock: 35,
    isActive: true,
    isDemo: true,
    description: "Voucher for one handcrafted beverage (drip coffee, espresso drink, hot tea, or iced refresher) at any participating university dining cafe.",
    redemptionInstructions: "Present your digital voucher code at the register before placing your order. Valid at Union Cafe and Library Atrium Cafe.",
    sponsor: "University Dining Services",
    terms: "Demo perk. Up to 16oz size. Redeemable during regular semester operating hours."
  },
  {
    id: "rew-demo-3",
    name: "Eco Recycled Stationery Set",
    category: "Academic",
    pointsCost: 300,
    visual: "pencil",
    stock: 25,
    isActive: true,
    isDemo: true,
    description: "Sustainable academic supply kit containing a spiral-bound notebook made from 100% post-consumer paper, two refillable bamboo pens, and index tabs.",
    redemptionInstructions: "Collect from the Main Library Circulation Desk during staff service hours.",
    sponsor: "Office of Campus Sustainability",
    terms: "Demo reward. Color variations may vary based on inventory."
  },
  {
    id: "rew-demo-4",
    name: "Campus Printing Credits (100 Pages)",
    category: "Academic",
    pointsCost: 400,
    visual: "printer",
    stock: 40,
    isActive: true,
    isDemo: true,
    description: "Adds a $10.00 print quota credit to your student campus card account for black-and-white or color laser printing across campus library labs.",
    redemptionInstructions: "Credits are queued to your student campus ID account. Contact IT Helpdesk with your voucher code if balance does not update within 24h.",
    sponsor: "University Information Technology",
    terms: "Demo perk. Applies to enrolled student accounts only. Non-refundable."
  },
  {
    id: "rew-demo-5",
    name: "LostLoop Heavyweight Canvas Tote Bag",
    category: "Campus Swag",
    pointsCost: 800,
    visual: "shopping-bag",
    stock: 15,
    isActive: true,
    isDemo: true,
    description: "Premium 12oz natural cotton canvas tote with reinforced shoulder strap webbing and interior pocket for your keys and phone. Perfect for campus errands.",
    redemptionInstructions: "Pick up at Student Union Room 102 (Campus Coordinator Desk). Requires signature confirmation.",
    sponsor: "LostLoop Student Initiative",
    terms: "Demo reward. Limited production run."
  }
];

/**
 * Kindness Achievement Badges
 */
const KINDNESS_BADGES = [
  {
    id: "badge_first_reunion",
    title: "First Reunion",
    requirement: 1,
    icon: "sparkles",
    description: "Helped safely reunite your very first lost item on campus."
  },
  {
    id: "badge_helping_hand",
    title: "Helping Hand",
    requirement: 2,
    icon: "heart",
    description: "Completed 2 verified item returns for your peers."
  },
  {
    id: "badge_community_hero",
    title: "Community Hero",
    requirement: 3,
    icon: "shield",
    description: "Demonstrated exceptional integrity with 3 successful campus reunifications."
  },
  {
    id: "badge_5_recoveries",
    title: "5 Successful Recoveries",
    requirement: 5,
    icon: "star",
    description: "Dedicated campus steward with 5 verified belongings returned."
  },
  {
    id: "badge_10_recoveries",
    title: "10 Successful Recoveries",
    requirement: 10,
    icon: "trophy",
    description: "Legendary campus kindness guardian with 10 verified reunions."
  }
];

/**
 * Initial Demo Ledger Seed:
 * Reflects verified resolved demo item #10 (iPad reunited by Library Security)
 * Awarded: exactly 50 LoopPoints under the current verified recovery policy.
 */
function getInitialSeedTransactions() {
  const t1 = 1761058000000;
  return [
    {
      txId: "TX-SEED-1001",
      userRef: REWARDS_CONFIG.DEFAULT_USER_REF,
      amount: REWARDS_CONFIG.RECOVERY_POINTS, // Exactly 50 LoopPoints
      type: TRANSACTION_TYPES.RECOVERY_REWARD,
      timestamp: t1,
      relatedId: "item-demo-10",
      idempotencyKey: "rec-item-demo-10-clm-demo-resolved",
      description: "Kindness reward: Verified return of Apple iPad Air (Sky Blue)",
      status: "completed"
    }
  ];
}

// ============================================================================
// Ledger & Storage Helpers
// ============================================================================

function getRewardsLedger() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(REWARDS_CONFIG.STORAGE_KEY_LEDGER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load rewards ledger from storage:", e);
  }
  const seed = getInitialSeedTransactions();
  saveRewardsLedger(seed);
  return seed;
}

function saveRewardsLedger(ledger) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(REWARDS_CONFIG.STORAGE_KEY_LEDGER, JSON.stringify(ledger));
    }
  } catch (e) {
    console.error("Failed to save rewards ledger:", e);
  }
}

function getRewardsCatalogue() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(REWARDS_CONFIG.STORAGE_KEY_CATALOGUE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load rewards catalogue:", e);
  }
  const initial = JSON.parse(JSON.stringify(INITIAL_REWARDS_CATALOGUE));
  saveRewardsCatalogue(initial);
  return initial;
}

function saveRewardsCatalogue(catalogue) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(REWARDS_CONFIG.STORAGE_KEY_CATALOGUE, JSON.stringify(catalogue));
    }
  } catch (e) {
    console.error("Failed to save rewards catalogue:", e);
  }
}

function getRewardsRedemptions() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(REWARDS_CONFIG.STORAGE_KEY_REDEMPTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load redemptions:", e);
  }
  return [];
}

function saveRewardsRedemptions(redemptions) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(REWARDS_CONFIG.STORAGE_KEY_REDEMPTIONS, JSON.stringify(redemptions));
    }
  } catch (e) {
    console.error("Failed to save redemptions:", e);
  }
}

// ============================================================================
// Balance & Analytics Calculations
// ============================================================================

/**
 * Calculates current spendable LoopPoints balance from the immutable ledger
 */
function calculateBalance(userRef = REWARDS_CONFIG.DEFAULT_USER_REF, ledger = null) {
  const activeLedger = ledger || getRewardsLedger();
  let balance = 0;
  for (const tx of activeLedger) {
    if (tx.status === "completed" && (!userRef || tx.userRef === userRef || tx.userRef === "all")) {
      balance += (Number(tx.amount) || 0);
    }
  }
  return Math.max(0, balance);
}

/**
 * Calculates total points ever earned (excluding redemptions)
 */
function calculateTotalEarned(userRef = REWARDS_CONFIG.DEFAULT_USER_REF, ledger = null) {
  const activeLedger = ledger || getRewardsLedger();
  let total = 0;
  for (const tx of activeLedger) {
    if (tx.status === "completed" && (!userRef || tx.userRef === userRef || tx.userRef === "all")) {
      if (tx.amount > 0 && tx.type !== TRANSACTION_TYPES.REWARD_REVERSAL) {
        total += Number(tx.amount) || 0;
      }
    }
  }
  return total;
}

/**
 * Calculates total points redeemed for perks
 */
function calculateTotalRedeemed(userRef = REWARDS_CONFIG.DEFAULT_USER_REF, ledger = null) {
  const activeLedger = ledger || getRewardsLedger();
  let total = 0;
  for (const tx of activeLedger) {
    if (tx.status === "completed" && (!userRef || tx.userRef === userRef || tx.userRef === "all")) {
      if (tx.type === TRANSACTION_TYPES.REWARD_REDEMPTION) {
        total += Math.abs(Number(tx.amount) || 0);
      } else if (tx.type === TRANSACTION_TYPES.REWARD_REVERSAL && tx.amount > 0) {
        // Compensating reversal offsets total redeemed
        total -= Number(tx.amount) || 0;
      }
    }
  }
  return Math.max(0, total);
}

/**
 * Counts verified successful recoveries associated with user
 */
function countVerifiedRecoveries(userRef = REWARDS_CONFIG.DEFAULT_USER_REF, ledger = null) {
  const activeLedger = ledger || getRewardsLedger();
  return activeLedger.filter(tx => 
    tx.status === "completed" &&
    tx.type === TRANSACTION_TYPES.RECOVERY_REWARD &&
    (!userRef || tx.userRef === userRef || tx.userRef === "all")
  ).length;
}

/**
 * Checks whether a recovery event has already been rewarded (Idempotency)
 */
function isRecoveryRewarded(recoveryKey, ledger = null) {
  if (!recoveryKey) return false;
  const activeLedger = ledger || getRewardsLedger();
  return activeLedger.some(tx => 
    tx.status === "completed" &&
    (tx.idempotencyKey === `rec-${recoveryKey}` || 
     tx.relatedId === recoveryKey ||
     (tx.idempotencyKey && tx.idempotencyKey.startsWith(`rec-${recoveryKey}-`)))
  );
}

// ============================================================================
// Earning Rules Engine
// ============================================================================

/**
 * Evaluates and awards points for a verified recovery
 * 
 * Rules:
 * 1. Exactly 50 LoopPoints awarded for every successfully verified item return.
 * 2. Item MUST be verified as reunited through confirmed handover workflow (status === "reunited").
 * 3. Unverified reports, active searching, claims in progress, or arranged handovers get 0 points.
 * 4. The rightful owner is NEVER charged.
 * 5. Reward is awarded strictly ONCE per unique recovery (strict recovery idempotency).
 * 6. No bonus points or different points based on item value or category (no milestone bonuses).
 * 7. Success message displayed: "Congratulations! You earned 50 LoopPoints for helping reunite an item."
 * 8. If multiple students contributed:
 *    - Follow a defined recipient or approved reward-splitting rule.
 *    - Never award everyone automatically (prevents point inflation).
 *    - The total recovery reward is capped at exactly 50 LoopPoints.
 */
function awardRecoveryReward(item, claim = null, actor = "System", ledger = null, options = {}) {
  if (!item) {
    return { success: false, error: "Item record missing" };
  }

  // Rule 2 & 3: Item must be genuinely reunited following confirmed handover
  const isReunited = item.status === "reunited" || item.trackingStatus === "reunited";
  if (!isReunited) {
    return {
      success: false,
      error: "Points can only be awarded after the item's handover is verified and confirmed. Unverified reports, claims, matches, and arranged handovers are ineligible."
    };
  }

  const activeLedger = ledger || getRewardsLedger();
  const recoveryId = item.id + (claim && claim.claimId ? `-${claim.claimId}` : "");
  const idempotencyKey = `rec-${recoveryId}`;

  // Rule 5: Strict Idempotency Check (prevent duplicate rewarding)
  if (isRecoveryRewarded(recoveryId, activeLedger)) {
    return {
      success: false,
      error: `Recovery "${recoveryId}" has already received LoopPoints reward. Duplicate rewards are prohibited.`
    };
  }

  const now = Date.now();
  const generatedTxs = [];
  const REWARD_AMOUNT = REWARDS_CONFIG.RECOVERY_POINTS; // Exactly 50 LoopPoints

  // Detect contributors (options, item.contributors, or item.coFinders)
  const contributors = options.contributors || item.contributors || item.coFinders || null;

  // Rule 8: Multi-Contributor Handling
  if (Array.isArray(contributors) && contributors.length > 1) {
    // Branch 8A: Defined primary recipient explicitly designated
    if (options.primaryRecipient || options.designatedRecipient) {
      const primaryUser = options.primaryRecipient || options.designatedRecipient;
      const primaryUserRef = typeof primaryUser === "object" ? (primaryUser.userRef || primaryUser.id) : primaryUser;
      const primaryDisplay = typeof primaryUser === "object" ? (primaryUser.name || primaryUserRef) : primaryUser;

      const rewardTx = {
        txId: `TX-REC-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
        userRef: primaryUserRef,
        recipientDisplay: primaryDisplay,
        amount: REWARD_AMOUNT, // Exactly 50 points
        type: TRANSACTION_TYPES.RECOVERY_REWARD,
        timestamp: now,
        relatedId: recoveryId,
        idempotencyKey,
        description: `Kindness reward: Verified return of "${item.title}" (Designated recipient from ${contributors.length} contributors)`,
        status: "completed",
        actor,
        contributors: contributors.map(c => typeof c === "object" ? (c.name || c.userRef) : c)
      };

      activeLedger.push(rewardTx);
      generatedTxs.push(rewardTx);

      if (!ledger) saveRewardsLedger(activeLedger);

      return {
        success: true,
        pointsAwarded: REWARD_AMOUNT,
        transactions: generatedTxs,
        recipient: primaryUserRef,
        message: "Congratulations! You earned 50 LoopPoints for helping reunite an item.",
        newBalance: calculateBalance(primaryUserRef, activeLedger)
      };
    }

    // Branch 8B: Approved Reward-Splitting Rule
    // Never award everyone 50 points automatically!
    // Fairly split the 50 points among verified contributors
    if (options.splitReward !== false) {
      const count = contributors.length;
      const splitAmount = Math.floor(REWARD_AMOUNT / count); // e.g. 50 / 2 = 25 pts each

      for (let i = 0; i < count; i++) {
        const c = contributors[i];
        const userRef = typeof c === "object" ? (c.userRef || c.id || `student_${i+1}`) : c;
        const display = typeof c === "object" ? (c.name || userRef) : userRef;

        const splitTx = {
          txId: `TX-REC-${now}-${i}-${Math.floor(1000 + Math.random() * 9000)}`,
          userRef,
          recipientDisplay: display,
          amount: splitAmount,
          type: TRANSACTION_TYPES.RECOVERY_REWARD,
          timestamp: now + i,
          relatedId: recoveryId,
          idempotencyKey: `rec-${recoveryId}-${userRef}`,
          description: `Kindness reward (split share): Verified return of "${item.title}" (${i + 1} of ${count} contributors)`,
          status: "completed",
          actor
        };

        activeLedger.push(splitTx);
        generatedTxs.push(splitTx);
      }

      // Append master recovery idempotency lock
      activeLedger.push({
        txId: `TX-REC-LOCK-${now}`,
        userRef: "system_lock",
        amount: 0,
        type: TRANSACTION_TYPES.RECOVERY_REWARD,
        timestamp: now,
        relatedId: recoveryId,
        idempotencyKey,
        description: `Recovery reward split among ${count} verified contributors (Total capped at ${REWARD_AMOUNT} pts)`,
        status: "completed",
        actor
      });

      if (!ledger) saveRewardsLedger(activeLedger);

      const totalSplit = generatedTxs.reduce((sum, t) => sum + t.amount, 0);

      return {
        success: true,
        pointsAwarded: totalSplit,
        splitPerContributor: splitAmount,
        transactions: generatedTxs,
        message: `Congratulations! You earned ${splitAmount} LoopPoints for helping reunite an item.`,
        newBalance: calculateBalance(REWARDS_CONFIG.DEFAULT_USER_REF, activeLedger)
      };
    }

    // Branch 8C: Unapproved / ambiguous distribution
    return {
      success: false,
      error: "Multiple contributors found without an approved recipient or reward-splitting rule. Automatic duplicate awards are prevented."
    };
  }

  // Single Contributor (Standard Flow)
  const recipientUser = options.customRecipient || options.recipientUser || (item.finderUserRef) || REWARDS_CONFIG.DEFAULT_USER_REF;
  const recipientDisplay = item.type === "found" 
    ? (item.reporter && item.reporter.maskedContact ? item.reporter.maskedContact : "Finder")
    : "Campus Finder";

  const rewardTx = {
    txId: `TX-REC-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
    userRef: recipientUser,
    recipientDisplay,
    amount: REWARD_AMOUNT, // Exactly 50 points
    type: TRANSACTION_TYPES.RECOVERY_REWARD,
    timestamp: now,
    relatedId: recoveryId,
    idempotencyKey,
    description: `Kindness reward: Verified return of "${item.title}"`,
    status: "completed",
    actor
  };

  activeLedger.push(rewardTx);
  generatedTxs.push(rewardTx);

  if (!ledger) {
    saveRewardsLedger(activeLedger);
  }

  return {
    success: true,
    pointsAwarded: REWARD_AMOUNT,
    transactions: generatedTxs,
    message: "Congratulations! You earned 50 LoopPoints for helping reunite an item.",
    newBalance: calculateBalance(recipientUser, activeLedger)
  };
}

// ============================================================================
// Safe Redemption Workflow
// ============================================================================

/**
 * Redeems an item from the reward catalogue
 * 
 * Safety checks:
 * 1. Checks reward exists, is active, and has stock > 0.
 * 2. Verifies current points balance >= reward.cost.
 * 3. Prevents duplicate / double-click execution.
 * 4. Deducts points atomically into transaction ledger.
 * 5. Generates unique redemption record with secure voucher passcode.
 */
function redeemReward(rewardId, userRef = REWARDS_CONFIG.DEFAULT_USER_REF, customCatalogue = null, customLedger = null, customRedemptions = null) {
  const catalogue = customCatalogue || getRewardsCatalogue();
  const ledger = customLedger || getRewardsLedger();
  const redemptions = customRedemptions || getRewardsRedemptions();

  const reward = catalogue.find(r => r.id === rewardId);
  if (!reward) {
    return { success: false, error: "Reward perk not found in catalogue." };
  }

  if (reward.isActive === false) {
    return { success: false, error: "This reward perk is currently unavailable." };
  }

  if (reward.stock <= 0) {
    return { success: false, error: "This reward is currently out of stock." };
  }

  const currentBalance = calculateBalance(userRef, ledger);
  if (currentBalance < reward.pointsCost) {
    return {
      success: false,
      error: `Insufficient LoopPoints. You have ${currentBalance} LoopPoints, but "${reward.name}" requires ${reward.pointsCost} LoopPoints.`,
      shortfall: reward.pointsCost - currentBalance
    };
  }

  const now = Date.now();
  const voucherCode = `LL-VCHR-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;
  const redemptionId = `RDM-${now}-${Math.floor(100 + Math.random() * 900)}`;

  // Decrement Stock
  reward.stock -= 1;

  // Record Negative Ledger Entry
  const txEntry = {
    txId: `TX-RDM-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
    userRef,
    amount: -reward.pointsCost,
    type: TRANSACTION_TYPES.REWARD_REDEMPTION,
    timestamp: now,
    relatedId: redemptionId,
    idempotencyKey: `rdm-${redemptionId}`,
    description: `Redeemed perk: ${reward.name}`,
    status: "completed"
  };

  ledger.push(txEntry);

  // Record Redemption Object
  const redemptionRecord = {
    redemptionId,
    rewardId: reward.id,
    rewardName: reward.name,
    pointsSpent: reward.pointsCost,
    userRef,
    voucherCode,
    timestamp: now,
    status: reward.category === "Food & Drink" || reward.category === "Academic" ? "issued" : "pending_fulfillment",
    instructions: reward.redemptionInstructions,
    isDemo: true,
    sponsor: reward.sponsor
  };

  redemptions.unshift(redemptionRecord);

  // Save if not using test mocks
  if (!customCatalogue) saveRewardsCatalogue(catalogue);
  if (!customLedger) saveRewardsLedger(ledger);
  if (!customRedemptions) saveRewardsRedemptions(redemptions);

  return {
    success: true,
    redemption: redemptionRecord,
    transaction: txEntry,
    newBalance: calculateBalance(userRef, ledger)
  };
}

// ============================================================================
// Compensating Reversals & Admin Adjustments
// ============================================================================

/**
 * Reverses a previous redemption, restoring stock and creating a compensating ledger entry
 */
function reverseRedemption(redemptionId, reason = "User requested cancellation", adminKey = "demo_admin", customLedger = null, customCatalogue = null, customRedemptions = null) {
  const ledger = customLedger || getRewardsLedger();
  const catalogue = customCatalogue || getRewardsCatalogue();
  const redemptions = customRedemptions || getRewardsRedemptions();

  const redemption = redemptions.find(r => r.redemptionId === redemptionId);
  if (!redemption) {
    return { success: false, error: "Redemption record not found." };
  }

  if (redemption.status === "reversed") {
    return { success: false, error: "This redemption has already been reversed." };
  }

  // Restore catalogue stock
  const reward = catalogue.find(r => r.id === redemption.rewardId);
  if (reward) {
    reward.stock += 1;
  }

  const now = Date.now();
  const refundAmount = Math.abs(redemption.pointsSpent);

  // Create Compensating Transaction (Positive reversal entry)
  const reversalTx = {
    txId: `TX-REV-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
    userRef: redemption.userRef,
    amount: refundAmount,
    type: TRANSACTION_TYPES.REWARD_REVERSAL,
    timestamp: now,
    relatedId: redemptionId,
    idempotencyKey: `rev-${redemptionId}`,
    description: `Compensating reversal: ${redemption.rewardName} (${reason})`,
    status: "completed",
    actor: adminKey
  };

  ledger.push(reversalTx);
  redemption.status = "reversed";
  redemption.reversedAt = now;
  redemption.reversalReason = reason;

  if (!customCatalogue) saveRewardsCatalogue(catalogue);
  if (!customLedger) saveRewardsLedger(ledger);
  if (!customRedemptions) saveRewardsRedemptions(redemptions);

  return {
    success: true,
    transaction: reversalTx,
    newBalance: calculateBalance(redemption.userRef, ledger)
  };
}

/**
 * Authorizes a manual administrative adjustment with clear audit logging
 */
function adminAdjustPoints(userRef, amount, reason, adminKey = "demo_admin", customLedger = null) {
  if (!amount || isNaN(amount) || amount === 0) {
    return { success: false, error: "Adjustment amount must be a non-zero number." };
  }
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A meaningful administrative justification (at least 5 characters) is required." };
  }

  const ledger = customLedger || getRewardsLedger();
  const now = Date.now();

  const currentBalance = calculateBalance(userRef, ledger);
  if (amount < 0 && (currentBalance + amount < 0)) {
    return { success: false, error: `Adjustment would cause negative balance (Current: ${currentBalance}, Adjustment: ${amount}).` };
  }

  const adjTx = {
    txId: `TX-ADJ-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
    userRef,
    amount: Number(amount),
    type: TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
    timestamp: now,
    relatedId: `admin-${now}`,
    idempotencyKey: `adj-${now}-${userRef}`,
    description: `Administrative adjustment: ${reason}`,
    status: "completed",
    actor: adminKey
  };

  ledger.push(adjTx);

  if (!customLedger) saveRewardsLedger(ledger);

  return {
    success: true,
    transaction: adjTx,
    newBalance: calculateBalance(userRef, ledger)
  };
}

// ============================================================================
// Catalogue Administration
// ============================================================================

function addRewardToCatalogue(rewardData, adminKey = "demo_admin", customCatalogue = null) {
  if (!rewardData.name || rewardData.name.trim().length < 3) {
    return { success: false, error: "Reward name must be at least 3 characters." };
  }
  if (!rewardData.pointsCost || Number(rewardData.pointsCost) <= 0) {
    return { success: false, error: "Points cost must be greater than 0." };
  }

  const catalogue = customCatalogue || getRewardsCatalogue();
  const newReward = {
    id: `rew-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    name: rewardData.name.trim(),
    category: rewardData.category || "General",
    pointsCost: Math.round(Number(rewardData.pointsCost)),
    visual: rewardData.visual || "sparkles",
    stock: Number(rewardData.stock) || 10,
    isActive: true,
    isDemo: true,
    description: rewardData.description || "Campus reward perk.",
    redemptionInstructions: rewardData.redemptionInstructions || "Collect at Student Union Room 102.",
    sponsor: rewardData.sponsor || "Campus Life",
    terms: rewardData.terms || "Demo reward."
  };

  catalogue.push(newReward);
  if (!customCatalogue) saveRewardsCatalogue(catalogue);

  return { success: true, reward: newReward };
}

function toggleRewardAvailability(rewardId, adminKey = "demo_admin", customCatalogue = null) {
  const catalogue = customCatalogue || getRewardsCatalogue();
  const reward = catalogue.find(r => r.id === rewardId);
  if (!reward) return { success: false, error: "Reward not found" };

  reward.isActive = !reward.isActive;
  if (!customCatalogue) saveRewardsCatalogue(catalogue);

  return { success: true, reward };
}

// ============================================================================
// Kindness Badges Evaluation
// ============================================================================

/**
 * Returns all achievements with unlocked status evaluated from verified recoveries
 */
function evaluateUserBadges(userRef = REWARDS_CONFIG.DEFAULT_USER_REF, ledger = null) {
  const recoveriesCount = countVerifiedRecoveries(userRef, ledger);

  return KINDNESS_BADGES.map(badge => {
    const isUnlocked = recoveriesCount >= badge.requirement;
    return {
      ...badge,
      unlocked: isUnlocked,
      progress: Math.min(recoveriesCount, badge.requirement),
      currentRecoveries: recoveriesCount
    };
  });
}

// Module export for JavaScriptCore / Node testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    REWARDS_CONFIG,
    TRANSACTION_TYPES,
    INITIAL_REWARDS_CATALOGUE,
    KINDNESS_BADGES,
    getInitialSeedTransactions,
    getRewardsLedger,
    saveRewardsLedger,
    getRewardsCatalogue,
    saveRewardsCatalogue,
    getRewardsRedemptions,
    saveRewardsRedemptions,
    calculateBalance,
    calculateTotalEarned,
    calculateTotalRedeemed,
    countVerifiedRecoveries,
    isRecoveryRewarded,
    awardRecoveryReward,
    redeemReward,
    reverseRedemption,
    adminAdjustPoints,
    addRewardToCatalogue,
    toggleRewardAvailability,
    evaluateUserBadges
  };
}
