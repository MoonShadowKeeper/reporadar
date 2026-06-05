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
            background: radial-gradient(circle at top right, #1e1b4b, var(--bg-dark));
            background-attachment: fixed;
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
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
        <div id="healthBadge" class="health-badge health-A">
            Loading...
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

        <!-- 2. Language Breakdown -->
        <div class="card glass animate-in" style="animation-delay: 0.2s;">
            <div class="card-header">
                <h2>📊 Language Activity</h2>
                <p class="subtitle">Change volume distribution</p>
            </div>
            <div class="chart-container">
                <canvas id="languageChart"></canvas>
            </div>
        </div>

        <!-- 3. Hidden Coupling Graph -->
        <div class="card glass full-width animate-in" style="animation-delay: 0.3s;">
            <div class="card-header">
                <h2>🕸️ Hidden Coupling (Temporal Dependencies)</h2>
                <p class="subtitle">Files that change together in the same commits (Jaccard Index > 0.5)</p>
            </div>
            <div id="couplingGraph" class="d3-container"></div>
        </div>

        <!-- 4. Contributor Risk (Churn) -->
        <div class="card glass animate-in" style="animation-delay: 0.4s;">
            <div class="card-header">
                <h2>👥 Contributor Churn</h2>
                <p class="subtitle">Authors with high rewrite/delete ratios</p>
            </div>
            <div class="chart-container">
                <canvas id="contributorChart"></canvas>
            </div>
        </div>

        <!-- 5. Issue Tracking -->
        <div class="card glass animate-in" style="animation-delay: 0.5s;">
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

        // 3. Language Chart (Doughnut)
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

        // 4. Contributor Chart (Scatter)
        const contCtx = document.getElementById('contributorChart').getContext('2d');
        new Chart(contCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Contributors',
                    data: data.contributors.map(c => ({
                        x: c.commits,
                        y: c.churnRatio,
                        author: c.author,
                        score: c.riskScore
                    })),
                    backgroundColor: ctx => {
                        const val = ctx.raw?.y || 0;
                        return val > 50 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
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
                            label: (ctx) => \`\${ctx.raw.author}: \${ctx.raw.y}% Churn (\${ctx.raw.x} Commits)\`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Total Commits' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { title: { display: true, text: 'Churn Ratio (%)' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
                }
            }
        });

        // 5. Tickets Chart (Doughnut)
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

        // 6. Coupling Graph (D3 Force Directed)
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
    exec(`${start} ${url}`).catch(() => {});
  });
  
  return server;
}

module.exports = { startServer, getHtmlTemplate };
