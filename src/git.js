const { execSync, spawnSync } = require('child_process');

/**
 * Checks if git is installed and available on the system.
 * @returns {boolean}
 */
function isGitInstalled() {
  try {
    execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the given path is inside a git repository.
 * @param {string} repoPath
 * @returns {boolean}
 */
function isGitRepo(repoPath) {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if the repository is a shallow clone.
 * @param {string} repoPath
 * @returns {boolean}
 */
function isShallowClone(repoPath) {
  try {
    const result = execSync('git rev-parse --is-shallow-repository', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }).trim();
    return result === 'true';
  } catch {
    return false;
  }
}

/**
 * Gets the git commit history with file stat changes.
 * Handles renamed files (git numstat shows them as "{old => new}"),
 * binary files (shown as "-\t-\tfilename"), and shallow clones gracefully.
 *
 * @param {string} repoPath
 * @param {Object} options - { since: string, ignore: string[], maxCommits: number }
 * @returns {Array} Array of parsed commits
 */
function getCommits(repoPath, options = {}) {
  if (!isGitInstalled()) {
    console.error('\x1b[31mError: git is not installed. Please install git and try again.\x1b[0m');
    console.error('  Install: https://git-scm.com/downloads');
    process.exit(1);
  }

  if (!isGitRepo(repoPath)) {
    console.error(`\x1b[31mError: ${repoPath} is not a git repository.\x1b[0m`);
    console.error('  Run this command inside a git repository, or use --path=<dir>.');
    process.exit(1);
  }

  if (isShallowClone(repoPath)) {
    console.warn('\x1b[33mWarning: This is a shallow clone. Results may be incomplete.\x1b[0m');
    console.warn('  For full analysis, run: git fetch --unshallow\n');
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const currentHead = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
    const cacheKey = currentHead + '_' + JSON.stringify({ since: options.since, ignore: options.ignore, maxCommits: options.maxCommits, ignoreBots: options.ignoreBots, ignoreVendor: options.ignoreVendor });
    const cacheFile = path.join(repoPath, '.reporadar-cache.json');

    if (options.cache && fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.key === cacheKey) {
          return cache.commits;
        }
      } catch (e) {
        // ignore cache read errors
      }
    }

    let cmd = `git log --numstat --format='COMMIT:%H|%an|%aI|%s' --no-merges`;
    
    if (options.maxCommits) {
      cmd += ` -n ${parseInt(options.maxCommits, 10)}`;
    }

    if (options.since) {
      cmd += ` --since="${options.since.replace(/\./g, ' ')}"`;
    }

    if (options.ignore && options.ignore.length > 0) {
      const ignores = options.ignore.map(p => `":!${p}"`).join(' ');
      cmd += ` -- . ${ignores}`;
    }

    const output = execSync(cmd, { cwd: repoPath, encoding: 'utf8', maxBuffer: 1024 * 1024 * 500, timeout: 120000 });
    
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
          message: parts.slice(3).join('|'), // in case subject has pipes
          files: []
        };
        commits.push(currentCommit);
      } else {
        // Numstat line: additions deletions filename
        const parts = line.split('\t');
        if (parts.length >= 3 && currentCommit) {
          const added = parseInt(parts[0], 10) || 0;
          const deleted = parseInt(parts[1], 10) || 0;
          
          let file = parts.slice(2).join('\t').trim();
          
          // Handle renamed files: "oldName => newName"
          if (file.includes('=>')) {
            const renameMatch = file.match(/^(?:.*{)?(.*?)\s*=>\s*(.*?)(?:}.*)?$/);
            if (renameMatch) {
              file = renameMatch[2].trim();
            } else {
              file = file.split('=>').pop().trim().replace(/}/g, '');
            }
          }
          
          currentCommit.files.push({
            file,
            added,
            deleted
          });
        }
      }
    }

    if (options.ignoreBots) {
      const isBot = (author) => author.includes('[bot]') || author.includes('dependabot') || author.includes('github-actions') || author.includes('snyk') || author.includes('renovate');
      const isAutoFormat = (msg) => {
        const m = msg.toLowerCase();
        return m.startsWith('chore: lint') || m.startsWith('style:') || m.startsWith('format:') || m.includes('auto-formatting') || m.includes('auto format');
      };
      
      const beforeCount = commits.length;
      for (let i = commits.length - 1; i >= 0; i--) {
        const c = commits[i];
        if (isBot(c.author) || isAutoFormat(c.message)) {
          commits.splice(i, 1);
        }
      }
    }

    if (options.ignoreVendor !== false) {
      const vendorPatterns = ['vendor/', 'node_modules/', 'dist/', 'build/', '.min.js', '.bundle.js', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'];
      for (let i = commits.length - 1; i >= 0; i--) {
        const c = commits[i];
        c.files = c.files.filter(f => !vendorPatterns.some(p => f.file.includes(p)));
        if (c.files.length === 0) {
          commits.splice(i, 1); // remove commit if all files were vendor files
        }
      }
    }

    if (options.cache) {
      try {
        fs.writeFileSync(cacheFile, JSON.stringify({ key: cacheKey, commits }));
      } catch (e) {
        // ignore cache write errors
      }
    }

    return commits;
  } catch (error) {
    if (error.killed) {
      console.error('\x1b[31mError: git log timed out (>120s). The repository may be too large.\x1b[0m');
      console.error('  Try limiting the scope: --since="6.months" or --max-commits=5000');
    } else {
      console.error('\x1b[31mError: Failed to parse git log.\x1b[0m');
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

module.exports = { getCommits, isGitInstalled, isGitRepo, isShallowClone };
