# Changelog

All notable changes to the Predict.fun Opportunity Scanner (`Betfarm`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-06-12

This release focuses on transitioning the repository to production-grade repository hygiene, strict separation of concerns, and full developer experience tooling.

### Added

- **Mathematical Decoupling**: Created [public/arbitrage.js](file:///Users/joe/Dev/Betfarm/public/arbitrage.js) housing `ArbCalculator` with pure functions for arbitrage checking (Binary YES/NO, NegRisk YES, NegRisk NO) and Liquidity/Spread scoring.
- **Unit Testing**: Implemented a comprehensive test suite in [tests/arbitrage.test.js](file:///Users/joe/Dev/Betfarm/tests/arbitrage.test.js) using **Jest** to test name parsers, sports category recognition, and multi-leg calculations.
- **Developer Tooling**: Configured `.eslintrc.json`, `.eslintignore`, `.prettierrc`, `.prettierignore`, and `.gitignore`.
- **Open Source Documentation**: Added [README.md](file:///Users/joe/Dev/Betfarm/README.md), [CONTRIBUTING.md](file:///Users/joe/Dev/Betfarm/CONTRIBUTING.md), [CHANGELOG.md](file:///Users/joe/Dev/Betfarm/CHANGELOG.md), and [docs/ARCHITECTURE.md](file:///Users/joe/Dev/Betfarm/docs/ARCHITECTURE.md).

### Changed

- **Folder Restructuring**: Moved the backend server from root `server.js` to [src/server.js](file:///Users/joe/Dev/Betfarm/src/server.js) and updated relative assets path resolutions.
- **Environment Handling**: Updated default configuration variable values to run strictly on BNB Mainnet by default.

---

## [0.9.0] - 2026-06-11

Initial release of the Predict.fun opportunity scanning system.

### Added

- **Express Proxy**: Proxy server handling CORS headers, caching, and server-side API Key forwarding.
- **Glassmorphic UI**: Single-page frontend dashboard incorporating Outfit typography, range sliders for filters, and real-time interval scans.
- **Safe Execution Checks**: Dynamic Slippage Risk notification matching user-selected shares to top-of-book leg depth bottlenecks.
- **Web Audio Alert**: Self-contained chime sound synthesizer warning traders when a profitable scanner match is fetched.
