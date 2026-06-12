# AGENTS.md

> Last updated: 2026-06-12

This file serves as a reference and governance document for AI agents and developers working on the **Predict.fun Opportunity Scanner** (`Betfarm`). It details the project structure, math principles, available commands, and key engineering safeguards.

---

## 📋 Project Context

`Betfarm` is a fast, web-based opportunity scanner built to track arbitrage opportunities on **Predict.fun**, with a special focus on **World Cup 2026 and soccer matches**.

Predict.fun uses **Negative Risk (NegRisk) conditional tokens** for categorical events (such as winner markets: Team A, Team B, Draw). This structure introduces predictable mathematical relationships that enable risk-free hedging.

---

## 📂 Directory Structure

```text
Betfarm/
├── public/                 # Frontend assets (served by Express)
│   ├── index.html          # Semantic HTML dashboard
│   ├── index.css           # Modern dark-mode styling (Outfit font, glassmorphism)
│   ├── app.js              # Frontend UI controller and DOM coordinator
│   └── arbitrage.js        # Extracted pure math and calculator engine (dual-env)
├── src/                    # Backend source code
│   └── server.js           # Express API proxy (bypasses CORS, appends API keys, handles cache)
├── tests/                  # Unit tests
│   └── arbitrage.test.js   # Jest unit tests for parsers, formulas, and math logic
├── node_modules/           # Node.js dependencies
├── .env                    # Local environment variables (API Key, Ports)
├── .env.example            # Environment variables template
├── package.json            # npm configuration and scripts
└── session_memory.md       # Local developer memory tracking file
```

---

## 🧮 Arbitrage Mathematics

The scanner calculates three distinct types of arbitrage opportunities:

### 1. Single Market Binary Arbitrage (YES + NO)

Calculated strictly on markets with **exactly two outcomes** to ensure complete coverage.

- **Cost**: $C = P_{\text{yes}} + P_{\text{no}}$
- **Payout**: $1.00$ at resolution
- **Arbitrage condition**: $C < 1.00$
- **Hedge execution**: Buy 1 share of YES and 1 share of NO.

### 2. Negative Risk YES Arbitrage (Mutually Exclusive Outcomes)

Calculated across $N$ open, mutually exclusive markets in a category where all markets have `isNegRisk === true`.

- **Cost**: $C = \sum_{i=1}^{N} P_{\text{yes}, i}$
- **Payout**: Exactly $1.00$ (since exactly one outcome will resolve to YES)
- **Arbitrage condition**: $C < 1.00$
- **Hedge execution**: Buy 1 share of the YES outcome on all $N$ markets.

### 3. Negative Risk NO Arbitrage (Mutually Exclusive Outcomes)

Calculated across $N$ open, mutually exclusive markets in a category where all markets have `isNegRisk === true`.

- **Cost**: $C = \sum_{i=1}^{N} P_{\text{no}, i}$
- **Payout**: Exactly $N - 1$ dollars (since exactly one outcome will resolve to YES, causing its NO contract to expire at $0.00, while the remaining $N-1$ outcomes resolve to NO, paying out $1.00 each)
- **Arbitrage condition**: $C < (N - 1)$
- **Hedge execution**: Buy 1 share of the NO outcome on all $N$ markets.

### 4. Liquidity Score Math

Calculated across all legs of the arbitrage to determine overall trade viability:

- **Bottleneck Depth**: $D = \min_{i} (S_{\text{ask}, i})$ (the maximum shares executable at the top of book across all legs of the hedge)
- **Average Spread**: $S_{\text{avg}} = \frac{1}{M} \sum_{i=1}^{M} (P_{\text{ask}, i} - P_{\text{bid}, i})$ (the mean bid-ask spread across the $M$ legs, with missing bid prices defaulting to $0$)
- **Depth Score Component**: $Score_{\text{depth}} = 100 \times \left(1 - e^{-D / 500}\right)$
- **Spread Score Component**: $Score_{\text{spread}} = 100 \times e^{-10 \times S_{\text{avg}}}$
- **Combined Liquidity Score**: $Score_{\text{liquidity}} = \min\left(100, \max\left(0, \text{round}\left(\frac{Score_{\text{depth}} \times Score_{\text{spread}}}{100}\right)\right)\right)$
- **Sorting Preference**: Opportunities are ordered by `Combined Liquidity Score` by default to prioritize executable risk mitigation. Users can switch sorting to `Expected Net Profit %` dynamically.

