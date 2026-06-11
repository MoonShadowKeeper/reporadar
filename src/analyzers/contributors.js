/**
 * Analyzes contributor patterns and finds refactoring heroes.
 * @param {Array} commits 
 * @returns {Array} Contributors sorted by impact/risk
 */
function analyzeContributors(commits) {
  const authors = {};
  
  for (const commit of commits) {
    if (!authors[commit.author]) {
      authors[commit.author] = { author: commit.author, commits: 0, added: 0, deleted: 0, refactors: 0, fixes: 0 };
    }
    
    authors[commit.author].commits += 1;
    
    const msg = commit.message.toLowerCase();
    if (msg.startsWith('refactor') || msg.includes('cleanup') || msg.includes('clean up')) {
      authors[commit.author].refactors += 1;
    }
    if (msg.startsWith('fix') || msg.includes('bug')) {
      authors[commit.author].fixes += 1;
    }

    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      authors[commit.author].added += file.added;
      authors[commit.author].deleted += file.deleted;
    }
  }

  const results = [];
  for (const stat of Object.values(authors)) {
    if (stat.commits < 3) continue; // ignore very minor contributors
    
    // Churn ratio: how much of their code is deleted/rewritten
    const totalLines = stat.added + stat.deleted;
    const churnRatio = totalLines > 0 ? stat.deleted / totalLines : 0;
    
    // Refactoring score: based on explicit refactor commits and deleting more code than adding
    const refactorRatio = stat.refactors / stat.commits;
    const netLines = stat.added - stat.deleted; // negative is good for refactoring
    const deletionBonus = netLines < 0 ? Math.min(0.5, Math.abs(netLines) / 10000) : 0;
    const heroScore = Math.round((refactorRatio * 0.6 + deletionBonus * 0.4) * 100);
    
    // Risk score
    const volumeScore = Math.min(1.0, Math.log10(totalLines + 1) / 5);
    const riskScore = Math.round((churnRatio * 0.7 + volumeScore * 0.3) * 100);
    
    results.push({
      author: stat.author,
      commits: stat.commits,
      refactors: stat.refactors,
      fixes: stat.fixes,
      churnRatio: Math.round(churnRatio * 100),
      heroScore,
      riskScore
    });
  }

  // Sort primarily by hero score (refactoring) to emphasize health
  return results.sort((a, b) => b.heroScore - a.heroScore);
}

module.exports = { analyzeContributors };
