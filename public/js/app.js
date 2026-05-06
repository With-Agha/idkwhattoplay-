/* ============================================================
   IDKWhatToPlay — app.js v3.0
   Handles: mode switching, daily limits, API calls,
   result cards, affiliate links, Web Audio sounds
   ============================================================ */

// ── DAILY LIMIT CONFIG ──
const DAILY_LIMIT = 5;
const STORAGE_KEY = "idkwtp_usage";

// ── LOADING MESSAGES per mode ──
const LOADING_MSGS = {
  a: ["// assembling your squad loadout...", "// cross-referencing platforms...", "// calculating vibe compatibility...", "// consulting the gaming council..."],
  b: ["// scanning your library...", "// matching mood to backlog...", "// running compatibility checks...", "// the algorithm is thinking..."],
  c: ["// reading your energy...", "// vibing with the universe...", "// mood detected...", "// locking in the perfect match..."]
};

let loadingTimers = {};
let currentMode = "a";

// ── WEB AUDIO ENGINE ──
// All sounds generated in-browser — no external files needed
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTick() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.type = "square";
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch(e) {}
}

function playSelect() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [0, 0.05, 0.1].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freqs = [440, 550, 660];
      osc.frequency.setValueAtTime(freqs[i], now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.type = "sine";
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  } catch(e) {}
}

function playPowerUp() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Rising sweep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    gain1.gain.setValueAtTime(0.0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);
    // Chord hit
    [330, 440, 550, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + 0.35);
      gain.gain.setValueAtTime(0.1, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc.start(now + 0.35);
      osc.stop(now + 0.9);
    });
  } catch(e) {}
}

// ── DAILY LIMIT SYSTEM ──
function getUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: today() };
    const data = JSON.parse(raw);
    if (data.date !== today()) return { count: 0, date: today() };
    return data;
  } catch { return { count: 0, date: today() }; }
}

function incrementUsage() {
  const usage = getUsage();
  usage.count += 1;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(usage)); } catch {}
  updateMeter();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getRemainingGenerations() {
  return Math.max(0, DAILY_LIMIT - getUsage().count);
}

function updateMeter() {
  const remaining = getRemainingGenerations();
  const fill = document.getElementById("meter-fill");
  const count = document.getElementById("meter-count");
  if (!fill || !count) return;
  const pct = (remaining / DAILY_LIMIT) * 100;
  fill.style.width = pct + "%";
  fill.style.background = remaining > 2 ? "var(--a)" : remaining > 0 ? "var(--warm)" : "var(--red)";
  count.textContent = remaining;
  // Color the text
  count.style.color = remaining > 2 ? "var(--a)" : remaining > 0 ? "var(--warm)" : "var(--red)";
}

// ── MODE SWITCHING ──
function switchMode(mode) {
  playSelect();
  currentMode = mode;

  // Update tabs
  document.querySelectorAll(".mode-tab").forEach(t => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  document.getElementById("tab-" + mode).classList.add("active");
  document.getElementById("tab-" + mode).setAttribute("aria-selected", "true");

  // Update panels
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + mode).classList.add("active");
}

