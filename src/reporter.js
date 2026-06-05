function reportHotspots(hotspots, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36m📡 Reporadar — Hotspot Analysis\x1b[0m\n');
  
  const top = hotspots.slice(0, limit);
  const maxCommits = top.length > 0 ? top[0].commits : 1;

  for (const stat of top) {
    const barLength = Math.round((stat.commits / maxCommits) * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
    console.log(`  \x1b[33m${bar}\x1b[0m ${String(stat.commits).padStart(4)} commits │ ${stat.file}`);
  }
  console.log('');
}

function reportBusFactor(busFactors, limit = 15) {
  console.log('\n  \x1b[1m\x1b[36m📡 Reporadar — Bus Factor Analysis\x1b[0m\n');
  
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

module.exports = { reportHotspots, reportBusFactor };
