# Changelog

All notable changes to this project will be documented in this file.

## [1.7.4] - 2026-06-06
### Fixed
- Fixed GitHub Actions Node.js 20 deprecation warnings by forcing actions to Node 24 (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).
- Published correct GitHub repository links to the npm registry sidebar.

## [1.7.2] - 2026-06-06
### Added
- **Team Burnout Risk**: New command `reporadar burnout` to detect developers consistently working on weekends or late at night.
- **Time-To-Merge**: New command `reporadar ttm` to find CI/CD review bottlenecks and average merge times.
- **Zombie Branches**: New command `reporadar zombies` to detect stale branches without activity for >2 months.
- **Module Ownership Map**: New command `reporadar map` to visualize ownership distribution at the directory/module level.
- **Commit Message Quality**: New command `reporadar messages` to grade commit descriptions, detecting vague messages and conventional commit usage.
- **Team Attrition Risk**: New command `reporadar attrition` (or `orphans`) to find "orphaned code" — files highly dependent on inactive authors.
- **Legacy Code Detection**: New command `reporadar legacy` (or `age`) to find "dusty" files untouched in over a year.
- **Web Dashboard Integration**: Upgraded `reporadar serve` and `reporadar html` with 4 new visual cards for the metrics above.

## [1.7.1] - 2026-06-06
### Added
- **Multi-Repository Support**: New command `reporadar multi --repos=./repo1,./repo2` to generate a summary table across multiple microservices.
- **Pull Request Analyzer**: New command `reporadar prs` to analyze merge commit frequencies and top mergers (detects CI/CD patterns vs solo coding).
- **Watch Mode**: Added `--watch` flag to automatically re-run analysis whenever a new commit is detected.
- **Performance**: Added `--cache` flag to cache parsed git history in `.reporadar-cache.json` for instant re-runs on large codebases.
- **CLI Polish**: Added a beautiful animated spinner during git history parsing.

## [1.7.0] - 2026-06-06
### Added
- **Dashboad Analytics**: Added Activity Timeline and Complexity Analysis charts to the web dashboard (`reporadar serve`).
- **Codebase Ownership Chart**: Added an interactive doughnut chart showing the percentage of the codebase owned by each author.
- **Light/Dark Mode**: Added a Theme toggle switch to the dashboard header for better readability in bright environments.

## [1.6.0] - 2026-06-06
### Added
- **Timeline Analyzer**: `reporadar timeline` detects dead zones, burst zones (deadline rushes), and peak coding hours.
- **Complexity Analyzer**: `reporadar complexity` combines lines of code, churn intensity, and bus factor into a single metric.
- **CLI Flags**: Added `--max-commits`, `--top`, `--quiet` (-q), and `--path` flags for better control.
- **Robust Git Parsing**: Support for renamed files, shallow clone detection, binary file filtering, and timeout protection for massive repos.

## [1.5.0] - 2026-06-05
### Added
- **Interactive Enterprise Dashboard**: New `serve` command launches a beautiful, local web dashboard with zero dependencies.
- **Visualizations**: Dynamic node-edge graphs (D3.js) for Temporal Coupling and interactive charts (Chart.js) for Hotspots, Languages, and Risk.
- **Language Breakdown Analyzer**: Analyzes commit volume by programming language to identify technology drift.
- **Issue Tracker Linkage Analyzer**: Calculates the ratio of structured development (Jira/GitHub issues) vs ad-hoc commits.
- **Modern UI Design**: Glassmorphism aesthetics, dark mode, smooth micro-animations, and responsive layouts.
- **Enterprise-Grade Architecture**: Transformed into a commercial-grade open-source analytics platform.
- **Health Score**: A-F grading and 0-100 overall repository health score.
- **Code Ownership Analysis**: Detailed mapping of author impact across the entire codebase.
- **Contributor Risk Analysis**: Detects authors with high churn ratios (rewritten/deleted code).
- **Historical Snapshots**: `--save-snapshot` to record current metrics and `--compare` to analyze trends over time.
- **Export Formats**: `--csv` and `--md` for Jira/Wiki integration, alongside `--json` and `html`.
- **Configuration Support**: `.reporadarrc` and `.reporadarrc.json` auto-loading.
- **GitHub Actions Integration**: `action.yml` to run RepoRadar seamlessly in CI/CD pipelines.

### Changed
- **Hotspot Algorithm**: Now uses a logarithmic scale based on lines added/deleted combined with temporal decay (half-life of 1 year).
- **Coupling Algorithm**: Replaced naive max changes with Jaccard similarity index for much higher accuracy.
- **Git Buffer**: Increased execution buffer to 500MB to support massively large enterprise repositories.
- **Test Suite**: Completely rewritten to cover the new metric outputs and CLI API.

## [1.1.1] - 2026-06-05
### Added
- Comprehensive README with API docs, CI integration, and tool comparison.

## [1.1.0] - 2026-06-05
### Added
- Churn analyzer: measures change rate relative to file age.
- Coupling analyzer: detects hidden file dependencies using co-change frequency.
- Overall Risk Score: combined metrics into a single 0-100 score.

## [1.0.0] - 2026-06-05
### Added
- Initial release with Hotspots and Bus Factor analyzers.
