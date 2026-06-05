#!/usr/bin/env node
const path = require('path');
const { getCommits, analyzeHotspots, analyzeBusFactor, analyzeChurn, analyzeCoupling, analyzeRisk, reporter } = require('../src');

const args = process.argv.slice(2);
const command = args[0] || 'scan';
const repoPath = process.cwd();

console.log(`\x1b[2mScanning repository at ${repoPath}...\x1b[0m`);
const commits = getCommits(repoPath);

if (commits.length === 0) {
  console.log('No commits found or not a git repository.');
  process.exit(1);
}

switch (command) {
  case 'scan': {
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    
    reporter.reportRisk(risk);
    break;
  }
  case 'hotspots': {
    const hotspots = analyzeHotspots(commits);
    reporter.reportHotspots(hotspots);
    break;
  }
  case 'busfactor': {
    const busfactor = analyzeBusFactor(commits);
    reporter.reportBusFactor(busfactor);
    break;
  }
  case 'churn': {
    const churn = analyzeChurn(commits);
    reporter.reportChurn(churn);
    break;
  }
  case 'coupling': {
    const coupling = analyzeCoupling(commits);
    reporter.reportCoupling(coupling);
    break;
  }
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Usage: reporadar [scan|hotspots|busfactor|churn|coupling]');
    process.exit(1);
}
