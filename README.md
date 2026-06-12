# Predict.fun Opportunity Scanner (Betfarm)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/joe/Betfarm/workflows/CI/badge.svg?branch=main)](https://github.com/joe/Betfarm/actions)

`Betfarm` is a fast, production-grade web-based opportunity scanner built to track arbitrage opportunities on **Predict.fun**, with a special focus on soccer matches and the FIFA World Cup 2026.

Predict.fun uses **Negative Risk (NegRisk) conditional tokens** for categorical events (such as winner markets: Team A, Team B, Draw). This structure introduces predictable mathematical relationships that enable risk-free hedging. The scanner monitors all open markets, calculates real-time arbitrage payouts across multiple contracts, evaluates orderbook depth & bid-ask spreads, and provides direct execution links.

---

## 🚀 Features

- **Multi-Leg Arbitrage Calculations**:
  - **Single Market Binary Arbitrage**: Calculates hedging opportunities on markets with exactly two outcomes (YES/NO).
  - **Negative Risk YES Arbitrage**: Scans mutually exclusive outcomes in linked NegRisk categories. Buying YES on all outcomes yields $1.00 at resolution.
  - **Negative Risk NO Arbitrage**: Scans mutually exclusive outcomes in linked NegRisk categories. Buying NO on all outcomes yields $N - 1$ at resolution.
- **Liquidity Score & Orderbook Analysis**:
  - Automatically identifies bottleneck execution size across all legs of the arbitrage.
  - Computes a dynamic **Liquidity Score (0-100)** incorporating both orderbook depth and average bid-ask spread.
  - Alerts users to **Slippage Risk** if their target share size exceeds the available top-of-book depth.
- **Real-Time Auto-Scan Engine**:
  - Polls Predict.fun APIs periodically on a configurable interval (5s, 10s, 30s, 60s).
  - Employs a local API proxy caching mechanism to prevent rate limits and optimize bandwidth.
  - Includes a custom synthesized Web Audio chime alert when new arbitrage opportunities are found.
- **Modern Responsive Dashboard**:
  - Designed with Outfit typography, glassmorphic dark-mode aesthetics, and clean cards.
  - Interactive sliders for **Min Profit %** (-5.0% to +10.0%) and **Target Shares** (1 to 10,000).
  - Instant redirection buttons pointing directly to Predict.fun event matching markets.
- **Robust Open Source Architecture**:
  - Decoupled mathematical calculator (`public/arbitrage.js`) tested via a Jest suite.
  - Server-side environment variables configuration ensuring API Keys are never exposed.

---

## 📂 Repository Structure

```text
Betfarm/
├── public/                 # Frontend assets (served by Express)
│   ├── index.html          # Semantic HTML dashboard
│   ├── index.css           # Modern dark-mode styling
│   ├── app.js              # Frontend UI controller and coordinator
│   └── arbitrage.js        # Environment-agnostic mathematical engine
├── src/                    # Backend proxy server
│   └── server.js           # Express API proxy (CORS bypass, API key injecting, caching)
├── tests/                  # Test suites
│   └── arbitrage.test.js   # Jest unit tests for parsers, formulas, and math logic
├── docs/                   # Additional documentation
│   └── ARCHITECTURE.md     # In-depth system design and data flows
├── .env                    # Local environment variables (ignored by git)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore configuration
├── .eslintrc.json          # ESLint code quality configuration
├── .prettierrc             # Prettier formatting rules
└── package.json            # npm scripts and dependencies
```

---

## 🛠️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (installed with Node)

### Step 1: Clone the Repository

```bash
git clone https://github.com/joe/Betfarm.git
cd Betfarm
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Copy the template configuration file:

```bash
cp .env.example .env
```

Open `.env` and fill in your Predict.fun details:

```env
# Predict.fun API Configuration
# Insert your BNB Mainnet API key from Predict.fun profile settings
PREDICT_API_KEY=your_mainnet_api_key_here

# Local Server Settings
PORT=3000
DEFAULT_NETWORK=mainnet
```

> [!IMPORTANT]
> To use the scanner on BNB Mainnet, a valid `PREDICT_API_KEY` is required. The key is securely loaded on the server side and never sent to the client browser.

---

## 💻 Running the Application

### Development Mode

Start the server in development mode. The server will launch on port `3000` by default:

```bash
npm run dev
```

Navigate to `http://localhost:3000` in your web browser. The scanner will run an automatic scan immediately on page load and periodically scan based on the selected interval.

### Production Mode

Start the production server:

```bash
npm start
```

---

## 🧪 Testing and Linting

We use **Jest** for unit testing, **ESLint** for code hygiene, and **Prettier** for code formatting.

### Run Unit Tests

Execute the unit tests verifying mathematical correctness, naming parsers, and sports filters:

```bash
npm test
```

### Run Linter

Scan the codebase for code style and syntax issues:

```bash
npm run lint
```

### Run Formatter

Automatically clean and format all source files:

```bash
npm run format
```

---

## ⚙️ Configuration & Filters

All dashboard filters are evaluated on the client side instantly without re-requesting the API:

- **Sort Order**: Toggle sorting by **Liquidity Score** (default) or **Expected Net Profit %**.
- **Min Profit % Slider**: Adjust the minimum profit target. Set it lower (down to `-5%`) to monitor negative arbitrage for testing/debugging.
- **Target Shares Slider**: Sets the minimum leg bottleneck. Adjusting this updates the **Slippage Risk** verification to check if the top-of-book depth can fill your execution size.

---

## 🤝 Contributing

Contributions to `Betfarm` are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to open pull requests, report issues, and follow our development standards.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
