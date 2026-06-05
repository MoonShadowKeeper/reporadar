/**
 * @module risk
 * @description Provides a composite risk assessment for every file in a repository
 * by aggregating signals from four independent analyzers: hotspots, bus factor,
 * churn, and coupling. Each factor contributes a weighted score, producing a
 * unified 0–100 risk score per file with a corresponding severity level.
 *
 * Risk weights:
 * - Hotspot:    30% — how frequently and heavily the file is modified
 * - Bus Factor: 30% — knowledge concentration risk
 * - Churn:      25% — rate of change relative to file age
 * - Coupling:   15% — hidden dependencies via temporal coupling
 */

const { analyzeHotspots } = require('./hotspots');
const { analyzeBusFactor } = require('./busfactor');
const { analyzeChurn } = require('./churn');
const { analyzeCoupling } = require('./coupling');

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
 * @typedef {Object} RiskOptions
 * @property {string[]} [exclude=[]] - Glob-like patterns of files to exclude
 *   (passed through to the hotspot analyzer).
 */

/**
 * @typedef {Object} RiskFactors
 * @property {number} hotspot - Hotspot risk score (0-100).
 * @property {number} busFactor - Bus factor risk score (0-100).
 * @property {number} churn - Churn risk score (0-100).
 * @property {number} coupling - Coupling risk score (0-100).
 */

/**
 * @typedef {Object} FileRisk
 * @property {string} file - The file path.
 * @property {number} riskScore - Combined risk score (0-100).
 * @property {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} riskLevel - Severity classification.
 * @property {RiskFactors} factors - Individual risk factor scores.
 */

/**
 * @typedef {Object} RiskSummary
 * @property {number} critical - Number of files with CRITICAL risk (76-100).
 * @property {number} high - Number of files with HIGH risk (51-75).
 * @property {number} medium - Number of files with MEDIUM risk (26-50).
 * @property {number} low - Number of files with LOW risk (0-25).
 * @property {number} totalFiles - Total number of files analyzed.
 * @property {number} averageRisk - Average risk score across all files.
 */

/**
 * @typedef {Object} RiskResult
 * @property {FileRisk[]} files - Per-file risk assessments sorted by riskScore descending.
 * @property {RiskSummary} summary - Aggregated risk statistics.
 */

/**
 * Converts a bus factor value to a 0–100 risk score.
 * Lower bus factors indicate higher risk.
 *
 * @param {number} busFactor - The computed bus factor for a file.
 * @returns {number} Risk score from 0 to 100.
 */
function busFactorToRisk(busFactor) {
  if (busFactor <= 1) return 100;
  if (busFactor === 2) return 60;
  if (busFactor === 3) return 30;
  return 10;
}

/**
 * Maps a numeric risk score to a severity level string.
 *
 * @param {number} score - The composite risk score (0-100).
 * @returns {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} The risk severity level.
 */
function getRiskLevel(score) {
  if (score >= 76) return 'CRITICAL';
  if (score >= 51) return 'HIGH';
  if (score >= 26) return 'MEDIUM';
  return 'LOW';
}

/**
 * Performs a comprehensive risk analysis on the repository by running all four
 * sub-analyzers and combining their outputs into a single, weighted risk score
 * per file.
 *
 * The composite risk score is computed as:
 *   `hotspot * 0.3 + busFactor * 0.3 + churn * 0.25 + coupling * 0.15`
 *
 * @param {Commit[]} commits - Array of commit objects from the git log.
 * @param {RiskOptions} [options={}] - Configuration options.
 * @returns {RiskResult} The composite risk analysis results.
 *
 * @example
 * const commits = [
 *   {
 *     hash: 'abc123', author: 'Alice', email: 'alice@example.com',
 *     date: '2024-01-01T00:00:00Z', message: 'Initial commit',
 *     files: [{ file: 'src/core.js', insertions: 200, deletions: 0 }]
 *   }
 * ];
 * const result = analyzeRisk(commits);
 * // result.files[0].riskScore => 72.5
 * // result.files[0].riskLevel => 'HIGH'
 * // result.summary.totalFiles => 1
 */
