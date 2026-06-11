#!/usr/bin/env node
const path = require('path');
const { getCommits, analyzeHotspots, analyzeBusFactor, analyzeChurn, analyzeCoupling, analyzeRisk, reporter } = require('../src');

const args = process.argv.slice(2);

let command = 'scan';
const options = {
  json: false,
  since: null,
  ignore: [],
  maxCommits: null,
  top: 15,
  quiet: false,
  path: null,
  ignoreBots: false,
  ignoreVendor: true,
  watch: process.argv.includes('--watch')
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--version' || arg === '-v') {
    console.log(require('../package.json').version);
    process.exit(0);
  }
  if (arg === '--help' || arg === '-h') {
    command = 'help';
    break;
  }
  if (arg === '--json') options.json = true;
  else if (arg === '--csv') options.csv = true;
  else if (arg === '--md') options.md = true;
  else if (arg === '--save-snapshot') options.saveSnapshot = true;
  else if (arg === '--quiet' || arg === '-q') options.quiet = true;
  else if (arg.startsWith('--compare=')) options.compare = arg.split('=')[1];
  else if (arg.startsWith('--since=')) options.since = arg.split('=')[1];
  else if (arg.startsWith('--ignore=')) options.ignore = arg.split('=')[1].split(',');
  else if (arg.startsWith('--max-commits=')) options.maxCommits = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--top=')) options.top = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--repos=')) options.repos = arg.split('=')[1].split(',');
  else if (arg.startsWith('--path=')) options.path = arg.split('=')[1];
  else if (arg === '--ignore-bots') options.ignoreBots = true;
  else if (arg === '--include-vendor') options.ignoreVendor = false;
  else if (!arg.startsWith('--')) command = arg;
}

if (command === 'multi') {
  if (!options.repos || options.repos.length === 0) {
    console.error('\x1b[31mError: multi command requires --repos=path1,path2\x1b[0m');
    process.exit(1);
  }
  console.log('\n  \x1b[1m\x1b[36m📡 RepoRadar — Multi-Repository Analysis\x1b[0m\n');
  console.log('  | Repository | Health | Commits | Risk Level |');
  console.log('  |---|---|---|---|');
  
  for (const rPath of options.repos) {
    const fullPath = path.resolve(rPath.trim());
    try {
      const commits = getCommits(fullPath, { ...options, quiet: true });
      if (commits.length === 0) continue;
      const hotspots = analyzeHotspots(commits);
      const busfactor = analyzeBusFactor(commits);
      const churn = analyzeChurn(commits);
      const coupling = analyzeCoupling(commits);
      const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
      const health = reporter.calculateHealth(risk);
      
      const repoName = path.basename(fullPath).padEnd(20);
      const healthStr = `${Math.round(health.score)} (${health.grade})`.padEnd(10);
      const commitCount = String(commits.length).padEnd(8);
      const riskSummary = risk.length > 0 ? (risk[0].riskScore > 75 ? '🔴 High' : '🟡 Medium') : '🟢 Low';
      
      console.log(`  | ${repoName} | ${healthStr} | ${commitCount} | ${riskSummary} |`);
    } catch (e) {
      console.log(`  | ${path.basename(fullPath).padEnd(20)} | Error | - | - |`);
    }
  }
  console.log('');
  process.exit(0);
}

const repoPath = options.path ? path.resolve(options.path) : process.cwd();

// Parse config file if exists
const fs = require('fs');
const configPaths = ['.reporadarrc', '.reporadarrc.json'].map(p => path.join(repoPath, p));
for (const cp of configPaths) {
  if (fs.existsSync(cp)) {
    try {
      const config = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (config.ignore && options.ignore.length === 0) options.ignore = config.ignore;
      if (config.since && !options.since) options.since = config.since;
    } catch (e) {
      console.warn(`\x1b[33mWarning: Failed to parse ${path.basename(cp)}\x1b[0m`);
    }
    break;
  }
}

