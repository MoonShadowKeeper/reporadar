/**
 * Analyzes commit timestamps to detect potential burnout risks.
 * Flags authors who consistently commit on weekends or late at night (22:00 - 06:00).
 * 
 * @param {Array} commits 
 * @returns {Array} List of authors with burnout risk metrics
 */
function analyzeBurnout(commits) {
  const authorStats = {};

  for (const commit of commits) {
    const author = commit.author;
    if (!authorStats[author]) {
      authorStats[author] = {
        total: 0,
        weekend: 0,
        lateNight: 0
      };
    }

    authorStats[author].total++;

    const date = new Date(commit.date);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = date.getHours();

    // Check for weekend (Saturday or Sunday)
    if (day === 0 || day === 6) {
      authorStats[author].weekend++;
    }

    // Check for late night (22:00 to 05:59)
    if (hour >= 22 || hour < 6) {
      authorStats[author].lateNight++;
    }
  }

  const results = [];
  for (const [author, stats] of Object.entries(authorStats)) {
    if (stats.total < 5) continue; // Ignore authors with very few commits

    const weekendPercent = Math.round((stats.weekend / stats.total) * 100);
    const lateNightPercent = Math.round((stats.lateNight / stats.total) * 100);

    let riskLevel = 'Low';
    if (weekendPercent > 30 || lateNightPercent > 30) riskLevel = 'High';
    else if (weekendPercent > 15 || lateNightPercent > 15) riskLevel = 'Medium';

    results.push({
      author,
      totalCommits: stats.total,
      weekendCommits: stats.weekend,
      lateNightCommits: stats.lateNight,
      weekendPercent,
      lateNightPercent,
      riskLevel
    });
  }

  // Sort by risk (High -> Medium -> Low), then by total burnout commits
  return results.sort((a, b) => {
    const riskScore = (r) => r === 'High' ? 3 : r === 'Medium' ? 2 : 1;
    const aScore = riskScore(a.riskLevel);
    const bScore = riskScore(b.riskLevel);
    if (aScore !== bScore) return bScore - aScore;
    return (b.weekendCommits + b.lateNightCommits) - (a.weekendCommits + a.lateNightCommits);
  });
}

module.exports = { analyzeBurnout };
