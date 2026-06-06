const { execSync } = require('child_process');

/**
 * Detects "Zombie Branches" — branches that haven't been updated
 * in a long time and are not merged into the default branch.
 * 
 * @param {string} repoPath 
 * @returns {Array} List of zombie branches
 */
function analyzeZombies(repoPath) {
  try {
    // Get all remote tracking branches
    const output = execSync(`git branch -r --no-merged HEAD --sort=-committerdate --format="%(refname:short)|%(committerdate:iso8601)|%(authorname)"`, {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    if (!output) return [];

    const branches = output.split('\n');
    const zombies = [];
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    for (const line of branches) {
      if (!line) continue;
      const [branch, dateStr, author] = line.split('|');
      
      // Ignore HEAD pointer
      if (branch.includes('->')) continue;
      
      const date = new Date(dateStr);
      const ageMonths = Math.round((now - date) / MS_PER_DAY / 30);

      // If branch hasn't been touched in over 2 months
      if (ageMonths >= 2) {
        zombies.push({
          branch,
          author,
          lastActivity: dateStr.split(' ')[0],
          ageMonths
        });
      }
    }

    return zombies;
  } catch (e) {
    return [];
  }
}

module.exports = { analyzeZombies };
