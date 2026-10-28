HEAD
# LostLoop — Campus Lost & Found Web Application

**LostLoop** is a mobile-friendly, privacy-first web application designed specifically for college campuses. It combines an explainable matching engine with an editorial visual design inspired by top-tier modern product systems.

---

## 📌 Major Systems

### 1. LoopPoints — Campus Kindness Rewards (`rewards.js`)
A gamified student kindness rewards system built to recognize and celebrate verified acts of campus integrity:

- **LoopPoints Wallet**:
  - Accessible directly from the top navigation bar and mobile bottom nav.
  - Live balance indicator (`#navLoopPointsBadge`) and detailed wallet view (`#view-rewards`).
  - Displays **Current Spendable Balance**, **Total Earned**, **Total Redeemed**, and **Verified Reunions Count**.
  - Dynamic progress bar illustrating points needed to unlock the next available catalogue perk.
- **Strict 50 LoopPoints Earning Policy**:
  - **Award exactly 50 LoopPoints** to the eligible student who genuinely helped return the item upon confirmed verification and handover.
  - Success message: *"Congratulations! You earned 50 LoopPoints for helping reunite an item."*
  - **No Bonus Points**: Milestone bonuses, value-based points, or category multipliers are strictly prohibited.
  - **Anti-Abuse Controls**:
    - Points are **never awarded** simply for submitting a lost or found report, submitting a claim, matching, or arranging a handover.
    - Potential matches, unverified claims, and unconfirmed handovers earn **0 points**.
    - The rightful owner is **never charged points**.
    - **Recovery Idempotency**: Each verified recovery can be rewarded **strictly once**. Duplicate events for the same item are blocked.
  - **Multiple Contributor Governance**:
    - If multiple students contributed, follows an approved designated primary recipient rule (awarding the 50 points to the designated student) OR an approved reward-splitting rule (e.g. 25 points each for 2 contributors, total pool strictly capped at 50 points).
    - **Never awards everyone automatically**, preventing point inflation and duplicate claims.
- **Reward Marketplace & Demo Catalogue**:
  - *LostLoop Holographic Sticker Pack* — 100 pts (Swag)
  - *Campus Cafe Beverage Coupon* — 200 pts (Food & Drink)
  - *Eco Recycled Stationery Set* — 300 pts (Academic)
  - *Campus Printing Credits (100 Pages)* — 400 pts (Academic)
  - *LostLoop Heavyweight Canvas Tote Bag* — 800 pts (Swag)
  - All perks are clearly marked with an official **"Demo Reward"** banner to distinguish mock campus offers from production perks.
- **Safe Atomic Redemption Workflow**:
  - Validates active catalogue availability and stock in real time.
  - Verifies spendable points balance (prevents negative balances).
  - Employs double-click and debounce protection.
  - Decrements catalogue stock and deducts points atomically.
  - Generates an official, unique campus voucher pass code (e.g. `LL-VCHR-4921-884`).
  - Distinguishes digital vouchers from physical items awaiting fulfillment.
- **Immutable Transaction Ledger & Reversals**:
  - Maintains an auditable, append-only history of transactions (`recovery_reward`, `reward_redemption`, `admin_adjustment`, `reward_reversal`).
  - No silent deletions: cancelled redemptions create positive **compensating reversal ledger entries** while restoring stock.
- **Coordinator / Administrator Tools**:
  - Collapsible administrative panel for campus coordinators to add custom perks, toggle inventory stock, and apply manual points adjustments with mandatory audit justifications.
- **Kindness Badges & Recognition**:
  - Opt-in, privacy-preserving achievement milestones (*First Reunion*, *Helping Hand*, *Community Hero*, *5 Successful Recoveries*, *10 Successful Recoveries*).
  - No unconsented public leaderboards or exposure of private student data.



### 2. Complete Item Tracking System (`tracking.js`)
Every reported **Lost** or **Found** item possesses its own dedicated tracking panel with an independent, timestamped recovery timeline:

- **Unique Report IDs**: Standardized campus identifiers (e.g., `LL-LST-1001` or `LL-FND-1002`).
- **Vertical Recovery Timeline**:
  - **Completed Stages**: Marked in accessible emerald green (`#10b981`) with verified checkmarks and completion timestamps.
  - **Current Active Stage**: Highlighted in vibrant blue (`#2563eb`) with an animated pulsing halo ring.
  - **Upcoming Stages**: Presented in clean, neutral styling.
