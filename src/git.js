const { execSync } = require('child_process');

/**
 * Gets the git commit history with file stat changes.
 * @param {string} repoPath
 * @param {Object} options - { since: string, ignore: string[] }
 * @returns {Array} Array of parsed commits
 */
function getCommits(repoPath, options = {}) {
  try {
    let cmd = `git log --numstat --format='COMMIT:%H|%an|%aI' --no-merges`;
    
    if (options.since) {
      cmd += ` --since="${options.since.replace(/\./g, ' ')}"`;
    }

    if (options.ignore && options.ignore.length > 0) {
      const ignores = options.ignore.map(p => `":!${p}"`).join(' ');
      cmd += ` -- . ${ignores}`;
    }

    const output = execSync(cmd, { cwd: repoPath, encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 });
    
    const commits = [];
    let currentCommit = null;

    const lines = output.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      if (line.startsWith('COMMIT:')) {
        const parts = line.substring(7).split('|');
        // Normalize author: "John Doe " -> "john doe", also strip email if provided as name
        let author = parts[1] ? parts[1].trim().toLowerCase() : 'unknown';
        author = author.replace(/<.*>/, '').trim();

        currentCommit = {
          hash: parts[0],
          author: author,
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
