/* =============================================================
   OPENTRAD — MAIN SCRIPT  v2
   Architecture: Triple-API Fallback + Web Speech + Multi-Theme
                + History + Favorites + i18n (FR/EN/EU)
                + Settings Modal + PWA + SpellCheck + Drag&Drop
                + OCR (pdf.js + Tesseract.js) + Keep Formatting
                + Accent Colors + Dark Mode for all themes
   APIs: 1) Google Translate (unofficial)
         2) MyMemory (api.mymemory.translated.net)
         3) LibreTranslate (libretranslate.de)
   Spell: LanguageTool (api.languagetool.org)
============================================================= */

"use strict";

/* ----------------------------------------------------------
   1. DOM REFERENCES
---------------------------------------------------------- */
const sourceText      = document.getElementById("sourceText");
const targetText      = document.getElementById("targetText");
const sourceLang      = document.getElementById("sourceLang");
const targetLang      = document.getElementById("targetLang");
const swapBtn         = document.getElementById("swapBtn");
const clearBtn        = document.getElementById("clearBtn");
const copyBtn         = document.getElementById("copyBtn");
const copyTooltip     = document.getElementById("copyTooltip");
const ttsSource       = document.getElementById("ttsSource");
const ttsTarget       = document.getElementById("ttsTarget");
const charCount       = document.getElementById("charCount");
const loadingOverlay  = document.getElementById("loadingOverlay");
const apiBadge        = document.getElementById("apiBadge");
const errorMsg        = document.getElementById("errorMsg");
const themeToggle     = document.getElementById("themeToggle");
const formatToggle    = document.getElementById("formatToggle");

// Connection toast (replaces the persistent header pill)
const connToast    = document.getElementById("connToast");
const connToastMsg = document.getElementById("connToastMsg");

// New buttons
const shareBtn         = document.getElementById("shareBtn");
const exportHistoryBtn = document.getElementById("exportHistoryBtn");
const focusBtn         = document.getElementById("focusBtn");
const focusCloseBtn    = document.getElementById("focusCloseBtn");
const fontSizeBtn      = document.getElementById("fontSizeBtn");
const favBtn           = document.getElementById("favBtn");

// History
const historyBtn      = document.getElementById("historyBtn");
const historyPanel    = document.getElementById("historyPanel");
const historyBackdrop = document.getElementById("historyBackdrop");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyList     = document.getElementById("historyList");
const historyEmpty    = document.getElementById("historyEmpty");

// Spell
const spellBtn        = document.getElementById("spellBtn");
const spellOverlay    = document.getElementById("spellOverlay");
const spellStatus     = document.getElementById("spellStatus");
const spellPanel      = document.getElementById("spellPanel");
const spellTooltip    = document.getElementById("spellTooltip");

// Drop / upload
const dropOverlay = document.getElementById("dropOverlay");
const dropZone    = document.getElementById("dropZone");
const uploadBtn   = document.getElementById("uploadBtn");
const fileInput   = document.getElementById("fileInput");
const ocrStatus   = document.getElementById("ocrStatus");

// PWA
const installBanner  = document.getElementById("installBanner");
const installBtn     = document.getElementById("installBtn");
const dismissInstall = document.getElementById("dismissInstall");

// Settings
const settingsBtn      = document.getElementById("settingsBtn");
const settingsModal    = document.getElementById("settingsModal");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const langOptions      = document.getElementById("langOptions");
const themeOptions     = document.getElementById("themeOptions");
const darkModeOptions  = document.getElementById("darkModeOptions");
const darkModeGroup    = document.getElementById("darkModeGroup");
const accentOptions    = document.getElementById("accentOptions");
const apiOptions       = document.getElementById("apiOptions");

// Text formatting / panel controls (wired below)
const boldBtn          = document.getElementById("boldBtn");
const underlineBtn     = document.getElementById("underlineBtn");
const panelSizeBtn     = document.getElementById("panelSizeBtn");
const fixAllBtn        = document.getElementById("fixAllBtn");

/* ----------------------------------------------------------
   2. STATE
---------------------------------------------------------- */
let debounceTimer      = null;
let isSpeaking         = false;
let spellEnabled       = true;
let spellDebounceTimer = null;
let spellErrors        = [];
let deferredInstall    = null;
let connToastTimer     = null;
let keepFormat         = false;

const DEBOUNCE_MS    = 500;
const SPELL_DEBOUNCE = 1000;
const MAX_CHARS      = 5000;
const HISTORY_KEY    = "opentrad-history";
const HISTORY_MAX    = 10;
const PREFS_KEY      = "opentrad-prefs";

/* ----------------------------------------------------------
   API COOLDOWN SYSTEM
   If an API returns 429 (rate limit) or 5xx errors, it is
   marked as unavailable for 5 minutes in localStorage to
   avoid wasting time on subsequent requests.
---------------------------------------------------------- */
const API_COOLDOWN_MS  = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_KEY     = "opentrad-api-cooldown";

function getApiCooldowns() {
  try { return JSON.parse(localStorage.getItem(COOLDOWN_KEY)) || {}; }
  catch { return {}; }
}

function setApiCooldown(api) {
  const cooldowns = getApiCooldowns();
  cooldowns[api]  = Date.now() + API_COOLDOWN_MS;
  try { localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns)); } catch { /* ignore */ }
}

function clearApiCooldown(api) {
  const cooldowns = getApiCooldowns();
  delete cooldowns[api];
  try { localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns)); } catch { /* ignore */ }
}

function isApiOnCooldown(api) {
  const cooldowns = getApiCooldowns();
  const until = cooldowns[api] || 0;
  if (Date.now() < until) return true;
  // Expired — clean up
  if (until) clearApiCooldown(api);
  return false;
}

/* ----------------------------------------------------------
   3. i18n — Internationalisation
   Supported: fr (French) · en (English) · eu (Basque/Euskara)
---------------------------------------------------------- */
// I18N and detectLang are loaded from i18n.js

/** Apply i18n strings to all [data-i18n] elements */
function applyI18n(lang) {
  const t = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (typeof t[key] === "string") el.textContent = t[key];
  });
  sourceText.placeholder = t.sourcePlaceholder;
  const hint = targetText.querySelector(".placeholder-hint");
  if (hint) hint.textContent = t.targetPlaceholder;
  document.documentElement.lang = lang;
}

/* ----------------------------------------------------------
   4. PREFERENCES — load / save
---------------------------------------------------------- */
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; }
  catch { return {}; }
}

function savePrefs(update) {
  const prefs = { ...loadPrefs(), ...update };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/* ----------------------------------------------------------
   5. THEME ENGINE
   themeStyle: "light"|"neuro"|"aurora"|"bento"|"paper"|"classic"
   darkMode:   "light"|"dark"|"auto"
   Aurora is always dark-ish — ignores darkMode for data-theme.
---------------------------------------------------------- */
const mq = window.matchMedia("(prefers-color-scheme: dark)");

/** Compute the actual data-theme attribute from style + mode */
function computeDataTheme(style, darkMode) {
  // "light" and "dark" legacy values map to glass style
  if (!style || style === "light" || style === "dark") {
    const isDark = darkMode === "dark" || (darkMode === "auto" && mq.matches);
    return isDark ? "dark" : "light";
  }
  if (style === "aurora") return "aurora"; // Always dark-ish, no variant
  const isDark = darkMode === "dark" || (darkMode === "auto" && mq.matches);
  return isDark ? `${style}-dark` : style;
}

/** Apply computed theme to document */
function applyTheme(style, darkMode) {
  const theme = computeDataTheme(style, darkMode);
  document.documentElement.setAttribute("data-theme", theme);
}

/** Initialise theme from saved prefs */
function initTheme() {
  const prefs    = loadPrefs();
  const style    = prefs.themeStyle || "light";
  const darkMode = prefs.darkMode   || "light";
  const accent   = prefs.accent     || "";
  applyTheme(style, darkMode);
  applyAccent(accent);
}

/** Apply accent color via data-accent attribute */
function applyAccent(accent) {
  if (accent) {
    document.documentElement.setAttribute("data-accent", accent);
  } else {
    document.documentElement.removeAttribute("data-accent");
  }
}

/** Header sun/moon toggle — toggles glass or current theme dark mode */
themeToggle.addEventListener("click", () => {
  const prefs    = loadPrefs();
  const style    = prefs.themeStyle || "light";
  const current  = document.documentElement.getAttribute("data-theme");
  const isDark   = current.endsWith("-dark") || current === "dark" || current === "aurora";
  const darkMode = isDark ? "light" : "dark";
  savePrefs({ darkMode });
  applyTheme(style, darkMode);
  syncSettingsUI();
});

/** Watch system preference for auto mode */
mq.addEventListener("change", () => {
  const prefs = loadPrefs();
  if (prefs.darkMode === "auto") {
    applyTheme(prefs.themeStyle || "light", "auto");
  }
});

/* ----------------------------------------------------------
   6. SETTINGS MODAL
---------------------------------------------------------- */
function openSettings() {
  settingsModal.classList.add("open");
  settingsModal.setAttribute("aria-hidden", "false");
  settingsBackdrop.classList.add("visible");
  document.body.style.overflow = "hidden";
  closeSettingsBtn.focus();
}

function closeSettings() {
  settingsModal.classList.remove("open");
  settingsModal.setAttribute("aria-hidden", "true");
  settingsBackdrop.classList.remove("visible");
  document.body.style.overflow = "";
  settingsBtn.focus();
}

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsBackdrop.addEventListener("click", closeSettings);

/** Sync all settings UI buttons to current prefs */
function syncSettingsUI() {
  const prefs      = loadPrefs();
  const themeStyle = prefs.themeStyle || "light";
  const darkMode   = prefs.darkMode   || "light";
  const lang       = prefs.lang       || detectLang();
  const accent     = prefs.accent     || "";

  // Language buttons
  langOptions.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Theme style buttons
  themeOptions.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeVal === themeStyle);
  });

  // Dark mode buttons — always visible; aurora ignores it but we still show it
  darkModeGroup.style.display = "";
  darkModeOptions.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.darkmode === darkMode);
  });

  // Accent buttons
  accentOptions.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.accent === accent);
  });

  // API buttons
  const api = prefs.api || "auto";
  apiOptions.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.api === api);
  });

  // Compare API
  const compareApi = prefs.compareApi || "off";
  document.querySelectorAll("#compareApiOptions .opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.compare === compareApi);
  });

  // Haptic
  const hapticPref = prefs.haptic !== "off" ? "on" : "off";
  document.querySelectorAll("#hapticOptions .opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.haptic === hapticPref);
  });

  // Auto time theme
  const timeTheme = prefs.autoTimeTheme || "off";
  document.querySelectorAll("#autoTimeThemeOptions .opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.timetheme === timeTheme);
  });

  // Hero banner
  const heroBanner = prefs.heroBanner || "show";
  document.querySelectorAll("#heroOptions .opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.hero === heroBanner);
  });
  const heroSection = document.getElementById("heroSection");
  if (heroSection) heroSection.classList.toggle("dismissed", heroBanner === "hide");

  // Rich copy
  const richcopy = prefs.richcopy || "off";
  document.querySelectorAll("#richCopyOptions .opt-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.richcopy === richcopy);
  });
}

