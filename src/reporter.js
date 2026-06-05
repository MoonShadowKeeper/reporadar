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
  if (risks.length === 0) return 100;
  const totalRisk = risks.reduce((sum, r) => sum + r.riskScore, 0);
  const avgRisk = totalRisk / Math.max(1, risks.length);
  return Math.max(0, 100 - Math.round(avgRisk * 1.5));
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
  let grade = 'A';
  let color = '\x1b[32m';
  if (health < 40) { grade = 'F'; color = '\x1b[31m'; }
  else if (health < 60) { grade = 'D'; color = '\x1b[31m'; }
  else if (health < 75) { grade = 'C'; color = '\x1b[33m'; }
  else if (health < 90) { grade = 'B'; color = '\x1b[36m'; }

  console.log(`  \x1b[1mRepository Health Score: ${color}${grade} (${health}/100)\x1b[0m\n`);

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
  console.log('\n  \x1b[1m\x1b[36mReporadar — Contributor Risk Analysis\x1b[0m\n');
  
  const top = contributors.slice(0, limit);

  for (const c of top) {
    let color = '\x1b[32m'; // green
    if (c.riskScore >= 60) color = '\x1b[31m'; // red
    else if (c.riskScore >= 40) color = '\x1b[33m'; // yellow
    
    const barLength = Math.round((c.riskScore / 100) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    
    console.log(`  ${color}${bar}\x1b[0m \x1b[36m${c.author.padEnd(20)}\x1b[0m ${c.churnRatio}% churn ratio (\x1b[33m${c.commits}\x1b[0m commits)`);
  }
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
  generateHtml,
  generateCsv,
  generateMd,
  calculateHealth
};
