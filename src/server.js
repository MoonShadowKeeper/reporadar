const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

function getHtmlTemplate(data) {
  // We embed the JSON data directly into the HTML so the client-side JS can render it.
  const jsonData = JSON.stringify(data).replace(/</g, '\\u003c');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RepoRadar — Architectural Intelligence Dashboard</title>
    <!-- Use CDN for D3.js and Chart.js to keep zero-dependencies in Node -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.7);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-primary: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.5);
            --risk-low: #10b981;
            --risk-medium: #f59e0b;
            --risk-high: #ef4444;
            --risk-critical: #b91c1c;
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        body {
            margin: 0;
            padding: 0;
            background: var(--bg-dark);
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            transition: background 0.3s ease, color 0.3s ease;
        }

        body.light-theme {
            --bg-dark: #f8fafc;
            --bg-card: rgba(255, 255, 255, 0.8);
            --text-main: #0f172a;
            --text-muted: #64748b;
            --glass-border: rgba(0, 0, 0, 0.1);
        }

        body:not(.light-theme) {
            background: radial-gradient(circle at top right, #1e1b4b, var(--bg-dark));
            background-attachment: fixed;
        }

        /* Glassmorphism utility */
        .glass {
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        header {
            padding: 24px 48px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--glass-border);
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(10px);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .theme-btn {
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            color: var(--text-main);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s ease;
        }
        .theme-btn:hover { background: rgba(255,255,255,0.1); }

        .logo {
            font-size: 24px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
            letter-spacing: -0.5px;
        }

        .logo-icon {
            font-size: 28px;
            filter: drop-shadow(0 0 8px var(--accent-glow));
        }

        .health-badge {
            padding: 8px 16px;
            border-radius: 999px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }

        .health-badge:hover {
            transform: translateY(-2px) scale(1.02);
        }

        .health-A { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
        .health-B { background: rgba(52, 211, 153, 0.2); color: #6ee7b7; border: 1px solid #34d399; }
        .health-C { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
        .health-D { background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid #f97316; }
        .health-F { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid #ef4444; }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 24px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        .full-width {
            grid-column: 1 / -1;
        }

        .card {
            padding: 24px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .card-header {
            margin-bottom: 20px;
        }

        h2 {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 14px;
            margin: 0;
        }

        /* Charts */
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
            flex-grow: 1;
        }

        .d3-container {
            width: 100%;
            height: 400px;
            overflow: hidden;
            border-radius: 8px;
            background: rgba(0,0,0,0.2);
        }

        /* D3 Graph Styles */
        .node circle {
            stroke: #fff;
            stroke-width: 1.5px;
            transition: r 0.3s ease;
        }
        
        .node:hover circle {
            stroke: var(--accent-primary);
            stroke-width: 3px;
        }

        .node text {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            fill: #e2e8f0;
            pointer-events: none;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }

        .link {
            stroke: rgba(255, 255, 255, 0.15);
            stroke-opacity: 0.6;
        }

        /* List styling */
        .risk-list {
            list-style: none;
            padding: 0;
            margin: 0;
            max-height: 300px;
            overflow-y: auto;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

        .risk-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid var(--glass-border);
            transition: background 0.2s ease;
        }

        .risk-item:hover {
            background: rgba(255,255,255,0.05);
        }

        .risk-item:last-child {
            border-bottom: none;
        }

        .risk-file {
            font-family: monospace;
            font-size: 14px;
            color: #cbd5e1;
            word-break: break-all;
            padding-right: 16px;
        }

        .risk-score-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            min-width: 32px;
            text-align: center;
        }

        .score-critical { background: var(--risk-critical); color: white; }
        .score-high { background: var(--risk-high); color: white; }
        .score-medium { background: var(--risk-medium); color: white; }
        .score-low { background: var(--risk-low); color: white; }

        /* Animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }
    </style>
</head>
<body>

    <header>
        <div class="logo">
            <span class="logo-icon">📡</span>
            RepoRadar
        </div>
        <div class="header-controls">
            <button class="theme-btn" onclick="document.body.classList.toggle('light-theme')">🌓 Theme</button>
            <div id="healthBadge" class="health-badge health-A">
                Loading...
            </div>
        </div>
    </header>

    <div class="container">
        <!-- 1. Risk Overview -->
        <div class="card glass animate-in" style="animation-delay: 0.1s;">
            <div class="card-header">
                <h2>⚠️ Highest Risk Files</h2>
                <p class="subtitle">Files demanding architectural refactoring</p>
            </div>
            <ul class="risk-list" id="riskList">
                <!-- Populated by JS -->
            </ul>
        </div>

        <!-- 2. Ownership Distribution -->
        <div class="card glass animate-in" style="animation-delay: 0.2s;">
            <div class="card-header">
                <h2>👑 Codebase Ownership</h2>
                <p class="subtitle">Percentage of files primarily owned by each author</p>
            </div>
            <div class="chart-container" style="display: flex; justify-content: center; align-items: center;">
                <div style="width: 250px; height: 250px;">
                    <canvas id="ownershipChart"></canvas>
                </div>
            </div>
        </div>

        <!-- 3. Language Breakdown -->
        <div class="card glass animate-in" style="animation-delay: 0.3s;">
            <div class="card-header">
                <h2>📊 Language Activity</h2>
                <p class="subtitle">Change volume distribution</p>
            </div>
            <div class="chart-container">
                <canvas id="languageChart"></canvas>
            </div>
        </div>

        <!-- 4. Hidden Coupling Graph -->
        <div class="card glass full-width animate-in" style="animation-delay: 0.4s;">
            <div class="card-header">
                <h2>🕸️ Hidden Coupling (Temporal Dependencies)</h2>
                <p class="subtitle">Files that change together in the same commits (Jaccard Index > 0.5)</p>
            </div>
            <div id="couplingGraph" class="d3-container"></div>
        </div>

        <!-- 5. Refactoring Heroes -->
        <div class="card glass animate-in" style="animation-delay: 0.5s;">
            <div class="card-header">
                <h2>🦸 Refactoring Heroes</h2>
                <p class="subtitle">Developers fixing hotspots and reducing complexity</p>
            </div>
            <div class="chart-container">
                <canvas id="contributorChart"></canvas>
            </div>
        </div>

        <!-- 6. Issue Tracking -->
        <div class="card glass animate-in" style="animation-delay: 0.6s;">
            <div class="card-header">
                <h2>🎫 Issue Tracker Linkage</h2>
                <p class="subtitle">Ratio of structured vs ad-hoc development</p>
            </div>
            <div class="chart-container" style="display: flex; justify-content: center; align-items: center;">
                <div style="width: 250px; height: 250px;">
                    <canvas id="ticketsChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Work Types -->
        <div class="card glass animate-in" style="animation-delay: 0.65s;">
            <div class="card-header">
                <h2>🏷️ Work Types (Context)</h2>
                <p class="subtitle">Commit categories based on semantic messages</p>
            </div>
            <div style="margin-top: 20px;">
                <div class="progress-bar" style="height: 24px; display: flex; margin-bottom: 15px;">
                    <div style="width: ${data.worktypes.percentages.feat}%; background: #3b82f6; height: 100%; border-radius: 4px 0 0 4px;" title="Features: ${data.worktypes.percentages.feat}%"></div>
                    <div style="width: ${data.worktypes.percentages.fix}%; background: #ef4444; height: 100%;" title="Bugfixes: ${data.worktypes.percentages.fix}%"></div>
                    <div style="width: ${data.worktypes.percentages.refactor}%; background: #10b981; height: 100%;" title="Refactor: ${data.worktypes.percentages.refactor}%"></div>
                    <div style="width: ${data.worktypes.percentages.chore}%; background: #8b5cf6; height: 100%;" title="Chores: ${data.worktypes.percentages.chore}%"></div>
                    <div style="width: ${100 - data.worktypes.percentages.feat - data.worktypes.percentages.fix - data.worktypes.percentages.refactor - data.worktypes.percentages.chore}%; background: #6b7280; height: 100%; border-radius: 0 4px 4px 0;" title="Other"></div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 14px; color: #a1a1aa; justify-content: center;">
                    <div style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#3b82f6;"></span> Feat (${data.worktypes.percentages.feat}%)</div>
                    <div style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#ef4444;"></span> Fix (${data.worktypes.percentages.fix}%)</div>
                    <div style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#10b981;"></span> Refactor (${data.worktypes.percentages.refactor}%)</div>
                    <div style="display: flex; align-items: center; gap: 5px;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#8b5cf6;"></span> Chore (${data.worktypes.percentages.chore}%)</div>
                </div>
            </div>
        </div>

        <!-- 7. Complexity Analysis -->
        <div class="card glass animate-in" style="animation-delay: 0.7s;">
            <div class="card-header">
                <h2>🧠 Complexity Analysis</h2>
                <p class="subtitle">Files with highest complexity scores (LOC × Churn × Authors)</p>
            </div>
            <div class="chart-container">
                <canvas id="complexityChart"></canvas>
            </div>
        </div>

        <!-- 8. Activity Timeline -->
        <div class="card glass animate-in" style="animation-delay: 0.8s;">
            <div class="card-header">
                <h2>📈 Activity Timeline</h2>
                <p class="subtitle">Commits per month (detects dead zones & rushes)</p>
            </div>
            <div class="chart-container">
                <canvas id="timelineChart"></canvas>
            </div>
        </div>

        <!-- 9. Message Quality -->
        <div class="card glass animate-in" style="animation-delay: 0.9s;">
            <div class="card-header">
                <h2>📝 Commit Messages</h2>
                <p class="subtitle">Quality score and conventional commits ratio</p>
            </div>
            <div class="chart-container" style="display: flex; justify-content: center; align-items: center;">
                <div style="width: 250px; height: 250px;">
                    <canvas id="messagesChart"></canvas>
                </div>
            </div>
            <div id="messageScore" style="text-align: center; margin-top: 15px; font-weight: bold; font-size: 18px;"></div>
        </div>

        <!-- 10. Burnout Risk -->
        <div class="card glass animate-in" style="animation-delay: 1.0s;">
            <div class="card-header">
                <h2>🔥 Burnout Risk</h2>
                <p class="subtitle">Developers overworking on weekends/nights</p>
            </div>
            <ul class="risk-list" id="burnoutList"></ul>
        </div>

        <!-- 11. Module Ownership -->
        <div class="card glass animate-in" style="animation-delay: 1.1s;">
            <div class="card-header">
                <h2>📁 Module Map</h2>
                <p class="subtitle">Codebase ownership by directory</p>
            </div>
            <ul class="risk-list" id="mapList"></ul>
        </div>

        <!-- 12. Legacy & Attrition -->
        <div class="card glass animate-in" style="animation-delay: 1.2s;">
            <div class="card-header">
                <h2>🏺 Legacy & Orphans</h2>
                <p class="subtitle">Dusty code & inactive primary authors</p>
            </div>
            <ul class="risk-list" id="legacyList"></ul>
        </div>
    </div>

    <script>
        // Inject data from Node.js
        const data = JSON.parse('${jsonData}');
        
        // 1. Health Badge
        const healthEl = document.getElementById('healthBadge');
        healthEl.className = 'health-badge health-' + data.health.grade;
        healthEl.innerHTML = 'Health Score: ' + data.health.grade + ' (' + Math.round(data.health.score) + '/100)';

        // 2. Risk List
        const riskList = document.getElementById('riskList');
        data.risk.slice(0, 15).forEach(f => {
            const li = document.createElement('li');
            li.className = 'risk-item';
            
            let scoreClass = 'score-low';
            if(f.riskScore >= 76) scoreClass = 'score-critical';
            else if(f.riskScore >= 51) scoreClass = 'score-high';
            else if(f.riskScore >= 26) scoreClass = 'score-medium';
            
            li.innerHTML = \`
                <div class="risk-file">\${f.file}</div>
                <div class="risk-score-badge \${scoreClass}">\${Math.round(f.riskScore)}</div>
            \`;
            riskList.appendChild(li);
        });

        // Setup Chart.js Defaults
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
        Chart.defaults.plugins.tooltip.titleColor = '#fff';
        Chart.defaults.plugins.tooltip.padding = 12;

        // 3. Ownership Chart (Doughnut)
        if (data.ownership && data.ownership.length > 0) {
            const ownCtx = document.getElementById('ownershipChart').getContext('2d');
            const topOwners = data.ownership.slice(0, 8);
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            new Chart(ownCtx, {
                type: 'doughnut',
                data: {
                    labels: topOwners.map(o => o.author),
                    datasets: [{
                        data: topOwners.map(o => o.ownedFiles),
                        backgroundColor: colors.slice(0, topOwners.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
                }
            });
        }

        // 4. Language Chart (Bar Chart)
        const langCtx = document.getElementById('languageChart').getContext('2d');
        const topLangs = data.languages.slice(0, 6);
        new Chart(langCtx, {
            type: 'bar',
            data: {
                labels: topLangs.map(l => l.language),
                datasets: [{
                    label: 'Changes',
                    data: topLangs.map(l => l.changes),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // 5. Refactoring Heroes Chart (Scatter)
        const contCtx = document.getElementById('contributorChart').getContext('2d');
        new Chart(contCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Refactoring Hero Score',
                    data: data.contributors.map(c => ({
                        x: c.commits,
                        y: c.heroScore || 0,
                        author: c.author,
                        refactors: c.refactors || 0,
                        fixes: c.fixes || 0
                    })),
                    backgroundColor: ctx => {
                        const val = ctx.raw?.y || 0;
                        return val > 30 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)';
                    },
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => \`\${ctx.raw.author}: \${ctx.raw.y} Score (\${ctx.raw.refactors} Refactors)\`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Total Commits' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { title: { display: true, text: 'Hero Score' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0 }
                }
            }
        });

        // 6. Tickets Chart (Doughnut)
        const tickCtx = document.getElementById('ticketsChart').getContext('2d');
        new Chart(tickCtx, {
            type: 'doughnut',
            data: {
                labels: ['Linked to Issue', 'Unlinked (Ad-Hoc)'],
                datasets: [{
                    data: [data.tickets.linkedCommits, data.tickets.unlinkedCommits],
                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // 7. Complexity Chart (Bar Chart)
        if (data.complexity) {
            const compCtx = document.getElementById('complexityChart').getContext('2d');
            const topComplexity = data.complexity.slice(0, 10);
            new Chart(compCtx, {
                type: 'bar',
                data: {
                    labels: topComplexity.map(c => c.file.split('/').pop()),
                    datasets: [{
                        label: 'Complexity Score',
                        data: topComplexity.map(c => c.complexityScore),
                        backgroundColor: topComplexity.map(c => c.category === 'critical' ? 'rgba(239, 68, 68, 0.8)' : (c.category === 'complex' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(59, 130, 246, 0.8)')),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }

        // 8. Timeline Chart (Line Chart)
        if (data.timeline && Object.keys(data.timeline).length > 0) {
            const timeCtx = document.getElementById('timelineChart').getContext('2d');
            const labels = Object.keys(data.timeline).sort();
            const values = labels.map(l => data.timeline[l]);
            
            new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Commits per Month',
                        data: values,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 12 } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 9. Messages Chart (Doughnut)
        if (data.messages) {
            document.getElementById('messageScore').innerHTML = 'Quality Score: <span style="color: ' + (data.messages.score > 75 ? '#10b981' : '#f59e0b') + ';">' + data.messages.score + '/100</span>';
            const msgCtx = document.getElementById('messagesChart').getContext('2d');
            new Chart(msgCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Conventional', 'Short/Vague', 'Other'],
                    datasets: [{
                        data: [
                            data.messages.conventionalPercentage,
                            data.messages.shortPercentage,
                            100 - data.messages.conventionalPercentage - data.messages.shortPercentage
                        ],
                        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
                }
            });
        }

        // 10. Burnout List
        if (data.burnout) {
            const burnoutList = document.getElementById('burnoutList');
            if (data.burnout.length === 0) {
                burnoutList.innerHTML = '<li class="risk-item" style="color: #10b981;">No burnout risks detected!</li>';
            } else {
                data.burnout.slice(0, 10).forEach(b => {
                    const li = document.createElement('li');
                    li.className = 'risk-item';
                    const icon = b.riskLevel === 'High' ? '🔥' : (b.riskLevel === 'Medium' ? '⚠️' : '✅');
                    const color = b.riskLevel === 'High' ? '#ef4444' : (b.riskLevel === 'Medium' ? '#f59e0b' : '#10b981');
                    li.innerHTML = \`
                        <div class="risk-file">\${icon} <span style="color: \${color}">\${b.author}</span></div>
                        <div style="font-size: 12px; color: var(--text-muted);">Wknd: \${b.weekendPercent}% | Ngt: \${b.lateNightPercent}%</div>
                    \`;
                    burnoutList.appendChild(li);
                });
            }
        }

        // 11. Map List
        if (data.map) {
            const mapList = document.getElementById('mapList');
            data.map.slice(0, 10).forEach(m => {
                const li = document.createElement('li');
                li.className = 'risk-item';
                const primary = m.owners.length > 0 ? m.owners[0].author : 'Unknown';
                li.innerHTML = \`
                    <div class="risk-file">📁 \${m.module}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Owner: \${primary}</div>
                \`;
                mapList.appendChild(li);
            });
        }

        // 12. Legacy & Attrition List
        if (data.age && data.attrition) {
            const legacyList = document.getElementById('legacyList');
            let items = 0;
            
            data.attrition.slice(0, 5).forEach(a => {
                items++;
                const li = document.createElement('li');
                li.className = 'risk-item';
                li.innerHTML = \`
                    <div class="risk-file">👻 \${a.file}</div>
                    <div style="font-size: 12px; color: #ef4444;">Orphaned (\${a.inactiveMonths}mo)</div>
                \`;
                legacyList.appendChild(li);
            });

            data.age.filter(a => a.status === 'legacy').slice(0, 10 - items).forEach(a => {
                const li = document.createElement('li');
                li.className = 'risk-item';
                li.innerHTML = \`
                    <div class="risk-file">🏺 \${a.file}</div>
                    <div style="font-size: 12px; color: #f59e0b;">Legacy (\${a.ageMonths}mo)</div>
                \`;
                legacyList.appendChild(li);
            });

            if (legacyList.children.length === 0) {
                legacyList.innerHTML = '<li class="risk-item" style="color: #10b981;">Codebase is fresh and well maintained!</li>';
            }
        }

        // 13. Coupling Graph (D3 Force Directed)
        function drawCouplingGraph() {
            if(!data.coupling || data.coupling.length === 0) {
                document.getElementById('couplingGraph').innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;">No strong coupling detected in the history.</div>';
                return;
            }

            const width = document.getElementById('couplingGraph').clientWidth;
            const height = document.getElementById('couplingGraph').clientHeight;

            // Extract nodes and links
            const nodesMap = {};
            const links = [];

            // Take top 30 coupled pairs to avoid clutter
            data.coupling.slice(0, 30).forEach(c => {
                if(!nodesMap[c.fileA]) nodesMap[c.fileA] = { id: c.fileA, group: c.fileA.split('/')[0] };
                if(!nodesMap[c.fileB]) nodesMap[c.fileB] = { id: c.fileB, group: c.fileB.split('/')[0] };
                links.push({
                    source: c.fileA,
                    target: c.fileB,
                    value: c.couplingStrength
                });
            });

            const nodes = Object.values(nodesMap);

            const svg = d3.select("#couplingGraph").append("svg")
                .attr("width", width)
                .attr("height", height);

            const simulation = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(100))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collide", d3.forceCollide().radius(40));

            const color = d3.scaleOrdinal(d3.schemeCategory10);

            const link = svg.append("g")
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("class", "link")
                .attr("stroke-width", d => d.value * 5);

            const node = svg.append("g")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            node.append("circle")
                .attr("r", 8)
                .attr("fill", d => color(d.group));

            node.append("text")
                .attr("dx", 12)
                .attr("dy", ".35em")
                .text(d => d.id.split('/').pop());

            simulation.on("tick", () => {
                link
                    .attr("x1", d => Math.max(10, Math.min(width - 10, d.source.x)))
                    .attr("y1", d => Math.max(10, Math.min(height - 10, d.source.y)))
                    .attr("x2", d => Math.max(10, Math.min(width - 10, d.target.x)))
                    .attr("y2", d => Math.max(10, Math.min(height - 10, d.target.y)));

                node
                    .attr("transform", d => {
                        d.x = Math.max(10, Math.min(width - 10, d.x));
                        d.y = Math.max(10, Math.min(height - 10, d.y));
                        return \`translate(\${d.x},\${d.y})\`;
                    });
            });

            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }

        // Draw graph after DOM load
        setTimeout(drawCouplingGraph, 100);
    </script>
</body>
</html>`;
}

function startServer(data, port = 3000) {
  const html = getHtmlTemplate(data);
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  \x1b[1m\x1b[32m🚀 RepoRadar Dashboard running at:\x1b[0m \x1b[4m\x1b[36m${url}\x1b[0m`);
    console.log('  Press Ctrl+C to stop.\n');
    
    // Auto-open browser
    const start = (process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open');
    exec(`${start} ${url}`, (err) => {
      // Ignore errors if browser opening fails
    });
  });
  
  return server;
}

module.exports = { startServer, getHtmlTemplate };