/** Language picker */
langOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-lang]");
  if (!btn) return;
  savePrefs({ lang: btn.dataset.lang });
  applyI18n(btn.dataset.lang);
  syncSettingsUI();
});

/** Theme style picker */
themeOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-theme-val]");
  if (!btn) return;
  const style    = btn.dataset.themeVal;
  const darkMode = loadPrefs().darkMode || "light";
  savePrefs({ themeStyle: style });
  applyTheme(style, darkMode);
  syncSettingsUI();
});

/** Dark mode picker — now applies to all themes */
darkModeOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-darkmode]");
  if (!btn) return;
  const darkMode  = btn.dataset.darkmode;
  const style     = loadPrefs().themeStyle || "light";
  savePrefs({ darkMode });
  applyTheme(style, darkMode);
  syncSettingsUI();
});

/** Accent color picker */
accentOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-accent]");
  if (!btn) return;
  const accent = btn.dataset.accent;
  savePrefs({ accent });
  applyAccent(accent);
  syncSettingsUI();
});

/** Translation API picker */
apiOptions.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-api]");
  if (!btn) return;
  savePrefs({ api: btn.dataset.api });
  syncSettingsUI();
});

/** Compare API picker */
document.getElementById("compareApiOptions")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-compare]");
  if (!btn) return;
  savePrefs({ compareApi: btn.dataset.compare });
  syncSettingsUI();
});

/** Haptic picker */
document.getElementById("hapticOptions")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-haptic]");
  if (!btn) return;
  savePrefs({ haptic: btn.dataset.haptic });
  syncSettingsUI();
});

/** Auto time theme picker */
document.getElementById("autoTimeThemeOptions")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-timetheme]");
  if (!btn) return;
  savePrefs({ autoTimeTheme: btn.dataset.timetheme });
  syncSettingsUI();
  if (btn.dataset.timetheme === "on") applyTimeBasedTheme();
});

/** Hero banner picker */
document.getElementById("heroOptions")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-hero]");
  if (!btn) return;
  savePrefs({ heroBanner: btn.dataset.hero });
  syncSettingsUI();
});

/** Rich copy picker */
document.getElementById("richCopyOptions")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt-btn[data-richcopy]");
  if (!btn) return;
  savePrefs({ richcopy: btn.dataset.richcopy });
  syncSettingsUI();
});

/* ----------------------------------------------------------
   7. CONNECTION STATUS — Ping-based toast system
   Replaces the permanent header pill.
   - On load: ping, show "Connected" for 3s (or offline state).
   - On network event: re-ping to verify; update toast.
---------------------------------------------------------- */

/** Real ping via HEAD request to favicon.ico — more reliable than navigator.onLine */
async function pingConnection() {
  try {
    const res = await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
    return res.ok || res.type === "opaque";
  } catch {
    return false;
  }
}

/**
 * Show connection toast.
 * @param {"connected"|"offline"} type
 * @param {string} msg
 * @param {boolean} autohide — true = auto-dismiss after 3s
 */
function showConnToast(type, msg, autohide = false) {
  connToast.className = `conn-toast conn-toast--${type} show`;
  connToast.setAttribute("aria-hidden", "false");
  connToastMsg.textContent = msg;
  clearTimeout(connToastTimer);
  if (autohide) {
    connToastTimer = setTimeout(() => {
      connToast.classList.remove("show");
      connToast.setAttribute("aria-hidden", "true");
    }, 3000);
  }
}

/** Get translated strings for connection messages */
function getConnStrings() {
  const prefs = loadPrefs();
  return I18N[prefs.lang || detectLang()] || I18N.en;
}

/** Called on page load */
async function checkInitialConnection() {
  const t  = getConnStrings();
  const ok = await pingConnection();
  if (ok) showConnToast("connected", t.connected, true);
  // offline pill supprimée
}

window.addEventListener("offline", () => {
  // pillule hors-ligne supprimée — pas de notification
});

window.addEventListener("online", async () => {
  const t  = getConnStrings();
  const ok = await pingConnection();
  if (ok) showConnToast("connected", t.connRestored, true);
});

/* ----------------------------------------------------------
   8. CHARACTER COUNTER
---------------------------------------------------------- */
function updateCharCount() {
  const len = sourceText.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.classList.remove("near-limit", "at-limit");
  if (len >= MAX_CHARS)             charCount.classList.add("at-limit");
  else if (len >= MAX_CHARS * 0.85) charCount.classList.add("near-limit");
  // Clear button contextuel : visible seulement si texte présent
  clearBtn.classList.toggle("visible", len > 0);
}

/* ----------------------------------------------------------
   9. LOADING / ERROR / BADGE HELPERS
---------------------------------------------------------- */
const translProgress = document.getElementById("translProgress");
let   translProgressTimer = null;

function startTranslProgress() {
  if (!translProgress) return;
  clearTimeout(translProgressTimer);
  translProgress.style.transition = "none";
  translProgress.style.width = "0%";
  translProgress.classList.add("active");
  // Force reflow
  void translProgress.offsetWidth;
  translProgress.style.transition = "width 0.4s ease";
  translProgress.style.width = "70%";
}

function finishTranslProgress() {
  if (!translProgress) return;
  clearTimeout(translProgressTimer);
  translProgress.style.transition = "width 0.2s ease";
  translProgress.style.width = "100%";
  translProgressTimer = setTimeout(() => {
    translProgress.classList.remove("active");
    translProgress.style.width = "0%";
  }, 250);
}

function showLoading() {
  loadingOverlay.classList.add("active");
  loadingOverlay.setAttribute("aria-hidden", "false");
  startTranslProgress();
  // Skeleton screen: replace target content with animated skeleton lines
  targetText.innerHTML = `
    <span class="skeleton-wrap" aria-hidden="true">
      <span class="skeleton-line" style="width:88%"></span>
      <span class="skeleton-line" style="width:72%"></span>
      <span class="skeleton-line" style="width:60%"></span>
    </span>`;
  clearError(); hideBadge();
}
function hideLoading() {
  loadingOverlay.classList.remove("active");
  loadingOverlay.setAttribute("aria-hidden", "true");
  finishTranslProgress();
  // Remove skeleton if still present (will be replaced by result or placeholder)
  const sk = targetText.querySelector(".skeleton-wrap");
  if (sk) {
    const prefs = loadPrefs();
    const t     = I18N[prefs.lang || detectLang()] || I18N.en;
    targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
  }
}
function showError(msg, withRetry = false) {
  if (withRetry) {
    errorMsg.innerHTML = `${escapeHtml(msg)}\u00a0<button class="retry-btn" id="retryTranslBtn">&#8635; R\u00e9essayer</button>`;
    const retryBtn = document.getElementById("retryTranslBtn");
    if (retryBtn) retryBtn.addEventListener("click", () => { clearError(); translate(); });
  } else {
    errorMsg.textContent = msg;
  }
}
function clearError()   { errorMsg.textContent = ""; }

function showBadge(api) {
  const labels  = { google: "✦ Google", mymemory: "✦ MyMemory", libre: "✦ LibreTranslate" };
  const classes = { google: "badge-google", mymemory: "badge-mymemory", libre: "badge-libre" };
  apiBadge.className = "api-badge";
  apiBadge.innerHTML = labels[api] || api;
  apiBadge.classList.add(classes[api] || "", "visible");
}
function hideBadge() { apiBadge.classList.remove("visible"); }

