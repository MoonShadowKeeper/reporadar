/**
 * Maps file extensions to programming languages.
 */
const extToLang = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.jsx': 'React',
  '.tsx': 'React (TS)',
  '.py': 'Python',
  '.go': 'Go',
  '.java': 'Java',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.rs': 'Rust',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.sh': 'Shell',
  '.sql': 'SQL'
};

function getLanguage(filename) {
  const match = filename.match(/(\.[^.]+)$/);
  if (match && extToLang[match[1]]) {
    return extToLang[match[1]];
  }
  return 'Other';
}

/**
 * Analyzes repository churn and activity by programming language.
 * @param {Array} commits 
 * @returns {Array} Language breakdown
 */
function analyzeLanguages(commits) {
  const languages = {};

  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.file.match(/package-lock\.json|yarn\.lock/)) continue;
      
      const lang = getLanguage(file.file);
      if (!languages[lang]) {
        languages[lang] = { language: lang, commits: 0, changes: 0, files: new Set() };
      }
      
      const changes = file.added + file.deleted || 1;
      languages[lang].commits += 1;
      languages[lang].changes += changes;
      languages[lang].files.add(file.file);
    }
  }

  const totalChanges = Object.values(languages).reduce((sum, l) => sum + l.changes, 0);

  return Object.values(languages)
    .map(l => ({
      language: l.language,
      files: l.files.size,
      changes: l.changes,
      percentage: Math.round((l.changes / Math.max(1, totalChanges)) * 100)
    }))
    .sort((a, b) => b.changes - a.changes);
}

module.exports = { analyzeLanguages, getLanguage };
