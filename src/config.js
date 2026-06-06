const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  aliases: {}, // e.g., { "John Doe": ["john.doe@gmail.com", "John D"] }
  thresholds: {
    burnoutWeekendPercent: 20,
    burnoutNightPercent: 20,
    ttmSlowDays: 7,
    busFactorCritical: 1,
    zombieMonths: 2
  }
};

function loadConfig(repoPath) {
  const configPath = path.join(repoPath, 'reporadar.config.json');
  let config = { ...DEFAULT_CONFIG };

  if (fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (userConfig.aliases) {
        config.aliases = { ...config.aliases, ...userConfig.aliases };
      }
      
      if (userConfig.thresholds) {
        config.thresholds = { ...config.thresholds, ...userConfig.thresholds };
      }
    } catch (e) {
      console.error('\x1b[31mError parsing reporadar.config.json, using defaults.\x1b[0m');
    }
  }

  return config;
}

function applyAliases(commits, aliases) {
  // Create a reverse mapping for fast lookup: { "john.d": "John Doe" }
  const lookup = {};
  for (const [primary, alternates] of Object.entries(aliases)) {
    for (const alt of alternates) {
      lookup[alt.toLowerCase()] = primary;
    }
  }

  // Mutate commits to merge authors
  for (const commit of commits) {
    if (!commit.author) continue;
    const authorLower = commit.author.toLowerCase();
    if (lookup[authorLower]) {
      commit.author = lookup[authorLower];
    }
  }

  return commits;
}

module.exports = { loadConfig, applyAliases, DEFAULT_CONFIG };