/* ----------------------------------------------------------
   10. TRIPLE-API TRANSLATION ENGINE  (unchanged — do not break)
---------------------------------------------------------- */
async function translateGoogle(text, from, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx`
            + `&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t`
            + `&q=${encodeURIComponent(text)}`;
  const res  = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    setApiCooldown("google");
    throw new Error(`Google API HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`Google API HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !data[0]) throw new Error("Google: unexpected response");
  const translated = data[0].filter(Boolean).map(c => c[0]).join("");
  if (!translated) throw new Error("Google: empty translation");
  clearApiCooldown("google"); // Success — reset any previous cooldown
  return translated;
}

async function translateMyMemory(text, from, to) {
  const langPair = `${from === "auto" ? "en" : from}|${to}`;
  const url = `https://api.mymemory.translated.net/get`
            + `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
  const res  = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    setApiCooldown("mymemory");
    throw new Error(`MyMemory HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  if (data.responseStatus === 429) {
    setApiCooldown("mymemory");
    throw new Error("MyMemory: quota exceeded");
  }
  if (data.responseStatus !== 200) throw new Error(`MyMemory: ${data.responseDetails || data.responseStatus}`);
  const translated = data.responseData?.translatedText;
  if (!translated) throw new Error("MyMemory: empty");
  clearApiCooldown("mymemory");
  return translated;
}

async function translateLibre(text, from, to) {
  // Multiple public mirrors — tried in order until one responds
  const LIBRE_MIRRORS = [
    "https://translate.argosopentech.com/translate",
    "https://libretranslate.pussthecat.org/translate",
    "https://translate.terraprint.co/translate",
  ];
  const body = JSON.stringify({ q: text, source: from === "auto" ? "auto" : from, target: to, format: "text" });
  for (const url of LIBRE_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.translatedText) {
        clearApiCooldown("libre");
        return data.translatedText;
      }
    } catch { /* try next mirror */ }
  }
  setApiCooldown("libre");
  throw new Error("LibreTranslate: all mirrors failed");
}

async function translate() {
  const text = sourceText.value.trim();
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;

  if (!text) {
    targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
    hideBadge(); clearError();
    return;
  }

  const from = sourceLang.value;
  const to   = targetLang.value;

  if (from !== "auto" && from === to) {
    targetText.textContent = text;
    hideBadge();
    return;
  }

  showLoading();

  try {
    let result = null;
    let apiUsed = null;
    const selectedApi = prefs.api || "auto";

    if ((selectedApi === "auto" || selectedApi === "google") && !isApiOnCooldown("google")) {
      try   { result = await translateGoogle(text, from, to);    apiUsed = "google"; }
      catch { /* fallthrough */ }
    }

    if (!result && (selectedApi === "auto" || selectedApi === "mymemory") && !isApiOnCooldown("mymemory")) {
      try   { result = await translateMyMemory(text, from, to); apiUsed = "mymemory"; }
      catch { /* fallthrough */ }
    }

    if (!result && (selectedApi === "auto" || selectedApi === "libre") && !isApiOnCooldown("libre")) {
      try   { result = await translateLibre(text, from, to);   apiUsed = "libre"; }
      catch { /* fallthrough */ }
    }

    // Chunked translation for large texts
    if (!result && text.length > 1500) {
      const chunked = await translateChunked(text, from, to, prefs);
      if (chunked.result) { result = chunked.result; apiUsed = chunked.apiUsed; }
    }

    if (result) {
      targetText.textContent = result;
      showBadge(apiUsed);
      saveToHistory(text, result, from, to);
      updateFavBtn();
      // API comparison mode
      if (prefs.compareApi === "on") {
        showApiComparison(text, from, to, result, apiUsed);
      }
    } else {
      targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
      showError(t.allApiFailed, true);
      resetFavBtn();
    }
  } finally {
    hideLoading();
  }
}

/* ----------------------------------------------------------
   11. DEBOUNCED INPUT
---------------------------------------------------------- */
sourceText.addEventListener("input", () => {
  updateCharCount();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(translate, DEBOUNCE_MS);

  if (spellEnabled) {
    clearTimeout(spellDebounceTimer);
    spellStatus.textContent = "";
    spellDebounceTimer = setTimeout(() => checkSpelling(sourceText.value), SPELL_DEBOUNCE);
  }
});

sourceLang.addEventListener("change", () => {
  translate();
  if (spellEnabled && sourceText.value.trim()) checkSpelling(sourceText.value);
});
targetLang.addEventListener("change", translate);

/* ----------------------------------------------------------
   12. SWAP LANGUAGES
   Animation: spin360 applies on both icon variants (CSS handles direction via SVG)
---------------------------------------------------------- */
swapBtn.addEventListener("click", () => {
  const fromVal = sourceLang.value;
  const toVal   = targetLang.value;

  if (fromVal === "auto") {
    sourceLang.value = toVal;
    targetLang.value = "en";
  } else {
    sourceLang.value = toVal;
    targetLang.value = fromVal;
  }

  const currentTranslation = targetText.textContent.trim();
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  if (currentTranslation && currentTranslation !== t.targetPlaceholder) {
    sourceText.value = currentTranslation;
    targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
    updateCharCount();
  }

  swapBtn.classList.add("rotating");
  swapBtn.addEventListener("animationend", () => swapBtn.classList.remove("rotating"), { once: true });

  // Haptic feedback
  haptic(30);

  clearTimeout(debounceTimer);
  translate();
  // Sync custom selects if present
  syncCustomSelect(sourceLang);
  syncCustomSelect(targetLang);
});

/* ----------------------------------------------------------
   13. CLEAR BUTTON
---------------------------------------------------------- */
clearBtn.addEventListener("click", () => {
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  sourceText.value = "";
  targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
  updateCharCount(); clearError(); hideBadge();
  clearTimeout(debounceTimer);
  clearSpellOverlay();
  spellStatus.textContent = "";
  spellStatus.classList.remove("has-errors");
  spellStatus.setAttribute("aria-expanded", "false");
  resetFavBtn();
  sourceText.focus();
});

