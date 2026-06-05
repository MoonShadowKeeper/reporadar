const { execSync } = require('child_process');

/**
 * Gets the git commit history with file stat changes.
 * @param {string} repoPath
 * @returns {Array} Array of parsed commits
 */
function getCommits(repoPath) {
  try {
    // Format: hash|author|date
    const cmd = `git log --numstat --format='COMMIT:%H|%an|%aI' --no-merges`;
    const output = execSync(cmd, { cwd: repoPath, encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
    
    const commits = [];
    let currentCommit = null;

    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith('COMMIT:')) {
        const parts = line.substring(7).split('|');
        currentCommit = {
          hash: parts[0],
          author: parts[1],
          date: parts[2],
          files: []
        };
        commits.push(currentCommit);
      } else {
        // Numstat line: additions deletions filename
        const parts = line.split('\t');
        if (parts.length === 3 && currentCommit) {
          const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
          const deleted = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
          const file = parts[2];
          currentCommit.files.push({ file, added, deleted });
        }
      }
    }
    return commits;
  } catch (error) {
    console.error('Failed to parse git log. Make sure this is a git repository.');
    process.exit(1);
  }
}

module.exports = { getCommits };
