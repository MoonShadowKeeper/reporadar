/**
 * Analyzes the commit history to find files that change most frequently.
 * @param {Array} commits 
 * @returns {Array} Hotspots sorted by frequency
 */
function analyzeHotspots(commits) {
  const fileStats = {};

  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      
      if (!fileStats[file.file]) {
        fileStats[file.file] = {
          file: file.file,
          commits: 0,
          changes: 0,
          authors: new Set(),
        };
      }
      
      fileStats[file.file].commits += 1;
      fileStats[file.file].changes += (file.added + file.deleted);
      fileStats[file.file].authors.add(commit.author);
    }
  }

  return Object.values(fileStats)
    .map(stat => ({ ...stat, authors: stat.authors.size }))
    .sort((a, b) => b.commits - a.commits);
}

module.exports = { analyzeHotspots };
