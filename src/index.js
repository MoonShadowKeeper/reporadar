const { getCommits } = require('./git');
const { analyzeHotspots } = require('./analyzers/hotspots');
const { analyzeBusFactor } = require('./analyzers/busfactor');
const reporter = require('./reporter');

module.exports = {
  getCommits,
  analyzeHotspots,
  analyzeBusFactor,
  reporter
};
