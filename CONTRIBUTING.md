# Contributing to Betfarm

Thank you for your interest in contributing to `Betfarm` (Predict.fun Opportunity Scanner)! We want to make contributing to this project as easy and transparent as possible.

---

## 🛠️ Development Workflow

### 1. Setup Your Environment

Make sure you have Node.js (v16+) and npm installed. Follow these steps:

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/your-username/Betfarm.git
   cd Betfarm
   ```
2. Install the developer dependencies:
   ```bash
   npm install
   ```
3. Set up your local configuration:
   ```bash
   cp .env.example .env
   ```
   Add your mainnet API key to `.env` so you can scan live markets during development.

### 2. Code Quality & Standards

We enforce strict style and code quality rules to keep the repository clean and maintainable. Before submitting any changes, make sure:

- Math logic is separated from DOM orchestration. Pure math and parsers must go into [public/arbitrage.js](file:///Users/joe/Dev/Betfarm/public/arbitrage.js).
- Front-end styling is confined to [public/index.css](file:///Users/joe/Dev/Betfarm/public/index.css) using vanilla CSS.
- ESLint and Prettier pass successfully.

To run the checks:

```bash
# Run lint check
npm run lint

# Format code files automatically
npm run format
```

### 3. Writing and Running Tests

If you add a new arbitrage calculation, modify parsing logic, or update mathematical filters, you **must** write corresponding unit tests in the [tests/](file:///Users/joe/Dev/Betfarm/tests) directory.

Run the test suite to verify everything passes:

```bash
npm test
```

---

## 🔀 Pull Request Process

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/my-amazing-feature
   ```
2. Make your changes and commit them with descriptive commit messages. Follow logical commit prefixes:
   - `refactor:` - code reorganizations or improvements with no behavior changes
   - `feat:` - new scanner features or calculator calculations
   - `fix:` - bug fixes
   - `docs:` - documentation improvements
   - `test:` - additions or improvements to tests
3. Push your branch to GitHub:
   ```bash
   git push origin feature/my-amazing-feature
   ```
4. Open a Pull Request (PR) against the `main` branch of the original repository.
5. Provide a clear description of the problem solved, changes made, and steps to verify.
6. Ensure that all CI checks (linting, tests) pass.

---

## 🛡️ Security Vulnerabilities

Please do not report security vulnerabilities in public issues. Instead, email the maintainers or report them through GitHub's private vulnerability reporting system.

Always make sure you never commit active API keys, secrets, or local `.env` files to git. Our `.gitignore` is pre-configured to exclude these.
