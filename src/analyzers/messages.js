/**
 * Analyzes the quality of commit messages.
 * Good messages are crucial for maintainability. This analyzer checks for:
 * - Conventional Commits format (feat:, fix:, chore:, etc.)
 * - Message length (too short vs descriptive)
 * - Presence of ticket/issue numbers (e.g., #123, PROJ-456)
 * 
 * @param {Array} commits 
 * @returns {Object} Commit message quality report
 */
function analyzeMessages(commits) {
  let totalCommits = 0;
  let conventionalCommits = 0;
  let ticketReferences = 0;
  let shortMessages = 0;

  const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?:/i;
  const ticketRegex = /(#[0-9]+|[A-Z]{2,}-[0-9]+)/;

  const topOffenders = {};

  for (const commit of commits) {
    if (!commit.message) continue;
    totalCommits++;
    
    const msg = commit.message.trim();
    let isShort = false;

    if (msg.length < 15) {
      shortMessages++;
      isShort = true;
      if (!topOffenders[commit.author]) topOffenders[commit.author] = 0;
      topOffenders[commit.author]++;
    }

    if (conventionalRegex.test(msg)) {
      conventionalCommits++;
    }

    if (ticketRegex.test(msg)) {
      ticketReferences++;
    }
  }

  if (totalCommits === 0) return null;

  const offendersList = Object.keys(topOffenders)
    .map(author => ({ author, count: topOffenders[author] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const score = Math.round(
    ((conventionalCommits / totalCommits) * 50) + 
    ((1 - (shortMessages / totalCommits)) * 50)
  );

  return {
    totalCommits,
    conventionalPercentage: Math.round((conventionalCommits / totalCommits) * 100),
    shortPercentage: Math.round((shortMessages / totalCommits) * 100),
    ticketPercentage: Math.round((ticketReferences / totalCommits) * 100),
    score,
    topOffenders: offendersList
  };
}

module.exports = { analyzeMessages };