/* ----------------------------------------------------------
   14. COPY TO CLIPBOARD
---------------------------------------------------------- */
const COPY_ICON_SVG  = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`;
const CHECK_ICON_SVG = `<polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/>`;

copyBtn.addEventListener("click", async () => {
  const text = targetText.textContent.trim();
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  if (!text || text === t.targetPlaceholder) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0;";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  }

  // Visual feedback: swap to checkmark + green flash
  const svg = copyBtn.querySelector("svg");
  if (svg) svg.innerHTML = CHECK_ICON_SVG;
  copyBtn.classList.add("copy-success");
  copyTooltip.classList.add("visible");

  // Haptic feedback
  haptic(15);

  setTimeout(() => {
    copyTooltip.classList.remove("visible");
    copyBtn.classList.remove("copy-success");
    if (svg) svg.innerHTML = COPY_ICON_SVG;
  }, 1800);
});

/* ----------------------------------------------------------
   15. KEEP FORMATTING TOGGLE
   Preserves line breaks and whitespace in the target panel.
---------------------------------------------------------- */
formatToggle.addEventListener("click", () => {
  keepFormat = !keepFormat;
  formatToggle.classList.toggle("active", keepFormat);
  formatToggle.setAttribute("aria-pressed", String(keepFormat));
  targetText.classList.toggle("keep-format", keepFormat);
});

/* ----------------------------------------------------------
   15b. TEXT FORMATTING — Bold / Underline on target output
---------------------------------------------------------- */
boldBtn.addEventListener("click", () => {
  const active = boldBtn.getAttribute("aria-pressed") === "true";
  boldBtn.setAttribute("aria-pressed", String(!active));
  boldBtn.classList.toggle("active", !active);
  targetText.classList.toggle("fmt-bold", !active);
});

underlineBtn.addEventListener("click", () => {
  const active = underlineBtn.getAttribute("aria-pressed") === "true";
  underlineBtn.setAttribute("aria-pressed", String(!active));
  underlineBtn.classList.toggle("active", !active);
  targetText.classList.toggle("fmt-underline", !active);
});

/* ----------------------------------------------------------
   16. TEXT-TO-SPEECH
---------------------------------------------------------- */
const LANG_TO_LOCALE = {
  auto:"en-US", en:"en-US", fr:"fr-FR", es:"es-ES", de:"de-DE",
  it:"it-IT",   pt:"pt-PT", ru:"ru-RU", zh:"zh-CN", ja:"ja-JP",
  ko:"ko-KR",   ar:"ar-SA", hi:"hi-IN", nl:"nl-NL", pl:"pl-PL",
  sv:"sv-SE",   tr:"tr-TR", uk:"uk-UA", vi:"vi-VN", id:"id-ID",
};

function speak(text, langCode, btn) {
  if (!("speechSynthesis" in window)) { alert("TTS non supporté dans ce navigateur."); return; }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".tts-btn").forEach(b => b.classList.remove("speaking"));
    isSpeaking = false;
    return;
  }
  if (!text.trim()) return;
  const utterance  = new SpeechSynthesisUtterance(text);
  utterance.lang   = LANG_TO_LOCALE[langCode] || langCode;
  utterance.rate   = 0.95;
  btn.classList.add("speaking");
  isSpeaking = true;
  utterance.onend  = utterance.onerror = () => { btn.classList.remove("speaking"); isSpeaking = false; };
  window.speechSynthesis.speak(utterance);
}

ttsSource.addEventListener("click", () => speak(sourceText.value, sourceLang.value, ttsSource));
ttsTarget.addEventListener("click", () => speak(targetText.textContent, targetLang.value, ttsTarget));

/* ----------------------------------------------------------
   DICTÉE VOCALE (STT) — source panel mic for desktop
   Uses Web Speech API SpeechRecognition to write into sourceText
---------------------------------------------------------- */
const sttBtn = document.getElementById("sttBtn");
let sttRecognition = null;
let sttActive = false;

if (sttBtn) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    sttBtn.style.display = "none"; // hide if not supported
  } else {
    sttBtn.addEventListener("click", () => {
      if (sttActive) {
        sttRecognition?.stop();
        return;
      }
      sttRecognition = new SpeechRec();
      sttRecognition.lang = sourceLang.value === "auto" ? "fr-FR"
        : (sourceLang.value + "-" + sourceLang.value.toUpperCase());
      sttRecognition.interimResults = true;
      sttRecognition.continuous = false;
      sttActive = true;
      sttBtn.classList.add("stt-active");
      sttBtn.title = "Dictée en cours… (cliquer pour arrêter)";
      haptic(20);

      const savedText = sourceText.value;
      let interimResult = "";

      sttRecognition.onresult = (e) => {
        interimResult = "";
        let final = savedText;
        for (const res of e.results) {
          if (res.isFinal) {
            final += (final && !final.endsWith(" ") ? " " : "") + res[0].transcript;
          } else {
            interimResult = res[0].transcript;
          }
        }
        sourceText.value = final + (interimResult ? " " + interimResult : "");
        updateCharCount();
      };

      sttRecognition.onend = () => {
        sttActive = false;
        sttBtn.classList.remove("stt-active");
        sttBtn.title = "Dicter (reconnaissance vocale)";
        // Trigger translation with final text
        clearTimeout(debounceTimer);
        translate();
      };

      sttRecognition.onerror = (e) => {
        sttActive = false;
        sttBtn.classList.remove("stt-active");
        sttBtn.title = "Dicter (reconnaissance vocale)";
        if (e.error !== "aborted") showError("Dictée : " + e.error);
      };

      sttRecognition.start();
    });
  }
}

/* ----------------------------------------------------------
   17. KEYBOARD SHORTCUTS  (power-user shortcuts)
---------------------------------------------------------- */

// ── New DOM refs ──
const shortcutToast  = document.getElementById("shortcutToast");

// ── Shortcut feedback toast ──
let shortcutToastTimer = null;
function showShortcutToast(msg) {
  shortcutToast.textContent = msg;
  shortcutToast.classList.add("show");
  clearTimeout(shortcutToastTimer);
  shortcutToastTimer = setTimeout(() => shortcutToast.classList.remove("show"), 1600);
}

// ── Ctrl+Enter on sourceText (existing, keep) ──
sourceText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    clearTimeout(debounceTimer);
    translate();
    showShortcutToast("⟳ Translation started");
  }
});

// ── Global shortcuts ──
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  const inInput = tag === "TEXTAREA" || tag === "INPUT";
  const mod = e.ctrlKey || e.metaKey;

  // Esc — close any open panel
  if (e.key === "Escape") {
    if (historyPanel.classList.contains("open"))  { closeHistory();  return; }
    if (settingsModal.classList.contains("open")) { closeSettings(); return; }
    if (document.body.classList.contains("focus-mode")) toggleFocusMode();
    return;
  }

  // ? — shortcuts help (when not typing)
  if (e.key === "?" && !mod && !inInput) {
    e.preventDefault();
    openSettings();
    // Scroll to shortcuts section after a short delay
    setTimeout(() => {
      const el = document.querySelector(".kb-settings-grid");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return;
  }

  if (!mod) return;

  // Ctrl+Enter — translate
  if (e.key === "Enter") {
    e.preventDefault();
    clearTimeout(debounceTimer);
    translate();
    showShortcutToast("⟳ Translation started");
    return;
  }

  // Ctrl+S — swap languages
  if (e.key === "s" && !e.shiftKey) {
    e.preventDefault();
    swapBtn.click();
    showShortcutToast("⇄ Langues inversées");
    return;
  }

  // Ctrl+L — clear text
  if (e.key === "l") {
    e.preventDefault();
    clearBtn.click();
    showShortcutToast("✕ Texte effacé");
    return;
  }

  // Ctrl+Shift+C — copy translation
  if (e.key === "c" && e.shiftKey) {
    e.preventDefault();
    copyBtn.click();
    return;
  }

  // Ctrl+H — history
  if (e.key === "h") {
    e.preventDefault();
    if (historyPanel.classList.contains("open")) closeHistory();
    else openHistory();
    return;
  }

  // Ctrl+, — settings
  if (e.key === ",") {
    e.preventDefault();
    if (settingsModal.classList.contains("open")) closeSettings();
    else openSettings();
    return;
  }

  // Ctrl+K — focus mode
  if (e.key === "k") {
    e.preventDefault();
    focusBtn.click();
    showShortcutToast("◈ Mode concentration");
    return;
  }
  // Ctrl+B — bold output (when not typing in source)
  if (e.key === "b" && !inInput) {
    e.preventDefault();
    boldBtn.click();
    return;
  }

  // Ctrl+U — underline output (when not typing in source)
  if (e.key === "u" && !inInput) {
    e.preventDefault();
    underlineBtn.click();
    return;
  }
});

/* ----------------------------------------------------------
   18b. HISTORY TABS — Recent / Favorites
---------------------------------------------------------- */
let activeHistoryTab = "history"; // "history" | "favorites"

function initHistoryTabs() {
  const tabs = document.querySelectorAll(".history-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeHistoryTab = tab.dataset.tab;
      renderHistory();
    });
  });
}


function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
  catch { /* storage full */ }
}

function saveToHistory(source, target, fromLang, toLang) {
  if (!source.trim() || !target.trim()) return;
  const history = loadHistory();
  if (history.length > 0) {
    const last = history[0];
    if (last.source === source && last.target === target) return;
  }
  const entry = {
    id: Date.now(),
    source: source.slice(0, 300),
    target: target.slice(0, 300),
    fromLang, toLang,
    date: new Date().toISOString(),
    starred: false,
  };
  history.unshift(entry);
  if (history.length > HISTORY_MAX) {
    history.splice(HISTORY_MAX);
  }
  saveHistory(history);
}

function toggleStar(id) {
  const history = loadHistory();
  const item = history.find(h => h.id === id);
  if (item) { item.starred = !item.starred; saveHistory(history); renderHistory(); }
}

/* ── Fav button (target panel footer) ── */
function updateFavBtn() {
  const history = loadHistory();
  if (!history.length) { resetFavBtn(); return; }
  const last = history[0];
  favBtn.disabled = false;
  favBtn.classList.toggle("starred", !!last.starred);
  favBtn.setAttribute("aria-pressed", String(!!last.starred));
  favBtn.title = last.starred ? "Retirer des favoris" : "Ajouter aux favoris";
}

function resetFavBtn() {
  favBtn.disabled = true;
  favBtn.classList.remove("starred");
  favBtn.setAttribute("aria-pressed", "false");
  favBtn.title = "Ajouter aux favoris";
}

favBtn.addEventListener("click", () => {
  const history = loadHistory();
  if (!history.length) return;
  toggleStar(history[0].id);
  updateFavBtn();
});

function timeAgo(iso) {
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  const diff  = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)         return t.justNow;
  const m = Math.floor(s / 60);
  if (m < 60)         return t.minutesAgo(m);
  const h = Math.floor(m / 60);
  if (h < 24)         return t.hoursAgo(h);
  return t.daysAgo(Math.floor(h / 24));
}

function langName(code) {
  const opt = document.querySelector(`#sourceLang option[value="${code}"]`)
           || document.querySelector(`#targetLang option[value="${code}"]`);
  return opt ? opt.textContent.replace(/^[^\s]+ /, "") : code.toUpperCase();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";

  const prefs = loadPrefs();
  const t = I18N[prefs.lang || detectLang()] || I18N.en;

  // Filter by active tab
  let items = history;
  if (activeHistoryTab === "favorites") {
    items = history.filter(h => h.starred);
    if (items.length === 0) {
      historyEmpty.textContent = t.favEmpty || "Aucun favori enregistré.";
      historyEmpty.classList.add("visible");
      return;
    }
  } else {
    if (history.length === 0) {
      historyEmpty.textContent = t.historyEmpty;
      historyEmpty.classList.add("visible");
      return;
    }
    // Sort: starred first
    items = [...history].sort((a, b) => {
      if (a.starred === b.starred) return 0;
      return a.starred ? -1 : 1;
    });
  }

  historyEmpty.classList.remove("visible");

  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "history-item";
    li.style.animationDelay = `${idx * 40}ms`;
    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-label", `Recharger : ${item.source}`);
    li.innerHTML = `
      <div class="history-item-top">
        <div style="min-width:0;flex:1">
          <div class="history-langs">
            <span>${langName(item.fromLang)}</span>
            <span class="arrow">→</span>
            <span>${langName(item.toLang)}</span>
          </div>
          <div class="history-source">${escapeHtml(item.source)}</div>
          <div class="history-target">${escapeHtml(item.target)}</div>
          <div class="history-time">${timeAgo(item.date)}</div>
        </div>
        <div class="history-item-actions">
          <button class="star-btn ${item.starred ? "starred" : ""}" data-id="${item.id}"
            title="${item.starred ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="Favori">
            ${item.starred ? "★" : "☆"}
          </button>
        </div>
      </div>
    `;
    const starButton = li.querySelector(".star-btn");
    starButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleStar(item.id);
    });

    const restore = () => {
      sourceText.value       = item.source;
      sourceLang.value       = item.fromLang;
      targetLang.value       = item.toLang;
      targetText.textContent = item.target;
      updateCharCount();
      closeHistory();
    };
    li.addEventListener("click",   (e) => { if (!e.target.closest(".star-btn")) restore(); });
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") restore(); });

    historyList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openHistory() {
  renderHistory();
  historyPanel.classList.add("open");
  historyPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("history-open");
  closeHistoryBtn.focus();
}

function closeHistory() {
  historyPanel.classList.remove("open");
  historyPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("history-open");
  historyBtn.focus();
}

historyBtn.addEventListener("click", openHistory);
closeHistoryBtn.addEventListener("click", closeHistory);
historyBackdrop.addEventListener("click", closeHistory);

