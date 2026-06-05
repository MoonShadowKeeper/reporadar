#!/usr/bin/env node
const path = require('path');
const { getCommits, analyzeHotspots, analyzeBusFactor, reporter } = require('../src');

const args = process.argv.slice(2);
const command = args[0] || 'hotspots';
const repoPath = process.cwd();

console.log(`\x1b[2mScanning repository at ${repoPath}...\x1b[0m`);
const commits = getCommits(repoPath);

if (commits.length === 0) {
  console.log('No commits found or not a git repository.');
  process.exit(1);
}

switch (command) {
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
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Usage: reporadar [hotspots|busfactor]');
    process.exit(1);
}
