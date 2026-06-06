const { execSync } = require('child_process');

/**
 * Analyzes Pull Request and Merge patterns by looking at merge commits.
 * @param {string} repoPath 
 * @param {Object} options 
 * @returns {Object} PR analysis results
 */
function analyzePrs(repoPath, options = {}) {
  try {
    let cmd = `git log --merges --format='%H|%an|%aI|%P'`;
    if (options.since) cmd += ` --since="${options.since.replace(/\./g, ' ')}"`;

    const output = execSync(cmd, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }).trim();
    if (!output) return { totalMerges: 0, mergesPerMonth: 0, topMergers: [] };

    const lines = output.split('\n');
    const merges = [];
    const mergersMap = {};
    const monthMap = {};

    for (const line of lines) {
      if (!line) continue;
      const [hash, authorRaw, dateStr] = line.split('|');
      const author = authorRaw.toLowerCase().replace(/<.*>/, '').trim();
      const date = new Date(dateStr);
      
      merges.push({ hash, author, date });

      if (!mergersMap[author]) mergersMap[author] = 0;
      mergersMap[author]++;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) monthMap[monthKey] = 0;
      monthMap[monthKey]++;
    }

    const topMergers = Object.keys(mergersMap)
      .map(author => ({ author, count: mergersMap[author] }))
      .sort((a, b) => b.count - a.count);

    const totalMonths = Object.keys(monthMap).length || 1;
    const mergesPerMonth = Math.round((merges.length / totalMonths) * 10) / 10;

    return {
      totalMerges: merges.length,
      mergesPerMonth,
      topMergers: topMergers.slice(0, 10),
      months: monthMap
    };
  } catch (e) {
    return { totalMerges: 0, mergesPerMonth: 0, topMergers: [] };
  }
}

module.exports = { analyzePrs };
