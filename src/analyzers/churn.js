/**
 * Analyzes file churn (change rate relative to age).
 * @param {Array} commits 
 * @returns {Array} Churn stats per file
 */
function analyzeChurn(commits) {
  const fileStats = {};
  const now = Date.now();

  for (const commit of commits) {
    const commitDate = new Date(commit.date).getTime();

    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock|\.gitignore/)) continue;
      
      if (!fileStats[file.file]) {
        fileStats[file.file] = {
          file: file.file,
          firstCommit: commitDate,
          lastCommit: commitDate,
          totalChanges: 0,
        };
      }
      
      const stats = fileStats[file.file];
      stats.firstCommit = Math.min(stats.firstCommit, commitDate);
      stats.lastCommit = Math.max(stats.lastCommit, commitDate);
      stats.totalChanges += (file.added + file.deleted || 1);
    }
  }

  const results = [];
  for (const stat of Object.values(fileStats)) {
    if (stat.totalChanges < 5) continue; // Ignore trivial files

    // Age in months (minimum 1 month to avoid division by zero)
    const ageMs = now - stat.firstCommit;
    const ageMonths = Math.max(1, ageMs / (1000 * 60 * 60 * 24 * 30.44));
    
    // Changes per month
    const churnRate = stat.totalChanges / ageMonths;

    let category = 'stable';
    if (churnRate > 4) category = 'turbulent';
    else if (churnRate > 1) category = 'active';

    results.push({
      file: stat.file,
      ageMonths: Math.round(ageMonths * 10) / 10,
      totalChanges: stat.totalChanges,
      churnRate: Math.round(churnRate * 100) / 100,
      category
    });
  }

  return results.sort((a, b) => b.churnRate - a.churnRate);
}

module.exports = { analyzeChurn };