clearHistoryBtn.addEventListener("click", () => {
  const history = loadHistory();
  saveHistory([]); // clear all history
  renderHistory();
});

/* ----------------------------------------------------------
   19. SPELL CHECK — LanguageTool API
---------------------------------------------------------- */
spellBtn.addEventListener("click", () => {
  spellEnabled = !spellEnabled;
  spellBtn.classList.toggle("active", spellEnabled);
  if (spellEnabled) {
    if (sourceText.value.trim()) checkSpelling(sourceText.value);
  } else {
    clearSpellOverlay();
    spellStatus.textContent = "Correction désactivée";
    fixAllBtn.style.display = "none";
    setTimeout(() => { spellStatus.textContent = ""; }, 2000);
  }
});

/** Corriger tout — applique la première suggestion de chaque erreur en ordre inverse */
fixAllBtn.addEventListener("click", () => {
  if (!spellErrors.length) return;
  const sorted = [...spellErrors]
    .filter(e => e.suggestions.length > 0)
    .sort((a, b) => b.offset - a.offset);
  let text = sourceText.value;
  for (const err of sorted) {
    text = text.slice(0, err.offset) + err.suggestions[0] + text.slice(err.offset + err.length);
  }
  sourceText.value = text;
  updateCharCount();
  clearSpellOverlay();
  spellStatus.textContent = "";
  spellStatus.classList.remove("has-errors");
  fixAllBtn.style.display = "none";
  clearTimeout(spellDebounceTimer);
  spellDebounceTimer = setTimeout(() => checkSpelling(sourceText.value), 300);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(translate, DEBOUNCE_MS);
});

async function checkSpelling(text) {
  if (!text.trim() || !spellEnabled) return;
  spellStatus.textContent = "⟳ Vérification…";

  const lt_lang = mapToLTLang(sourceLang.value);
  const params  = new URLSearchParams();
  params.set("text", text);
  params.set("language", lt_lang);
  params.set("enabledOnly", "false");

  try {
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    params.toString(),
    });
    if (!res.ok) throw new Error(`LanguageTool HTTP ${res.status}`);
    const data = await res.json();

    spellErrors = (data.matches || []).map(m => ({
      offset:      m.offset,
      length:      m.length,
      message:     m.message,
      type:        m.rule?.issueType || "error",
      suggestions: (m.replacements || []).slice(0, 3).map(r => r.value),
    }));

    renderSpellOverlay(text, spellErrors);

    const errorCount = spellErrors.filter(e => e.type === "misspelling").length;
    const warnCount  = spellErrors.filter(e => e.type !== "misspelling").length;

    if (spellErrors.length === 0) {
      spellStatus.textContent = "✓ Aucune erreur";
      spellStatus.classList.remove("has-errors");
      spellPanel.innerHTML = "";
      spellPanel.setAttribute("aria-hidden", "true");
      spellStatus.setAttribute("aria-expanded", "false");
      fixAllBtn.style.display = "none";
      setTimeout(() => { spellStatus.textContent = ""; }, 3000);
    } else {
      const parts = [];
      if (errorCount > 0) parts.push(`${errorCount} faute${errorCount > 1 ? "s" : ""}`);
      if (warnCount  > 0) parts.push(`${warnCount} suggestion${warnCount > 1 ? "s" : ""}`);
      spellStatus.textContent = "⚠ " + parts.join(", ");
      spellStatus.classList.add("has-errors");
      renderSpellPanel(text, spellErrors);
      // Show "Corriger tout" only if at least one error has a suggestion
      const hasFixable = spellErrors.some(e => e.suggestions.length > 0);
      fixAllBtn.style.display = hasFixable ? "inline-flex" : "none";
    }
  } catch (err) {
    spellStatus.textContent = "";
    console.warn("[OpenTrad] LanguageTool error:", err.message);
    clearSpellOverlay();
  }
}

function mapToLTLang(code) {
  const map = {
    auto:"auto", en:"en-US", fr:"fr-FR", es:"es",
    de:"de-DE",  it:"it",    pt:"pt-PT", ru:"ru",
    nl:"nl",     pl:"pl-PL", sv:"sv",    uk:"uk-UA",
    zh:"auto",   ja:"auto",  ko:"auto",  ar:"auto",
    hi:"auto",   tr:"auto",  vi:"auto",  id:"auto",
  };
  return map[code] || "auto";
}

function renderSpellOverlay(text, errors) {
  if (!errors || errors.length === 0) { spellOverlay.innerHTML = ""; return; }

  let html   = "";
  let cursor = 0;
  const sorted = [...errors].sort((a, b) => a.offset - b.offset);

  for (const err of sorted) {
    if (err.offset < cursor) continue;
    html += escapeHtml(text.slice(cursor, err.offset));
    const word = text.slice(err.offset, err.offset + err.length);
    const cls  = err.type === "misspelling" ? "err-error"
               : err.type === "grammar"     ? "err-accord"
               : err.type === "style"       ? "err-style"
               :                              "err-warning";
    html += `<mark class="${cls}" data-err="${sorted.indexOf(err)}">${escapeHtml(word)}</mark>`;
    cursor = err.offset + err.length;
  }
  html += escapeHtml(text.slice(cursor));
  spellOverlay.innerHTML = html;

  spellOverlay.querySelectorAll("mark[data-err]").forEach(mark => {
    mark.addEventListener("mouseenter", (e) => showSpellTooltip(e, mark));
    mark.addEventListener("mouseleave", () => {
      if (!spellTooltip.classList.contains("interactive")) hideSpellTooltip();
    });
    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      showSpellTooltip(e, mark, true);
    });
  });
}

function showSpellTooltip(e, mark, interactive = false) {
  const idx    = parseInt(mark.dataset.err, 10);
  const sorted = [...spellErrors].sort((a, b) => a.offset - b.offset);
  const err    = sorted[idx];
  if (!err) return;
  let html = `<strong>${escapeHtml(err.message)}</strong>`;
  if (err.suggestions.length > 0) {
    if (interactive) {
      html += `<div class="spell-suggestions">`;
      err.suggestions.forEach(s => {
        html += `<button class="spell-suggestion" data-offset="${err.offset}" data-length="${err.length}" data-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
      });
      html += `</div>`;
    } else {
      html += `<br><span style="color:var(--accent-3)">→ ${err.suggestions.join(" · ")}</span>`;
    }
  }
  spellTooltip.innerHTML = html;
  spellTooltip.classList.toggle("interactive", interactive);
  spellTooltip.classList.add("visible");
}

function hideSpellTooltip() { spellTooltip.classList.remove("visible", "interactive"); }
function clearSpellOverlay() {
  spellOverlay.innerHTML = "";
  spellErrors = [];
  spellPanel.innerHTML = "";
  spellPanel.setAttribute("aria-hidden", "true");
  if (spellStatus) spellStatus.setAttribute("aria-expanded", "false");
}

function renderSpellPanel(text, errors) {
  if (!errors || errors.length === 0) {
    spellPanel.innerHTML = "";
    spellPanel.setAttribute("aria-hidden", "true");
    return;
  }
  const sorted = [...errors].sort((a, b) => a.offset - b.offset);
  let html = `<ul class="spell-panel-list">`;
  sorted.forEach((err, idx) => {
    const word = escapeHtml(text.slice(err.offset, err.offset + err.length));
    const cls  = err.type === "misspelling" ? "spe-error"
               : err.type === "grammar"     ? "spe-accord"
               : err.type === "style"       ? "spe-style"
               :                              "spe-warn";
    const suggestions = err.suggestions.map(s =>
      `<button class="spell-fix-btn" data-offset="${err.offset}" data-length="${err.length}" data-value="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join("");
    html += `<li class="spell-panel-item">
      <span class="spe-badge ${cls}">${word}</span>
      <span class="spe-msg">${escapeHtml(err.message)}</span>
      ${suggestions ? `<span class="spe-fixes">${suggestions}</span>` : ""}
    </li>`;
  });
  html += `</ul>`;
  spellPanel.innerHTML = html;

  // Toggle visibility based on current aria state
  const isOpen = spellStatus.getAttribute("aria-expanded") === "true";
  spellPanel.setAttribute("aria-hidden", String(!isOpen));
  spellPanel.classList.toggle("open", isOpen);

  // Fix buttons
  spellPanel.querySelectorAll(".spell-fix-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const offset = parseInt(btn.dataset.offset, 10);
      const length = parseInt(btn.dataset.length, 10);
      const value  = btn.dataset.value;
      const t      = sourceText.value;
      sourceText.value = t.slice(0, offset) + value + t.slice(offset + length);
      updateCharCount();
      clearSpellOverlay();
      spellStatus.textContent = "";
      clearTimeout(spellDebounceTimer);
      spellDebounceTimer = setTimeout(() => checkSpelling(sourceText.value), 300);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(translate, DEBOUNCE_MS);
    });
  });
}

// Toggle spell panel on spellStatus click
spellStatus.addEventListener("click", () => {
  if (!spellStatus.classList.contains("has-errors")) return;
  const isOpen = spellStatus.getAttribute("aria-expanded") === "true";
  spellStatus.setAttribute("aria-expanded", String(!isOpen));
  spellPanel.setAttribute("aria-hidden", String(isOpen));
  spellPanel.classList.toggle("open", !isOpen);
});

// Sync spell overlay scroll with textarea
sourceText.addEventListener("scroll", () => {
  spellOverlay.scrollTop = sourceText.scrollTop;
});

