/**
 * @module coupling
 * @description Detects temporal coupling between files — pairs of files that
 * frequently change together in the same commits. High coupling strength can
 * reveal hidden dependencies, architectural issues, or opportunities for
 * refactoring. The analysis is scoped to the top 100 most-changed files
 * to keep computation tractable (O(n²) pair analysis).
 */

/**
 * Maximum number of top files (by commit count) to include in
 * the coupling analysis, to bound the O(n²) pair comparison.
 * @constant {number}
 */
const TOP_FILES_LIMIT = 100;

/**
 * Minimum coupling strength (0-1) required for a pair to be reported.
 * @constant {number}
 */
const MIN_COUPLING_STRENGTH = 0.5;

/**
 * Minimum number of co-changes required for a pair to be reported.
 * @constant {number}
 */
const MIN_CO_CHANGES = 3;

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
 * @typedef {Object} CouplingOptions
 * @property {number} [topFilesLimit=100] - Maximum number of top files to analyze.
 * @property {number} [minCouplingStrength=0.5] - Minimum coupling strength threshold (0-1).
 * @property {number} [minCoChanges=3] - Minimum number of co-changes to report a pair.
 */

/**
 * @typedef {Object} CouplingResult
 * @property {string} fileA - First file in the coupled pair.
 * @property {string} fileB - Second file in the coupled pair.
 * @property {number} coChanges - Number of commits where both files changed together.
 * @property {number} changesA - Total number of commits that changed fileA.
 * @property {number} changesB - Total number of commits that changed fileB.
 * @property {number} couplingStrength - Coupling strength (0-1), computed as
 *   coChanges / max(changesA, changesB).
 * @property {number} percentage - Coupling strength as a percentage (0-100).
 */

/**
 * Creates a deterministic, order-independent key for a file pair.
 * This ensures that (fileA, fileB) and (fileB, fileA) map to the same entry.
 *
 * @param {string} a - First file path.
 * @param {string} b - Second file path.
 * @returns {string} A canonical pair key with the lexicographically smaller path first.
 */
function makePairKey(a, b) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

/**
 * Analyzes temporal coupling between files in the commit history.
 *
 * The algorithm:
 * 1. Counts commit frequency per file to identify the top N most-changed files.
 * 2. For each commit touching multiple files from the top set, records co-changes
 *    for every pair.
 * 3. Computes coupling strength as `coChanges / max(changesA, changesB)`.
 * 4. Filters pairs by minimum coupling strength and minimum co-change count.
 * 5. Returns results sorted by coupling strength descending.
 *
 * @param {Commit[]} commits - Array of commit objects from the git log.
 * @param {CouplingOptions} [options={}] - Configuration options.
 * @returns {CouplingResult[]} Array of coupled file pairs sorted by strength descending.
 *
 * @example
 * const commits = [
 *   {
 *     hash: 'abc123', author: 'Alice', email: 'alice@example.com',
 *     date: '2024-01-01T00:00:00Z', message: 'Update both',
 *     files: [
 *       { file: 'src/model.js', insertions: 10, deletions: 2 },
 *       { file: 'src/view.js', insertions: 5, deletions: 1 }
 *     ]
 *   },
 *   // ... more commits where model.js and view.js change together
 * ];
 * const results = analyzeCoupling(commits);
 * // [{ fileA: 'src/model.js', fileB: 'src/view.js', coChanges: 5, ... }]
 */
function analyzeCoupling(commits, options = {}) {
  const topFilesLimit = options.topFilesLimit || TOP_FILES_LIMIT;
  const minStrength =
    options.minCouplingStrength !== undefined
      ? options.minCouplingStrength
      : MIN_COUPLING_STRENGTH;
  const minCoChanges =
    options.minCoChanges !== undefined ? options.minCoChanges : MIN_CO_CHANGES;

  // Step 1: Count commits per file to identify top files
  /** @type {Map<string, number>} */
  const fileCommitCounts = new Map();

  for (const commit of commits) {
    // Track unique files per commit (avoid double-counting if duplicates exist)
    const uniqueFiles = new Set(commit.files.map((f) => f.file));
    for (const file of uniqueFiles) {
      fileCommitCounts.set(file, (fileCommitCounts.get(file) || 0) + 1);
    }
  }

  // Step 2: Select top N files by commit count
  const sortedFiles = Array.from(fileCommitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topFilesLimit);

  /** @type {Set<string>} */
  const topFilesSet = new Set(sortedFiles.map(([file]) => file));

  /** @type {Map<string, number>} */
  const topFileChanges = new Map(sortedFiles);

  // Step 3: For each commit, record co-changes among the top files
  /** @type {Map<string, number>} */
  const pairCoChanges = new Map();

  for (const commit of commits) {
    // Filter to only files in the top set
    const relevantFiles = [
      ...new Set(
        commit.files.map((f) => f.file).filter((f) => topFilesSet.has(f))
      ),
    ];

    // Skip commits touching fewer than 2 relevant files
    if (relevantFiles.length < 2) {
      continue;
    }

    // Record co-change for every pair
    for (let i = 0; i < relevantFiles.length; i++) {
      for (let j = i + 1; j < relevantFiles.length; j++) {
        const key = makePairKey(relevantFiles[i], relevantFiles[j]);
        pairCoChanges.set(key, (pairCoChanges.get(key) || 0) + 1);
      }
    }
  }

  // Step 4: Compute coupling strength and filter
  /** @type {CouplingResult[]} */
  const results = [];

  for (const [key, coChanges] of pairCoChanges.entries()) {
    if (coChanges < minCoChanges) {
      continue;
    }

    const [fileA, fileB] = key.split('\0');
    const changesA = topFileChanges.get(fileA) || 0;
    const changesB = topFileChanges.get(fileB) || 0;
    const maxChanges = Math.max(changesA, changesB);

    const couplingStrength = maxChanges > 0 ? coChanges / maxChanges : 0;

    if (couplingStrength <= minStrength) {
      continue;
    }

    results.push({
      fileA,
      fileB,
      coChanges,
      changesA,
      changesB,
      couplingStrength: Math.round(couplingStrength * 1000) / 1000,
      percentage: Math.round(couplingStrength * 10000) / 100,
    });
  }

  // Step 5: Sort by coupling strength descending
  results.sort((a, b) => b.couplingStrength - a.couplingStrength);

  return results;
}

module.exports = { analyzeCoupling };
