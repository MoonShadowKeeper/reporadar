#!/usr/bin/env node

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

// ─── Module imports ──────────────────────────────────────────────────────────
const { getCommits } = require('../src/git');
const { analyzeHotspots } = require('../src/analyzers/hotspots');
const { analyzeBusFactor } = require('../src/analyzers/busfactor');
const { analyzeChurn } = require('../src/analyzers/churn');
const { analyzeCoupling } = require('../src/analyzers/coupling');
const { analyzeRisk } = require('../src/analyzers/risk');

// ─── Colors ──────────────────────────────────────────────────────────────────
const COLOR = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

// ─── Test Runner ─────────────────────────────────────────────────────────────
class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  async run(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const elapsed = Date.now() - t0;
      this.passed++;
      this.results.push({ name, passed: true, elapsed });
      console.log(`  ${COLOR.green('✓')} ${name} ${COLOR.dim(`(${elapsed}ms)`)}`);
    } catch (err) {
      const elapsed = Date.now() - t0;
      this.failed++;
      this.results.push({ name, passed: false, elapsed, error: err });
      console.log(`  ${COLOR.red('✗')} ${name} ${COLOR.dim(`(${elapsed}ms)`)}`);
      console.log(`    ${COLOR.red(err.message)}`);
      if (err.code === 'ERR_ASSERTION') {
        if (err.expected !== undefined) {
          console.log(`    ${COLOR.dim('expected:')} ${COLOR.cyan(JSON.stringify(err.expected))}`);
          console.log(`    ${COLOR.dim('actual:  ')} ${COLOR.yellow(JSON.stringify(err.actual))}`);
        }
      }
    }
  }

  summary() {
    const total = this.passed + this.failed;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('');
    console.log('══════════════════════════');
    if (this.failed === 0) {
      console.log(`  ${COLOR.green(`Results: ${this.passed}/${total} passed`)}`);
    } else {
      console.log(`  ${COLOR.red(`Results: ${this.passed}/${total} passed, ${this.failed} failed`)}`);
    }
    console.log(`  Time: ${elapsed}s`);
    console.log('');
    return this.failed === 0 ? 0 : 1;
  }
}

