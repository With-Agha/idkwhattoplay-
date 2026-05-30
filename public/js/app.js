/* ============================================================
   IDKWhatToPlay v5.0 — app.js
   Cinematic Gaming Nexus — full logic
   ============================================================ */

// ── CONFIG ──
const DAILY_LIMIT   = 5;
const USAGE_KEY     = "idkwtp_v5_usage";
const HISTORY_KEY   = "idkwtp_history";
const PLAYED_KEY    = "idkwtp_played";

const LOAD_MSGS = {
  a: ["// assembling squad loadout...", "// cross-referencing platforms...", "// calculating vibe compatibility...", "// consulting the gaming council...", "// locking in the perfect pick..."],
  b: ["// scanning your library...", "// matching mood to backlog...", "// running compatibility checks...", "// the algorithm is thinking...", "// your pick is ready..."],
  c: ["// reading your energy...", "// vibing with the universe...", "// mood signature detected...", "// locking in the perfect match...", "// almost there..."]
};

// Ambience colors per game vibe
const AMBIENCE = {
  dark:     { r: 180, g: 40,  b: 40  },
  intense:  { r: 245, g: 100, b: 20  },
  bright:   { r: 0,   g: 150, b: 255 },
  cozy:     { r: 255, g: 180, b: 50  },
  default:  { r: 0,   g: 150, b: 255 }
};

let loadTimers   = {};
let zenActive    = false;
let audioCtx     = null;
let currentMode  = "a";

// ── AUDIO ENGINE (Web Audio API — no external files) ──
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playHover() {
  try {
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.04);
    g.gain.setValueAtTime(0.035, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
    o.start(c.currentTime); o.stop(c.currentTime + 0.05);
  } catch(e) {}
}

function playClick() {
  try {
    const c = getCtx(), n = c.currentTime;
    [440, 554, 660].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(freq, n + i * 0.06);
      g.gain.setValueAtTime(0.06, n + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.06 + 0.14);
      o.start(n + i * 0.06); o.stop(n + i * 0.06 + 0.14);
    });
  } catch(e) {}
}

function playModeSwitch() {
  try {
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "square";
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.1);
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    o.start(c.currentTime); o.stop(c.currentTime + 0.12);
  } catch(e) {}
}

function playReveal() {
  try {
    const c = getCtx(), n = c.currentTime;
    // Rising sweep
    const o1 = c.createOscillator(), g1 = c.createGain();
    o1.connect(g1); g1.connect(c.destination);
    o1.type = "sawtooth";
    o1.frequency.setValueAtTime(120, n);
    o1.frequency.exponentialRampToValueAtTime(900, n + 0.45);
    g1.gain.setValueAtTime(0, n);
    g1.gain.linearRampToValueAtTime(0.08, n + 0.08);
    g1.gain.exponentialRampToValueAtTime(0.001, n + 0.55);
    o1.start(n); o1.stop(n + 0.55);
    // Chord resolution
    [330, 415, 523, 659].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(freq, n + 0.4);
      g.gain.setValueAtTime(0.09, n + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, n + 1.1);
      o.start(n + 0.4); o.stop(n + 1.1);
    });
  } catch(e) {}
}

function playPlayed() {
  try {
    const c = getCtx(), n = c.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, n + i * 0.07);
      g.gain.setValueAtTime(0.07, n + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, n + i * 0.07 + 0.2);
      o.start(n + i * 0.07); o.stop(n + i * 0.07 + 0.2);
    });
  } catch(e) {}
}

// ── DAILY LIMIT ──
function todayStr() { return new Date().toISOString().slice(0, 10); }

function getUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { count: 0, date: todayStr() };
    const d = JSON.parse(raw);
    if (d.date !== todayStr()) return { count: 0, date: todayStr() };
    return d;
  } catch { return { count: 0, date: todayStr() }; }
}

function incrementUsage() {
  const u = getUsage(); u.count++;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch {}
  updateEnergyMeter();
}

function getRemaining() { return Math.max(0, DAILY_LIMIT - getUsage().count); }

function updateEnergyMeter() {
  const r    = getRemaining();
  const fill  = document.getElementById("energy-fill");
  const count = document.getElementById("energy-count");
  if (!fill || !count) return;
  const pct = (r / DAILY_LIMIT) * 100;
  fill.style.width = pct + "%";
  const color = r > 2 ? "var(--teal)" : r > 0 ? "var(--amber)" : "var(--red)";
  fill.style.background = color;
  fill.style.boxShadow  = r > 0 ? `0 0 6px ${color}` : "none";
  count.textContent  = r;
  count.style.color  = color;
}

