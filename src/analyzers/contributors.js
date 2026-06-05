/**
 * Analyzes contributor risk patterns (e.g., high churn ratio, low bus factor impact).
 * @param {Array} commits 
 * @returns {Array} Contributors sorted by risk score
 */
function analyzeContributors(commits) {
  const authors = {};
  
  for (const commit of commits) {
    if (!authors[commit.author]) {
      authors[commit.author] = { author: commit.author, commits: 0, added: 0, deleted: 0 };
    }
    
    authors[commit.author].commits += 1;
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      authors[commit.author].added += file.added;
      authors[commit.author].deleted += file.deleted;
    }
  }

  const results = [];
  for (const stat of Object.values(authors)) {
    if (stat.commits < 5) continue; // ignore very minor contributors
    
    // Churn ratio: how much of their code is deleted/rewritten
    const totalLines = stat.added + stat.deleted;
    const churnRatio = totalLines > 0 ? stat.deleted / totalLines : 0;
    
    // Risk score: combination of high churn and high volume
    // If you write 100,000 lines and 80,000 are deleted, that's high risk.
    const volumeScore = Math.min(1.0, Math.log10(totalLines + 1) / 5); // caps around 100k lines
    const riskScore = Math.round((churnRatio * 0.7 + volumeScore * 0.3) * 100);
    
    results.push({
      author: stat.author,
      commits: stat.commits,
      churnRatio: Math.round(churnRatio * 100),
      riskScore
    });
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}

module.exports = { analyzeContributors };