// ── RIPPLE EFFECT ──
function createRipple(e) {
  const ripple = document.createElement("div");
  ripple.className = "ripple";
  ripple.style.left = e.clientX + "px";
  ripple.style.top = e.clientY + "px";
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// ── SCANNING ANIMATION ──
function startScanAnimation(mode) {
  const scanEl = document.getElementById("scan-" + mode);
  if (scanEl) scanEl.classList.add("show");
}

function stopScanAnimation(mode) {
  const scanEl = document.getElementById("scan-" + mode);
  if (scanEl) scanEl.classList.remove("show");
}

// ── MAIN GENERATE FUNCTION ──
async function generate(mode) {
  playSelect();

  // Check daily limit
  if (getRemainingGenerations() <= 0) {
    showDepleted(mode);
    return;
  }

  // Gather inputs based on mode
  let payload = { mode };

  if (mode === "a") {
    const platforms = [...document.querySelectorAll('input[name="a-plat"]:checked')].map(e => e.value);
    if (platforms.length === 0) { showErr(mode, "Pick at least one platform your squad has."); return; }
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

  // Reset UI
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

    const text = (data.result || "").trim();
    if (!text || text.length < 20) throw new Error("Empty response. Hit Reroll.");

    // Count this generation
    incrementUsage();

    // Play power-up sound
    playPowerUp();

    // Show result card
    showResult(mode, text, data.gameTitle || "");

  } catch (err) {
    showErr(mode, err.message || "Something went wrong. Try again.");
  } finally {
    setLoading(mode, false);
  }
}

// ── RESULT CARD ──
function showResult(mode, text, gameTitle) {
  // Parse sections from AI response
  const gameMatch = text.match(/^GAME:\s*(.+)/m);
  const game = gameMatch ? gameMatch[1].trim() : gameTitle || "Unknown Game";

  // Remove the GAME: line and split remaining into sections
  const body = text.replace(/^GAME:\s*.+/m, "").trim();

  // Build the result card HTML
  const steamUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(game)}`;
  const gmgUrl   = `https://www.greenmangaming.com/search/?query=${encodeURIComponent(game)}`;
  const hbUrl    = `https://www.humblebundle.com/store/search?search=${encodeURIComponent(game)}`;

  const card = document.getElementById("rcard-" + mode);
  const titleEl = document.getElementById("rtitle-" + mode);
  const bodyEl  = document.getElementById("rbody-" + mode);

  if (titleEl) titleEl.textContent = game;
  if (bodyEl)  bodyEl.textContent  = body;

  // Set affiliate links
  const steamBtn = document.getElementById("rbtn-steam-" + mode);
  const gmgBtn   = document.getElementById("rbtn-gmg-" + mode);
  const hbBtn    = document.getElementById("rbtn-hb-" + mode);
  if (steamBtn) steamBtn.href = steamUrl;
  if (gmgBtn)   gmgBtn.href   = gmgUrl;
  if (hbBtn)    hbBtn.href    = hbUrl;

  // Show with animation
  const section = document.getElementById("res-" + mode);
  if (section) {
    section.classList.add("show");
    setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }
}

function hideResult(mode) {
  const section = document.getElementById("res-" + mode);
  if (section) section.classList.remove("show");
  const copyBtn = document.getElementById("copy-" + mode);
  if (copyBtn) { copyBtn.textContent = "Copy"; copyBtn.classList.remove("copied"); }
}

// ── COPY ──
async function copyResult(mode) {
  const title = document.getElementById("rtitle-" + mode)?.textContent || "";
  const body  = document.getElementById("rbody-" + mode)?.textContent || "";
  const text  = `🎮 ${title}\n\n${body}`;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById("copy-" + mode);
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2500);
    playTick();
  } catch {}
}

// ── LOADING STATE ──
function setLoading(mode, on) {
  const btn  = document.getElementById("btn-" + mode);
  const load = document.getElementById("load-" + mode);
  const txt  = document.getElementById("ltxt-" + mode);

  if (btn)  btn.disabled = on;
  if (load) load.classList.toggle("show", on);

  if (on) {
    startScanAnimation(mode);
    let i = 0;
    if (txt) txt.textContent = LOADING_MSGS[mode][0];
    loadingTimers[mode] = setInterval(() => {
      i = (i + 1) % LOADING_MSGS[mode].length;
      if (txt) txt.textContent = LOADING_MSGS[mode][i];
    }, 1600);
  } else {
    stopScanAnimation(mode);
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

// ── DAILY ENERGY DEPLETED ──
function showDepleted(mode) {
  const el = document.getElementById("err-" + mode);
  if (el) {
    el.innerHTML = `⚡ Daily energy depleted — you've used all 5 picks for today. Come back tomorrow, or <a href="https://buymeacoffee.com/YOUR_USERNAME" target="_blank" rel="noopener" style="color:var(--warm);text-decoration:underline">buy me a coffee</a> to support the site. ☕`;
    el.classList.add("show");
  }
}

// ── HOVER SOUND on interactive elements ──
function attachHoverSounds() {
  document.querySelectorAll(".mode-tab, .pill label, .btn-sm, .store, .bmc-btn").forEach(el => {
    el.addEventListener("mouseenter", () => playTick(), { passive: true });
  });
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  updateMeter();
  attachHoverSounds();

  // Attach ripple to all buttons
  document.querySelectorAll(".btn-gen, .btn-sm, .mode-tab").forEach(btn => {
    btn.addEventListener("click", createRipple);
  });
});