- **7-Stage Lost Item Journey**:
  1. *Report Created* &rarr; 2. *Searching for Matches* &rarr; 3. *Potential Match Found* &rarr; 4. *Claim Submitted* &rarr; 5. *Verification Pending* &rarr; 6. *Handover Arranged* &rarr; 7. *Reunited*.
- **Found Item Journey**:
  1. *Found Item Reported* &rarr; 2. *Published & Awaiting Owner* &rarr; 3. *Potential Claim Received* &rarr; 4. *Verification Pending* &rarr; 5. *Handover Arranged* &rarr; 6. *Returned to Owner / Reunited*.
- **State Machine Integrity**:
  - Invalid state skips (e.g. jumping directly from `created` to `reunited`) are strictly blocked.
  - If a user withdraws or closes a report, historical timeline events are **strictly preserved**.
  - Direct access via the **"Track Item"** button on any card in the feed.



### 3. LostLoop AI Recovery Assistant (`assistant.js`)
Accessible via the floating **"Recovery Assistant"** button at the bottom-right:

- **Natural Language Entity Extraction**: Interprets conversational queries to extract belonging types, categories, brands, colors, locations, and distinguishing marks.
- **Calibrated Qualitative Match Labels**: Replaces fake AI percentages with clear qualitative badges: **"Strong candidate"** and **"Possible match"**.
- **Strict Privacy Guarantee**:
  - Secret verification challenge answers (e.g. lock screen photo details, secret serial numbers) are **strictly filtered out and never exposed** in assistant messages.
  - Student emails remain masked (`m.pat***@campus.edu`).
- **Offline-First Operation**: 100% client-side local rule engine without third-party network dependencies.

---

### 4. Accurate Match Engine (`matching.js`)
- **Noun & Taxonomy Gate**: Immediately rejects cross-category false matches (e.g. coats vs headphones) even if both share incidental words like "black" or "case".
- **Campus Isolation Gate**: Blocks matches between items reported at different institutions by default. Allows cross-campus matching only if explicitly authorized.
- **Brand Conflict Disqualification**: Explicitly rejects candidates with conflicting brands (e.g. Sony vs Bose).
- **Neutral Missing Information**: Missing fields receive neutral scoring without penalty or hallucinated assumptions.
- **Distinguishing Mark Weighting**: Decals, stickers, and unique marks strongly elevate ranking.
- **Minimum Relevance Gate**: Returns clean `"No strong matches yet"` instead of forcing irrelevant suggestions.



### 5. Multi-College Architecture & Campus Isolation (`data.js`, `app.js`)
A scalable multi-institution architecture allowing students from different universities to use LostLoop with strict data isolation:

- **First-Entry College Selection Screen**:
  - Displayed to first-time visitors before accessing the main dashboard.
  - Deep studio dark UI with LostLoop branding, search bar, searchable college list, and disabled "Continue" button until a valid college is picked.
  - Smooth entrance animations and responsive mobile styling.
- **Structured College Directory (`COLLEGES_DIRECTORY`)**:
  - Sample institutions: JSPM University (Wagholi), JSPM RSCOE (Tathawade), COEP Technological University (Shivajinagar), IIT Bombay (Powai), BITS Pilani (Goa), University of Delhi (North Campus), and MIT-WPU (Inactive test sample).
  - Handles duplicate university names by distinguishing their unique campus IDs, locations, and municipal addresses.
- **Campus Context & Data Scoping**:
  - Feed and search results display only reports belonging to the selected campus.
  - Reporting forms automatically bind the new item to the active college.
  - Matching engine strictly scopes suggestions within the same institution by default.
  - AI Recovery Assistant only queries reports belonging to the authorized campus.
- **Visible College Switcher**:
  - Persistent header control (`🏛️ JSPM University - Wagholi Campus ▼`) allowing students and staff to switch campuses at any time.
  - Refreshes report feeds and campus location zones dynamically without displaying stale data.
- **College Persistence**:
  - Persists selected college ID in `localStorage` (`lostloop_selected_college_v1`).
  - Returning visitors bypass the onboarding screen and load directly into their saved campus.
  - Deactivated or invalid college selections automatically prompt the visitor to choose an active campus.



## 🔒 Security Architecture: Prototype vs. Production

