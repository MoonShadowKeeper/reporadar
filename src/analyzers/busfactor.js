/**
 * Analyzes bus factor (knowledge concentration) per file.
 * @param {Array} commits 
 * @returns {Array} Bus factor stats per file
 */
function analyzeBusFactor(commits) {
  const fileAuthors = {};

  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      
      if (!fileAuthors[file.file]) {
        fileAuthors[file.file] = { totalChanges: 0, authors: {} };
      }
      
      const changes = file.added + file.deleted || 1; // fallback to 1 if binary/unknown
      fileAuthors[file.file].totalChanges += changes;
      
      if (!fileAuthors[file.file].authors[commit.author]) {
        fileAuthors[file.file].authors[commit.author] = 0;
      }
      fileAuthors[file.file].authors[commit.author] += changes;
    }
  }

  const results = [];
  for (const [file, data] of Object.entries(fileAuthors)) {
    if (data.totalChanges < 10) continue; // ignore trivial files

    const sortedAuthors = Object.entries(data.authors)
      .map(([name, changes]) => ({
        name,
        percentage: Math.round((changes / data.totalChanges) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate bus factor (how many authors to reach 50% knowledge)
    let sum = 0;
    let busFactor = 0;
    for (const a of sortedAuthors) {
      sum += a.percentage;
      busFactor++;
      if (sum >= 50) break;
    }

    results.push({ file, busFactor, topContributors: sortedAuthors.slice(0, 3) });
  }

  return results.sort((a, b) => a.busFactor - b.busFactor);
}

module.exports = { analyzeBusFactor };