function analyzeRisk(commits, options = {}) {
  // Run all four analyzers
  const hotspots = analyzeHotspots(commits, options);
  const busFactorResult = analyzeBusFactor(commits, options);
  const churnResults = analyzeChurn(commits, options);
  const couplingResults = analyzeCoupling(commits, options);

  // Build lookup maps for quick access by file path

  /** @type {Map<string, number>} */
  const hotspotScores = new Map();
  for (const h of hotspots) {
    hotspotScores.set(h.file, h.score);
  }

  /** @type {Map<string, number>} */
  const busFactorScores = new Map();
  for (const f of busFactorResult.files) {
    busFactorScores.set(f.file, busFactorToRisk(f.busFactor));
  }

  /** @type {Map<string, number>} */
  const churnRates = new Map();
  let maxChurnRate = 0;
  for (const c of churnResults) {
    churnRates.set(c.file, c.churnRate);
    if (c.churnRate > maxChurnRate) {
      maxChurnRate = c.churnRate;
    }
  }

  // Normalize churn rates to 0-100
  /** @type {Map<string, number>} */
  const churnScores = new Map();
  for (const [file, rate] of churnRates.entries()) {
    churnScores.set(
      file,
      maxChurnRate > 0 ? (rate / maxChurnRate) * 100 : 0
    );
  }

  // For coupling, compute the maximum coupling strength each file participates in
  /** @type {Map<string, number>} */
  const couplingScores = new Map();
  for (const pair of couplingResults) {
    const strengthScore = pair.couplingStrength * 100;

    const currentA = couplingScores.get(pair.fileA) || 0;
    if (strengthScore > currentA) {
      couplingScores.set(pair.fileA, strengthScore);
    }

    const currentB = couplingScores.get(pair.fileB) || 0;
    if (strengthScore > currentB) {
      couplingScores.set(pair.fileB, strengthScore);
    }
  }

  // Collect all unique files across all analyzers
  /** @type {Set<string>} */
  const allFiles = new Set();
  for (const key of hotspotScores.keys()) allFiles.add(key);
  for (const key of busFactorScores.keys()) allFiles.add(key);
  for (const key of churnScores.keys()) allFiles.add(key);
  for (const key of couplingScores.keys()) allFiles.add(key);

  // Compute composite risk for each file
  /** @type {FileRisk[]} */
  const files = [];

  for (const file of allFiles) {
    const hotspotRisk = hotspotScores.get(file) || 0;
    const busFactorRisk = busFactorScores.get(file) || 0;
    const churnRisk = churnScores.get(file) || 0;
    const couplingRisk = couplingScores.get(file) || 0;

    const riskScore =
      Math.round(
        (hotspotRisk * 0.3 +
          busFactorRisk * 0.3 +
          churnRisk * 0.25 +
          couplingRisk * 0.15) *
          100
      ) / 100;

    files.push({
      file,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      factors: {
        hotspot: Math.round(hotspotRisk * 100) / 100,
        busFactor: Math.round(busFactorRisk * 100) / 100,
        churn: Math.round(churnRisk * 100) / 100,
        coupling: Math.round(couplingRisk * 100) / 100,
      },
    });
  }

  // Sort by riskScore descending
  files.sort((a, b) => b.riskScore - a.riskScore);

  // Build summary
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    totalFiles: files.length,
    averageRisk: 0,
  };

  let totalRisk = 0;
  for (const f of files) {
    totalRisk += f.riskScore;
    switch (f.riskLevel) {
      case 'CRITICAL':
        summary.critical++;
        break;
      case 'HIGH':
        summary.high++;
        break;
      case 'MEDIUM':
        summary.medium++;
        break;
      case 'LOW':
        summary.low++;
        break;
    }
  }

  summary.averageRisk =
    files.length > 0
      ? Math.round((totalRisk / files.length) * 100) / 100
      : 0;

  return { files, summary };
}

module.exports = { analyzeRisk };
