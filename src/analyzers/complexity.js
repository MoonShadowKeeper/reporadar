/**
 * File Complexity Analysis.
 * Combines Lines of Code, Churn Rate, and Bus Factor into a single complexity score.
 * High complexity = large file + high churn + single owner = refactoring candidate.
 *
 * @param {Array} commits
 * @returns {Array} Files sorted by complexity score
 */
function analyzeComplexity(commits) {
  const fileData = {};

  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock|\.min\./)) continue;

      if (!fileData[file.file]) {
        fileData[file.file] = {
          file: file.file,
          totalAdded: 0,
          totalDeleted: 0,
          commits: 0,
          authors: new Set(),
          firstSeen: commit.date,
          lastSeen: commit.date
        };
      }

      fileData[file.file].totalAdded += file.added || 0;
      fileData[file.file].totalDeleted += file.deleted || 0;
      fileData[file.file].commits++;
      fileData[file.file].authors.add(commit.author);
      fileData[file.file].lastSeen = commit.date;
    }
  }

  const results = Object.values(fileData).map(f => {
    // Estimated current LOC = total added - total deleted (approximation)
    const estimatedLOC = Math.max(1, f.totalAdded - f.totalDeleted);
    
    // Churn intensity = total changes / estimated LOC
    // Higher means the file is rewritten many times over
    const totalChanges = f.totalAdded + f.totalDeleted;
    const churnIntensity = totalChanges / Math.max(1, estimatedLOC);

    // Bus factor penalty: 1 author = 3x, 2 authors = 1.5x, 3+ = 1x
    const authorCount = f.authors.size;
    const busFactor = authorCount === 1 ? 3 : authorCount === 2 ? 1.5 : 1;

    // Size factor: logarithmic scale for LOC
    const sizeFactor = Math.log10(estimatedLOC + 1);

    // Complexity Score = size * churn * bus_factor_penalty
    const complexityScore = Math.round(sizeFactor * churnIntensity * busFactor * 10) / 10;

    // Categorize
    let category = 'simple';
    if (complexityScore >= 20) category = 'critical';
    else if (complexityScore >= 10) category = 'complex';
    else if (complexityScore >= 5) category = 'moderate';

    return {
      file: f.file,
      estimatedLOC,
      totalChanges,
      commits: f.commits,
      authors: authorCount,
      churnIntensity: Math.round(churnIntensity * 100) / 100,
      complexityScore,
      category
    };
  });

  return results
    .filter(f => f.complexityScore > 0)
    .sort((a, b) => b.complexityScore - a.complexityScore);
}

module.exports = { analyzeComplexity };