// ── HISTORY ──
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveToHistory(result, mode) {
  const modeNames = { a: "Squad Night", b: "My Backlog", c: "Mood Match" };
  const entry = {
    id:       Date.now(),
    game:     result.game,
    tagline:  result.tagline || "",
    mode,
    modeName: modeNames[mode],
    date:     new Date().toISOString(),
    played:   false
  };
  const history = getHistory();
  history.unshift(entry);
  // Keep last 50 entries
  if (history.length > 50) history.pop();
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

function markPlayed(id) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (item) {
    item.played = true;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }
  renderHistory();
  playPlayed();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── PAGE ROUTING ──
function showPage(page) {
  document.getElementById("page-home").style.display    = page === "home"    ? "block" : "none";
  document.getElementById("page-history").style.display = page === "history" ? "block" : "none";

  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
  const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add("active");

  if (page === "history") renderHistory();
  playClick();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHistory() {
  const list    = document.getElementById("history-list");
  const empty   = document.getElementById("history-empty");
  const history = getHistory();

  if (!list || !empty) return;

  if (history.length === 0) {
    empty.style.display = "block";
    list.style.display  = "none";
    return;
  }

  empty.style.display = "none";
  list.style.display  = "flex";
  list.innerHTML = "";

  history.forEach(item => {
    const el = document.createElement("div");
    el.className = `history-item mode-${item.mode}${item.played ? " played" : ""}`;

    const modeIcons = { a: "👥", b: "📚", c: "🎭" };
    const formattedDate = formatDate(item.date);

    el.innerHTML = `
      <div class="history-item-icon">${modeIcons[item.mode]}</div>
      <div class="history-item-info">
        <div class="history-item-game">${escHtml(item.game)}</div>
        <div class="history-item-meta">
          <span class="mode-badge badge-${item.mode}">${escHtml(item.modeName)}</span>
          <span class="history-date">${formattedDate}</span>
          ${item.played ? `<span class="played-badge">✓ Played</span>` : ""}
        </div>
      </div>
      <div class="history-item-actions">
        ${!item.played ? `<button class="btn-sm" onclick="markPlayed(${item.id})" aria-label="Mark as played">Mark Played</button>` : ""}
        <a class="btn-sm" href="https://store.steampowered.com/search/?term=${encodeURIComponent(item.game)}" target="_blank" rel="noopener noreferrer">Find it</a>
      </div>
    `;

    list.appendChild(el);
  });
}

// ── ZEN MODE ──
function toggleZen() {
  zenActive = !zenActive;
  document.body.classList.toggle("zen-mode", zenActive);
  const btn = document.getElementById("zen-btn");
  if (btn) {
    btn.classList.toggle("active", zenActive);
    btn.textContent = zenActive ? "⊙ Exit Zen" : "⊙ Zen Mode";
  }
  playModeSwitch();
}

// ── MODE SWITCHING ──
function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  playModeSwitch();

  document.querySelectorAll(".mode-tab").forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  const tab = document.getElementById("tab-" + mode);
  if (tab) { tab.classList.add("active"); tab.setAttribute("aria-selected", "true"); }

  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("panel-" + mode);
  if (panel) panel.classList.add("active");
}

// ── AMBIENCE SHIFT ──
function setAmbience(vibe) {
  const c = AMBIENCE[vibe] || AMBIENCE.default;
  document.documentElement.style.setProperty("--amb-r", c.r);
  document.documentElement.style.setProperty("--amb-g", c.g);
  document.documentElement.style.setProperty("--amb-b", c.b);
}

function resetAmbience() {
  const c = AMBIENCE.default;
  document.documentElement.style.setProperty("--amb-r", c.r);
  document.documentElement.style.setProperty("--amb-g", c.g);
  document.documentElement.style.setProperty("--amb-b", c.b);
}

// Hero gradient colors per ambience
const HERO_GRADS = {
  dark:    "linear-gradient(135deg, rgba(120,20,20,0.7), rgba(60,10,10,0.5), rgba(11,14,20,0.95))",
  intense: "linear-gradient(135deg, rgba(140,50,10,0.7), rgba(80,30,5,0.5),  rgba(11,14,20,0.95))",
  bright:  "linear-gradient(135deg, rgba(76,29,149,0.7), rgba(30,58,138,0.5), rgba(11,14,20,0.95))",
  cozy:    "linear-gradient(135deg, rgba(120,60,10,0.7), rgba(80,40,5,0.5),   rgba(11,14,20,0.95))",
  default: "linear-gradient(135deg, rgba(76,29,149,0.6), rgba(20,70,80,0.4),  rgba(11,14,20,0.95))"
};

// ── MAIN GENERATE FUNCTION ──
async function generate(mode) {
  playClick();

  if (getRemaining() <= 0) {
    showErr(mode, `⚡ Daily energy depleted — 5 picks used. Come back tomorrow, or <a href="https://ko-fi.com/idkwhattoplay" target="_blank" style="color:var(--amber);text-decoration:underline">support the site ☕</a> to keep it running.`);
    return;
  }

  // Collect inputs
  const apiMode = mode === 'a' ? 'group' : mode === 'b' ? 'backlog' : 'mood';
  let payload = { mode: apiMode };

  if (mode === "a") {
    const platforms = [...document.querySelectorAll('input[name="a-plat"]:checked')].map(e => e.value);
    if (!platforms.length) { showErr(mode, "Pick at least one platform your squad has."); return; }
    payload.players   = document.getElementById("a-players").value;
    payload.platforms = platforms.join(", ");
    payload.time      = document.getElementById("a-time").value;
    payload.vibe      = document.querySelector('input[name="a-vibe"]:checked')?.value || "chill";
    payload.context   = document.getElementById("a-ctx").value.trim();
  } else if (mode === "b") {
    const games = document.getElementById("b-games").value.trim();
    if (!games) { showErr(mode, "Add some games you own first."); return; }
    payload.games   = games;
    payload.mood    = document.querySelector('input[name="b-mood"]:checked')?.value || "chill";
    payload.time    = document.getElementById("b-time").value;
    payload.players = document.getElementById("b-players").value;
  } else if (mode === "c") {
    payload.feeling = document.getElementById("c-feeling").value;
    payload.solo    = document.querySelector('input[name="c-solo"]:checked')?.value || "solo";
    payload.time    = document.getElementById("c-time").value;
  }

  clearErr(mode);
  hideResult(mode);
  resetAmbience();
  setLoading(mode, true);

  try {
    const response = await fetch('/api/recommend', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Server error.");

    const result = data.result;
    if (!result || !result.game) throw new Error("Empty response. Hit Reroll and try again.");

    // Success
    incrementUsage();
    saveToHistory(result, mode);
    setAmbience(result.ambience || "default");
    playReveal();
    showResult(mode, result);

  } catch (err) {
    showErr(mode, err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(mode, false);
  }
}

// ── RESULT CARD ──
function showResult(mode, r) {
  const steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(r.game)}`;
  const gmgUrl   = `https://www.greenmangaming.com/search/?query=${encodeURIComponent(r.game)}`;
  const hbUrl    = `https://www.humblebundle.com/store/search?search=${encodeURIComponent(r.game)}`;
  const ytUrl    = `https://www.youtube.com/results?search_query=${encodeURIComponent(r.game + " gameplay")}`;

  const heroGrad = HERO_GRADS[r.ambience] || HERO_GRADS.default;

  const reasonsHtml = (r.reasons || []).map(re => `<li>${escHtml(re)}</li>`).join("");
  const similarHtml = (r.similar || []).map(g => `<span class="similar-chip">${escHtml(g)}</span>`).join("");

  const html = `
    <div class="result-hero">
      <div class="result-hero-bg" style="background:${heroGrad}"></div>
      <div class="result-hero-overlay"></div>
      <div class="result-hero-content">
        <div class="result-badge">Recommended for Tonight</div>
        <div class="result-game-title">${escHtml(r.game)}</div>
        <div class="result-tagline">${escHtml(r.tagline || "")}</div>
        <div class="result-stats">
          ${r.genre         ? `<div class="stat-chip"><span class="chip-label">Genre</span>${escHtml(r.genre)}</div>` : ""}
          ${r.players       ? `<div class="stat-chip"><span class="chip-label">Players</span>${escHtml(r.players)}</div>` : ""}
          ${r.session_length? `<div class="stat-chip"><span class="chip-label">Sessions</span>${escHtml(r.session_length)}</div>` : ""}
          ${r.difficulty    ? `<div class="stat-chip"><span class="chip-label">Difficulty</span>${escHtml(r.difficulty)}</div>` : ""}
          ${r.mood_match    ? `<div class="stat-chip">${escHtml(r.mood_match)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="result-body">
      <div class="result-main">
        <div class="result-section-label">// why it fits tonight</div>
        <div class="result-why">${escHtml(r.why || "")}</div>

        ${reasonsHtml ? `
          <div class="result-section-label">// why you'll love it</div>
          <ul class="reasons">${reasonsHtml}</ul>
        ` : ""}

        ${r.hltb ? `<div class="hltb-pill">⏱ ${escHtml(r.hltb)}</div>` : ""}

        ${r.protip ? `
          <div class="protip">
            <span class="protip-icon">💡</span>
            <div class="protip-text"><strong>Pro tip:</strong> ${escHtml(r.protip)}</div>
          </div>
        ` : ""}

        <div class="result-actions">
          <button class="btn-sm" onclick="generate('${mode}')" aria-label="Get a new recommendation">↺ Reroll</button>
          <button class="btn-sm" id="copy-${mode}" onclick="copyResult('${mode}', ${JSON.stringify(JSON.stringify(r))})" aria-label="Copy to clipboard">Copy</button>
          <button class="btn-sm" onclick="markPlayedFromResult('${escHtml(r.game)}')" aria-label="Mark as played">✓ Mark Played</button>
        </div>
      </div>

      ${similarHtml ? `
        <div class="similar-section">
          <div class="result-section-label">// more like this</div>
          <div class="similar-chips">${similarHtml}</div>
        </div>
      ` : ""}

      <div class="aff-section">
        <div class="result-section-label">// find it here</div>
        <div class="aff-btns">
          <a class="aff-btn aff-steam" href="${steamUrl}" target="_blank" rel="noopener noreferrer">🖥️ Search on Steam</a>
          <a class="aff-btn aff-gmg"   href="${gmgUrl}"   target="_blank" rel="noopener noreferrer">🟢 Check on GMG</a>
          <a class="aff-btn aff-hb"    href="${hbUrl}"    target="_blank" rel="noopener noreferrer">🎁 Humble Bundle</a>
          <a class="aff-btn aff-yt"    href="${ytUrl}"    target="_blank" rel="noopener noreferrer">▶ Watch Gameplay</a>
        </div>
      </div>
    </div>
  `;

  const section = document.getElementById("res-" + mode);
  if (!section) return;
  section.innerHTML = html;
  section.classList.add("show");
  setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
}

function hideResult(mode) {
  const s = document.getElementById("res-" + mode);
  if (s) { s.classList.remove("show"); s.innerHTML = ""; }
}

function markPlayedFromResult(gameName) {
  const history = getHistory();
  const item = history.find(h => h.game === gameName && !h.played);
  if (item) markPlayed(item.id);
  else playPlayed();
}

// ── COPY ──
async function copyResult(mode, jsonStr) {
  try {
    const r = JSON.parse(jsonStr);
    const text = `🎮 ${r.game}\n\n${r.tagline}\n\n${r.why}\n\nPro tip: ${r.protip}`;
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById("copy-" + mode);
    if (btn) {
      btn.textContent = "Copied!";
      btn.classList.add("success");
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("success"); }, 2500);
    }
    playHover();
  } catch(e) {}
}

// ── LOADING ──
function setLoading(mode, on) {
  const btn  = document.getElementById("btn-" + mode);
  const scan = document.getElementById("scan-" + mode);
  const txt  = document.getElementById("ltxt-" + mode);
  if (btn)  btn.disabled = on;
  if (scan) scan.classList.toggle("show", on);
  if (on) {
    let i = 0;
    if (txt) txt.textContent = LOAD_MSGS[mode][0];
    loadTimers[mode] = setInterval(() => {
      i = (i + 1) % LOAD_MSGS[mode].length;
      if (txt) txt.textContent = LOAD_MSGS[mode][i];
    }, 1600);
  } else {
    clearInterval(loadTimers[mode]);
  }
}

// ── ERRORS ──
function showErr(mode, msg) {
  const el = document.getElementById("err-" + mode);
  if (!el) return;
  el.innerHTML = "⚠ " + msg;
  el.classList.add("show");
}
function clearErr(mode) {
  const el = document.getElementById("err-" + mode);
  if (el) el.classList.remove("show");
}

// ── RIPPLE ──
function ripple(e) {
  const r = document.createElement("div");
  r.className = "ripple";
  r.style.left = e.clientX + "px";
  r.style.top  = e.clientY + "px";
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ── UTILS ──
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  updateEnergyMeter();

  // Hover sounds on interactive elements
  document.querySelectorAll(".mode-tab, .pill label, .store-card, .kofi-btn, .support-btn").forEach(el => {
    el.addEventListener("mouseenter", playHover, { passive: true });
  });

  // Ripples on buttons
  document.querySelectorAll(".btn-gen, .btn-sm, .mode-tab").forEach(btn => {
    btn.addEventListener("click", ripple);
  });

  // Default to home page
  showPage("home");
  document.querySelector('.nav-link[data-page="home"]')?.classList.add("active");
});
