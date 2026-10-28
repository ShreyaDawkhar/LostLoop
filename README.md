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

> **Development note:** Features listed above may have different implementation statuses. AI integrations, shared multi-college infrastructure, secure authentication, and real reward fulfilment depend on the current implementation and configuration.

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
git clone YOUR_REPOSITORY_URL
```

Replace `YOUR_REPOSITORY_URL` with your GitHub repository URL.

### 2. Open the project folder

```bash
cd YOUR_REPOSITORY_FOLDER
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

---

**LostLoop** — Built for campuses. Powered by community kindness.
