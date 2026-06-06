/**
 * Analyzes the age of files to detect legacy or "dusty" code.
 * Code that hasn't been touched in a long time might be stable,
 * but it also poses a risk if it needs to be changed and the original authors are gone.
 * 
 * @param {Array} commits 
 * @returns {Array} List of files sorted by age
 */
function analyzeAge(commits) {
  const fileLastModified = {};
  const fileFirstModified = {};

  for (const commit of commits) {
    const date = new Date(commit.date);
    for (const f of commit.files) {
      if (!fileLastModified[f.file] || date > fileLastModified[f.file]) {
        fileLastModified[f.file] = date;
      }
      if (!fileFirstModified[f.file] || date < fileFirstModified[f.file]) {
        fileFirstModified[f.file] = date;
      }
    }
  }

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const ageData = Object.keys(fileLastModified).map(file => {
    const lastModified = fileLastModified[file];
    const firstModified = fileFirstModified[file];
    const ageMonths = Math.round((now - lastModified) / MS_PER_DAY / 30);
    const lifespanMonths = Math.round((lastModified - firstModified) / MS_PER_DAY / 30);
    
    let status = 'active';
    if (ageMonths > 24) status = 'legacy';
    else if (ageMonths > 12) status = 'dormant';
    else if (ageMonths > 6) status = 'inactive';

    return {
      file,
      lastModified: lastModified.toISOString().split('T')[0],
      ageMonths,
      lifespanMonths,
      status
    };
  });

  return ageData.sort((a, b) => b.ageMonths - a.ageMonths);
}

module.exports = { analyzeAge };
