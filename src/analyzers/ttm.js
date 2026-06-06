const { execSync } = require('child_process');

/**
 * Analyzes Time-To-Merge (TTM) for pull requests / branches.
 * Finds merge commits and calculates the time difference between the 
 * first commit in the feature branch and the merge itself.
 * 
 * @param {string} repoPath 
 * @param {Object} options 
 * @returns {Object} TTM metrics
 */
function analyzeTtm(repoPath, options = {}) {
  try {
    let cmd = `git log --merges --format='%H|%aI'`;
    if (options.since) cmd += ` --since="${options.since.replace(/\./g, ' ')}"`;

    const output = execSync(cmd, { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }).trim();
    if (!output) return { averageHours: 0, averageDays: 0, totalAnalyzed: 0, fastMerges: 0, slowMerges: 0, details: [] };

    const mergeLines = output.split('\n');
    let totalHours = 0;
    let fastMerges = 0; // < 24 hours
    let slowMerges = 0; // > 7 days

    const details = [];

    for (const line of mergeLines) {
      if (!line) continue;
      const [hash, mergeDateStr] = line.split('|');
      const mergeDate = new Date(mergeDateStr);

      // Get the first commit in this branch (oldest commit reachable from parent 2 but not parent 1)
      // ^1 = target branch (usually master/main), ^2 = feature branch
      try {
        const firstCommitDateStr = execSync(`git log ${hash}^1..${hash}^2 --reverse --format='%aI' | head -n 1`, {
          cwd: repoPath,
          encoding: 'utf8',
          stdio: 'pipe'
        }).trim();

        if (firstCommitDateStr) {
          const firstCommitDate = new Date(firstCommitDateStr);
          const diffMs = mergeDate - firstCommitDate;
          if (diffMs < 0) continue; // safety check

          const diffHours = diffMs / (1000 * 60 * 60);
          totalHours += diffHours;

          if (diffHours < 24) fastMerges++;
          else if (diffHours > 24 * 7) slowMerges++;

          details.push({
            hash,
            hours: Math.round(diffHours),
            mergeDate: mergeDate.toISOString().split('T')[0]
          });
        }
      } catch (e) {
        // Parent doesn't exist or other git error, skip
      }
    }

    if (details.length === 0) return { averageHours: 0, averageDays: 0, totalAnalyzed: 0, fastMerges: 0, slowMerges: 0, details: [] };

    const averageHours = Math.round(totalHours / details.length);
    
    return {
      averageHours,
      averageDays: Math.round((averageHours / 24) * 10) / 10,
      totalAnalyzed: details.length,
      fastMerges,
      slowMerges,
      details: details.sort((a, b) => b.hours - a.hours) // Slowest first
    };
  } catch (e) {
    return { averageHours: 0, averageDays: 0, totalAnalyzed: 0, fastMerges: 0, slowMerges: 0, details: [] };
  }
}

module.exports = { analyzeTtm };
