<div align="center">
  <h1>📡 reporadar</h1>
  <p><strong>Git repository forensic analyzer — detect code hotspots, bus factor risks, coupling, and churn</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/reporadar"><img alt="npm version" src="https://img.shields.io/npm/v/reporadar?color=blue&style=flat-square" /></a>
    <a href="https://nodejs.org"><img alt="node" src="https://img.shields.io/node/v/reporadar?style=flat-square" /></a>
    <a href="https://github.com/MoonShadowKeeper/reporadar/blob/master/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/reporadar?style=flat-square" /></a>
    <a href="https://github.com/MoonShadowKeeper/reporadar/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/MoonShadowKeeper/reporadar/test.yml?style=flat-square&label=CI" /></a>
  </p>
</div>

---

## The Problem
Codebases accumulate hidden risks over time that aren't caught by linters or tests. The most dangerous are:
1. **Hotspots**: Files that change constantly, indicating design flaws, missing abstractions, or tech debt.
2. **Bus Factor**: Critical files that only one developer understands. If they leave, the knowledge is lost.
3. **High Churn**: Old, stable files that suddenly start changing rapidly (a sign of architectural decay).
4. **Hidden Coupling**: Files that always change together in the same commits, but have no explicit dependency in the code.

**reporadar** analyzes your git history locally to uncover these risks before they become incidents. Zero external dependencies, instant results.

## Installation

### Global Install
```bash
npm install -g reporadar
```

### One-off execution (without installing)
```bash
npx reporadar scan
```

## Commands & Usage

Run commands inside any Git repository.

| Command | Description |
|---|---|
| `reporadar scan` | **(Default)** Runs all analyzers and calculates an overall Health Score (A-F). |
| `reporadar serve` | Launches a local Web Dashboard with interactive D3.js and Chart.js graphs. |
| `reporadar html` | Generates the interactive HTML dashboard to a file (`reporadar-report.html`). |
| `reporadar hotspots` | Finds the most frequently modified files (logarithmic scale). |
| `reporadar busfactor` | Identifies files heavily dependent on a single author. |
| `reporadar churn` | Measures change rate relative to file age (stable vs active vs turbulent). |
| `reporadar coupling` | Finds files that frequently co-change in the same commits (hidden dependencies). |
| `reporadar ownership` | Analyzes which authors "own" the codebase based on impact volume. |
| `reporadar contributors`| Identifies Refactoring Heroes 🦸 who reduce complexity and fix bugs. |
| `reporadar worktypes` | Categorizes commits by semantic context (feat, fix, refactor, chore). |
| `reporadar languages` | Analyzes commit volume distributed by programming language. |
| `reporadar tickets`   | Measures the ratio of commits linked to issue trackers (Jira/GitHub). |
| `reporadar prs`       | Analyzes pull requests, merge commits, and CI/CD patterns vs solo coding. |
| `reporadar legacy`    | Detects "dusty" legacy code that hasn't been touched in over a year. |
| `reporadar attrition` | Identifies orphaned files whose primary authors are completely inactive (left the team). |
| `reporadar messages`  | Grades commit message quality (length, conventions, ticket refs). |
| `reporadar multi`     | Analyzes multiple repositories simultaneously to output a unified team health table. |
| `reporadar bot`       | Generates a Markdown summary tailored for CI/CD PR comments (GitHub Actions / GitLab). |

### Global Options

All commands support the following flags to customize the analysis:

- `--json`: Output raw JSON instead of human-readable text. Perfect for CI/CD pipelines.
- `--ignore="pattern"`: Comma-separated list of ignore patterns (e.g., `--ignore="package-lock.json,dist"`).
- `--ignore-bots`: Automatically filters out commits from dependabot, github-actions, [bot], and auto-formatting (e.g. `chore: lint`).
- `--include-vendor`: Disables the default ignoring of vendor code (`node_modules/`, `vendor/`, `dist/`).
- `--since="time"`: Time window to analyze (e.g., `--since="6.months"`, `--since="1.year"`).
- `--cache`: Caches the parsed git history for instant re-runs on large codebases.
- `--watch`: Keeps the process alive and automatically re-runs analysis on new commits.
- `--repos="paths"`: Comma-separated paths for the `multi` command.

## Configuration & Aliases

You can customize thresholds and merge multiple author emails into a single user by creating a `reporadar.config.json` file in the root of your project:

```json
{
  "aliases": {
    "John Doe": ["john.doe@gmail.com", "johnd"],
    "Jane Smith": ["jane@company.com", "jane-smith"]
  },
  "thresholds": {
    "burnoutWeekendPercent": 20,
    "ttmSlowDays": 7,
    "busFactorCritical": 1
  }
}
```

## CI Integration (GitHub Actions)

You can easily integrate `reporadar` into your CI/CD pipeline to monitor repository health on every push. Since it requires no dependencies, it runs in seconds.

```yaml
name: Repository Health Check
on: [push]

jobs:
  reporadar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required! reporadar needs git history
          
      - name: Run Reporadar Health Check
        run: npx reporadar bot
```

## Programmatic API

You can use `reporadar` directly in your Node.js scripts to build custom dashboards or CI blockers:

```javascript
const { getCommits, analyzeHotspots, analyzeBusFactor } = require('reporadar');

// Parse git log
const commits = getCommits('/path/to/repo');

// Run analyzers
const hotspots = analyzeHotspots(commits);
const busFactor = analyzeBusFactor(commits);

console.log(hotspots[0]); 
// { file: 'src/main.js', commits: 150, changes: 4500, authors: 4 }
```

## Comparison

How does `reporadar` compare to other tools in the ecosystem?

| Feature | RepoRadar | CodeScene | git-of-theseus |
|---|---|---|---|
| **Price** | Free & Open Source | Paid | Free & Open Source |
| **Installation** | `npx reporadar` | SaaS / Server | Python Setup |
| **Language** | Node.js | Java / Clojure | Python |
| **Hotspot Analysis** | ✅ | ✅ | ⚠️ Partial |
| **Bus Factor Analysis** | ✅ | ✅ | ❌ |
| **Hidden Coupling** | ✅ | ✅ | ❌ |
| **Ownership Analysis** | ✅ | ✅ | ⚠️ Limited |
| **Churn Analysis** | ✅ | ✅ | ✅ |
| **CI/CD Friendly** | ✅ Excellent | ✅ | ⚠️ Limited |
| **Local Execution** | ✅ | ⚠️ Self-hosted only | ✅ |
| **Open Source** | ✅ | ❌ | ✅ |

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
