<div align="center">
  <h1>📡 reporadar</h1>
  <p><strong>Git repository forensic analyzer — detect code hotspots and bus factor risks</strong></p>
</div>

## The Problem
Codebases accumulate hidden risks over time. Two of the most dangerous are:
1. **Hotspots**: Files that change constantly, indicating design flaws or tech debt.
2. **Bus Factor**: Critical files that only one developer understands.

**reporadar** analyzes your git history locally to uncover these risks before they become incidents. Zero dependencies, instant results.

## Installation
```bash
npm install -g reporadar
# or run directly
npx reporadar
```

## Commands
- `reporadar hotspots` - Find files that are changed most frequently.
- `reporadar busfactor` - Identify files heavily dependent on a single author.

## Example Output
```bash
$ reporadar busfactor

📡 Reporadar — Bus Factor Analysis

HIGH RISK (Bus factor = 1)
  src/core/engine.js (100% John Doe)
  src/utils/crypto.js (95% Jane Smith)

HEALTHY
  src/components/Button.js (33% John, 33% Jane, 33% Bob)
```

## License
MIT
