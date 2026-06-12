# Session Memory - Predict.fun Opportunity Scanner

This file keeps track of the active session memory, code architectures, decisions, and progress.

## Current Objective

Implement a fully functional web-based opportunity scanner for Predict.fun markets (soccer & World Cup matches) to detect YES and NO arbitrage opportunities.

## Implemented Files

- [package.json](file:///Users/joe/Dev/Betfarm/package.json) - Node.js project file
- [.env.example](file:///Users/joe/Dev/Betfarm/.env.example) - Environment template
- [.env](file:///Users/joe/Dev/Betfarm/.env) - Local configurations
- [server.js](file:///Users/joe/Dev/Betfarm/server.js) - Proxy server backend
- [public/index.html](file:///Users/joe/Dev/Betfarm/public/index.html) - Dashboard skeleton
- [public/index.css](file:///Users/joe/Dev/Betfarm/public/index.css) - Premium styling
- [public/app.js](file:///Users/joe/Dev/Betfarm/public/app.js) - Calculator engine and UI controller
- [AGENTS.md](file:///Users/joe/Dev/Betfarm/AGENTS.md) - AI agent onboarding and reference guide

## Planned Architecture

- **Backend**: Express.js server (`server.js`) acting as an API proxy. It routes requests to the Predict.fun API (handling the Mainnet API key header or defaulting to Testnet) and serves static files from `public/`.
- **Frontend**: Single Page Application under `public/` using HTML5, Vanilla CSS, and JavaScript.
- **Arbitrage Mathematics**:
  - For $N$ mutually exclusive outcomes (e.g. Winner A, Winner B, Draw) in a category:
    - **YES Arbitrage**: Buy YES for all outcomes if $\sum P_{yes} < 1.00$.
    - **NO Arbitrage**: Buy NO for all outcomes if $\sum P_{no} < N - 1$.
    - **Individual Arbitrage**: Buy YES + NO for outcome $i$ if $P_{yes, i} + P_{no, i} < 1.00$.

## Progress Tracker

- [x] Implementation Plan Approved
- [x] Initialized `task.md`
- [x] Create workspace configuration and dependencies (`package.json`, `.env.example`, `.env`)
- [x] Create proxy backend server (`server.js`)
- [x] Create frontend dashboard UI (`public/index.html`, `public/index.css`, `public/app.js`)
- [x] Implement Liquidity Score and Depth/Spread Verification
- [x] Verification
- [x] Create walkthrough documentation (`walkthrough.md`)
- [x] Create agent onboarding reference (`AGENTS.md`)
- [x] Refactor directory structure into standard layout (`src/server.js`)
- [x] Extract arbitrage.js calculations and naming parsers
- [x] Create ESLint, Prettier, and Jest configurations
- [x] Create automated tests suite (tests/arbitrage.test.js) and verify passing
- [x] Write open source files: README.md, CONTRIBUTING.md, CHANGELOG.md, docs/ARCHITECTURE.md
- [x] Perform security and quality audits (no key leak, lint/format check)

## Decisions & Debugging

- **Tag-Based API Filtering**: Fixed an issue where sports/soccer matches were omitted during scans due to pagination limits. With thousands of active crypto markets, standard paginated fetching reached its cap before loading sports matches. We updated `server.js` to forward parameters and `public/index.html` / `public/app.js` to include a dropdown filter for tags. It defaults to `14,81,113` (Soccer, World Cup 2026, and World Cup), enabling fast, targeted scans that retrieve exactly the soccer markets.
- **Outcome String Matching Bug (Norway/NOR)**: Fixed a bug where team abbreviations starting with "no" (like Norway's `NOR`) were incorrectly matched as the `No` outcome. This resulted in matching the same team win outcome twice and claiming a fake arbitrage opportunity. We resolved this by using regexes with word boundaries (`/^no\b/i` and `/^yes\b/i`) for YES/NO parsing. We also added safety guards to only run binary arbitrage on markets with exactly 2 outcomes and to restrict negative risk arbitrage to categories where `isNegRisk === true` for all markets.
- **Dust Liquidity / Zero Quantity Bottleneck**: Documented why arbitrage opportunities may show a quantity of 0 on certain legs (e.g. ENG (No) and Draw (No) displaying Qty: 0). This happens because the maximum executable quantity of the combined hedge is the bottleneck (minimum) of the individual sizes across all legs. Tiny fractional dust orders in the API (e.g., < 1 share) were also previously rounded down to 0 by `Math.floor`.
- **Liquidity Score & Safe Order Size Checks**: Implemented a comprehensive Liquidity Score from 0 to 100 based on bid-ask spread and bottleneck depth. Calculated using exponential decay formulas:
  - Depth Score: $100 \times (1 - e^{-D / 500})$ where $D$ is the bottleneck best ask size across all legs of the arb.
  - Spread Score: $100 \times e^{-10 \times S}$ where $S$ is the average bid-ask spread across all legs of the arb.
  - Combined Score: $DepthScore \times SpreadScore / 100$.
    Also implemented a dynamic check against a target order size input (defaulting to 100 shares), displaying warnings (`⚠️ Slippage Risk`) or safety tags (`✓ Safe`) based on whether the order size exceeds the available top-of-book depth.
- **Header Stats Count Mismatch**: Fixed a mismatch where the top dashboard stats card ("OPPORTUNITIES FOUND") was filtered by `o.profitPct > 0`, while the list container badge was filtered by user-input criteria (which could include negative or zero profit threshold items). Synced both elements to count the exact number of opportunities rendered on screen matching the filters.
- **Scanned Matches Browser Performance Optimization**: Limited the "All Scanned Sports Matches" browser list to render a maximum of 50 categories at a time. Included a notice row at the bottom indicating the listing limit and suggesting the user use the search bar to locate specific matches. This preserves dashboard rendering speed and prevents browser lag.
- **Mexico vs South Africa Query**: Scanned the Predict.fun API for matches related to Mexico and South Africa (Match Date: June 11, 2026). Found four active categories: the main match winner market (`Mexico vs. South Africa`), halftime results (`Mexico vs. South Africa - Halftime Result`), exact scores (`Mexico vs. South Africa - Exact Score`), and alternative markets (`Mexico vs. South Africa - More Markets`). Identified a **0.50% NO Negative Risk Arbitrage** opportunity in the Halftime Result category.
- **Real-Time Scanner Features**: Implemented a complete real-time auto-scan engine in the frontend dashboard. Users can toggle auto-refresh with a countdown pulse indicator (supporting intervals of 5s, 10s, 30s, and 60s) and configure a synthesized audio alert. The alert triggers a premium chime via the self-contained Web Audio API when a new matching opportunity is scanned. The auto-scan state, interval selection, and sound preferences are persisted to `localStorage` for convenience.
- **Mainnet network default, Auto-Scan on Load, and API optimization**: Removed the `testnet` network option and its selector dropdown from the frontend header to resolve discrepancies between the server config (`.env`) and client storage. The application now runs exclusively on BNB Mainnet. The API Key input is always displayed in the header. Added automatic scanning `performScan()` immediately on page load to fill the dashboard without requiring manual user interaction. Implemented a key API query optimization by appending `status=OPEN` to the paginated categories request. This reduces categories fetched per scan from 1500+ down to under 400 (a ~75% payload size reduction), dramatically speeding up mainnet loading times and protecting the API key from rate limits.
- **Auto-Scan Only Mode**: Simplified the dashboard UI by removing the manual "Scan Markets" button and the "Auto-Scan" switch toggle entirely. Auto-scan is now the only mode of operation, enabled by default on page load. The user can still customize the auto-scan interval (5s, 10s, 30s, 60s) and sound alert chimes.
- **Server-Side API Key Configuration**: Removed the API Key text input box from the user interface. The backend Express proxy now handles API Key configuration strictly on the server side by reading the `PREDICT_API_KEY` from the `.env` file and appending it to all outgoing Mainnet requests. The client-side code no longer handles or exposes API Key credentials.
- **Default Ordering by Liquidity Score**: Added a Sort By filter selector in the controls panel. By default, scanned active arbitrage opportunities are ordered descending by their Combined Liquidity Score, ensuring the safest, most liquid trades appear at the top. Users can dynamically switch the selector to sort descending by Expected Net Profit % instead.
- **Interactive Range Sliders for Filters**: Replaced the static numeric input boxes for **Min Profit %** and **Target Shares** with interactive range sliders.
  - **Min Profit %**: Slider spans from `-5.0%` to `+10.0%` with `0.1%` increments, allowing users to view negative arbitrage or slightly unprofitable hedges for debugging.
  - **Target Shares**: Slider spans from `1` to `10,000` with increments of `10`, allowing granular control of minimum required liquidity bottleneck.
  - **Live Indicators**: Added live text indicators displaying current selected values (e.g. `+0.0%` and `100`) that update in real-time as the sliders are dragged.
- **Predict.fun Trade Redirect Links**: Integrated a premium action button labeled **"Trade on Predict.fun ↗"** into the header of each arbitrage opportunity card, aligned directly to the left of the Expected Net Profit badge. The link dynamically points to `https://predict.fun/market/${opp.categorySlug}` (opening in a new browser tab), providing high-visibility and convenient navigation for traders executing arbitrage hedges.
- **Repository Organization & Refactoring**: Cleaned up the project structure by moving the server to `src/server.js` and creating a dedicated `tests/` folder. Extracted pure mathematical logic into `public/arbitrage.js` as an environment-agnostic module.
- **isSportsCategory Return Type Bug**: Fixed a JavaScript evaluation bug where `hasSportsTag` evaluated to `undefined` when `category.tags` was missing. This caused the expression `hasKeywords || hasSportsTag` to return `undefined` instead of `false`, breaking the Jest test suite's validation for sports category checks. Corrected it by casting the expressions to boolean using `!!`.
- **Quality Tooling Configuration**: Set up ESLint and Prettier, fixing styling and quotes warnings across all files. Set up standard dev scripts in `package.json`.
- **Open Source Documentation Creation**: Authored `README.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` to make the repository fork-ready and prepare it for public code reviews.
- **Soccer and World Cup Filter Segregation**: Addressed category tag bleed-over and empty results. Rewrote soccer/World Cup queries on tag selections `14` (Soccer Leagues), `81` (World Cup 2026), and `14,81,113` (Soccer & World Cup) to query all three tags `14,81,113` to prevent the empty result bug on tag `81`. Implemented `ArbCalculator.isWorldCup(category)` and client-side post-filtering in `performScan()` to cleanly isolate World Cup games (starts with `fifwc` in slug or contains `world-cup`/`world cup`) from domestic soccer leagues. Added comprehensive unit tests in `tests/arbitrage.test.js` to verify classification correctness.
- **Alert Flood Prevention**: Solved the issue where loading a new category dropdown or experiencing an empty opportunities state could trigger a massive influx of popups. Configured the category tag selector to set `appState.realtime.isFirstScan = true` on change, bypassing popups on category initialization. Decoupled the alert tracking logic in `checkNewOpportunitiesAlert()` from the active UI filters by comparing new items against the unfiltered list (`appState.opportunities`). The active UI filters are now applied client-side to only trigger toast popups for new opportunities that match the filter threshold.

