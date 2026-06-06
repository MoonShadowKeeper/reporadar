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
const { analyzeTimeline } = require('./analyzers/timeline');
const { analyzeComplexity } = require('./analyzers/complexity');
const reporter = require('./reporter');
const server = require('./server');

const { analyzePrs } = require('./analyzers/prs');
const { analyzeAge } = require('./analyzers/age');
const { analyzeAttrition } = require('./analyzers/attrition');
const { analyzeMessages } = require('./analyzers/messages');
const { analyzeBurnout } = require('./analyzers/burnout');
const { analyzeTtm } = require('./analyzers/ttm');
const { analyzeZombies } = require('./analyzers/zombies');
const { analyzeMap } = require('./analyzers/map');
const { loadConfig, applyAliases } = require('./config');

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
  analyzeTimeline,
  analyzeComplexity,
  analyzePrs,
  analyzeAge,
  analyzeAttrition,
  analyzeMessages,
  analyzeBurnout,
  analyzeTtm,
  analyzeZombies,
  analyzeMap,
  reporter,
  server,
  loadConfig,
  applyAliases
};
