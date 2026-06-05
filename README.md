<div align="center">
  <h1>📡 reporadar</h1>
  <p><strong>Git repository forensic analyzer — detect code hotspots, bus factor risks, coupling, and churn</strong></p>
</div>

## The Problem
Codebases accumulate hidden risks over time. The most dangerous are:
1. **Hotspots**: Files that change constantly, indicating design flaws or tech debt.
2. **Bus Factor**: Critical files that only one developer understands.
3. **High Churn**: Old files that are suddenly changing rapidly.
4. **Hidden Coupling**: Files that always change together but have no explicit dependency.

**reporadar** analyzes your git history locally to uncover these risks before they become incidents. Zero dependencies, instant results.

## Installation
```bash
npm install -g reporadar
# or run directly
npx reporadar
```

## Commands
- `reporadar scan` - (Default) Run all analyzers and calculate an overall Risk Score per file.
- `reporadar hotspots` - Find files that are changed most frequently.
- `reporadar busfactor` - Identify files heavily dependent on a single author.
- `reporadar churn` - Measure change rate relative to file age (stable vs turbulent).
- `reporadar coupling` - Find files that always change together in the same commits.

## Example Output (Risk Scan)
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

## License
MIT
