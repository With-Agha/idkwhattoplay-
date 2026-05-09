/* ============================================================
   IDKWhatToPlay v4.0 — app.js
   Glassmorphism gaming platform — all logic lives here
   ============================================================ */

// ── CONFIG ──
const DAILY_LIMIT = 5;
const STORAGE_KEY = "idkwtp_v4_usage";
const LOADING_MSGS = {
  a: ["// assembling squad loadout...", "// cross-referencing platforms...", "// calculating vibe compatibility...", "// consulting the gaming council...", "// locking in the perfect pick..."],
  b: ["// scanning your library...", "// matching mood to backlog...", "// running compatibility checks...", "// the algorithm is thinking...", "// found your pick..."],
  c: ["// reading your energy...", "// vibing with the universe...", "// mood signature detected...", "// locking in the perfect match...", "// almost there..."]
};

let loadingTimers = {};
let zenMode = false;
let audioCtx = null;

// ── AUDIO ENGINE ──
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTick() {
  try {
    const c = getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(900, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(650, c.currentTime + 0.05);
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
    o.type = "square"; o.start(c.currentTime); o.stop(c.currentTime + 0.06);
  } catch(e) {}
}

function playSelect() {
  try {
    const c = getCtx(), n = c.currentTime;
    [0, 0.06, 0.12].forEach((off, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.setValueAtTime([440, 554, 660][i], n + off);
      g.gain.setValueAtTime(0.07, n + off);
      g.gain.exponentialRampToValueAtTime(0.001, n + off + 0.14);
      o.type = "sine"; o.start(n + off); o.stop(n + off + 0.14);
    });
  } catch(e) {}
}

function playPowerUp() {
  try {
    const c = getCtx(), n = c.currentTime;
    const o1 = c.createOscillator(), g1 = c.createGain();
    o1.connect(g1); g1.connect(c.destination);
    o1.type = "sawtooth";
    o1.frequency.setValueAtTime(120, n);
    o1.frequency.exponentialRampToValueAtTime(900, n + 0.45);
    g1.gain.setValueAtTime(0, n);
    g1.gain.linearRampToValueAtTime(0.1, n + 0.08);
    g1.gain.exponentialRampToValueAtTime(0.001, n + 0.55);
    o1.start(n); o1.stop(n + 0.55);
    [330, 415, 523, 659, 831].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine"; o.frequency.setValueAtTime(f, n + 0.4);
      g.gain.setValueAtTime(0.09, n + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, n + 1.0);
      o.start(n + 0.4); o.stop(n + 1.0);
    });
  } catch(e) {}
}

// ── ZEN MODE ──
function toggleZen() {
  zenMode = !zenMode;
  document.body.classList.toggle("zen-mode", zenMode);
  const btn = document.getElementById("zen-btn");
  if (btn) {
    btn.classList.toggle("active", zenMode);
    btn.textContent = zenMode ? "⊙ Exit Zen" : "⊙ Zen Mode";
  }
  playSelect();
}

// ── DAILY LIMIT ──
function today() { return new Date().toISOString().slice(0, 10); }

function getUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: today() };
    const d = JSON.parse(raw);
    if (d.date !== today()) return { count: 0, date: today() };
    return d;
  } catch { return { count: 0, date: today() }; }
}

function incrementUsage() {
  const u = getUsage(); u.count++;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  updateMeter();
}

function getRemaining() { return Math.max(0, DAILY_LIMIT - getUsage().count); }

function updateMeter() {
  const r = getRemaining();
  const fill = document.getElementById("meter-fill");
  const count = document.getElementById("meter-count");
  if (!fill || !count) return;
  fill.style.width = (r / DAILY_LIMIT * 100) + "%";
  fill.style.background = r > 2 ? "var(--teal)" : r > 0 ? "var(--amber)" : "var(--red)";
  count.textContent = r;
  count.style.color = r > 2 ? "var(--teal)" : r > 0 ? "var(--amber)" : "var(--red)";
}

// ── MODE SWITCHING ──
function switchMode(mode) {
  playSelect();
  document.querySelectorAll(".mode-tab").forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  document.getElementById("tab-" + mode).classList.add("active");
  document.getElementById("tab-" + mode).setAttribute("aria-selected", "true");
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + mode).classList.add("active");
}

