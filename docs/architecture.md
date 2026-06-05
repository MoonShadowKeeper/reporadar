# Architecture Review

## Current Architecture (v2.0)
RepoRadar is designed as a zero-dependency Node.js CLI tool. The architecture is intentionally monolithic but highly modular:

1. **Git Parser (`src/git.js`)**: Interfaces natively with `git log --numstat` to parse raw commits. No third-party git bindings are used to maintain maximum portability and zero installation overhead.
2. **Analyzers (`src/analyzers/`)**: Pure functions that take the raw parsed commits and return structured data.
   - `hotspots`: Calculates code churn volume and commit frequency, applying a temporal decay logarithm.
   - `busfactor`: Identifies single points of failure in code ownership.
   - `churn`: Distinguishes between stable, active, and turbulent files.
   - `coupling`: Uses Jaccard similarity index to detect files that change together but aren't structurally linked.
   - `ownership`: Global map of codebase contribution per author.
   - `contributors`: Assesses risk based on a contributor's rewrite/delete ratio.
   - `risk`: Aggregates the results of all analyzers into a normalized 0-100 score per file.
3. **Reporter (`src/reporter.js`)**: Handles all presentation logic. It maps the structured analyzer data to:
   - CLI standard output (ANSI colors)
   - CSV
   - Markdown
   - HTML Dashboards
4. **CLI Entrypoint (`bin/reporadar.js`)**: Parses `process.argv` and `.reporadarrc.json` configs, maps flags to commands, and dispatches to the analyzers and reporters.

## Strengths
- **Zero Dependencies**: Security audits are trivial, and `npx reporadar` executes almost instantaneously.
- **Portability**: Runs on any system with Node.js and Git.
- **CI/CD Native**: By design, it fits cleanly into GitHub Actions and other CI runners with exit codes and raw JSON/Markdown outputs.

## Areas for Future Improvement
- **Streaming Parser**: Currently `git log` is buffered using `execSync`. While the buffer is 500MB (sufficient for 99% of repositories), migrating to a `spawn` based streaming architecture would lower the memory footprint for massive monolithic repositories (e.g. Linux kernel).
- **Abstract Syntax Tree (AST) Parsing**: The tool currently operates on a file-level granularity. To achieve true commercial parity, AST parsing could be integrated to track function-level hotspots.