// ─── Git helpers ─────────────────────────────────────────────────────────────
function git(args, cwd) {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

function gitCommitAs(name, email, message, cwd) {
  git(`-c user.name='${name}' -c user.email='${email}' commit -m "${message}"`, cwd);
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Setup: create temporary git repo with scripted history ──────────────────
function createTestRepo() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reporadar-test-'));

  git('init', tempDir);
  git('config user.email "test@test.com"', tempDir);
  git('config user.name "Test User"', tempDir);

  // Commit 1 — Alice creates src/main.js
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    '',
    'function startServer(port) {',
    '  const server = http.createServer((req, res) => {',
    '    res.writeHead(200);',
    '    res.end("Hello World");',
    '  });',
    '  server.listen(port);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'feat: add main server entry point', tempDir);

  // Commit 2 — Alice creates src/utils.js
  writeFile(path.join(tempDir, 'src', 'utils.js'), [
    '// Utility functions',
    'function formatDate(d) {',
    '  return d.toISOString().split("T")[0];',
    '}',
    '',
    'function slugify(text) {',
    '  return text.toLowerCase().replace(/\\s+/g, "-");',
    '}',
    '',
    'module.exports = { formatDate, slugify };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'feat: add utility functions', tempDir);

  // Commit 3 — Bob modifies src/main.js
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    '',
    'function startServer(port) {',
    '  const server = http.createServer((req, res) => {',
    '    res.writeHead(200, { "Content-Type": "text/plain" });',
    '    res.end("Hello World - " + formatDate(new Date()));',
    '  });',
    '  server.listen(port);',
    '  console.log(`Server running on port ${port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Bob', 'bob@test.com', 'feat: integrate utils and improve response', tempDir);

  // Commit 4 — Alice creates src/config.js AND modifies src/main.js (co-change)
  writeFile(path.join(tempDir, 'src', 'config.js'), [
    '// Application configuration',
    'const config = {',
    '  port: process.env.PORT || 3000,',
    '  host: process.env.HOST || "localhost",',
    '  env: process.env.NODE_ENV || "development",',
    '  logLevel: "info",',
    '};',
    '',
    'module.exports = config;',
  ].join('\n'));
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    'const config = require("./config");',
    '',
    'function startServer() {',
    '  const server = http.createServer((req, res) => {',
    '    res.writeHead(200, { "Content-Type": "text/plain" });',
    '    res.end("Hello World - " + formatDate(new Date()));',
    '  });',
    '  server.listen(config.port, config.host);',
    '  console.log(`Server running on ${config.host}:${config.port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'feat: add config module and integrate', tempDir);

  // Commit 5 — Bob modifies src/main.js AND src/config.js together (more coupling)
  writeFile(path.join(tempDir, 'src', 'config.js'), [
    '// Application configuration',
    'const config = {',
    '  port: parseInt(process.env.PORT, 10) || 3000,',
    '  host: process.env.HOST || "0.0.0.0",',
    '  env: process.env.NODE_ENV || "development",',
    '  logLevel: process.env.LOG_LEVEL || "info",',
    '  timeout: 30000,',
    '};',
    '',
    'module.exports = config;',
  ].join('\n'));
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    'const config = require("./config");',
    '',
    'function startServer() {',
    '  const server = http.createServer((req, res) => {',
    '    res.writeHead(200, { "Content-Type": "application/json" });',
    '    res.end(JSON.stringify({ message: "Hello World", time: formatDate(new Date()) }));',
    '  });',
    '  server.setTimeout(config.timeout);',
    '  server.listen(config.port, config.host);',
    '  console.log(`[${config.env}] Server on ${config.host}:${config.port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Bob', 'bob@test.com', 'refactor: use JSON response and env config', tempDir);

  // Commit 6 — Charlie modifies src/main.js
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    'const config = require("./config");',
    '',
    'function createHandler() {',
    '  return (req, res) => {',
    '    const payload = {',
    '      message: "Hello World",',
    '      time: formatDate(new Date()),',
    '      uptime: process.uptime(),',
    '    };',
    '    res.writeHead(200, { "Content-Type": "application/json" });',
    '    res.end(JSON.stringify(payload));',
    '  };',
    '}',
    '',
    'function startServer() {',
    '  const server = http.createServer(createHandler());',
    '  server.setTimeout(config.timeout);',
    '  server.listen(config.port, config.host);',
    '  console.log(`[${config.env}] Server on ${config.host}:${config.port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer, createHandler };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Charlie', 'charlie@test.com', 'refactor: extract request handler', tempDir);

  // Commit 7 — Alice modifies src/utils.js
  writeFile(path.join(tempDir, 'src', 'utils.js'), [
    '// Utility functions',
    'function formatDate(d) {',
    '  return d.toISOString().split("T")[0];',
    '}',
    '',
    'function slugify(text) {',
    '  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");',
    '}',
    '',
    'function truncate(str, len = 100) {',
    '  return str.length > len ? str.slice(0, len) + "..." : str;',
    '}',
    '',
    'module.exports = { formatDate, slugify, truncate };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'feat: add truncate util and improve slugify', tempDir);

  // Commit 8 — Alice creates docs/readme.md
  writeFile(path.join(tempDir, 'docs', 'readme.md'), [
    '# Project Documentation',
    '',
    '## Getting Started',
    '',
    'Install dependencies and run the server:',
    '',
    '```bash',
    'npm install',
    'node src/main.js',
    '```',
    '',
    '## Configuration',
    '',
    'Set environment variables to configure the server.',
    '',
    '| Variable | Default | Description |',
    '|----------|---------|-------------|',
    '| PORT     | 3000    | Server port |',
    '| HOST     | 0.0.0.0 | Server host |',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'docs: add project documentation', tempDir);

  // Commit 9 — Alice modifies src/main.js AND src/config.js together (more coupling)
  writeFile(path.join(tempDir, 'src', 'config.js'), [
    '// Application configuration',
    'const config = {',
    '  port: parseInt(process.env.PORT, 10) || 3000,',
    '  host: process.env.HOST || "0.0.0.0",',
    '  env: process.env.NODE_ENV || "development",',
    '  logLevel: process.env.LOG_LEVEL || "info",',
    '  timeout: 30000,',
    '  cors: {',
    '    origin: process.env.CORS_ORIGIN || "*",',
    '    methods: ["GET", "POST"],',
    '  },',
    '};',
    '',
    'module.exports = config;',
  ].join('\n'));
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    'const config = require("./config");',
    '',
    'function setCorsHeaders(res) {',
    '  res.setHeader("Access-Control-Allow-Origin", config.cors.origin);',
    '  res.setHeader("Access-Control-Allow-Methods", config.cors.methods.join(","));',
    '}',
    '',
    'function createHandler() {',
    '  return (req, res) => {',
    '    setCorsHeaders(res);',
    '    const payload = {',
    '      message: "Hello World",',
    '      time: formatDate(new Date()),',
    '      uptime: process.uptime(),',
    '      version: "1.0.0",',
    '    };',
    '    res.writeHead(200, { "Content-Type": "application/json" });',
    '    res.end(JSON.stringify(payload));',
    '  };',
    '}',
    '',
    'function startServer() {',
    '  const server = http.createServer(createHandler());',
    '  server.setTimeout(config.timeout);',
    '  server.listen(config.port, config.host);',
    '  console.log(`[${config.env}] Server on ${config.host}:${config.port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer, createHandler };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Alice', 'alice@test.com', 'feat: add CORS support', tempDir);

  // Commit 10 — Bob modifies src/main.js
  writeFile(path.join(tempDir, 'src', 'main.js'), [
    '// Main application entry point',
    'const http = require("http");',
    'const { formatDate } = require("./utils");',
    'const config = require("./config");',
    '',
    'function setCorsHeaders(res) {',
    '  res.setHeader("Access-Control-Allow-Origin", config.cors.origin);',
    '  res.setHeader("Access-Control-Allow-Methods", config.cors.methods.join(","));',
    '}',
    '',
    'function createHandler() {',
    '  return (req, res) => {',
    '    setCorsHeaders(res);',
    '    if (req.url === "/health") {',
    '      res.writeHead(200);',
    '      return res.end("OK");',
    '    }',
    '    const payload = {',
    '      message: "Hello World",',
    '      time: formatDate(new Date()),',
    '      uptime: process.uptime(),',
    '      version: "1.0.0",',
    '      pid: process.pid,',
    '    };',
    '    res.writeHead(200, { "Content-Type": "application/json" });',
    '    res.end(JSON.stringify(payload));',
    '  };',
    '}',
    '',
    'function startServer() {',
    '  const server = http.createServer(createHandler());',
    '  server.setTimeout(config.timeout);',
    '  server.listen(config.port, config.host);',
    '  console.log(`[${config.env}] Server on ${config.host}:${config.port}`);',
    '  return server;',
    '}',
    '',
    'module.exports = { startServer, createHandler };',
  ].join('\n'));
  git('add -A', tempDir);
  gitCommitAs('Bob', 'bob@test.com', 'feat: add health check endpoint', tempDir);

  return tempDir;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`📡 ${COLOR.bold('RepoRadar Test Suite')}`);
  console.log('══════════════════════════');
  console.log('');

  const runner = new TestRunner();
  let tempDir;

  try {
    tempDir = createTestRepo();

    const TOTAL_COMMITS = 10;
    const TOTAL_AUTHORS = 3; // Alice, Bob, Charlie
    const projectRoot = path.resolve(__dirname, '..');
    const binPath = path.join(projectRoot, 'bin', 'reporadar.js');

    // getRepoInfo removed

    // ── 2. getCommits ─────────────────────────────────────────────────────
    await runner.run('getCommits returns all commits with required fields', async () => {
      const commits = await getCommits(tempDir);
      assert.equal(commits.length, TOTAL_COMMITS, `Expected ${TOTAL_COMMITS} commits`);

      for (const commit of commits) {
        assert.ok(commit.hash, 'Commit must have a hash');
        assert.ok(commit.author, 'Commit must have an author');
        assert.ok(commit.date, 'Commit must have a date');
        assert.ok(Array.isArray(commit.files), 'Commit must have a files array');
      }
    });

    // ── 3. getCommits with since option ───────────────────────────────────
    await runner.run('getCommits with old since date returns all commits', async () => {
      const commits = await getCommits(tempDir, { since: '2000-01-01' });
      assert.equal(commits.length, TOTAL_COMMITS, 'All commits should be returned for old since date');
    });

    // ── 4. Commit file parsing ────────────────────────────────────────────
    await runner.run('commit file parsing has correct insertions/deletions', async () => {
      const commits = await getCommits(tempDir);

      // Find a commit that modified existing files (should have non-zero data)
      const commitWithChanges = commits.find(
        (c) => c.files && c.files.some((f) => f.added > 0 || f.deleted > 0)
      );
      assert.ok(commitWithChanges, 'Should find at least one commit with file change data');

      for (const file of commitWithChanges.files) {
        assert.ok(file.path || file.file, 'File entry must have a path');
        assert.ok(
          typeof file.added === 'number' && file.added >= 0,
          'insertions must be a non-negative number'
        );
        assert.ok(
          typeof file.deleted === 'number' && file.deleted >= 0,
          'deletions must be a non-negative number'
        );
      }
    });

    // ── 5. analyzeHotspots ────────────────────────────────────────────────
    await runner.run('analyzeHotspots ranks src/main.js as #1', async () => {
      const commits = await getCommits(tempDir);
      const hotspots = await analyzeHotspots(commits);

      assert.ok(Array.isArray(hotspots), 'Hotspots should be an array');
      assert.ok(hotspots.length > 0, 'Hotspots should not be empty');

      // src/main.js appears in commits 1,3,4,5,6,9,10 = 7 times — most of any file
      const topFile = hotspots[0].file || hotspots[0].path;
      assert.ok(
        topFile.includes('main.js'),
        `Top hotspot should be main.js, got: ${topFile}`
      );
      assert.ok(hotspots[0].score > 0, 'Top hotspot should have a positive score');
    });

    // ── 6. Hotspot exclusion ──────────────────────────────────────────────
    // Excluded logic handled in CLI options now

    // ── 7. analyzeBusFactor ───────────────────────────────────────────────
    await runner.run('analyzeBusFactor identifies single-author files', async () => {
      const commits = await getCommits(tempDir);
      const result = await analyzeBusFactor(commits);

      assert.ok(Array.isArray(result), 'Bus factor result should be an array');
      const files = result;

      // src/utils.js was only touched by Alice (commits 2, 7)
      const utilsEntry = files.find((f) => {
        const fp = f.file || f.path;
        return fp.includes('utils.js');
      });
      assert.ok(utilsEntry, 'utils.js should appear in bus factor results');
      assert.equal(utilsEntry.busFactor, 1, 'utils.js busFactor should be 1 (only Alice)');
    });

    // ── 8. Bus factor risk levels (removed) ───────────────────────────────

    // ── 9. analyzeChurn ───────────────────────────────────────────────────
    await runner.run('analyzeChurn returns valid categories and positive rates', async () => {
      const commits = await getCommits(tempDir);
      const churnResult = await analyzeChurn(commits);

      const files = churnResult;
      assert.ok(Array.isArray(files), 'Churn result should contain a files array');
      assert.ok(files.length > 0, 'Churn should have at least one file');

      const validCategories = ['stable', 'active', 'turbulent'];
      for (const f of files) {
        const cat = (f.category || f.status || '').toLowerCase();
        assert.ok(
          validCategories.includes(cat),
          `File ${f.file || f.path} category should be one of ${validCategories.join('/')}, got: ${cat}`
        );
        assert.ok(
          typeof f.churnRate === 'number' && f.churnRate > 0,
          `File ${f.file || f.path} churnRate should be a positive number, got: ${f.churnRate}`
        );
      }
    });

    // ── 10. analyzeCoupling ───────────────────────────────────────────────
    await runner.run('analyzeCoupling detects main.js ↔ config.js coupling', async () => {
      const commits = await getCommits(tempDir);
      const couplingResult = await analyzeCoupling(commits);

      const pairs = couplingResult;
      assert.ok(Array.isArray(pairs), 'Coupling result should contain pairs array');
      assert.ok(pairs.length > 0, 'Should detect at least one coupled pair');

      // main.js and config.js change together in commits 4, 5, 9 = 3 times
      const mainConfigPair = pairs.find((p) => {
        const files = [p.fileA || p.source, p.fileB || p.target].map((f) => f || '');
        return (
          (files[0].includes('main.js') && files[1].includes('config.js')) ||
          (files[0].includes('config.js') && files[1].includes('main.js'))
        );
      });
      assert.ok(mainConfigPair, 'main.js and config.js should appear as a coupled pair');
    });

    // ── 11. analyzeRisk ───────────────────────────────────────────────────
    await runner.run('analyzeRisk returns valid scores, levels, and summary', async () => {
      const commits = await getCommits(tempDir);
      const riskResult = await analyzeRisk(await analyzeHotspots(commits), await analyzeBusFactor(commits), await analyzeChurn(commits), await analyzeCoupling(commits));

      const files = riskResult;
      assert.ok(Array.isArray(files), 'Risk result should contain files array');
      assert.ok(files.length > 0, 'Risk should have at least one file');

      const validLevels = ['low', 'medium', 'high', 'critical'];
      for (const f of files) {
        assert.ok(
          typeof f.riskScore === 'number' && f.riskScore >= 0 && f.riskScore <= 100,
          `riskScore should be 0-100, got: ${f.riskScore}`
        );
        const level = (f.level || '').toLowerCase();
        assert.ok(
          validLevels.includes(level),
          `level should be one of ${validLevels.join('/')}, got: ${level}`
        );
      }
    });

    // ── 12. CLI --help ────────────────────────────────────────────────────
    await runner.run('CLI --help contains reporadar', async () => {
      const output = execSync(`node "${binPath}" --help`, {
        encoding: 'utf8',
        cwd: projectRoot,
      });
      assert.ok(
        output.toLowerCase().includes('reporadar'),
        `--help output should mention reporadar, got: ${output.slice(0, 200)}`
      );
    });

    // ── 13. CLI --version ─────────────────────────────────────────────────
    await runner.run('CLI --version outputs correctly', async () => {
      const output = execSync(`node "${binPath}" --version`, {
        encoding: 'utf8',
        cwd: projectRoot,
      });
      assert.ok(
        output.includes('1.6.0'),
        `--version should output 1.6.0, got: ${output.trim()}`
      );
    });

    // ── 14. CLI JSON output ───────────────────────────────────────────────
    await runner.run('CLI scan --json produces valid JSON', async () => {
      const output = execSync(
        `node "${binPath}" scan --json`,
        {
          encoding: 'utf8',
          cwd: tempDir,
        }
      );

      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        assert.fail(`CLI output is not valid JSON: ${output.slice(0, 300)}`);
      }
      assert.ok(parsed, 'Parsed JSON should be truthy');
      assert.ok(
        typeof parsed === 'object',
        'Parsed JSON should be an object or array'
      );
    });
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; ignore errors on Windows lock issues etc.
      }
    }
  }

  const exitCode = runner.summary();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(COLOR.red(`\nFatal error: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
