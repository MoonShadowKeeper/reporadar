#!/usr/bin/env node
const path = require('path');
const { getCommits, analyzeHotspots, analyzeBusFactor, analyzeChurn, analyzeCoupling, analyzeRisk, reporter } = require('../src');

const args = process.argv.slice(2);

let command = 'scan';
const options = {
  json: false,
  since: null,
  ignore: []
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--json') options.json = true;
  else if (arg.startsWith('--since=')) options.since = arg.split('=')[1];
  else if (arg.startsWith('--ignore=')) options.ignore = arg.split('=')[1].split(',');
  else if (!arg.startsWith('--')) command = arg;
}

const repoPath = process.cwd();

if (!options.json) {
  console.log(`\x1b[2mScanning repository at ${repoPath}...\x1b[0m`);
  if (options.since) console.log(`\x1b[2mTime window: since ${options.since}\x1b[0m`);
  if (options.ignore.length > 0) console.log(`\x1b[2mIgnoring: ${options.ignore.join(', ')}\x1b[0m`);
}

const commits = getCommits(repoPath, options);

if (commits.length === 0) {
  if (options.json) console.log(JSON.stringify({ error: 'No commits found' }));
  else console.log('No commits found or not a git repository.');
  process.exit(1);
}

switch (command) {
  case 'scan': {
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    
    if (options.json) {
      console.log(JSON.stringify(risk, null, 2));
    } else {
      reporter.reportRisk(risk);
    }
    break;
  }
  case 'html': {
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    
    const path = require('path');
    const outPath = path.resolve(repoPath, 'reporadar-report.html');
    reporter.generateHtml(risk, outPath);
    break;
  }
  case 'hotspots': {
    const hotspots = analyzeHotspots(commits);
    if (options.json) console.log(JSON.stringify(hotspots, null, 2));
    else reporter.reportHotspots(hotspots);
    break;
  }
  case 'busfactor': {
    const busfactor = analyzeBusFactor(commits);
    if (options.json) console.log(JSON.stringify(busfactor, null, 2));
    else reporter.reportBusFactor(busfactor);
    break;
  }
  case 'churn': {
    const churn = analyzeChurn(commits);
    if (options.json) console.log(JSON.stringify(churn, null, 2));
    else reporter.reportChurn(churn);
    break;
  }
  case 'coupling': {
    const coupling = analyzeCoupling(commits);
    if (options.json) console.log(JSON.stringify(coupling, null, 2));
    else reporter.reportCoupling(coupling);
    break;
  }
  default:
    if (options.json) {
      console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
    } else {
      console.log(`Unknown command: ${command}`);
      console.log('\nUsage: reporadar [command] [options]');
      console.log('Commands: scan | html | hotspots | busfactor | churn | coupling');
      console.log('Options:');
      console.log('  --json                        Output results as JSON');
      console.log('  --since=<time>                Time window (e.g. 6.months, 1.year)');
      console.log('  --ignore=<patterns>           Comma-separated ignore patterns (e.g. package-lock.json,dist)');
    }
    process.exit(1);
}
