/**
 * Analyzes commit activity over time to detect patterns:
 * - Dead zones (periods with zero activity)
 * - Burst zones (deadline rushes with abnormally high commit rates)
 * - Weekly/monthly activity distribution
 *
 * @param {Array} commits
 * @returns {Object} Timeline analysis
 */
function analyzeTimeline(commits) {
  if (commits.length === 0) return { months: [], weekdays: [], deadZones: [], burstZones: [] };

  // Group commits by month
  const monthMap = {};
  // Group by weekday
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Group by hour
  const hourCount = new Array(24).fill(0);

  for (const commit of commits) {
    const d = new Date(commit.date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { month: monthKey, commits: 0, authors: new Set(), changes: 0 };
    }
    monthMap[monthKey].commits++;
    monthMap[monthKey].authors.add(commit.author);

    for (const f of commit.files) {
      monthMap[monthKey].changes += (f.added + f.deleted) || 0;
    }

    weekdayCount[d.getDay()]++;
    hourCount[d.getHours()]++;
  }

  // Convert to sorted array
  const months = Object.values(monthMap)
    .map(m => ({ ...m, authors: m.authors.size }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate average commits per month
  const avgCommits = months.length > 0 ? months.reduce((s, m) => s + m.commits, 0) / months.length : 0;

  // Detect dead zones (months with zero or very few commits — < 10% of average)
  const deadZones = [];
  const threshold = Math.max(1, avgCommits * 0.1);
  
  // Fill gaps — months with no commits at all
  if (months.length >= 2) {
    const start = new Date(months[0].month + '-01');
    const end = new Date(months[months.length - 1].month + '-01');
    const existingMonths = new Set(months.map(m => m.month));

    const cursor = new Date(start);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      if (!existingMonths.has(key)) {
        deadZones.push({ month: key, commits: 0, type: 'inactive' });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  for (const m of months) {
    if (m.commits <= threshold && m.commits > 0) {
      deadZones.push({ month: m.month, commits: m.commits, type: 'low-activity' });
    }
  }
  deadZones.sort((a, b) => a.month.localeCompare(b.month));

  // Detect burst zones (months with >2x average)
  const burstZones = months
    .filter(m => m.commits > avgCommits * 2)
    .map(m => ({ month: m.month, commits: m.commits, ratio: Math.round((m.commits / Math.max(1, avgCommits)) * 10) / 10 }));

  // Weekday distribution
  const weekdays = weekdayNames.map((name, i) => ({
    day: name,
    commits: weekdayCount[i],
    percentage: Math.round((weekdayCount[i] / Math.max(1, commits.length)) * 100)
  }));

  // Peak hours
  const peakHour = hourCount.indexOf(Math.max(...hourCount));

  return {
    months,
    weekdays,
    deadZones,
    burstZones,
    peakHour,
    avgCommitsPerMonth: Math.round(avgCommits * 10) / 10,
    totalMonths: months.length
  };
}

module.exports = { analyzeTimeline };
