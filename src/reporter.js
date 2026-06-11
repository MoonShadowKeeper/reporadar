function reportHotspots(hotspots, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Hotspot Analysis\x1b[0m\n');
  
  const top = hotspots.slice(0, limit);
  const maxScore = top.length > 0 ? top[0].score || 1 : 1;
  for (const h of top) {
    const barLength = Math.round((h.score / maxScore) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`  ${bar} \x1b[33m${h.score.toFixed(1)} score\x1b[0m (\x1b[33m${h.commits}\x1b[0m commits, \x1b[32m${h.changes}\x1b[0m lines) — \x1b[36m${h.file}\x1b[0m`);
  }
  console.log('');
}

function reportBusFactor(busFactors, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Bus Factor Analysis\x1b[0m\n');
  
  const critical = busFactors.filter(f => f.busFactor === 1).slice(0, limit);
  const healthy = busFactors.filter(f => f.busFactor > 1).slice(0, 5);

  if (critical.length > 0) {
    console.log('  \x1b[31m\x1b[1mCRITICAL RISK (Bus factor = 1)\x1b[0m');
    for (const file of critical) {
      const author = file.topContributors[0];
      console.log(`    \x1b[31m●\x1b[0m ${file.file} \x1b[2m(${author.percentage}% ${author.name})\x1b[0m`);
    }
    console.log('');
  }

  if (healthy.length > 0) {
    console.log('  \x1b[32m\x1b[1mHEALTHY FILES\x1b[0m');
    for (const file of healthy) {
      const authorsStr = file.topContributors.map(a => `${a.percentage}% ${a.name}`).join(', ');
      console.log(`    \x1b[32m●\x1b[0m ${file.file} \x1b[2m(${authorsStr})\x1b[0m`);
    }
    console.log('');
  }
}

function reportChurn(churns, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Code Churn Analysis\x1b[0m\n');
  
  const top = churns.slice(0, limit);
  for (const c of top) {
    let color = '\x1b[32m'; // green
    if (c.category === 'turbulent') color = '\x1b[31m'; // red
    else if (c.category === 'active') color = '\x1b[33m'; // yellow
    
    console.log(`  ${color}●\x1b[0m ${c.file}`);
    console.log(`    \x1b[2m${c.churnRate} changes/mo │ Age: ${c.ageMonths} mo │ Total changes: ${c.totalChanges}\x1b[0m`);
  }
  console.log('');
}

function reportCoupling(couplings, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Hidden Coupling (Co-changing files)\x1b[0m\n');
  
  if (couplings.length === 0) {
    console.log('  \x1b[32m✓ No strong coupling detected.\x1b[0m\n');
    return;
  }

  const top = couplings.slice(0, limit);
  for (const c of top) {
    console.log(`  \x1b[31m${c.strength}%\x1b[0m coupling (\x1b[2m${c.coChanges} co-changes\x1b[0m)`);
    console.log(`    ├─ ${c.fileA}`);
    console.log(`    └─ ${c.fileB}`);
  }
  console.log('');
}

function calculateHealth(risks) {
  let score = 100;
  if (risks.length > 0) {
    const totalRisk = risks.reduce((sum, r) => sum + r.riskScore, 0);
    const avgRisk = totalRisk / Math.max(1, risks.length);
    score = Math.max(0, 100 - Math.round(avgRisk * 1.5));
  }
  
  let grade = 'A';
  if (score < 40) grade = 'F';
  else if (score < 60) grade = 'D';
  else if (score < 75) grade = 'C';
  else if (score < 90) grade = 'B';
  
  return { score, grade };
}

function reportRisk(risks, limit = 20) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Overall Risk Report\x1b[0m\n');
  
  const top = risks.slice(0, limit);
  
  for (const r of top) {
    let color = '\x1b[32m'; // green
    if (r.level === 'CRITICAL') color = '\x1b[31m'; // red
    else if (r.level === 'HIGH') color = '\x1b[33m'; // yellow
    else if (r.level === 'MEDIUM') color = '\x1b[36m'; // cyan
    
    console.log(`  [${String(r.riskScore).padStart(3)}] ${color}${r.level.padEnd(8)}\x1b[0m ${r.file}`);
    for (const factor of r.factors) {
      console.log(`       \x1b[2m↳ ${factor}\x1b[0m`);
    }
    console.log('');
  }

  const health = calculateHealth(risks);
  let color = '\x1b[32m';
  if (health.score < 40) color = '\x1b[31m';
  else if (health.score < 60) color = '\x1b[31m';
  else if (health.score < 75) color = '\x1b[33m';
  else if (health.score < 90) color = '\x1b[36m';

  console.log(`  \x1b[1mRepository Health Score: ${color}${health.grade} (${health.score}/100)\x1b[0m\n`);

  console.log('  \x1b[2mRun specific analyzers for more details: hotspots, busfactor, churn, coupling\x1b[0m\n');
}

function generateHtml(risks, outputPath) {
  const fs = require('fs');
  const path = require('path');
  
  const topRisks = risks.slice(0, 50);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reporadar Risk Dashboard</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    h1 { text-align: center; color: #38bdf8; }
    .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; border-left: 4px solid #38bdf8; }
    .critical { border-left-color: #ef4444; }
    .high { border-left-color: #f97316; }
    .medium { border-left-color: #eab308; }
    .file { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; word-break: break-all; }
    .score { font-size: 1.5rem; float: right; font-weight: 900; }
    .reasons { color: #94a3b8; font-size: 0.9rem; }
    .reason { margin-top: 0.3rem; }
  </style>
</head>
<body>
  <h1>📡 Reporadar Risk Dashboard</h1>
  <div style="max-width: 900px; margin: 0 auto;">
    ${topRisks.map(r => {
      let level = 'low';
      if (r.riskScore >= 75) level = 'critical';
      else if (r.riskScore >= 50) level = 'high';
      else if (r.riskScore >= 25) level = 'medium';
      
      const reasons = r.factors.map(res => `<div class="reason">↳ ${res}</div>`).join('');
      return `<div class="card ${level}">
        <span class="score">${r.riskScore}</span>
        <div class="file">${r.file}</div>
        <div class="reasons">${reasons}</div>
      </div>`;
    }).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`\n  \x1b[32m✓ HTML Dashboard generated at: ${outputPath}\x1b[0m\n`);
}

function generateCsv(risks) {
  const header = 'File,RiskScore,Level,Factors\n';
  const rows = risks.map(r => {
    const factors = r.factors.join('; ').replace(/"/g, '""');
    return `"${r.file}",${r.riskScore},${r.level},"${factors}"`;
  });
  return header + rows.join('\n');
}

function generateMd(risks) {
  let md = '# 📡 Reporadar Risk Report\n\n';
  md += '| File | Risk Score | Level | Factors |\n';
  md += '|---|---|---|---|\n';
  for (const r of risks) {
    const factors = r.factors.join('<br>↳ ');
    let emoji = '🟢';
    if (r.riskScore >= 75) emoji = '🔴';
    else if (r.riskScore >= 50) emoji = '🟠';
    else if (r.riskScore >= 25) emoji = '🟡';
    
    md += `| \`${r.file}\` | ${r.riskScore} | ${emoji} ${r.level} | ↳ ${factors} |\n`;
  }
  return md;
}

function reportOwnership(ownerships, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Code Ownership Analysis\x1b[0m\n');
  
  const top = ownerships.slice(0, limit);
  const totalRepoChanges = ownerships.reduce((sum, o) => sum + o.totalChanges, 0);

  for (const o of top) {
    const percentage = Math.round((o.totalChanges / Math.max(1, totalRepoChanges)) * 100);
    const barLength = Math.round((percentage / 100) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    console.log(`  ${bar} \x1b[36m${o.author.padEnd(20)}\x1b[0m ${percentage}% repo impact (\x1b[33m${o.ownedFiles}\x1b[0m files owned)`);
  }
  console.log('');
}

function reportContributors(contributors, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Refactoring Heroes 🦸\x1b[0m\n');
  
  const top = contributors.slice(0, limit);

  for (const c of top) {
    let color = '\x1b[32m'; // green
    if (c.heroScore >= 60) color = '\x1b[34m'; // blue/cyan for very high
    else if (c.heroScore >= 40) color = '\x1b[32m'; // green
    else color = '\x1b[33m'; // yellow
    
    const barLength = Math.round((Math.min(c.heroScore, 100) / 100) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    console.log(`  ${color}${bar}\x1b[0m \x1b[36m${c.author.padEnd(20)}\x1b[0m ${c.heroScore} score (\x1b[33m${c.refactors}\x1b[0m refactors, \x1b[33m${c.fixes}\x1b[0m fixes)`);
  }
  console.log('');
}

function reportLanguages(languages) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Language Breakdown\x1b[0m\n');
  for (const l of languages) {
    const barLength = Math.round((l.percentage / 100) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`  \x1b[35m${bar}\x1b[0m \x1b[36m${l.language.padEnd(15)}\x1b[0m ${l.percentage}% (${l.changes} changes)`);
  }
  console.log('');
}

function reportTickets(tickets) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Issue Tracker Linkage\x1b[0m\n');
  
  let color = '\x1b[32m';
  if (tickets.linkageRatio < 50) color = '\x1b[33m';
  if (tickets.linkageRatio < 20) color = '\x1b[31m';
  
  console.log(`  Linkage Ratio: ${color}${tickets.linkageRatio}%\x1b[0m`);
  console.log(`  Linked Commits: \x1b[32m${tickets.linkedCommits}\x1b[0m`);
  console.log(`  Unlinked Commits: \x1b[31m${tickets.unlinkedCommits}\x1b[0m\n`);
  
  if (tickets.topIssues.length > 0) {
    console.log('  Top Active Issues:');
    for (const t of tickets.topIssues) {
      console.log(`    \x1b[36m${t.issue.padEnd(12)}\x1b[0m ${t.count} commits`);
    }
  }
  console.log('');
}

function reportTimeline(timeline) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Activity Timeline\x1b[0m\n');
  
  console.log(`  Average commits/month: \x1b[36m${timeline.avgCommitsPerMonth}\x1b[0m`);
  console.log(`  Peak coding hour: \x1b[36m${timeline.peakHour}:00\x1b[0m`);
  console.log(`  Time span: \x1b[36m${timeline.totalMonths} months\x1b[0m\n`);

  // Weekday chart
  console.log('  \x1b[1mWeekday Distribution:\x1b[0m');
  const maxDay = Math.max(...timeline.weekdays.map(w => w.commits));
  for (const w of timeline.weekdays) {
    const barLen = Math.round((w.commits / Math.max(1, maxDay)) * 20);
    const bar = '\x1b[35m' + '█'.repeat(barLen) + '░'.repeat(20 - barLen) + '\x1b[0m';
    console.log(`  ${bar} ${w.day.padEnd(10)} ${w.percentage}%`);
  }

  // Dead zones
  if (timeline.deadZones.length > 0) {
    console.log(`\n  \x1b[31m\x1b[1mDead Zones (low/no activity):\x1b[0m`);
    for (const d of timeline.deadZones.slice(0, 5)) {
      console.log(`    \x1b[31m●\x1b[0m ${d.month} — ${d.commits} commits (${d.type})`);
    }
  }

  // Burst zones
  if (timeline.burstZones.length > 0) {
    console.log(`\n  \x1b[33m\x1b[1mBurst Zones (deadline rushes):\x1b[0m`);
    for (const b of timeline.burstZones.slice(0, 5)) {
      console.log(`    \x1b[33m●\x1b[0m ${b.month} — ${b.commits} commits (${b.ratio}x average)`);
    }
  }
  console.log('');
}

function reportComplexity(complexities, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Complexity Analysis\x1b[0m\n');

  const top = complexities.slice(0, limit);
  const maxScore = top.length > 0 ? top[0].complexityScore || 1 : 1;

  for (const c of top) {
    let color = '\x1b[32m';
    if (c.category === 'critical') color = '\x1b[31m';
    else if (c.category === 'complex') color = '\x1b[33m';
    else if (c.category === 'moderate') color = '\x1b[36m';

    const barLen = Math.round((c.complexityScore / maxScore) * 20);
    const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
    console.log(`  ${color}${bar}\x1b[0m \x1b[36m${c.complexityScore.toFixed(1).padStart(6)}\x1b[0m  ${c.file}`);
    console.log(`       \x1b[2m~${c.estimatedLOC} LOC │ ${c.commits} commits │ ${c.authors} author(s) │ ${c.churnIntensity}x churn\x1b[0m`);
  }
  console.log('');
}

function reportPrs(prs) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Pull Requests & Merge Analysis\x1b[0m\n');
  
  if (prs.totalMerges === 0) {
    console.log('  \x1b[33mNo merge commits found. Team is using fast-forward/rebase or developing solo.\x1b[0m\n');
    return;
  }

  console.log(`  Total Merges: \x1b[1m${prs.totalMerges}\x1b[0m`);
  console.log(`  Merges per month: \x1b[1m${prs.mergesPerMonth}\x1b[0m\n`);
  
  console.log('  \x1b[36mTop Mergers (Reviewers/Maintainers):\x1b[0m');
  for (const merger of prs.topMergers) {
    console.log(`    \x1b[32m✔\x1b[0m ${merger.author.padEnd(20)} ${merger.count} merges`);
  }
  console.log('');
}

function reportAge(ageData, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Legacy Code Detection (Code Age)\x1b[0m\n');
  
  const legacy = ageData.filter(a => a.status === 'legacy' || a.status === 'dormant');
  if (legacy.length === 0) {
    console.log('  \x1b[32m✓ No legacy code detected. The codebase is actively maintained.\x1b[0m\n');
    return;
  }

  console.log(`  Found \x1b[33m${legacy.length}\x1b[0m files that haven't been touched in over a year.\n`);
  
  for (const f of legacy.slice(0, limit)) {
    const color = f.status === 'legacy' ? '\x1b[31m' : '\x1b[33m';
    console.log(`  ${color}●\x1b[0m \x1b[1m${f.ageMonths} months ago\x1b[0m (${f.lastModified}) — ${f.file}`);
  }
  console.log('');
}

function reportAttrition(orphanedFiles, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Team Attrition Risk (Orphaned Code)\x1b[0m\n');
  
  if (orphanedFiles.length === 0) {
    console.log('  \x1b[32m✓ No orphaned code detected. Codebase knowledge is well distributed.\x1b[0m\n');
    return;
  }

  console.log(`  \x1b[31m⚠️  WARNING: Found ${orphanedFiles.length} files highly dependent on inactive authors.\x1b[0m\n`);
  
  for (const f of orphanedFiles.slice(0, limit)) {
    console.log(`  \x1b[31m●\x1b[0m \x1b[1m${f.file}\x1b[0m`);
    console.log(`       \x1b[2mPrimary author: \x1b[33m${f.primaryAuthor}\x1b[2m (${f.ownershipRatio}% ownership) — inactive for ${f.inactiveMonths} months\x1b[0m`);
  }
  console.log('');
}

function reportMessages(msgData) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Commit Message Quality\x1b[0m\n');
  
  if (!msgData) return;

  const scoreColor = msgData.score >= 80 ? '\x1b[32m' : (msgData.score >= 50 ? '\x1b[33m' : '\x1b[31m');
  console.log(`  Quality Score: ${scoreColor}\x1b[1m${msgData.score}/100\x1b[0m\n`);
  
  console.log(`  Conventional Commits: \x1b[1m${msgData.conventionalPercentage}%\x1b[0m (feat:, fix:, etc.)`);
  console.log(`  Short/Vague Messages: \x1b[1m${msgData.shortPercentage}%\x1b[0m (< 15 chars)`);
  console.log(`  Linked to Tickets:    \x1b[1m${msgData.ticketPercentage}%\x1b[0m (e.g. #123, PROJ-456)\n`);
  
  if (msgData.topOffenders.length > 0) {
    console.log('  \x1b[36mTop offenders (vague commits):\x1b[0m');
    for (const offender of msgData.topOffenders) {
      console.log(`    \x1b[31m✘\x1b[0m ${offender.author.padEnd(20)} ${offender.count} vague commits`);
    }
  }
  console.log('');
}

function reportBurnout(burnoutData) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Team Burnout Risk\x1b[0m\n');
  
  if (burnoutData.length === 0) {
    console.log('  \x1b[32m✓ No developers analyzed or not enough data.\x1b[0m\n');
    return;
  }

  console.log('  \x1b[2mAnalyzing weekend and late-night (22:00-06:00) commit patterns...\x1b[0m\n');

  for (const author of burnoutData) {
    let color = author.riskLevel === 'High' ? '\x1b[31m' : (author.riskLevel === 'Medium' ? '\x1b[33m' : '\x1b[32m');
    let icon = author.riskLevel === 'High' ? '🔥' : (author.riskLevel === 'Medium' ? '⚠️ ' : '✅');
    
    console.log(`  ${icon} ${color}\x1b[1m${author.author.padEnd(20)}\x1b[0m Risk: ${color}${author.riskLevel}\x1b[0m`);
    console.log(`      \x1b[2mWeekend: \x1b[0m${author.weekendPercent}% \x1b[2mLate Night: \x1b[0m${author.lateNightPercent}% \x1b[2m(Total commits: ${author.totalCommits})\x1b[0m`);
  }
  console.log('');
}

function reportTtm(ttmData) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Time-To-Merge (Review Bottlenecks)\x1b[0m\n');
  
  if (ttmData.totalAnalyzed === 0) {
    console.log('  \x1b[33mNot enough merge commits to analyze TTM.\x1b[0m\n');
    return;
  }

  const avgColor = ttmData.averageDays > 3 ? '\x1b[31m' : (ttmData.averageDays > 1 ? '\x1b[33m' : '\x1b[32m');
  
  console.log(`  Average Time-To-Merge: ${avgColor}\x1b[1m${ttmData.averageDays} days\x1b[0m (${ttmData.averageHours} hours)`);
  console.log(`  Fast Merges (< 24h):   \x1b[32m${ttmData.fastMerges}\x1b[0m`);
  console.log(`  Slow Merges (> 7d):    \x1b[31m${ttmData.slowMerges}\x1b[0m\n`);
  
  if (ttmData.slowMerges > 0) {
    console.log('  \x1b[36mSlowest PRs/Merges:\x1b[0m');
    for (const detail of ttmData.details.slice(0, 5)) {
      if (detail.hours > 24 * 7) {
        const days = Math.round(detail.hours / 24);
        console.log(`    \x1b[31m●\x1b[0m ${detail.hash.substring(0, 7)} took \x1b[1m${days} days\x1b[0m (Merged: ${detail.mergeDate})`);
      }
    }
  }
  console.log('');
}

function reportZombies(zombies) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Zombie Branches\x1b[0m\n');
  
  if (zombies.length === 0) {
    console.log('  \x1b[32m✓ No zombie branches found. Repository is clean.\x1b[0m\n');
    return;
  }

  console.log(`  \x1b[33mFound ${zombies.length} stale branches (no activity for > 2 months).\x1b[0m\n`);
  
  for (const z of zombies.slice(0, 15)) {
    console.log(`  \x1b[31m🧟\x1b[0m \x1b[1m${z.branch.padEnd(30)}\x1b[0m \x1b[2m(Inactive for ${z.ageMonths} months, author: ${z.author})\x1b[0m`);
  }
  console.log('');
}

function reportMap(mapData) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Module Ownership Map\x1b[0m\n');
  
  if (mapData.length === 0) {
    console.log('  \x1b[33mNot enough data to map modules.\x1b[0m\n');
    return;
  }

  for (const mod of mapData.slice(0, 10)) {
    console.log(`  📁 \x1b[1m\x1b[34m${mod.module.padEnd(25)}\x1b[0m \x1b[2m(${mod.totalChanges} changes)\x1b[0m`);
    let ownersStr = mod.owners.map(o => `\x1b[32m${o.author}\x1b[0m (${o.percentage}%)`).join(', ');
    console.log(`       Owners: ${ownersStr}`);
  }
  console.log('');
}
function reportWorkTypes(wt) {
  console.log('\n  \x1b[1m\x1b[36mReporadar — Work Types (Context) 🏷️\x1b[0m\n');
  if (wt.total === 0) {
    console.log('  \x1b[33mNot enough data.\x1b[0m\n');
    return;
  }
  console.log(`  \x1b[34mFeat:\x1b[0m     ${wt.percentages.feat}% (${wt.distribution.feat})`);
  console.log(`  \x1b[31mFix:\x1b[0m      ${wt.percentages.fix}% (${wt.distribution.fix})`);
  console.log(`  \x1b[32mRefactor:\x1b[0m ${wt.percentages.refactor}% (${wt.distribution.refactor})`);
  console.log(`  \x1b[35mChore:\x1b[0m    ${wt.percentages.chore}% (${wt.distribution.chore})`);
  console.log(`  \x1b[36mDocs:\x1b[0m     ${wt.percentages.docs}% (${wt.distribution.docs})`);
  console.log('');
}

module.exports = {
  reportHotspots,
  reportBusFactor,
  reportChurn,
  reportCoupling,
  reportRisk,
  reportOwnership,
  reportContributors,
  reportLanguages,
  reportTickets,
  reportTimeline,
  reportComplexity,
  reportPrs,
  reportAge,
  reportAttrition,
  reportMessages,
  reportBurnout,
  reportTtm,
  reportZombies,
  reportMap,
  reportWorkTypes,
  generateHtml,
  generateCsv,
  generateMd,
  calculateHealth
};
