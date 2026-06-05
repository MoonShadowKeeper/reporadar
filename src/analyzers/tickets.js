/**
 * Analyzes commit messages to find links to Issue Trackers (Jira, GitHub Issues, Linear).
 * High ticket linkage indicates structured development (lower risk).
 * Low ticket linkage indicates ad-hoc development (higher risk).
 */

const ISSUE_REGEX = /([A-Z]+-\d+)|(#\d+)|([A-Z]{2,3}-\d+)/;

function analyzeTickets(commits) {
  let linkedCommits = 0;
  let unlinkedCommits = 0;
  const issueCounts = {};

  for (const commit of commits) {
    if (!commit.message) continue;
    
    // Ignore automated commits
    if (commit.message.toLowerCase().includes('merge pull request') || 
        commit.message.toLowerCase().includes('chore: release')) {
      continue;
    }

    const match = commit.message.match(ISSUE_REGEX);
    if (match) {
      linkedCommits++;
      const issueId = match[0];
      issueCounts[issueId] = (issueCounts[issueId] || 0) + 1;
    } else {
      unlinkedCommits++;
    }
  }

  const total = linkedCommits + unlinkedCommits;
  const linkageRatio = total > 0 ? (linkedCommits / total) * 100 : 0;
  
  // Calculate top active issues
  const topIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCommits: total,
    linkedCommits,
    unlinkedCommits,
    linkageRatio: Math.round(linkageRatio),
    topIssues
  };
}

module.exports = { analyzeTickets };