### Current Prototype Implementation (Client-Side Demo)
- Data persists in the browser's `localStorage`.
- Ideal for evaluation, interactive demos, and automated unit testing without requiring backend server setup.
- **Prototype Scope Disclosed in UI**:
  - Selecting a college is currently a client-side browsing preference, not proof of student identity or institutional membership.
  - Cross-college isolation in the demo is enforced via client-side filtering and matching gates.

### Production Rollout Requirements
For a real campus-wide rollout across multiple institutions:
1. **Authenticated Accounts & SSO**: Central campus Single Sign-On (CAS / SAML / Shibboleth / OAuth2) verifying student enrollment and binding accounts to verified `@college.edu` or institutional email domains.
2. **Server-Side Tenant Scoping**: All API endpoints and database queries must be strictly parameterized (`WHERE college_id = req.user.college_id`).
3. **Database Schema / Row-Level Security**: PostgreSQL multi-tenancy utilizing Row-Level Security (RLS) or separate tenant schemas to guarantee zero cross-college data leaks at the database layer.
4. **Isolated Administrative Roles**: Campus coordinators and lost-and-found desk workers have role-based access strictly scoped to their own campus reports, claims, and catalogue perks.
5. **Private Challenge Isolation**: Verification challenge answers, claimant notes, and pickup passcodes must be encrypted and accessible only to the verified owner and authorized campus desk staff.



## 🚀 How to Run the Application

Because LostLoop is built with vanilla HTML, CSS, and modern JavaScript with `localStorage` persistence, it requires **zero build steps or package managers**.

### Option A: Open Directly in Your Browser
```bash
open /Users/shreyadawkhar/.gemini/antigravity/scratch/lostloop/index.html
```
*(Or double-click `index.html` in Finder).*

