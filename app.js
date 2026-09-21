// 個人用の戦略トレーニングアプリ。バックエンドなし、localStorageのみで完結。
const STORAGE_KEY = "pdm_dojo_attempts_v1";
const SEEDED_KEY = "pdm_dojo_seeded_v1";
const AXES = RUBRIC.map((r) => r.id);
const COLOR_LATEST = "#b5533c";
const COLOR_FIRST = "#9a9a94";

function loadAttempts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  if (!localStorage.getItem(SEEDED_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ATTEMPTS));
    localStorage.setItem(SEEDED_KEY, "1");
    return JSON.parse(JSON.stringify(SEED_ATTEMPTS));
  }
  return [];
}

function saveAttempts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addAttempt(attempt) {
  const list = loadAttempts();
  list.push(attempt);
  saveAttempts(list);
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function avgScore(scores) {
  const vals = AXES.map((a) => scores[a] || 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function caseById(id) {
  return CASES.find((c) => c.id === id);
}

// ---------- Canvas charts ----------

function drawRadar(canvas, series) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 - 6;
  const radius = Math.min(w, h) / 2 - 58;
  const n = AXES.length;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const gridColor = getComputedStyle(document.body).getPropertyValue("--border").trim() || "#ddd";
  const textColor = getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#888";

  // grid rings
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angleFor(i % n);
      const r = (radius * ring) / 5;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // axes + labels
  ctx.fillStyle = textColor;
  ctx.font = "11px -apple-system, sans-serif";
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const x2 = cx + radius * Math.cos(a);
    const y2 = cy + radius * Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const lx = cx + (radius + 22) * Math.cos(a);
    const ly = cy + (radius + 22) * Math.sin(a);
    ctx.textAlign = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
    ctx.fillText(RUBRIC[i].short, lx, ly + 4);
  }

  // series polygons
  series.forEach((s) => {
    ctx.beginPath();
    AXES.forEach((axisId, i) => {
      const val = s.values[axisId] || 0;
      const r = (radius * val) / 5;
      const a = angleFor(i);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = s.color + "33";
    ctx.fill();
  });
}

function drawLine(canvas, points) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const padL = 30, padR = 16, padT = 16, padB = 26;
  const gridColor = getComputedStyle(document.body).getPropertyValue("--border").trim() || "#ddd";
  const textColor = getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#888";

  const plotW = w - padL - padR, plotH = h - padT - padB;
  ctx.strokeStyle = gridColor;
  ctx.fillStyle = textColor;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.lineWidth = 1;
  for (let v = 0; v <= 5; v++) {
    const y = padT + plotH - (plotH * v) / 5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.strokeStyle = gridColor;
    ctx.stroke();
    ctx.fillText(String(v), 6, y + 3);
  }

  if (points.length === 0) return;
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = padL + stepX * i;
    const y = padT + plotH - (plotH * p.avg) / 5;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = COLOR_LATEST;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  points.forEach((p, i) => {
    const x = padL + stepX * i;
    const y = padT + plotH - (plotH * p.avg) / 5;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_LATEST;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(String(i + 1), x - 3, h - 8);
  });
}

// ---------- Routing ----------

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return { path: "/" };
  if (parts[0] === "cases") return { path: "/cases" };
  if (parts[0] === "history") return { path: "/history" };
  if (parts[0] === "case" && parts[1]) return { path: "/case", id: parts[1] };
  return { path: "/" };
}

function setActiveNav(path) {
  document.querySelectorAll(".topbar nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === path || (path === "/case" && a.dataset.route === "/cases"));
  });
}

function render() {
  const route = parseHash();
  setActiveNav(route.path);
  const app = document.getElementById("app");
  if (route.path === "/") app.innerHTML = renderDashboard();
  else if (route.path === "/cases") app.innerHTML = renderCasesList();
  else if (route.path === "/history") app.innerHTML = renderHistory();
  else if (route.path === "/case") renderCaseDetail(app, route.id);
  afterRender(route);
}

function afterRender(route) {
  if (route.path === "/") {
    const attempts = loadAttempts().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (attempts.length > 0) {
      const first = attempts[0], latest = attempts[attempts.length - 1];
      const radarCanvas = document.getElementById("radarChart");
      if (radarCanvas) {
        drawRadar(radarCanvas, [
          { label: "初回", color: COLOR_FIRST, values: first.scores },
          { label: "直近", color: COLOR_LATEST, values: latest.scores },
        ]);
      }
      const lineCanvas = document.getElementById("lineChart");
      if (lineCanvas) {
        drawLine(lineCanvas, attempts.map((a) => ({ avg: avgScore(a.scores) })));
      }
    }
  }
}