// Apply correction on suggestion click
spellTooltip.addEventListener("click", (e) => {
  const btn = e.target.closest(".spell-suggestion");
  if (!btn) return;
  const offset = parseInt(btn.dataset.offset, 10);
  const length = parseInt(btn.dataset.length, 10);
  const value  = btn.dataset.value;
  const text   = sourceText.value;
  sourceText.value = text.slice(0, offset) + value + text.slice(offset + length);
  updateCharCount();
  hideSpellTooltip();
  clearSpellOverlay();
  spellErrors = [];
  clearTimeout(spellDebounceTimer);
  spellDebounceTimer = setTimeout(() => checkSpelling(sourceText.value), 300);
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(translate, DEBOUNCE_MS);
});

// Close interactive tooltip on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".spell-tooltip") && !e.target.closest("mark")) {
    if (spellTooltip.classList.contains("interactive")) hideSpellTooltip();
  }
});

/* ----------------------------------------------------------
   20. DRAG & DROP — .txt / PDF / image support
---------------------------------------------------------- */
let dragCounter = 0;

document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  const hasFiles = e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  if (hasFiles) dropOverlay.classList.add("active");
});

document.addEventListener("dragleave", () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove("active"); }
});

document.addEventListener("dragover",  (e) => e.preventDefault());

document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("active");
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFileLoad(file);
});

uploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleFileLoad(file);
  fileInput.value = "";
});

/**
 * Route a dropped/selected file to the correct extraction method.
 * Supports: .txt, .pdf (via pdf.js), .jpg/.png/.webp (via Tesseract.js OCR)
 */
async function handleFileLoad(file) {
  const name = file.name.toLowerCase();
  const type = file.type;

  // Plain text
  if (type === "text/plain" || name.endsWith(".txt")) {
    return handleTextFile(file);
  }

  // PDF — requires pdf.js CDN
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return handlePdfFile(file);
  }

  // Images — requires Tesseract.js CDN
  if (type.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(name)) {
    return handleImageOcr(file);
  }

  showError("Format non supporté. Utilisez .txt, .pdf, .jpg ou .png");
}

function handleTextFile(file) {
  const MAX_FILE_SIZE = 20 * 1024; // 20 KB
  if (file.size > MAX_FILE_SIZE) {
    showError(`Fichier trop grand (max ${MAX_FILE_SIZE / 1024} Ko).`);
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result.slice(0, MAX_CHARS);
    loadTextIntoSource(content);
  };
  reader.onerror = () => showError("Impossible de lire le fichier.");
  reader.readAsText(file, "UTF-8");
}

/** Extract text from PDF using pdf.js */
async function handlePdfFile(file) {
  if (typeof pdfjsLib === "undefined") {
    showError("pdf.js non chargé. Vérifiez votre connexion internet.");
    return;
  }

  showOcrStatus(true);
  try {
    const arrayBuffer = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const pdf     = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let   allText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      allText += pageText + "\n";
    }

    loadTextIntoSource(allText.trim().slice(0, MAX_CHARS));
  } catch (err) {
    showError("Impossible d'extraire le texte du PDF.");
    console.warn("[OpenTrad] PDF extraction error:", err);
  } finally {
    showOcrStatus(false);
  }
}

/** Extract text from image using Tesseract.js */
async function handleImageOcr(file) {
  if (typeof Tesseract === "undefined") {
    showError("Tesseract.js non chargé. Vérifiez votre connexion internet.");
    return;
  }

  showOcrStatus(true);
  try {
    // Resolve current UI language for Tesseract (best-effort)
    const prefs = loadPrefs();
    const srcLang = sourceLang.value === "auto" ? "eng" : (sourceLang.value || "eng");
    const langMap = {
      fr:"fra", en:"eng", es:"spa", de:"deu", it:"ita", pt:"por",
      ru:"rus", zh:"chi_sim", ja:"jpn", ko:"kor", ar:"ara", nl:"nld",
      pl:"pol", sv:"swe", tr:"tur", uk:"ukr",
    };
    const ocrLang = langMap[srcLang] || "eng";

    const result = await Tesseract.recognize(file, ocrLang, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          ocrStatus.textContent = `OCR ${pct}%`;
        }
      }
    });

    loadTextIntoSource(result.data.text.trim().slice(0, MAX_CHARS));
  } catch (err) {
    showError("Impossible d'extraire le texte de l'image (OCR).");
    console.warn("[OpenTrad] OCR error:", err);
  } finally {
    showOcrStatus(false);
  }
}

/** Show/hide OCR progress indicator */
function showOcrStatus(active) {
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  ocrStatus.classList.toggle("visible", active);
  if (active) ocrStatus.textContent = t.ocrLoading;
  else        ocrStatus.textContent = "";
}

/** Load extracted text into source textarea and trigger translation */
function loadTextIntoSource(content) {
  if (!content) return;
  sourceText.value = content;
  updateCharCount();
  clearTimeout(debounceTimer);
  clearError();
  if (spellEnabled) checkSpelling(content);
  translate();
  sourceText.classList.add("file-loaded");
  setTimeout(() => sourceText.classList.remove("file-loaded"), 600);
}

/* ----------------------------------------------------------
   20b. WEB SHARE API
---------------------------------------------------------- */
shareBtn.addEventListener("click", async () => {
  const text  = targetText.textContent.trim();
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || detectLang()] || I18N.en;
  if (!text || text === t.targetPlaceholder) return;

  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch { /* user cancelled */ }
  } else {
    // Fallback: copy + show tooltip
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    copyTooltip.classList.add("visible");
    setTimeout(() => copyTooltip.classList.remove("visible"), 1800);
  }
});

/* ----------------------------------------------------------
   20c. EXPORT HISTORY
---------------------------------------------------------- */
/** Haptic feedback — respects user pref */
function haptic(ms = 30) {
  if (loadPrefs().haptic !== "off") navigator.vibrate?.(ms);
}