---

## 🛠️ Available Commands

### Development and Quality Tools

| Command                     | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `npm install`               | Install all backend and development dependencies           |
| `npm start` / `npm run dev` | Launch the Express proxy server on `http://localhost:3000` |
| `npm test`                  | Run Jest unit tests for the arbitrage math engine          |
| `npm run lint`              | Run ESLint check for style guide and code quality          |
| `npm run format`            | Run Prettier formatter to auto-format files                |

---

## 🔬 Key Engineering Safeguards

### 1. Tag-Based API Querying (Bypassing Pagination Limits)

Predict.fun can have thousands of active short-term markets (e.g. 5-minute crypto up/down markets). Paginating general categories can cause rate-limit blocks or miss sports categories altogether.

- **Solution**: The backend forwards all parameters, and the frontend defaults to query `tagIds=14,81,113` (Soccer, World Cup 2026, and World Cup). This ensures sports markets are retrieved immediately.

### 2. Strict Word-Boundary Regex Parsing

Older versions of name parsing matched substring prefixes (e.g., `NOR` for Norway matched `/no/i` prefix). This caused a team name to be matched as both the team outcome and the generic `NO` contract, generating false arbitrages.

- **Solution**: Parser functions in `public/app.js` use strict word-boundary regular expressions (`/^yes\b/i` and `/^no\b/i`) to identify contracts.

### 3. Mutual Exclusivity and Negative Risk Group Guard

Handicaps, Over/Under, or unrelated markets in a single match should never be grouped for negative risk calculation.

- **Solution**: The calculator only runs Negative Risk logic on categories where **all** open markets are verified as `isNegRisk === true`.

### 4. Minimum Leg Liquidity Bottleneck

Because arbitrage execution requires purchasing an equal number of shares across all legs of the hedge:
$$\text{Max Executable Arbitrage Quantity} = \min_{i} (\text{Size}_i)$$
If any single contract leg has $0$ size (or near-zero depth), the total executable arbitrage quantity is $0$.

### 5. Dust Liquidity Display

To prevent tiny fractional orders (e.g., $0.5$ shares) from rounding down to $0$ and confusing the user:

- **Solution**: The UI formats quantities under $10$ shares to 2 decimal places (`item.size.toFixed(2)`), keeping precise dust volumes visible.

### 6. Orderbook Depth Price-Impact Safety Check

To execute an arbitrage trade without moving the orderbook (and risking slippage that makes the arbitrage unprofitable), we verify if the bottleneck depth is greater than or equal to a target shares threshold (defaulting to 100).

- **Solution**: The UI implements a dynamic safety indicator. If the bottleneck depth is less than the target size, the UI alerts the user with a warning badge (`⚠️ Slippage Risk: Order of X shares exceeds top depth`) so they avoid executing a trade that shifts the orderbook.

### 7. Mainnet-Only, Auto-Scan Only, and Server-Side API Key

To prevent configuration inconsistencies and protect credentials:

- **Mainnet Only**: The scanner runs exclusively on BNB Mainnet. The testnet toggles have been removed.
- **Auto-Scan Only**: The manual "Scan Markets" button and "Auto-Scan" toggle have been removed. The scanner runs in auto-scan mode by default and triggers immediately on page load, running periodically based on the configured interval.
- **Server-Side API Key**: The API key is read strictly from the server's `.env` file and is never exposed or collected from the user interface.

### 8. Direct Status-Filtering API Optimization

Instead of fetching all categories (which includes thousands of inactive/resolved categories), the frontend now appends `status=OPEN` to the query. This optimization reduces the paginated fetch payload from 1500+ categories to under 400, resulting in 4x faster page loads and dramatically lower memory usage.
