/**
 * @module churn
 * @description Analyzes code churn — the rate of change relative to a file's age.
 * High churn rates can indicate instability, poor initial design, rapidly evolving
 * requirements, or areas that may benefit from refactoring. Files are categorized
 * as stable, active, or turbulent based on their monthly change rate.
 */

/**
 * Number of milliseconds in a single day.
 * @constant {number}
 */
const MS_PER_DAY = 86400000;

/**
 * Number of days used to approximate one month for churn rate calculations.
 * @constant {number}
 */
const DAYS_PER_MONTH = 30;

/**
 * @typedef {Object} FileChange
 * @property {string} file - The file path.
 * @property {number} insertions - Number of lines inserted.
 * @property {number} deletions - Number of lines deleted.
 */

/**
 * @typedef {Object} Commit
 * @property {string} hash - The commit hash.
 * @property {string} author - The author name.
 * @property {string} email - The author email.
 * @property {string} date - ISO 8601 date string.
 * @property {string} message - The commit message.
 * @property {FileChange[]} files - Array of file changes in this commit.
 */

/**
 * @typedef {Object} ChurnOptions
 * @property {string[]} [exclude=[]] - File patterns to exclude (reserved for future use).
 */

/**
 * @typedef {Object} ChurnResult
 * @property {string} file - The file path.
 * @property {number} ageDays - Age of the file in days (from first commit to now).
 * @property {string} ageFormatted - Human-readable age string (e.g., "2 years, 3 months").
 * @property {number} totalChanges - Sum of all insertions and deletions.
 * @property {number} churnRate - Changes per month (or totalChanges if age < 30 days).
 * @property {'stable'|'active'|'turbulent'} category - Classification based on churn rate.
 * @property {number} commits - Number of commits that touched this file.
 */

/**
 * Formats a number of days into a human-readable age string.
 * Produces output like "2 years, 3 months, 5 days" or "15 days"
 * depending on the magnitude.
 *
 * @param {number} days - The number of days to format.
 * @returns {string} A human-readable representation of the duration.
 *
 * @example
 * formatAge(0);    // "< 1 day"
 * formatAge(1);    // "1 day"
 * formatAge(45);   // "1 month, 15 days"
 * formatAge(400);  // "1 year, 1 month, 5 days"
 */
function formatAge(days) {
  if (days < 1) return '< 1 day';

  const years = Math.floor(days / 365);
  const remainingAfterYears = days % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const remainingDays = Math.floor(remainingAfterYears % 30);

  const parts = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  }
  if (remainingDays > 0 || parts.length === 0) {
    parts.push(
      `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`
    );
  }

  return parts.join(', ');
}

/**
 * Categorizes a churn rate into a stability classification.
 *
 * @param {number} churnRate - The computed churn rate (changes per month).
 * @returns {'stable'|'active'|'turbulent'} The churn category.
 */
function categorizeChurn(churnRate) {
  if (churnRate < 1) return 'stable';
  if (churnRate <= 4) return 'active';
  return 'turbulent';
}

/**
 * Analyzes code churn across the commit history by measuring the rate of
 * change relative to each file's age.
 *
 * For each file, the churn rate is computed as `totalChanges / ageInMonths`,
 * where a month is defined as 30 days. If a file is younger than 30 days,
 * the raw `totalChanges` value is used as the churn rate to avoid division
 * by a very small number.
 *
 * @param {Commit[]} commits - Array of commit objects from the git log.
 * @param {ChurnOptions} [options={}] - Configuration options.
 * @returns {ChurnResult[]} Array of churn results sorted by churnRate descending.
 *
 * @example
 * const commits = [
 *   {
 *     hash: 'abc123', author: 'Alice', email: 'alice@example.com',
 *     date: '2024-01-01T00:00:00Z', message: 'Create file',
 *     files: [{ file: 'src/app.js', insertions: 50, deletions: 0 }]
 *   },
 *   {
 *     hash: 'def456', author: 'Bob', email: 'bob@example.com',
 *     date: '2024-06-01T00:00:00Z', message: 'Major refactor',
 *     files: [{ file: 'src/app.js', insertions: 200, deletions: 150 }]
 *   }
 * ];
 * const results = analyzeChurn(commits);
 * // [{ file: 'src/app.js', ageDays: ..., churnRate: ..., category: 'turbulent', ... }]
 */
function analyzeChurn(commits, options = {}) {
  const now = new Date();

  /**
   * Per-file tracking data.
   * @type {Map<string, { firstSeen: Date, lastModified: Date, totalChanges: number, commits: number }>}
   */
  const fileMap = new Map();

  for (const commit of commits) {
    const commitDate = new Date(commit.date);

    for (const change of commit.files) {
      const linesChanged = change.insertions + change.deletions;

      if (!fileMap.has(change.file)) {
        fileMap.set(change.file, {
          firstSeen: commitDate,
          lastModified: commitDate,
          totalChanges: 0,
          commits: 0,
        });
      }

      const entry = fileMap.get(change.file);
      entry.totalChanges += linesChanged;
      entry.commits += 1;

      // Track earliest and latest dates
      if (commitDate < entry.firstSeen) {
        entry.firstSeen = commitDate;
      }
      if (commitDate > entry.lastModified) {
        entry.lastModified = commitDate;
      }
    }
  }

  const results = [];

  for (const [file, entry] of fileMap.entries()) {
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - entry.firstSeen.getTime()) / MS_PER_DAY)
    );

    const ageInMonths = ageDays / DAYS_PER_MONTH;

    // If the file is younger than one month, use totalChanges as churnRate
    const churnRate =
      ageDays < DAYS_PER_MONTH
        ? entry.totalChanges
        : Math.round((entry.totalChanges / ageInMonths) * 100) / 100;

    results.push({
      file,
      ageDays,
      ageFormatted: formatAge(ageDays),
      totalChanges: entry.totalChanges,
      churnRate,
      category: categorizeChurn(churnRate),
      commits: entry.commits,
    });
  }

  // Sort by churnRate descending
  results.sort((a, b) => b.churnRate - a.churnRate);

  return results;
}

module.exports = { analyzeChurn };
