# Changelog

All notable changes to this project will be documented in this file.

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
