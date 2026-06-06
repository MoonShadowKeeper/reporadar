const path = require('path');

/**
 * Analyzes ownership at the Module/Directory level instead of per-file.
 * Shows who "owns" major architectural boundaries.
 * 
 * @param {Array} commits 
 * @returns {Array} Module ownership map
 */
function analyzeMap(commits) {
  const moduleAuthors = {};
  
  for (const commit of commits) {
    for (const f of commit.files) {
      // Get the top-level directory (e.g., "src/api/routes.js" -> "src/api")
      // For simple projects, just the first folder. For others, 2 levels deep.
      const parts = f.file.split(/[/\\]/);
      if (parts.length <= 1) continue; // Skip root files
      
      const moduleName = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];

      if (!moduleAuthors[moduleName]) moduleAuthors[moduleName] = {};
      if (!moduleAuthors[moduleName][commit.author]) moduleAuthors[moduleName][commit.author] = 0;
      
      moduleAuthors[moduleName][commit.author] += (f.added + f.deleted || 1);
    }
  }

  const results = [];
  
  for (const [mod, authors] of Object.entries(moduleAuthors)) {
    const totalChanges = Object.values(authors).reduce((a, b) => a + b, 0);
    if (totalChanges < 50) continue; // Ignore tiny directories

    const topAuthors = Object.keys(authors)
      .map(author => ({
        author,
        percentage: Math.round((authors[author] / totalChanges) * 100)
      }))
      .filter(a => a.percentage > 5)
      .sort((a, b) => b.percentage - a.percentage);

    results.push({
      module: mod,
      totalChanges,
      owners: topAuthors,
      busFactor: topAuthors.length
    });
  }

  return results.sort((a, b) => b.totalChanges - a.totalChanges);
}

module.exports = { analyzeMap };
