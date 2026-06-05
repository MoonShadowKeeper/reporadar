const { getCommits } = require('./git');
const { analyzeHotspots } = require('./analyzers/hotspots');
const { analyzeBusFactor } = require('./analyzers/busfactor');
const { analyzeChurn } = require('./analyzers/churn');
const { analyzeCoupling } = require('./analyzers/coupling');
const { analyzeRisk } = require('./analyzers/risk');
const { analyzeOwnership } = require('./analyzers/ownership');
const { analyzeContributors } = require('./analyzers/contributors');
const { analyzeLanguages } = require('./analyzers/languages');
const { analyzeTickets } = require('./analyzers/tickets');
const reporter = require('./reporter');
const server = require('./server');

module.exports = {
  getCommits,
  analyzeHotspots,
  analyzeBusFactor,
  analyzeChurn,
  analyzeCoupling,
  analyzeRisk,
  analyzeOwnership,
  analyzeContributors,
  analyzeLanguages,
  analyzeTickets,
  reporter,
  server
};
