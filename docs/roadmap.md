# Future Roadmap

RepoRadar v2.0 fulfills the core mission of becoming the strongest open-source Git repository analytics CLI. To push beyond commercial offerings, the following roadmap is proposed:

## v2.1: Granularity & Languages
- [ ] **Function-Level Hotspots**: Integrate lightweight AST parsers (e.g., Babel for JS/TS, tree-sitter for others) to track hotspots at the function level rather than just the file level.
- [ ] **Language Recognition**: Break down risk by programming language (e.g., "70% of risk is concentrated in TypeScript files").

## v2.2: Ecosystem Integrations
- [ ] **Jira / Linear Integration**: Cross-reference git commit hashes with issue trackers to determine if high-churn files are associated with specific bug types.
- [ ] **Slack / Discord Reporter**: Add webhook support for `--slack` output, sending a daily/weekly health report to team channels.

## v3.0: The Enterprise Dashboard
- [ ] **Interactive Web UI**: While the current `reporadar html` generates a static report, v3.0 will launch an interactive local React server (`reporadar serve`) with deep-dive graphs, node-edge maps for coupling, and interactive timeline sliders.
- [ ] **Multi-Repo Management**: A configuration wrapper to scan dozens of microservices simultaneously and aggregate the health score into a single executive dashboard.