// ---------- Views ----------

function renderDashboard() {
  const attempts = loadAttempts().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  if (attempts.length === 0) {
    return `
      <h1>ダッシュボード</h1>
      <p class="subtitle">戦略思考・優先順位づけ・合意形成を、ケーススタディで鍛える個人用道場。</p>
      <div class="card empty-state">
        <p>まだ記録がありません。最初のケースに挑戦してみましょう。</p>
        <a class="button" href="#/cases">ケース一覧へ</a>
      </div>`;
  }
  const first = attempts[0], latest = attempts[attempts.length - 1];
  const rows = RUBRIC.map((r) => {
    const f = first.scores[r.id] || 0, l = latest.scores[r.id] || 0;
    const d = l - f;
    const cls = d > 0 ? "delta-up" : d < 0 ? "delta-down" : "delta-flat";
    const arrow = d > 0 ? "↑" : d < 0 ? "↓" : "→";
    return `<tr><td>${r.label}</td><td>${f}</td><td>${l}</td><td class="${cls}">${arrow} ${d > 0 ? "+" : ""}${d}</td></tr>`;
  }).join("");

  return `
    <h1>ダッシュボード</h1>
    <p class="subtitle">これまで${attempts.length}回挑戦。初回と直近を比べて、伸びた軸・停滞している軸を確認しましょう。</p>

    <div class="grid-2">
      <div class="card">
        <h2>スキルレーダー(初回 vs 直近)</h2>
        <canvas id="radarChart" width="340" height="300"></canvas>
        <div class="legend">
          <span><span class="dot" style="background:${COLOR_FIRST}"></span>初回</span>
          <span><span class="dot" style="background:${COLOR_LATEST}"></span>直近</span>
        </div>
      </div>
      <div class="card">
        <h2>平均スコアの推移</h2>
        <canvas id="lineChart" width="320" height="300"></canvas>
        <p class="legend">横軸=挑戦回数、縦軸=5軸の平均点(0〜5)</p>
      </div>
    </div>

    <div class="card">
      <h2>軸別の変化</h2>
      <table>
        <thead><tr><th>評価軸</th><th>初回</th><th>直近</th><th>変化</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="card">
      <h2>次の一手</h2>
      <p>まだ挑戦していないケースがあれば、そこから伸びしろのある軸を重点的に意識してみましょう。</p>
      <a class="button" href="#/cases">ケース一覧へ</a>
      <a class="button secondary" href="#/history">全履歴を見る</a>
    </div>`;
}

function renderCasesList() {
  const attempts = loadAttempts();
  const items = CASES.map((c) => {
    const count = attempts.filter((a) => a.caseId === c.id).length;
    const badge = count > 0
      ? `<span class="badge done">実施済み ×${count}</span>`
      : `<span class="badge new">未着手</span>`;
    return `
      <a class="case-item" href="#/case/${c.id}">
        <div>
          <div><strong>${escapeHtml(c.title)}</strong></div>
          <div class="meta">${escapeHtml(c.summary)}</div>
        </div>
        ${badge}
      </a>`;
  }).join("");
  return `
    <h1>ケース一覧</h1>
    <p class="subtitle">同じ5つの評価軸(診断・方針・優先順位・数字・合意形成)で、毎回自己採点します。</p>
    <div class="case-list">${items}</div>`;
}

function renderHistory() {
  const attempts = loadAttempts().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  if (attempts.length === 0) {
    return `<h1>履歴</h1><div class="card empty-state"><p>まだ記録がありません。</p></div>`;
  }
  const rows = attempts.map((a) => {
    const c = caseById(a.caseId);
    const avg = avgScore(a.scores).toFixed(1);
    const dt = new Date(a.date);
    const chips = RUBRIC.map((r) => `<span class="score-chip">${r.short} ${a.scores[r.id]}</span>`).join("");
    return `
      <div class="attempt-row">
        <div class="attempt-head">
          <span>${dt.toLocaleString("ja-JP")} ・ ${escapeHtml(c ? c.title : a.caseId)}</span>
          <span>平均 ${avg} / 5</span>
        </div>
        <div class="score-chip-row">${chips}</div>
        ${a.note ? `<p class="meta" style="margin-top:8px;color:var(--text-muted)">${escapeHtml(a.note)}</p>` : ""}
        <details>
          <summary>回答内容を見る</summary>
          <div class="answer-block">
            <b>① 診断</b><p>${escapeHtml(a.answers.diagnosis)}</p>
            <b>② 基本方針</b><p>${escapeHtml(a.answers.policy)}</p>
            <b>③ 優先順位</b><p>${escapeHtml(a.answers.priority)}</p>
            <b>④ 説明</b><p>${escapeHtml(a.answers.stakeholderMsg)}</p>
          </div>
        </details>
      </div>`;
  }).join("");
  return `<h1>履歴</h1><p class="subtitle">全${attempts.length}件</p>${rows}`;
}

