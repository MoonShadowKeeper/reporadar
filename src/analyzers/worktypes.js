/**
 * Analyzes work types based on commit messages.
 * Categories: feat, fix, refactor, chore, docs, test
 * @param {Array} commits 
 * @returns {Object} Work type distribution
 */
function analyzeWorkTypes(commits) {
  const distribution = {
    feat: 0,
    fix: 0,
    refactor: 0,
    chore: 0,
    docs: 0,
    test: 0,
    other: 0
  };

  for (const commit of commits) {
    const msg = commit.message.toLowerCase();
    
    if (msg.startsWith('feat') || msg.includes('feature')) {
      distribution.feat++;
    } else if (msg.startsWith('fix') || msg.includes('bug')) {
      distribution.fix++;
    } else if (msg.startsWith('refactor')) {
      distribution.refactor++;
    } else if (msg.startsWith('chore')) {
      distribution.chore++;
    } else if (msg.startsWith('docs')) {
      distribution.docs++;
    } else if (msg.startsWith('test')) {
      distribution.test++;
    } else {
      distribution.other++;
    }
  }

  const total = commits.length;
  
  return {
    distribution,
    percentages: {
      feat: total > 0 ? (distribution.feat / total * 100).toFixed(1) : 0,
      fix: total > 0 ? (distribution.fix / total * 100).toFixed(1) : 0,
      refactor: total > 0 ? (distribution.refactor / total * 100).toFixed(1) : 0,
      chore: total > 0 ? (distribution.chore / total * 100).toFixed(1) : 0,
      docs: total > 0 ? (distribution.docs / total * 100).toFixed(1) : 0,
      test: total > 0 ? (distribution.test / total * 100).toFixed(1) : 0,
      other: total > 0 ? (distribution.other / total * 100).toFixed(1) : 0
    },
    total
  };
}

module.exports = { analyzeWorkTypes };