### Option B: Local Web Server
```bash
cd /Users/shreyadawkhar/.gemini/antigravity/scratch/lostloop
python3 -m http.server 8080
```
Open [`http://localhost:8080`](http://localhost:8080) in your browser.

---

## 🧪 How to Run the Tests

### 1. In-Browser Test Runner
1. Open the app in any browser.
2. Click the **"Tests"** tab in the top navigation bar.
3. Click the **"▶ Run All Checks"** button.
4. All 19 live checks (matching, tracking, AI assistant, LoopPoints rewards, and multi-college isolation) execute and display verified results.

### 2. Command-Line Test Suites (JavaScriptCore)
Run the automated test suites in your terminal using Apple's built-in JavaScriptCore:
```bash
cd /Users/shreyadawkhar/.gemini/antigravity/scratch/lostloop
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tests.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc test_app_logic.js
```

**Actual Verified Test Results:**
- `tests.js`: **141 / 141 assertions passed (100%)** across 22 system checks
- `test_app_logic.js`: **69 / 69 assertions passed (100%)** across 7 integration groups
- **Total: 210 / 210 assertions passed (100%)**

---

## 📂 Project Architecture

```
lostloop/
├── index.html           # Main layout, first-entry college overlay, header switcher & modals
├── styles.css           # Editorial Light & Dark themes, college onboarding card, badges, vouchers
├── app.js               # Application state, college controller, tracking & rewards views
├── data.js              # Multi-college directory, campus locations, categories, and demo items
├── matching.js          # Deterministic item comparison, category gating & college isolation
├── tracking.js          # State machine, valid transitions, and vertical timeline builder
├── assistant.js         # LostLoop AI Recovery Assistant (NLP entity parser & campus-scoped search)
├── rewards.js           # LoopPoints rewards engine (strict 50 pts, multi-contributor rules, ledger)
├── tests.js             # Comprehensive automated test suite (22 check categories, 141 assertions)
├── test_app_logic.js    # Workflow integration test suite (7 groups, 69 assertions)
└── README.md            # Complete documentation, multi-college guide & production deployment
```

# LostLoop
LostLoop — A smart, AI-powered campus lost-and-found platform with item tracking, intelligent matching, and rewards for helping reunite belongings.

### Lost something? Let's bring it home.

The platform aims to simplify the recovery process through intelligent item matching, item tracking, an AI-powered recovery assistant, and a community rewards system.

## ✨ Features

- **Lost & Found Reporting:** Report lost belongings or items found on campus.
- **Smart Item Matching:** Discover potentially matching reports using item descriptions and available attributes.
- **Item Tracking:** Track the progress of lost and found reports through a recovery timeline.
- **AI Recovery Assistant:** An assistant designed to help students improve descriptions, search similar reports, and understand recovery steps.
- **Multi-College Support:** A college selection experience designed to organize LostLoop around individual campuses.
- **LoopPoints Rewards:** A proposed kindness-based rewards system that awards 50 LoopPoints for each eligible, verified successful item return.
- **Search & Filters:** Browse reports using relevant categories, keywords, and available filters.
- **Responsive UI:** A modern, mobile-friendly interface with a dark visual theme and smooth interactions.

 **Development note:** Features listed above may have different implementation statuses. AI integrations, shared multi-college infrastructure, secure authentication, and real reward fulfilment depend on the current implementation and configuration.

## 🎯 Problem Statement

Students frequently lose everyday belongings such as:

- Headphones and earphones
- Water bottles
- Wallets and keys
- Calculators
- Student ID cards
- Books and stationery

Traditional lost-and-found processes can be inconvenient, disconnected, and difficult to track.

LostLoop aims to create a centralized, accessible campus recovery experience that encourages students to help one another.

## 💡 Our Solution

LostLoop connects lost-item reports with found-item reports and helps students navigate the recovery process.

The platform is designed around three goals:

1. **Discover:** Make relevant lost and found reports easier to find.
2. **Recover:** Provide clear tracking and recovery workflows.
3. **Reward kindness:** Recognize students who genuinely help return belongings.

## 🛠️ Tech Stack

Current project structure and intended technologies:

- **HTML5** — Application structure
- **CSS3** — Styling, responsive layouts, and animations
- **JavaScript** — Application logic and interactions
- **localStorage** — Local persistence in the current prototype, where applicable

Additional backend, database, or AI technologies may be introduced as the project evolves.

## 📁 Project Structure

```text
LostLoop/
├── index.html
├── styles.css
├── app.js
├── data.js
├── matching.js
├── tests.js
├── test_app_logic.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- A Mac, Windows PC, or Linux computer
- [Google Chrome](https://www.google.com/chrome/) or another modern browser
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor
- Python 3, for running a local development server

### 1. Clone the repository

```bash
git clone https://github.com/ShreyaDawkhar/LostLoop
```

Replace `https://github.com/ShreyaDawkhar/LostLoop` with your GitHub repository URL.

### 2. Open the project folder

```bash
cd LostLoop
```

### 3. Start the local server

For a simple static frontend:

```bash
python3 -m http.server 8000
```

### 4. Open LostLoop

Visit:

[http://localhost:8000](http://localhost:8000)

To stop the server, press `Control + C` in Terminal.

**Note:** This assumes the application can run as a static website. If the project requires additional setup, follow its actual dependencies and configuration.

## 🧪 Testing

LostLoop includes test files for application logic and functionality.

Test files:

- `tests.js`
- `test_app_logic.js`

The exact test commands depend on the current test runner and project configuration.

Check the existing test setup before running the tests. Do not assume these files can be executed directly with Node.js without verifying their imports and environment requirements.

## 🔐 Privacy & Security

LostLoop is intended to support a trustworthy campus recovery experience.

Important principles:

- Protect personal information.
- Avoid publicly exposing sensitive ownership verification details.
- Do not treat potential matches as confirmed ownership.
- Verify claims before confirming item handovers.
- Keep reward transactions linked to verified recovery events.
- Use appropriate authentication and access control for real multi-college deployments.

The current prototype should not be considered a secure production multi-user platform unless the required backend and security controls are implemented.

## 🗺️ Future Roadmap

- [ ] Improve matching accuracy
- [ ] Complete individual item tracking
- [ ] AI-powered recovery assistance
- [ ] Multi-college onboarding and campus selection
- [ ] LoopPoints wallet and rewards catalogue
- [ ] Secure authentication and shared database
- [ ] Campus staff verification workflows
- [ ] Real-time notifications
- [ ] Production deployment

Roadmap items represent development goals and may change.

## 🌱 Vision

We envision a campus community where losing something doesn't mean losing hope of finding it.

LostLoop is built around a simple idea:

**A small act of kindness can bring something important back home.**

## 👩‍💻 Contributing

Suggestions, feedback, and contributions are welcome.

If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes.
5. Submit a pull request.

## 📄 License

A license has not yet been specified.

Add a license before distributing or accepting contributions under defined open-source terms.



**LostLoop** — Built for campuses. Powered by community kindness.
origin/main