function renderCaseDetail(app, id) {
  const c = caseById(id);
  if (!c) { app.innerHTML = `<p>ケースが見つかりません。</p>`; return; }
  const pastAttempts = loadAttempts().filter((a) => a.caseId === id).sort((a, b) => new Date(b.date) - new Date(a.date));

  const fieldsHtml = FIELDS.map((f) => `
    <div class="field">
      <label for="f-${f.id}">${f.label}</label>
      <div class="hint">${escapeHtml(c[f.hintKey] || "")}</div>
      <textarea id="f-${f.id}"></textarea>
    </div>`).join("");

  const rubricHtml = RUBRIC.map((r) => `
    <div class="rubric-axis">
      <div class="axis-top">
        <label>${r.label}</label>
        <span class="score-val" id="val-${r.id}">3</span>
      </div>
      <input type="range" min="1" max="5" step="1" value="3" id="score-${r.id}" data-axis="${r.id}">
      <div class="level-desc" id="desc-${r.id}">${r.levels[3]}</div>
    </div>`).join("");

  const pastHtml = pastAttempts.length === 0 ? "" : `
    <div class="card">
      <h2>このケースの過去の挑戦(${pastAttempts.length}件)</h2>
      ${pastAttempts.map((a) => {
        const avg = avgScore(a.scores).toFixed(1);
        const dt = new Date(a.date);
        return `<div class="attempt-row">
          <div class="attempt-head"><span>${dt.toLocaleString("ja-JP")}</span><span>平均 ${avg} / 5</span></div>
          <div class="score-chip-row">${RUBRIC.map((r) => `<span class="score-chip">${r.short} ${a.scores[r.id]}</span>`).join("")}</div>
        </div>`;
      }).join("")}
    </div>`;

  app.innerHTML = `
    <h1>${escapeHtml(c.title)}</h1>
    <div class="card">
      <h2>シナリオ</h2>
      <div class="scenario">${escapeHtml(c.scenario)}</div>
    </div>
    <div class="card">
      <h2>あなたの回答</h2>
      ${fieldsHtml}
    </div>
    <div class="card">
      <h2>自己採点</h2>
      <p class="hint" style="margin-bottom:16px;">スライダーを動かすと、その点数の基準が下に表示されます。甘めにつけず、基準文と照らして採点してください。</p>
      ${rubricHtml}
      <div class="field">
        <label for="f-note">メモ(任意)</label>
        <input type="text" id="f-note" placeholder="今回気づいたこと、フィードバックの要約など">
      </div>
      <button class="button" id="saveBtn">この回答を保存する</button>
    </div>
    ${pastHtml}
  `;

  RUBRIC.forEach((r) => {
    const slider = document.getElementById(`score-${r.id}`);
    slider.addEventListener("input", () => {
      document.getElementById(`val-${r.id}`).textContent = slider.value;
      document.getElementById(`desc-${r.id}`).textContent = r.levels[slider.value];
    });
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    const answers = {};
    FIELDS.forEach((f) => { answers[f.id] = document.getElementById(`f-${f.id}`).value.trim(); });
    const allEmpty = Object.values(answers).every((v) => v === "");
    if (allEmpty) { alert("少なくとも1項目は入力してください。"); return; }
    const scores = {};
    RUBRIC.forEach((r) => { scores[r.id] = Number(document.getElementById(`score-${r.id}`).value); });
    const note = document.getElementById("f-note").value.trim();
    addAttempt({
      id: "a-" + Date.now(),
      caseId: c.id,
      date: new Date().toISOString(),
      note,
      answers,
      scores,
    });
    location.hash = "#/";
  });
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
