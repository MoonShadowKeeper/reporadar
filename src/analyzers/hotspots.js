/**
 * Analyzes the commit history to find files that change most frequently.
 * @param {Array} commits 
 * @returns {Array} Hotspots sorted by frequency
 */
function analyzeHotspots(commits) {
  const fileStats = {};

  const now = new Date();

  for (const commit of commits) {
    const commitDate = new Date(commit.date);
    const daysAgo = (now - commitDate) / (1000 * 60 * 60 * 24) || 1;
    // Decay factor: half-life of 1 year (365 days)
    const decay = Math.pow(0.5, daysAgo / 365);

    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      
      if (!fileStats[file.file]) {
        fileStats[file.file] = {
          file: file.file,
          commits: 0,
          changes: 0,
          score: 0,
          authors: new Set(),
        };
      }
      
      const fileChanges = file.added + file.deleted;
      fileStats[file.file].commits += 1;
      fileStats[file.file].changes += fileChanges;
      // Score = (1 + log10(changes)) * time_decay
      fileStats[file.file].score += (1 + Math.log10(fileChanges + 1)) * decay;
      fileStats[file.file].authors.add(commit.author);
    }
  }

  return Object.values(fileStats)
    .map(stat => ({ 
      ...stat, 
      authors: stat.authors.size,
      score: Math.round(stat.score * 100) / 100
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { analyzeHotspots };
