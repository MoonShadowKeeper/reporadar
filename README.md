<div align="center">
  <h1>📡 reporadar</h1>
  <p><strong>Git repository forensic analyzer — detect code hotspots, bus factor risks, coupling, and churn</strong></p>

  <p>
    <a href="https://www.npmjs.com/package/reporadar"><img alt="npm version" src="https://img.shields.io/npm/v/reporadar?color=blue&style=flat-square" /></a>
    <img alt="node" src="https://img.shields.io/node/v/reporadar?style=flat-square" />
    <img alt="license" src="https://img.shields.io/npm/l/reporadar?style=flat-square" />
    <a href="https://github.com/MoonShadowKeeper/reporadar/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/MoonShadowKeeper/reporadar/test.yml?style=flat-square&label=CI" /></a>
  </p>
</div>

---

## 🧐 The Problem
Codebases accumulate hidden risks over time that aren't caught by linters or tests. The most dangerous are:
1. **🔥 Hotspots**: Files that change constantly, indicating design flaws, missing abstractions, or tech debt.
2. **🚌 Bus Factor**: Critical files that only one developer understands. If they leave, the knowledge is lost.
3. **🌪️ High Churn**: Old, stable files that suddenly start changing rapidly (a sign of architectural decay).
4. **🔗 Hidden Coupling**: Files that always change together in the same commits, but have no explicit dependency in the code.

**reporadar** analyzes your git history locally to uncover these risks before they become incidents. Zero external dependencies, instant results.

## 🚀 Installation

### Global Install
```bash
npm install -g reporadar
```

### One-off execution (without installing)
```bash
npx reporadar scan
```

## 🛠️ Commands & Usage

Run commands inside any Git repository.

| Command | Description |
|---|---|
| `reporadar scan` | **(Default)** Runs all analyzers and calculates an overall Risk Score (0-100) per file. |
| `reporadar hotspots` | Finds the most frequently modified files. |
| `reporadar busfactor` | Identifies files heavily dependent on a single author (Bus Factor = 1). |
| `reporadar churn` | Measures change rate relative to file age (stable vs active vs turbulent). |
| `reporadar coupling` | Finds files that frequently co-change in the same commits (hidden dependencies). |

### Example Output (Risk Scan)
```bash
$ reporadar scan

  📡 Reporadar — Overall Risk Report

  [100] CRITICAL src/core/engine.js
       ↳ Hotspot (142 commits)
       ↳ Bus factor 1 (John Doe owns 95%)
       ↳ Turbulent churn (8.5 changes/month)

  [ 65] HIGH     src/api/routes.js
       ↳ Highly coupled
       ↳ Bus factor 2

  [ 30] MEDIUM   src/utils/helpers.js
       ↳ Hotspot (45 commits)
```

## 🤖 CI Integration (GitHub Actions)

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
          
      - name: Run Reporadar
        run: npx reporadar scan
```

## 💻 Programmatic API

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

## 🥊 Comparison

How does `reporadar` compare to other tools in the ecosystem?

| Feature | `reporadar` | CodeScene | git-of-theseus |
|---|---|---|---|
| **Price** | Free (Open Source) | Paid (Enterprise) | Free |
| **Language** | Node.js (Zero deps) | Java / Clojure | Python |
| **Setup Time** | < 5 seconds | Minutes / SaaS setup | Requires Python env |
| **Bus Factor Analysis**| ✅ Yes | ✅ Yes | ❌ No |
| **Hidden Coupling** | ✅ Yes | ✅ Yes | ❌ No |
| **CI Friendly** | ✅ Yes (npx runs instantly) | ⚠️ Complex | ⚠️ Slow for CI |

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
