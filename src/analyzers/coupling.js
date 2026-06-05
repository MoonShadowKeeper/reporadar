/**
 * Finds files that frequently change together in the same commits.
 * @param {Array} commits 
 * @returns {Array} Strongly coupled file pairs
 */
function analyzeCoupling(commits) {
  const fileChangeCounts = {};
  const pairCounts = {};

  for (const commit of commits) {
    // Only care about commits touching between 2 and 30 files
    // Commits with 1 file have no coupling. Commits with >30 files are usually massive refactors/format runs.
    if (commit.files.length < 2 || commit.files.length > 30) continue;

    const files = commit.files
      .map(f => f.file)
      .filter(f => !f.match(/package-lock\.json|yarn\.lock|\.gitignore|package\.json/));

    for (let i = 0; i < files.length; i++) {
      const fileA = files[i];
      fileChangeCounts[fileA] = (fileChangeCounts[fileA] || 0) + 1;

      for (let j = i + 1; j < files.length; j++) {
        const fileB = files[j];
        
        // Ensure consistent ordering for the pair key
        const pair = [fileA, fileB].sort();
        const pairKey = `${pair[0]}::${pair[1]}`;
        
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
      }
    }
  }

  const results = [];
  for (const [pairKey, coChanges] of Object.entries(pairCounts)) {
    if (coChanges < 3) continue; // Ignore pairs with fewer than 3 co-changes

    const [fileA, fileB] = pairKey.split('::');
    
    // Jaccard similarity index for coupling
    const strength = coChanges / (fileChangeCounts[fileA] + fileChangeCounts[fileB] - coChanges);
    
    // Only care about moderately strong coupling
    if (strength > 0.4) {
      results.push({
        fileA,
        fileB,
        coChanges,
        strength: Math.round(strength * 100)
      });
    }
  }

  return results.sort((a, b) => b.strength - a.strength);
}

module.exports = { analyzeCoupling };
