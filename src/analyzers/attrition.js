/**
 * Analyzes the repository for "Attrition Risk" or "Orphaned Code".
 * It identifies files where the primary or sole author has not contributed
 * to the project in a long time (e.g., > 6 months), indicating they may have left.
 * 
 * @param {Array} commits 
 * @returns {Array} List of high-risk orphaned files
 */
function analyzeAttrition(commits) {
  const authorLastActive = {};
  const fileAuthors = {};

  for (const commit of commits) {
    const author = commit.author;
    const date = new Date(commit.date);

    // Track when the author was last seen anywhere in the repo
    if (!authorLastActive[author] || date > authorLastActive[author]) {
      authorLastActive[author] = date;
    }

    for (const f of commit.files) {
      if (!fileAuthors[f.file]) fileAuthors[f.file] = {};
      if (!fileAuthors[f.file][author]) fileAuthors[f.file][author] = 0;
      fileAuthors[f.file][author] += (f.added + f.deleted || 1);
    }
  }

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const orphanedFiles = [];

  for (const file of Object.keys(fileAuthors)) {
    const authors = fileAuthors[file];
    const totalChanges = Object.values(authors).reduce((sum, val) => sum + val, 0);
    
    // Find the primary author
    let primaryAuthor = null;
    let maxChanges = 0;
    
    for (const author of Object.keys(authors)) {
      if (authors[author] > maxChanges) {
        maxChanges = authors[author];
        primaryAuthor = author;
      }
    }

    // If primary author wrote more than 70% of the file
    if (primaryAuthor && (maxChanges / totalChanges) > 0.7) {
      const lastActive = authorLastActive[primaryAuthor];
      const inactiveMonths = Math.round((now - lastActive) / MS_PER_DAY / 30);
      
      // If the primary author hasn't been active in 6+ months
      if (inactiveMonths >= 6) {
        orphanedFiles.push({
          file,
          primaryAuthor,
          ownershipRatio: Math.round((maxChanges / totalChanges) * 100),
          inactiveMonths
        });
      }
    }
  }

  return orphanedFiles.sort((a, b) => b.inactiveMonths - a.inactiveMonths);
}

module.exports = { analyzeAttrition };
