const { getCommits } = require('./git');
const { analyzeHotspots } = require('./analyzers/hotspots');
const { analyzeBusFactor } = require('./analyzers/busfactor');
const { analyzeChurn } = require('./analyzers/churn');
const { analyzeCoupling } = require('./analyzers/coupling');
const { analyzeRisk } = require('./analyzers/risk');
const reporter = require('./reporter');

module.exports = {
  getCommits,
  analyzeHotspots,
  analyzeBusFactor,
  analyzeChurn,
  analyzeCoupling,
  analyzeRisk,
  reporter
};