// ── RIPPLE ──
function createRipple(e) {
  const r = document.createElement("div");
  r.className = "ripple";
  r.style.left = e.clientX + "px";
  r.style.top = e.clientY + "px";
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ── GENERATE ──
async function generate(mode) {
  playSelect();

  if (getRemaining() <= 0) { showDepleted(mode); return; }

  let payload = { mode };

  if (mode === "a") {
    const platforms = [...document.querySelectorAll('input[name="a-plat"]:checked')].map(e => e.value);
    if (!platforms.length) { showErr(mode, "Pick at least one platform your squad has."); return; }
    payload.players  = document.getElementById("a-players").value;
    payload.platforms = platforms.join(", ");
    payload.time     = document.getElementById("a-time").value;
    payload.vibe     = document.querySelector('input[name="a-vibe"]:checked')?.value || "chill";
    payload.context  = document.getElementById("a-ctx").value.trim();
  }

  if (mode === "b") {
    const games = document.getElementById("b-games").value.trim();
    if (!games) { showErr(mode, "Add some games you own first."); return; }
    payload.games   = games;
    payload.mood    = document.querySelector('input[name="b-mood"]:checked')?.value || "chill";
    payload.time    = document.getElementById("b-time").value;
    payload.players = document.getElementById("b-players").value;
  }

  if (mode === "c") {
    payload.feeling = document.getElementById("c-feeling").value;
    payload.solo    = document.querySelector('input[name="c-solo"]:checked')?.value || "solo";
    payload.time    = document.getElementById("c-time").value;
  }

  clearErr(mode);
  hideResult(mode);
  setLoading(mode, true);

  try {
    const res = await fetch("/.netlify/functions/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server error. Try again.");

    const result = data.result;
    if (!result || !result.game) throw new Error("Invalid response. Hit Reroll.");

    incrementUsage();
    playPowerUp();
    showResult(mode, result);

  } catch (err) {
    showErr(mode, err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(mode, false);
  }
}

// ── BUILD RESULT CARD ──
function showResult(mode, r) {
  const steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(r.game)}`;
  const gmgUrl   = `https://www.greenmangaming.com/search/?query=${encodeURIComponent(r.game)}`;
  const hbUrl    = `https://www.humblebundle.com/store/search?search=${encodeURIComponent(r.game)}`;

  // Mode accent colors
  const accents = { a: "var(--violet)", b: "var(--amber)", c: "var(--teal)" };
  const accent = accents[mode];

  // Build the cinematic hero gradient based on mode
  const heroGrads = {
    a: "linear-gradient(135deg, rgba(76,29,149,0.6), rgba(30,58,138,0.4), rgba(11,14,20,0.9))",
    b: "linear-gradient(135deg, rgba(120,53,15,0.6), rgba(67,20,7,0.4), rgba(11,14,20,0.9))",
    c: "linear-gradient(135deg, rgba(5,78,72,0.6), rgba(19,78,74,0.4), rgba(11,14,20,0.9))"
  };

  const reasonsHTML = (r.reasons || []).map(reason => `<li>${reason}</li>`).join("");
  const similarHTML = (r.similar || []).map(g => `<span class="similar-chip">${g}</span>`).join("");

  const html = `
    <div class="result-hero">
      <div class="result-hero-bg" style="background:${heroGrads[mode]}"></div>
      <div class="result-hero-gradient"></div>
      <div class="result-hero-content">
        <div class="result-rec-badge">Recommended for tonight</div>
        <div class="result-title">${escHtml(r.game)}</div>
        <div class="result-tagline">${escHtml(r.tagline || "")}</div>
        <div class="result-stats">
          ${r.genre ? `<div class="stat-chip"><span class="stat-icon">🎮</span><span class="stat-label">Genre</span>${escHtml(r.genre)}</div>` : ""}
          ${r.players ? `<div class="stat-chip"><span class="stat-icon">👥</span><span class="stat-label">Players</span>${escHtml(r.players)}</div>` : ""}
          ${r.time_to_play ? `<div class="stat-chip"><span class="stat-icon">⏱</span><span class="stat-label">Sessions</span>${escHtml(r.time_to_play)}</div>` : ""}
          ${r.difficulty ? `<div class="stat-chip"><span class="stat-icon">⚡</span><span class="stat-label">Difficulty</span>${escHtml(r.difficulty)}</div>` : ""}
          ${r.mood_match ? `<div class="stat-chip"><span class="stat-icon">✨</span>${escHtml(r.mood_match)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="result-body">
      <div class="result-main">
        <div class="result-section-title">// why it fits tonight</div>
        <div class="result-why">${escHtml(r.why || "")}</div>

        ${reasonsHTML ? `
          <div class="result-section-title">// why you'll love it</div>
          <ul class="reasons-list">${reasonsHTML}</ul>
        ` : ""}

        ${r.protip ? `
          <div class="protip-box">
            <span class="protip-icon">💡</span>
            <div class="protip-text"><strong>Pro tip:</strong> ${escHtml(r.protip)}</div>
          </div>
        ` : ""}

        <div class="result-actions">
          <button class="btn-sm" onclick="generate('${mode}')" aria-label="Get a new recommendation">Reroll</button>
          <button class="btn-sm" id="copy-${mode}" onclick="copyResult('${mode}', ${JSON.stringify(r).replace(/'/g, "\\'")})" aria-label="Copy recommendation">Copy</button>
        </div>
      </div>

      ${similarHTML ? `
        <div class="similar-section">
          <div class="result-section-title">// more like this</div>
          <div class="similar-grid">${similarHTML}</div>
        </div>
      ` : ""}

      <div class="aff-section">
        <div class="aff-label">// find it here</div>
        <div class="aff-buttons">
          <a class="aff-btn aff-steam" href="${steamUrl}" target="_blank" rel="noopener noreferrer">🖥️ Search on Steam</a>
          <a class="aff-btn aff-gmg" href="${gmgUrl}" target="_blank" rel="noopener noreferrer">🟢 Check on GMG</a>
          <a class="aff-btn aff-hb" href="${hbUrl}" target="_blank" rel="noopener noreferrer">🎁 Humble Bundle</a>
        </div>
      </div>
    </div>
  `;

  const section = document.getElementById("res-" + mode);
  section.innerHTML = html;
  section.classList.add("show");
  setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
}

function hideResult(mode) {
  const s = document.getElementById("res-" + mode);
  if (s) { s.classList.remove("show"); s.innerHTML = ""; }
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── COPY ──
async function copyResult(mode, result) {
  const text = `🎮 ${result.game}\n\n${result.tagline}\n\n${result.why}\n\nPro tip: ${result.protip}`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById("copy-" + mode);
    if (btn) { btn.textContent = "Copied!"; btn.classList.add("copied"); setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2500); }
    playTick();
  } catch {}
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
    if (txt) txt.textContent = LOADING_MSGS[mode][0];
    loadingTimers[mode] = setInterval(() => {
      i = (i + 1) % LOADING_MSGS[mode].length;
      if (txt) txt.textContent = LOADING_MSGS[mode][i];
    }, 1600);
  } else {
    clearInterval(loadingTimers[mode]);
  }
}

// ── ERRORS ──
function showErr(mode, msg) {
  const el = document.getElementById("err-" + mode);
  if (el) { el.textContent = "⚠ " + msg; el.classList.add("show"); }
}
function clearErr(mode) {
  const el = document.getElementById("err-" + mode);
  if (el) el.classList.remove("show");
}
function showDepleted(mode) {
  const el = document.getElementById("err-" + mode);
  if (el) {
    el.innerHTML = `⚡ Daily energy depleted — 5 picks used. Come back tomorrow, or <a href="https://ko-fi.com/idkwhattoplay" target="_blank" style="color:var(--amber);text-decoration:underline">support the site ☕</a> to keep it running.`;
    el.classList.add("show");
  }
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  updateMeter();

  // Hover sounds
  document.querySelectorAll(".mode-tab, .pill label, .btn-sm, .store, .kofi-big, .kofi-btn").forEach(el => {
    el.addEventListener("mouseenter", () => playTick(), { passive: true });
  });

  // Ripples
  document.querySelectorAll(".btn-gen, .btn-sm, .mode-tab").forEach(btn => {
    btn.addEventListener("click", createRipple);
  });
});