exportHistoryBtn.addEventListener("click", () => {
  const history = loadHistory();
  if (history.length === 0) return;
  const json    = JSON.stringify(history, null, 2);
  const blob    = new Blob([json], { type: "application/json" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href        = url;
  a.download    = `opentrad-history-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// CSV export
document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
  const history = loadHistory();
  if (history.length === 0) return;
  const header = ["id","date","fromLang","toLang","source","target","starred"];
  const rows   = history.map(h => header.map(k => {
    const v = String(h[k] ?? "");
    return `"${v.replace(/"/g,'\'\'')}"`;
  }).join(","));
  const csv  = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `opentrad-history-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ----------------------------------------------------------
   20d. FOCUS MODE
---------------------------------------------------------- */
function toggleFocusMode() {
  const active = document.body.classList.toggle("focus-mode");
  focusBtn.classList.toggle("active", active);
  focusBtn.setAttribute("aria-pressed", String(active));
}
focusBtn.addEventListener("click", toggleFocusMode);
focusCloseBtn.addEventListener("click", toggleFocusMode);

/* ----------------------------------------------------------
   20e. HERO DISMISS
---------------------------------------------------------- */
const heroSection = document.getElementById("heroSection");
if (heroSection) {
  heroSection.addEventListener("click", () => {
    heroSection.classList.add("dismissed");
    heroSection.setAttribute("aria-hidden", "true");
  });
}

/* ----------------------------------------------------------
   20f. FONT SIZE TOGGLE
---------------------------------------------------------- */
const FONT_SIZES = ["normal", "large", "xlarge"];
let fontSizeIndex = 0;

fontSizeBtn.addEventListener("click", () => {
  const panels = document.querySelectorAll(".translator-wrap");
  fontSizeIndex = (fontSizeIndex + 1) % FONT_SIZES.length;
  const size = FONT_SIZES[fontSizeIndex];
  document.documentElement.setAttribute("data-font-size", size);
  fontSizeBtn.setAttribute("data-size", size);
  fontSizeBtn.title = size === "normal"
    ? "Agrandir le texte"
    : size === "large"
      ? "Très grand"
      : "Taille normale";
});

/* ----------------------------------------------------------
   20g. PANEL SIZE TOGGLE — removed, button removed from UI
---------------------------------------------------------- */

/* ----------------------------------------------------------
   21. PWA — Service Worker + Install Prompt
---------------------------------------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg  => console.log("[OpenTrad] SW registered:", reg.scope))
      .catch(err => console.warn("[OpenTrad] SW registration failed:", err));
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (localStorage.getItem("opentrad-install-dismissed")) return;
  setTimeout(() => {
    installBanner.classList.add("show");
    installBanner.setAttribute("aria-hidden", "false");
  }, 3000);
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstall) return;
  installBanner.classList.remove("show");
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  console.log("[OpenTrad] Install outcome:", outcome);
  deferredInstall = null;
});

dismissInstall.addEventListener("click", () => {
  installBanner.classList.remove("show");
  localStorage.setItem("opentrad-install-dismissed", "1");
});

window.addEventListener("appinstalled", () => {
  installBanner.classList.remove("show");
  console.log("[OpenTrad] App installed successfully.");
});

/* ----------------------------------------------------------
   22. INITIALISATION
---------------------------------------------------------- */

/* ----------------------------------------------------------
   NEW FEATURES BLOCK
   - Chunked translation (large texts)
   - API comparison panel
   - Auto time-based theme
   - Pinned history clear guard
---------------------------------------------------------- */

/* ── Chunked translation ── */
async function translateChunked(text, from, to, prefs) {
  const CHUNK = 1000;
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK) {
    chunks.push(text.slice(i, i + CHUNK));
  }
  const parts = [];
  let apiUsed  = null;
  const selectedApi = prefs.api || "auto";

  for (const chunk of chunks) {
    let r = null;
    if ((selectedApi === "auto" || selectedApi === "google") && !isApiOnCooldown("google")) {
      try { r = await translateGoogle(chunk, from, to); apiUsed = "google"; } catch {}
    }
    if (!r && (selectedApi === "auto" || selectedApi === "mymemory") && !isApiOnCooldown("mymemory")) {
      try { r = await translateMyMemory(chunk, from, to); apiUsed = "mymemory"; } catch {}
    }
    if (!r && (selectedApi === "auto" || selectedApi === "libre") && !isApiOnCooldown("libre")) {
      try { r = await translateLibre(chunk, from, to); apiUsed = "libre"; } catch {}
    }
    if (!r) return { result: null, apiUsed: null }; // chunk failed — abort
    parts.push(r);
  }
  return { result: parts.join(" "), apiUsed };
}

/* ── API Comparison Panel ── */
const apiComparePanel    = document.getElementById("apiComparePanel");
const apiCompareBody     = document.getElementById("apiCompareBody");
const apiComparePanelClose = document.getElementById("apiComparePanelClose");

if (apiComparePanelClose) apiComparePanelClose.addEventListener("click", closeApiCompare);

function closeApiCompare() {
  apiComparePanel?.classList.remove("open");
  apiComparePanel?.setAttribute("aria-hidden", "true");
}

async function showApiComparison(text, from, to, primaryResult, primaryApi) {
  if (!apiComparePanel || !apiCompareBody) return;
  const apis = [
    { key: "google",   fn: translateGoogle,   label: "✦ Google" },
    { key: "mymemory", fn: translateMyMemory,  label: "✦ MyMemory" },
    { key: "libre",    fn: translateLibre,     label: "✦ LibreTranslate" },
  ];

  apiCompareBody.innerHTML = '<p class="compare-loading">Interrogation des sources…</p>';
  apiComparePanel.classList.add("open");
  apiComparePanel.setAttribute("aria-hidden", "false");
  // Scroll inline panel into view
  setTimeout(() => apiComparePanel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);

  const results = await Promise.allSettled(
    apis.map(a => a.fn(text, from, to).then(r => ({ key: a.key, label: a.label, stars: a.stars, result: r })))
  );

  apiCompareBody.innerHTML = "";
  results.forEach((r, i) => {
    const api  = apis[i];
    const ok   = r.status === "fulfilled";
    const txt  = ok ? r.value.result : null;
    const isPrimary = api.key === primaryApi;
    const div  = document.createElement("div");
    div.className = "compare-row" + (isPrimary ? " compare-primary" : "") + (ok ? "" : " compare-error");
    div.innerHTML = `
      <div class="compare-row-header">
        <span class="compare-label">${api.label}</span>
        <span class="compare-stars" title="Qualité estimée">${api.stars}</span>
        ${isPrimary ? '<span class="compare-used-badge">Utilisé</span>' : ""}
        <button class="compare-use-btn" ${ok ? "" : "disabled"}>Utiliser</button>
      </div>
      <div class="compare-text">${ok ? escapeHtml(txt) : '<em>Service indisponible</em>'}</div>
    `;
    if (ok) {
      div.querySelector(".compare-use-btn").addEventListener("click", () => {
        targetText.textContent = txt;
        closeApiCompare();
      });
    }
    apiCompareBody.appendChild(div);
  });
}

/* ── Auto time-based theme (slot-configurable) ── */

const DEFAULT_SLOTS = [
  { id: "morning",   start: 6,  end: 12, theme: "light"  },
  { id: "afternoon", start: 12, end: 20, theme: "paper"  },
  { id: "night",     start: 20, end: 6,  theme: "aurora" },
];

function loadTimeSlots() {
  try { return JSON.parse(localStorage.getItem("opentrad-timeslots")) || DEFAULT_SLOTS; }
  catch { return DEFAULT_SLOTS; }
}

function saveTimeSlots(slots) {
  try { localStorage.setItem("opentrad-timeslots", JSON.stringify(slots)); } catch {}
}

function applyTimeBasedTheme() {
  const prefs = loadPrefs();
  if (prefs.autoTimeTheme !== "on") return;
  const h = new Date().getHours();
  const slots = loadTimeSlots();
  let targetTheme = null;
  for (const slot of slots) {
    const inSlot = slot.start <= slot.end
      ? h >= slot.start && h < slot.end
      : h >= slot.start || h < slot.end; // overnight
    if (inSlot) { targetTheme = slot.theme; break; }
  }
  if (!targetTheme) return;
  const darkMode = targetTheme === "aurora" ? "dark" : (prefs.darkMode || "light");
  if (prefs.themeStyle !== targetTheme) {
    savePrefs({ themeStyle: targetTheme, darkMode });
    applyTheme(targetTheme, darkMode);
    syncSettingsUI();
  }
}

function syncTimeSlotsUI() {
  const slots  = loadTimeSlots();
  const on     = loadPrefs().autoTimeTheme === "on";
  const config = document.getElementById("timeSlotsConfig");
  if (config) config.classList.toggle("visible", on);
  slots.forEach(slot => {
    const cap     = slot.id.charAt(0).toUpperCase() + slot.id.slice(1);
    const startEl = document.getElementById(`slot${cap}Start`);
    const endEl   = document.getElementById(`slot${cap}End`);
    const themeEl = document.getElementById(`slot${cap}Theme`);
    if (startEl) startEl.value = slot.start;
    if (endEl)   endEl.value   = slot.end;
    if (themeEl) themeEl.value = slot.theme;
  });
}

document.getElementById("timeSlotsApply")?.addEventListener("click", () => {
  const slots = loadTimeSlots();
  slots.forEach(slot => {
    const cap     = slot.id.charAt(0).toUpperCase() + slot.id.slice(1);
    const startEl = document.getElementById(`slot${cap}Start`);
    const endEl   = document.getElementById(`slot${cap}End`);
    const themeEl = document.getElementById(`slot${cap}Theme`);
    if (startEl) slot.start = parseInt(startEl.value, 10);
    if (endEl)   slot.end   = parseInt(endEl.value,   10);
    if (themeEl) slot.theme = themeEl.value;
  });
  saveTimeSlots(slots);
  applyTimeBasedTheme();
  const btn = document.getElementById("timeSlotsApply");
  if (btn) { const orig = btn.textContent; btn.textContent = "✓ Enregistré !"; setTimeout(() => btn.textContent = orig, 1800); }
});

// Show/hide slot config when toggling on/off
document.getElementById("autoTimeThemeOptions")?.addEventListener("click", () => {
  setTimeout(syncTimeSlotsUI, 60);
}, true);

syncTimeSlotsUI();
applyTimeBasedTheme();
setInterval(applyTimeBasedTheme, 5 * 60 * 1000);


function init() {
  const prefs = loadPrefs();
  // Auto-detect UI language on first visit; fall back to saved pref
  const lang = prefs.lang || detectLang();
  if (!prefs.lang) savePrefs({ lang });

  initTheme();        // Apply theme + accent from prefs
  applyI18n(lang);    // Apply i18n strings
  updateCharCount();  // Reset char counter (also inits clearBtn visibility)
  syncSettingsUI();   // Sync settings buttons
  initHistoryTabs();  // Wire history tab buttons

  // Custom searchable language selects (built from static list first)
  buildCustomSelect(sourceLang);
  buildCustomSelect(targetLang);

  if (sourceText.value) updateCharCount();

  // Ping-based connection check on load (3s auto-dismiss if connected)
  checkInitialConnection();

  // Dynamic language discovery — enriches the selects after load
  fetchAndPopulateLangs();

}

init();

/* ----------------------------------------------------------
   23. DYNAMIC LANGUAGE DISCOVERY
   Fetches available languages from MyMemory at startup
   and enriches the source/target <select> elements.
   Falls back silently to the hardcoded list on error.
---------------------------------------------------------- */
const KNOWN_LANG_CODES = new Set([
  "auto","fr","en","es","de","it","pt","ru","zh","ja","ko","ar",
  "hi","nl","pl","sv","tr","uk","vi","id"
]);

// Emoji flags mapped to common lang codes
const LANG_FLAGS = {
  fr:"🇫🇷", en:"🇬🇧", es:"🇪🇸", de:"🇩🇪", it:"🇮🇹", pt:"🇵🇹",
  ru:"🇷🇺", zh:"🇨🇳", ja:"🇯🇵", ko:"🇰🇷", ar:"🇸🇦", hi:"🇮🇳",
  nl:"🇳🇱", pl:"🇵🇱", sv:"🇸🇪", tr:"🇹🇷", uk:"🇺🇦", vi:"🇻🇳",
  id:"🇮🇩", cs:"🇨🇿", ro:"🇷🇴", hu:"🇭🇺", el:"🇬🇷", he:"🇮🇱",
  th:"🇹🇭", da:"🇩🇰", fi:"🇫🇮", no:"🇳🇴", bg:"🇧🇬", hr:"🇭🇷",
  sk:"🇸🇰", sl:"🇸🇮", et:"🇪🇪", lv:"🇱🇻", lt:"🇱🇹", ca:"🇪🇸",
  ms:"🇲🇾", fa:"🇮🇷", ur:"🇵🇰", bn:"🇧🇩", ta:"🇮🇳", sw:"🇰🇪",
  af:"🇿🇦", sq:"🇦🇱", hy:"🇦🇲", az:"🇦🇿", eu:"🏴", be:"🇧🇾",
  cy:"🏴󠁧󠁢󠁷󠁬󠁳󠁿", ga:"🇮🇪", gl:"🇪🇸", ka:"🇬🇪", is:"🇮🇸",
  mk:"🇲🇰", mn:"🇲🇳", mt:"🇲🇹", my:"🇲🇲", ne:"🇳🇵", si:"🇱🇰",
  sr:"🇷🇸", tl:"🇵🇭", uz:"🇺🇿", kk:"🇰🇿", km:"🇰🇭",
};

async function fetchAndPopulateLangs() {
  // Try MyMemory /languages endpoint
  try {
    const res = await fetch("https://api.mymemory.translated.net/languages", {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error("MyMemory languages HTTP " + res.status);
    const data = await res.json();
    // MyMemory returns { responseData: { [code]: "Name" } }
    const langMap = data.responseData;
    if (!langMap || typeof langMap !== "object") throw new Error("Unexpected format");

    // Build new options: start with auto (source only), then merge
    const newEntries = Object.entries(langMap)
      .filter(([code]) => code && code.length >= 2)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (newEntries.length < 5) throw new Error("Too few langs");

    injectNewLangs(newEntries);
  } catch {
    // Silently keep hardcoded list
  }
}

function injectNewLangs(entries) {
  // Build a map of existing options
  const existingSource = new Map(
    Array.from(sourceLang.options).map(o => [o.value, o])
  );
  const existingTarget = new Map(
    Array.from(targetLang.options).map(o => [o.value, o])
  );

  entries.forEach(({ code, name }) => {
    if (code === "auto") return;
    const flag  = LANG_FLAGS[code] || "🌐";
    const label = `${flag} ${name}`;

    if (!existingSource.has(code)) {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = label;
      sourceLang.appendChild(opt);
    }
    if (!existingTarget.has(code)) {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = label;
      targetLang.appendChild(opt);
    }
  });

  // Rebuild custom selects to reflect new options
  rebuildCustomSelect(sourceLang);
  rebuildCustomSelect(targetLang);
}

/** Rebuild an already-built custom select after new <option>s were appended */
function rebuildCustomSelect(nativeSelect) {
  const wrap = nativeSelect.closest(".cselect-wrap");
  if (!wrap) return;

  // Re-render the list (search is already wired — just refresh render)
  const list = wrap.querySelector(".cselect-list");
  if (!list) return;

  // Trigger a fresh render of the list with current filter (empty = show all)
  const search = wrap.querySelector(".cselect-search");
  const filter = search ? search.value : "";
  const q = filter.toLowerCase();

  list.innerHTML = "";
  Array.from(nativeSelect.options).forEach(o => {
    if (q && !o.textContent.toLowerCase().includes(q)) return;
    const li = document.createElement("li");
    li.className   = "cselect-opt";
    li.textContent = o.textContent.trim();
    li.dataset.value = o.value;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(o.value === nativeSelect.value));
    if (o.value === nativeSelect.value) li.classList.add("selected");
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      nativeSelect.value = o.value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      const btn = wrap.querySelector(".cselect-btn");
      if (btn) btn.textContent = o.textContent.trim();
      // close
      const dd = wrap.querySelector(".cselect-dropdown");
      if (dd) { dd.hidden = true; }
      const b = wrap.querySelector(".cselect-btn");
      if (b)  b.setAttribute("aria-expanded", "false");
    });
    list.appendChild(li);
  });
}

/* ----------------------------------------------------------
   NEW. TRANSLATE CHUNKED — splits large texts into ≤1000 char
   chunks to avoid API limits and UI blocking.
---------------------------------------------------------- */
async function translateChunked(text, from, to, prefs) {
  const CHUNK = 1000;
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > CHUNK && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  let combined = "";
  let apiUsed   = null;
  for (const chunk of chunks) {
    let res = null;
    if ((prefs.api === "auto" || prefs.api === "google") && !isApiOnCooldown("google")) {
      try { res = await translateGoogle(chunk, from, to); apiUsed = "google"; } catch {}
    }
    if (!res && (prefs.api === "auto" || prefs.api === "mymemory") && !isApiOnCooldown("mymemory")) {
      try { res = await translateMyMemory(chunk, from, to); apiUsed = "mymemory"; } catch {}
    }
    if (!res && (prefs.api === "auto" || prefs.api === "libre") && !isApiOnCooldown("libre")) {
      try { res = await translateLibre(chunk, from, to); apiUsed = "libre"; } catch {}
    }
    if (res) combined += (combined ? " " : "") + res;
    // Yield to the event loop between chunks
    await new Promise(r => setTimeout(r, 0));
  }
  return { result: combined || null, apiUsed };
}

/* ----------------------------------------------------------
   MOBILE BOTTOM BAR — Wire up mobile action buttons
   These mirror the desktop panel buttons for easy thumb reach.
---------------------------------------------------------- */




/* ----------------------------------------------------------
   iOS SCROLL FIX — Prevent body scroll behind modals/panels
   Locks body scroll when a modal or slide-in panel is open.
---------------------------------------------------------- */
(function initScrollLock() {
  let scrollY = 0;

  function lockScroll() {
    scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  }

  // Observe modal/panel open states via class mutation
  const settingsModal = document.getElementById("settingsModal");
  const historyPanel  = document.getElementById("historyPanel");
  const observer = new MutationObserver(() => {
    const isOpen =
      settingsModal?.classList.contains("open") ||
      historyPanel?.classList.contains("open") ||
      false;

    if (isOpen) lockScroll();
    else unlockScroll();
  });

  [settingsModal, historyPanel].forEach(el => {
    if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  });
})();

/* ----------------------------------------------------------
   MOBILE — Auto-dismiss hero section on first translation
   Saves vertical space on small screens.
---------------------------------------------------------- */
(function initHeroAutoDismiss() {
  const hero = document.getElementById("heroSection");
  if (!hero) return;

  // Dismiss hero after the first character is typed
  const src = document.getElementById("sourceText");
  if (src) {
    src.addEventListener("input", function onFirstInput() {
      if (window.innerWidth <= 700 && src.value.length > 0) {
        hero.classList.add("dismissed");
        src.removeEventListener("input", onFirstInput);
      }
    }, { once: false });
  }
})();


/* ----------------------------------------------------------
   MOBILE BOTTOM BAR — Wire up all 4 action buttons
   Runs after DOM is ready; all referenced functions exist.
---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const mobileSwapBtn     = document.getElementById("mobileSwapBtn");
  const mobileCopyBtn     = document.getElementById("mobileCopyBtn");
  const mobileHistoryBtn  = document.getElementById("mobileHistoryBtn");
  const mobileSettingsBtn = document.getElementById("mobileSettingsBtn");

  // Swap — trigger the main swap button animation
  mobileSwapBtn?.addEventListener("click", () => {
    swapBtn?.click();
    haptic(10);
  });

  // Copy — write plain or rich text to clipboard
  mobileCopyBtn?.addEventListener("click", async () => {
    const prefs = loadPrefs();
    const t     = I18N[prefs.lang || detectLang()] || I18N.en;
    const rawText = targetText.textContent.trim();
    if (!rawText || rawText === t.targetPlaceholder) return;

    try {
      if (prefs.richcopy === "on" && targetText.innerHTML) {
        const html = targetText.innerHTML;
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html":  new Blob([html],    { type: "text/html" }),
            "text/plain": new Blob([rawText], { type: "text/plain" }),
          })
        ]);
      } else {
        await navigator.clipboard.writeText(rawText);
      }
      mobileCopyBtn.classList.add("copy-success");
      setTimeout(() => mobileCopyBtn.classList.remove("copy-success"), 1800);
      haptic(15);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = rawText;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
  });

  // History — open history panel
  mobileHistoryBtn?.addEventListener("click", () => {
    openHistory();
    haptic(10);
  });

  // Settings — open settings modal
  mobileSettingsBtn?.addEventListener("click", () => {
    openSettings();
    haptic(10);
  });
});

/* ----------------------------------------------------------
   COPY BUTTON — upgrade to rich copy when pref is ON
   Patches the existing copyBtn listener to support HTML copy.
---------------------------------------------------------- */
(function patchCopyBtn() {
  if (!copyBtn) return;
  copyBtn.addEventListener("click", async (e) => {
    // Only intercept if rich copy is on
    const prefs = loadPrefs();
    if (prefs.richcopy !== "on") return; // let original handler run
    e.stopImmediatePropagation();

    const t       = I18N[prefs.lang || detectLang()] || I18N.en;
    const rawText = targetText.textContent.trim();
    if (!rawText || rawText === t.targetPlaceholder) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html":  new Blob([targetText.innerHTML], { type: "text/html" }),
          "text/plain": new Blob([rawText],              { type: "text/plain" }),
        })
      ]);
      const svg = copyBtn.querySelector("svg");
      if (svg) svg.innerHTML = CHECK_ICON_SVG;
      copyBtn.classList.add("copy-success");
      copyTooltip?.classList.add("visible");
      haptic(15);
      setTimeout(() => {
        copyTooltip?.classList.remove("visible");
        copyBtn.classList.remove("copy-success");
        if (svg) svg.innerHTML = COPY_ICON_SVG;
      }, 1800);
    } catch {
      // ClipboardItem not supported — fall through to plain text
    }
  }, true); // capture phase so it runs first
})();

/* ----------------------------------------------------------
   iOS SCROLL FIX — lock body when modal/panel is open
---------------------------------------------------------- */
(function initScrollLock() {
  let scrollY = 0;
  function lockScroll() {
    scrollY = window.scrollY;
    document.body.style.cssText += ";overflow:hidden;position:fixed;top:-" + scrollY + "px;width:100%";
  }
  function unlockScroll() {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollY);
  }
  const observe = (el) => {
    if (!el) return;
    new MutationObserver(() => {
      const anyOpen = [settingsModal, historyPanel].some(p => p?.classList.contains("open"));
      anyOpen ? lockScroll() : unlockScroll();
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  };
  observe(settingsModal);
  observe(historyPanel);
})();
