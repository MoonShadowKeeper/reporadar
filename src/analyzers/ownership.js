/**
 * Analyzes code ownership across the entire repository.
 * @param {Array} commits 
 * @returns {Array} Authors sorted by lines of code they "own"
 */
function analyzeOwnership(commits) {
  const fileAuthors = {};
  
  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      
      if (!fileAuthors[file.file]) {
        fileAuthors[file.file] = { totalChanges: 0, authors: {} };
      }
      
      const changes = file.added + file.deleted || 1;
      fileAuthors[file.file].totalChanges += changes;
      
      if (!fileAuthors[file.file].authors[commit.author]) {
        fileAuthors[file.file].authors[commit.author] = 0;
      }
      fileAuthors[file.file].authors[commit.author] += changes;
    }
  }

  const globalOwnership = {};
  
  for (const [file, data] of Object.entries(fileAuthors)) {
    if (data.totalChanges === 0) continue;
    
    // Find the primary owner of this file
    let primaryOwner = null;
    let maxChanges = 0;
    
    for (const [author, changes] of Object.entries(data.authors)) {
      if (changes > maxChanges) {
        maxChanges = changes;
        primaryOwner = author;
      }
      
      // Also add to global stats
      if (!globalOwnership[author]) {
        globalOwnership[author] = { author, totalChanges: 0, ownedFiles: 0, files: [] };
      }
      globalOwnership[author].totalChanges += changes;
    }
    
    // If someone owns > 50% of the file, they are the owner
    if (primaryOwner && (maxChanges / data.totalChanges) >= 0.5) {
      globalOwnership[primaryOwner].ownedFiles += 1;
      globalOwnership[primaryOwner].files.push(file);
    }
  }

  const results = Object.values(globalOwnership)
    .sort((a, b) => b.totalChanges - a.totalChanges);
    
  return results;
}

module.exports = { analyzeOwnership };