if (!options.json && !options.quiet) {
  console.log(`\x1b[2mScanning repository at ${repoPath}...\x1b[0m`);
  if (options.since) console.log(`\x1b[2mTime window: since ${options.since}\x1b[0m`);
  if (options.maxCommits) console.log(`\x1b[2mMax commits: ${options.maxCommits}\x1b[0m`);
  if (options.ignore.length > 0) console.log(`\x1b[2mIgnoring: ${options.ignore.join(', ')}\x1b[0m`);
}

function runAnalysis() {
  let spinnerTimer;
  if (!options.json && !options.quiet) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    spinnerTimer = setInterval(() => {
      process.stdout.write(`\r\x1b[36m${frames[i]} Parsing git history...\x1b[0m`);
      i = (i + 1) % frames.length;
    }, 80);
  }

  const { getCommits, loadConfig, applyAliases } = require('../src');

  let config = loadConfig(repoPath);

  let commits = getCommits(repoPath, options);
  commits = applyAliases(commits, config.aliases);

  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    process.stdout.write('\r\x1b[K'); // clear line
  }

  if (commits.length === 0) {
    if (options.json) console.log(JSON.stringify({ error: 'No commits found' }));
    else console.log('No commits found or not a git repository.');
    if (!options.watch) process.exit(1);
    return;
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
    } else if (options.csv) {
      console.log(reporter.generateCsv(risk));
    } else if (options.md) {
      console.log(reporter.generateMd(risk));
    } else {
      reporter.reportRisk(risk);
    }

    if (options.saveSnapshot) {
      const fs = require('fs');
      fs.writeFileSync('.reporadar-snapshot.json', JSON.stringify({ date: new Date(), risk, health: reporter.calculateHealth(risk) }, null, 2));
      console.log(`\n  \x1b[32m✓ Snapshot saved to .reporadar-snapshot.json\x1b[0m\n`);
    }

    if (options.compare) {
      const fs = require('fs');
      if (fs.existsSync(options.compare)) {
        const oldSnapshot = JSON.parse(fs.readFileSync(options.compare, 'utf8'));
        const newHealth = reporter.calculateHealth(risk);
        const diff = newHealth - oldSnapshot.health;
        const sign = diff > 0 ? '+' : '';
        console.log(`\n  \x1b[1mTrend Analysis (compared to ${new Date(oldSnapshot.date).toLocaleDateString()}): Health Score changed by \x1b[33m${sign}${diff} points\x1b[0m\n`);
      } else {
        console.log(`\n  \x1b[31mError: Snapshot file ${options.compare} not found.\x1b[0m\n`);
      }
    }
    
    break;
  }
  case 'serve': {
    const { server, analyzeOwnership, analyzeContributors, analyzeLanguages, analyzeTickets, analyzeTimeline, analyzeComplexity, analyzeAge, analyzeAttrition, analyzeMessages, analyzeBurnout, analyzeTtm, analyzeZombies, analyzeMap, analyzeWorkTypes } = require('../src');
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const ownership = analyzeOwnership(commits);
    const contributors = analyzeContributors(commits);
    const languages = analyzeLanguages(commits);
    const tickets = analyzeTickets(commits);
    const timeline = analyzeTimeline(commits);
    const complexity = analyzeComplexity(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    const health = reporter.calculateHealth(risk);
    
    const age = analyzeAge(commits);
    const attrition = analyzeAttrition(commits);
    const messages = analyzeMessages(commits);
    const burnout = analyzeBurnout(commits);
    const ttm = analyzeTtm(repoPath, options);
    const zombies = analyzeZombies(repoPath);
    const map = analyzeMap(commits);
    const worktypes = analyzeWorkTypes(commits);

    const fullData = { hotspots, busfactor, churn, coupling, ownership, contributors, languages, tickets, timeline, complexity, risk, health, age, attrition, messages, burnout, ttm, zombies, map, worktypes };
    
    server.startServer(fullData, options.port || 3000);
    break;
  }
  case 'html': {
    const { server, analyzeOwnership, analyzeContributors, analyzeLanguages, analyzeTickets, analyzeTimeline, analyzeComplexity, analyzeAge, analyzeAttrition, analyzeMessages, analyzeBurnout, analyzeTtm, analyzeZombies, analyzeMap, analyzeWorkTypes } = require('../src');
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const ownership = analyzeOwnership(commits);
    const contributors = analyzeContributors(commits);
    const languages = analyzeLanguages(commits);
    const tickets = analyzeTickets(commits);
    const timeline = analyzeTimeline(commits);
    const complexity = analyzeComplexity(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    const health = reporter.calculateHealth(risk);

    const age = analyzeAge(commits);
    const attrition = analyzeAttrition(commits);
    const messages = analyzeMessages(commits);
    const burnout = analyzeBurnout(commits);
    const ttm = analyzeTtm(repoPath, options);
    const zombies = analyzeZombies(repoPath);
    const map = analyzeMap(commits);
    const worktypes = analyzeWorkTypes(commits);

    const fullData = { hotspots, busfactor, churn, coupling, ownership, contributors, languages, tickets, timeline, complexity, risk, health, age, attrition, messages, burnout, ttm, zombies, map, worktypes };
    
    const html = server.getHtmlTemplate(fullData);
    const fs = require('fs');
    fs.writeFileSync('reporadar-report.html', html);
    console.log('✓ HTML dashboard generated: reporadar-report.html');
    break;
  }
  case 'ownership': {
    const { analyzeOwnership } = require('../src');
    const ownership = analyzeOwnership(commits);
    if (options.json) console.log(JSON.stringify(ownership, null, 2));
    else reporter.reportOwnership(ownership);
    break;
  }
  case 'contributors': {
    const { analyzeContributors } = require('../src');
    const contributors = analyzeContributors(commits);
    if (options.json) console.log(JSON.stringify(contributors, null, 2));
    else reporter.reportContributors(contributors);
    break;
  }
  case 'worktypes': {
    const { analyzeWorkTypes } = require('../src');
    const worktypes = analyzeWorkTypes(commits);
    if (options.json) {
      console.log(JSON.stringify(worktypes, null, 2));
    } else {
      console.log('\n  \x1b[1m\x1b[36mReporadar — Work Types (Context) 🏷️\x1b[0m\n');
      console.log(`  \x1b[34mFeat:\x1b[0m     ${worktypes.percentages.feat}% (${worktypes.distribution.feat})`);
      console.log(`  \x1b[31mFix:\x1b[0m      ${worktypes.percentages.fix}% (${worktypes.distribution.fix})`);
      console.log(`  \x1b[32mRefactor:\x1b[0m ${worktypes.percentages.refactor}% (${worktypes.distribution.refactor})`);
      console.log(`  \x1b[35mChore:\x1b[0m    ${worktypes.percentages.chore}% (${worktypes.distribution.chore})`);
      console.log(`  \x1b[36mDocs:\x1b[0m     ${worktypes.percentages.docs}% (${worktypes.distribution.docs})`);
      console.log(`  \x1b[33mTest:\x1b[0m     ${worktypes.percentages.test}% (${worktypes.distribution.test})`);
      console.log(`  \x1b[37mOther:\x1b[0m    ${worktypes.percentages.other}% (${worktypes.distribution.other})`);
      console.log('\n  Total commits analyzed: ' + worktypes.total + '\n');
    }
    break;
  }
  case 'languages': {
    const { analyzeLanguages } = require('../src');
    const languages = analyzeLanguages(commits);
    if (options.json) console.log(JSON.stringify(languages, null, 2));
    else reporter.reportLanguages(languages);
    break;
  }
  case 'tickets': {
    const { analyzeTickets } = require('../src');
    const tickets = analyzeTickets(commits);
    if (options.json) console.log(JSON.stringify(tickets, null, 2));
    else reporter.reportTickets(tickets);
    break;
  }
  case 'timeline': {
    const { analyzeTimeline } = require('../src');
    const timeline = analyzeTimeline(commits);
    if (options.json) console.log(JSON.stringify(timeline, null, 2));
    else reporter.reportTimeline(timeline);
    break;
  }
  case 'complexity': {
    const { analyzeComplexity } = require('../src');
    const complexity = analyzeComplexity(commits);
    if (options.json) console.log(JSON.stringify(complexity, null, 2));
    else reporter.reportComplexity(complexity, options.top);
    break;
  }
  case 'prs': {
    const { analyzePrs } = require('../src');
    const prs = analyzePrs(repoPath, options);
    if (options.json) console.log(JSON.stringify(prs, null, 2));
    else reporter.reportPrs(prs);
    break;
  }
  case 'legacy':
  case 'age': {
    const { analyzeAge } = require('../src');
    const ageData = analyzeAge(commits);
    if (options.json) console.log(JSON.stringify(ageData, null, 2));
    else reporter.reportAge(ageData, options.top);
    break;
  }
  case 'attrition':
  case 'orphans': {
    const { analyzeAttrition } = require('../src');
    const orphanedFiles = analyzeAttrition(commits);
    if (options.json) console.log(JSON.stringify(orphanedFiles, null, 2));
    else reporter.reportAttrition(orphanedFiles, options.top);
    break;
  }
  case 'messages': {
    const { analyzeMessages } = require('../src');
    const msgData = analyzeMessages(commits);
    if (options.json) console.log(JSON.stringify(msgData, null, 2));
    else reporter.reportMessages(msgData);
    break;
  }
  case 'burnout': {
    const { analyzeBurnout } = require('../src');
    const burnoutData = analyzeBurnout(commits);
    if (options.json) console.log(JSON.stringify(burnoutData, null, 2));
    else reporter.reportBurnout(burnoutData);
    break;
  }
  case 'ttm': {
    const { analyzeTtm } = require('../src');
    const ttmData = analyzeTtm(repoPath, options);
    if (options.json) console.log(JSON.stringify(ttmData, null, 2));
    else reporter.reportTtm(ttmData);
    break;
  }
  case 'zombies': {
    const { analyzeZombies } = require('../src');
    const zombies = analyzeZombies(repoPath);
    if (options.json) console.log(JSON.stringify(zombies, null, 2));
    else reporter.reportZombies(zombies);
    break;
  }
  case 'map': {
    const { analyzeMap } = require('../src');
    const mapData = analyzeMap(commits);
    if (options.json) console.log(JSON.stringify(mapData, null, 2));
    else reporter.reportMap(mapData);
    break;
  }
  case 'bot': {
    // Generates a markdown summary tailored for GitHub Actions PR comments
    const hotspots = analyzeHotspots(commits);
    const busfactor = analyzeBusFactor(commits);
    const churn = analyzeChurn(commits);
    const coupling = analyzeCoupling(commits);
    const risk = analyzeRisk(hotspots, busfactor, churn, coupling);
    const health = reporter.calculateHealth(risk);
    
    let comment = `## 📡 RepoRadar Health Report\n\n`;
    comment += `**Overall Health Score:** ${health.grade} (${Math.round(health.score)}/100)\n\n`;
    
    const criticalFiles = risk.filter(f => f.riskScore > 75).slice(0, 5);
    if (criticalFiles.length > 0) {
      comment += `### ⚠️ Critical Files to Review\n`;
      for (const f of criticalFiles) {
        comment += `- **\`${f.file}\`** (Risk: ${Math.round(f.riskScore)})\n`;
      }
      comment += `\n`;
    }

    const { analyzeBurnout } = require('../src');
    const burnoutData = analyzeBurnout(commits);
    const highRisks = burnoutData.filter(b => b.riskLevel === 'High');
    if (highRisks.length > 0) {
      comment += `### 🔥 Burnout Risk Detected\n`;
      for (const b of highRisks) {
        comment += `- ${b.author} is overworking (${b.weekendPercent}% weekend commits)\n`;
      }
      comment += `\n`;
    }

    if (process.env.GITHUB_STEP_SUMMARY) {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, comment);
    } else {
      console.log(comment);
    }
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
  case 'help': {
    console.log('\n  \x1b[1m\x1b[36m📡 RepoRadar\x1b[0m — Git Repository Forensic Analyzer\n');
    console.log('  \x1b[1mUsage:\x1b[0m reporadar [command] [options]\n');
    console.log('  \x1b[1mCommands:\x1b[0m');
    console.log('    scan              (Default) Full risk analysis with Health Score');
    console.log('    serve             Launch interactive web dashboard');
    console.log('    html              Export dashboard as HTML file');
    console.log('    hotspots          Most frequently modified files');
    console.log('    busfactor         Knowledge concentration analysis');
    console.log('    churn             Change rate vs file age');
    console.log('    coupling          Hidden temporal dependencies');
    console.log('    ownership         Codebase ownership by author');
    console.log('    contributors      Identify refactoring heroes 🦸');
    console.log('    worktypes         Categorize commits by context (feat/fix/etc)');
    console.log('    languages         Activity breakdown by language');
    console.log('    tickets           Issue tracker linkage ratio');
    console.log('    timeline          Commit activity over time');
    console.log('    prs               Pull requests & merge analysis');
    console.log('    legacy            Find old, unmaintained "dusty" files');
    console.log('    attrition         Find orphaned files whose authors have left');
    console.log('    messages          Grade commit message quality');
    console.log('    burnout           Detect developers overworking on weekends/nights');
    console.log('    ttm               Analyze Time-To-Merge for pull requests');
    console.log('    zombies           Find stale branches not merged to master');
    console.log('    map               Show codebase ownership by module/directory');
    console.log('    bot               Generate a Markdown summary for CI/CD PR comments');
    console.log('    multi             Analyze multiple repositories (--repos=)\n');
    console.log('  \x1b[1mOptions:\x1b[0m');
    console.log('    --json                      Output as JSON');
    console.log('    --csv                       Output as CSV');
    console.log('    --md                        Output as Markdown');
    console.log('    --ignore-bots               Filter out bots and auto-formatting');
    console.log('    --include-vendor            Include vendor code (node_modules, etc)');
    console.log('    --top=<n>                   Show top N results (default: 15)');
    console.log('    --since=<time>              Time window (e.g. 6.months, 1.year)');
    console.log('    --max-commits=<n>           Limit analysis to last N commits');
    console.log('    --ignore=<patterns>         Comma-separated ignore patterns');
    console.log('    --path=<dir>                Path to repository (default: cwd)');
    console.log('    --repos=<dirs>              Comma-separated paths for "multi" command');
    console.log('    --watch                     Watch repository for new commits');
    console.log('    --save-snapshot             Save metrics to .reporadar-snapshot.json');
    console.log('    --compare=<file>            Compare with a previous snapshot');
    console.log('    --quiet, -q                 Suppress status messages\n');
    if (!options.watch) process.exit(0);
    return;
  }
  default:
    if (options.json) {
      console.log(JSON.stringify({ error: `Unknown command: ${command}` }));
    } else {
      console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
      console.error('Run \x1b[36mreporadar --help\x1b[0m for usage.');
    }
    if (!options.watch) process.exit(1);
    return;
}
} // end runAnalysis()

runAnalysis();

if (options.watch) {
  const fs = require('fs');
  const watchPath = path.join(repoPath, '.git', 'refs', 'heads');
  if (fs.existsSync(watchPath)) {
    console.log(`\n\x1b[36m👀 Watching for new commits in ${watchPath}...\x1b[0m`);
    let debounceTimer;
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`\n\x1b[33m↻ Detected new commit. Re-running analysis...\x1b[0m`);
        runAnalysis();
      }, 500);
    });
  } else {
    console.warn(`\x1b[33mWarning: --watch requires a local .git directory. Watch mode disabled.\x1b[0m`);
  }
}
