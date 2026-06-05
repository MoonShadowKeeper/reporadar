/**
 * Combines all analyzers to calculate a holistic risk score.
 * @param {Array} hotspots 
 * @param {Array} busfactors 
 * @param {Array} churns 
 * @param {Array} couplings 
 * @returns {Array} Files sorted by risk score (0-100)
 */
function analyzeRisk(hotspots, busfactors, churns, couplings) {
  const fileScores = {};

  // Initialize
  for (const h of hotspots) {
    if (!fileScores[h.file]) fileScores[h.file] = { file: h.file, riskScore: 0, factors: [] };
  }

  // 1. Hotspots contribution (up to 35 points)
  if (hotspots.length > 0) {
    const maxHotspotScore = hotspots[0].score || 1;
    for (const h of hotspots) {
      const score = (h.score / maxHotspotScore) * 35;
      fileScores[h.file].riskScore += score;
      if (score > 10) fileScores[h.file].factors.push(`Hotspot (score: ${h.score}, ${h.commits} commits)`);
    }
  }

  // 2. Bus Factor contribution (up to 35 points)
  for (const b of busfactors) {
    if (!fileScores[b.file]) fileScores[b.file] = { file: b.file, riskScore: 0, factors: [] };
    
    if (b.busFactor === 1) {
      fileScores[b.file].riskScore += 35;
      const author = b.topContributors[0];
      fileScores[b.file].factors.push(`Bus factor 1 (${author.name} owns ${author.percentage}%)`);
    } else if (b.busFactor === 2) {
      fileScores[b.file].riskScore += 15;
    }
  }

  // 3. Churn contribution (up to 20 points)
  if (churns.length > 0) {
    const maxChurn = churns[0].churnRate;
    for (const c of churns) {
      if (!fileScores[c.file]) fileScores[c.file] = { file: c.file, riskScore: 0, factors: [] };
      
      const score = (c.churnRate / maxChurn) * 20;
      fileScores[c.file].riskScore += score;
      if (c.category === 'turbulent') {
        fileScores[c.file].factors.push(`Turbulent churn (${c.churnRate} changes/month)`);
      }
    }
  }

  // 4. Coupling contribution (up to 10 points)
  for (const c of couplings) {
    for (const file of [c.fileA, c.fileB]) {
      if (fileScores[file]) {
        fileScores[file].riskScore += 5; // Add points for being highly coupled
        
        // Add factor description only once
        if (!fileScores[file].factors.some(f => f.startsWith('Highly coupled'))) {
           fileScores[file].factors.push(`Highly coupled`);
        }
      }
    }
  }

  const results = Object.values(fileScores).map(f => {
    f.riskScore = Math.min(100, Math.round(f.riskScore));
    f.level = f.riskScore >= 75 ? 'CRITICAL' : f.riskScore >= 50 ? 'HIGH' : f.riskScore >= 25 ? 'MEDIUM' : 'LOW';
    return f;
  }).filter(f => f.riskScore > 10);

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

module.exports = { analyzeRisk };
