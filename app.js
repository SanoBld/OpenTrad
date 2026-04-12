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
let lastHighlightWord  = "";  // cross-highlight word sync

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
const I18N = {
  fr: {
    historyTabAll:    "Récent",
    historyTabFav:    "⭐ Favoris",
    favEmpty:         "Aucun favori enregistré.",
    heroTitle:        "Traduisez",
    heroAccent:       " instantanément",
    heroSub:          "Correction orthographique · Triple API · Hors-ligne · Glisser-déposer",
    sourcePlaceholder:"Saisissez ou glissez un fichier ici…",
    targetPlaceholder:"La traduction apparaîtra ici…",
    translating:      "Traduction…",
    history:          "Historique",
    historyTitle:     "10 dernières traductions",
    clearHistory:     "Tout effacer",
    historyEmpty:     "Aucune traduction enregistrée.",
    settingsHeading:  "Paramètres",
    settingsLang:     "Langue de l'interface",
    settingsTheme:    "Style de l'interface",
    settingsDark:     "Mode sombre",
    settingsAccent:   "Couleur d'accentuation",
    modeLight:        "Clair",
    modeDark:         "Sombre",
    modeAuto:         "Auto (système)",
    connected:        "Connecté",
    connRestored:     "Connexion rétablie",
    connLost:         "Connexion perdue",
    offline:          "Hors-ligne",
    installMsg:       "📲 Installer OpenTrad comme application",
    install:          "Installer",
    ocrLoading:       "Extraction…",
    ocrDone:          "Extrait !",
    allApiFailed:     "Tous les services de traduction sont indisponibles. Réessayez plus tard.",
    settingsApi:      "API de traduction",
    settingsApiHint:  "En mode Auto, l'application essaie chaque service l'un après l'autre si le précédent échoue.",
    justNow:          "À l'instant",
    minutesAgo:       (m) => `Il y a ${m} min`,
    hoursAgo:         (h) => `Il y a ${h} h`,
    daysAgo:          (d) => `Il y a ${d} j`,
  },
  en: {
    historyTabAll:    "Recent",
    historyTabFav:    "⭐ Favorites",
    favEmpty:         "No favorites yet.",
    heroTitle:        "Translate",
    heroAccent:       " instantly",
    heroSub:          "Spell check · Triple API · Offline · Drag & drop",
    sourcePlaceholder:"Type or drop a file here…",
    targetPlaceholder:"Translation will appear here…",
    translating:      "Translating…",
    history:          "History",
    historyTitle:     "Last 10 translations",
    clearHistory:     "Clear all",
    historyEmpty:     "No translations saved.",
    settingsHeading:  "Settings",
    settingsLang:     "Interface Language",
    settingsTheme:    "Interface Style",
    settingsDark:     "Dark Mode",
    settingsAccent:   "Accent Color",
    modeLight:        "Light",
    modeDark:         "Dark",
    modeAuto:         "Auto (system)",
    connected:        "Connected",
    connRestored:     "Connection restored",
    connLost:         "Connection lost",
    offline:          "Offline",
    installMsg:       "📲 Install OpenTrad as an app",
    install:          "Install",
    ocrLoading:       "Extracting…",
    ocrDone:          "Extracted!",
    allApiFailed:     "All translation services are unavailable. Try again later.",
    settingsApi:      "Translation API",
    settingsApiHint:  "In Auto mode, the app tries each service one after another if the previous one fails.",
    justNow:          "Just now",
    minutesAgo:       (m) => `${m}min ago`,
    hoursAgo:         (h) => `${h}h ago`,
    daysAgo:          (d) => `${d}d ago`,
  },
  eu: {
    historyTabAll:    "Azkenak",
    historyTabFav:    "⭐ Gogokoak",
    favEmpty:         "Ez dago gogoko itzulpenik.",
    heroTitle:        "Itzuli",
    heroAccent:       " berehala",
    heroSub:          "Ortografia · Triple API · Lineaz kanpo · Arrastatu",
    sourcePlaceholder:"Idatzi edo utzi fitxategi bat hemen…",
    targetPlaceholder:"Itzulpena hemen agertuko da…",
    translating:      "Itzultzen…",
    history:          "Historia",
    historyTitle:     "Azken 10 itzulpenak",
    clearHistory:     "Dena garbitu",
    historyEmpty:     "Ez dago itzulpenik gordeta.",
    settingsHeading:  "Ezarpenak",
    settingsLang:     "Interfazearen hizkuntza",
    settingsTheme:    "Interfaze estiloa",
    settingsDark:     "Modu iluna",
    settingsAccent:   "Azpimarkatze-kolorea",
    modeLight:        "Argia",
    modeDark:         "Iluna",
    modeAuto:         "Automatiko",
    connected:        "Konektatuta",
    connRestored:     "Konexioa berrezarri da",
    connLost:         "Konexioa galdu da",
    offline:          "Lineaz kanpo",
    installMsg:       "📲 Instalatu OpenTrad aplikazio gisa",
    install:          "Instalatu",
    ocrLoading:       "Ateratzen…",
    ocrDone:          "Ateratzeko!",
    allApiFailed:     "Itzulpen zerbitzu guztiak ez daude erabilgarri. Saiatu berriro geroago.",
    settingsApi:      "Itzulpen API",
    settingsApiHint:  "Auto moduan, aplikazioak zerbitzu bakoitza saiatzen du aurreko batek huts egiten badu.",
    justNow:          "Oraintxe",
    minutesAgo:       (m) => `Duela ${m} min`,
    hoursAgo:         (h) => `Duela ${h} ordu`,
    daysAgo:          (d) => `Duela ${d} egun`,
  },
};

/** Apply i18n strings to all [data-i18n] elements */
function applyI18n(lang) {
  const t = I18N[lang] || I18N.fr;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (typeof t[key] === "string") el.textContent = t[key];
  });
  sourceText.placeholder = t.sourcePlaceholder;
  const hint = targetText.querySelector(".placeholder-hint");
  if (hint) hint.textContent = t.targetPlaceholder;
  // Properly map all supported UI languages to BCP-47 codes
  const langMap = { fr: "fr", en: "en", eu: "eu" };
  document.documentElement.lang = langMap[lang] || lang;
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
  const lang       = prefs.lang       || "fr";
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
  return I18N[prefs.lang || "fr"] || I18N.fr;
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
    const t     = I18N[prefs.lang || "fr"] || I18N.fr;
    targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
  }
}
function showError(msg) { errorMsg.textContent = msg; }
function clearError()   { errorMsg.textContent = ""; }

function showBadge(api) {
  const labels  = { google: "✦ Google", mymemory: "✦ MyMemory", libre: "✦ LibreTranslate" };
  const classes = { google: "badge-google", mymemory: "badge-mymemory", libre: "badge-libre" };
  apiBadge.className = "api-badge";
  apiBadge.textContent = labels[api] || api;
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
  const res = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: from === "auto" ? "auto" : from, target: to, format: "text" }),
  });
  if (res.status === 429 || res.status >= 500) {
    setApiCooldown("libre");
    throw new Error(`LibreTranslate HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const data = await res.json();
  if (!data.translatedText) throw new Error("LibreTranslate: empty");
  clearApiCooldown("libre");
  return data.translatedText;
}

async function translate() {
  const text = sourceText.value.trim();
  const prefs = loadPrefs();
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;

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

    if (result) {
      targetText.textContent = result;
      // Clear any cross-highlights since text changed
      clearSourceHighlights();
      lastHighlightWord = "";
      showBadge(apiUsed);
      saveToHistory(text, result, from, to);
      updateFavBtn();
    } else {
      targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
      showError(t.allApiFailed);
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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
  if (currentTranslation && currentTranslation !== t.targetPlaceholder) {
    sourceText.value = currentTranslation;
    targetText.innerHTML = `<span class="placeholder-hint">${t.targetPlaceholder}</span>`;
    updateCharCount();
  }

  swapBtn.classList.add("rotating");
  swapBtn.addEventListener("animationend", () => swapBtn.classList.remove("rotating"), { once: true });

  // Haptic feedback
  navigator.vibrate?.(30);

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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
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
  navigator.vibrate?.(15);

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
   17. KEYBOARD SHORTCUTS  (power-user shortcuts)
---------------------------------------------------------- */

// ── New DOM refs ──
const convModeBtn    = document.getElementById("convModeBtn");
const convOverlay    = document.getElementById("convOverlay");
const convMicTop     = document.getElementById("convMicTop");
const convMicBottom  = document.getElementById("convMicBottom");
const convTtsTop     = document.getElementById("convTtsTop");
const convTtsBottom  = document.getElementById("convTtsBottom");
const convCloseMobile = document.getElementById("convCloseMobile");
const convTextTop    = document.getElementById("convTextTop");
const convTextBottom = document.getElementById("convTextBottom");
const convBarLangs   = document.getElementById("convBarLangs");
const convSwapLangs  = document.getElementById("convSwapLangs");
const convClearBtn2  = document.getElementById("convClearBtn");
const convCloseBtn   = document.getElementById("convCloseBtn");
const convLangSelectTop    = document.getElementById("convLangTop");
const convLangSelectBottom = document.getElementById("convLangBottom");
const dictPanel      = document.getElementById("dictPanel");
const dictBody       = document.getElementById("dictBody");
const dictWordBadge  = document.getElementById("dictWordBadge");
const dictCloseBtn   = document.getElementById("dictCloseBtn");
const kbHelpOverlay  = document.getElementById("kbHelpOverlay");
const kbHelpClose    = document.getElementById("kbHelpClose");
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
    showShortcutToast("⟳ Traduction lancée");
  }
});

// ── Global shortcuts ──
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  const inInput = tag === "TEXTAREA" || tag === "INPUT";
  const mod = e.ctrlKey || e.metaKey;

  // Esc — close any open panel
  if (e.key === "Escape") {
    if (convOverlay.classList.contains("open"))   { closeConvMode(); return; }
    if (kbHelpOverlay.classList.contains("open")) { closeKbHelp();   return; }
    if (historyPanel.classList.contains("open"))  { closeHistory();  return; }
    if (settingsModal.classList.contains("open")) { closeSettings(); return; }
    if (document.body.classList.contains("focus-mode")) toggleFocusMode();
    return;
  }

  // ? — shortcuts help (when not typing)
  if (e.key === "?" && !mod && !inInput) {
    e.preventDefault();
    toggleKbHelp();
    return;
  }

  if (!mod) return;

  // Ctrl+Enter — translate
  if (e.key === "Enter") {
    e.preventDefault();
    clearTimeout(debounceTimer);
    translate();
    showShortcutToast("⟳ Traduction lancée");
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

  // Ctrl+Shift+V — conversation mode
  if (e.key === "v" && e.shiftKey) {
    e.preventDefault();
    toggleConvMode();
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
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
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
  const t = I18N[prefs.lang || "fr"] || I18N.fr;

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
        <button class="star-btn ${item.starred ? "starred" : ""}" data-id="${item.id}"
          title="${item.starred ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="Favori">
          ${item.starred ? "★" : "☆"}
        </button>
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
  localStorage.removeItem(HISTORY_KEY);
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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
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
  const t     = I18N[prefs.lang || "fr"] || I18N.fr;
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
function init() {
  const prefs = loadPrefs();
  const lang  = prefs.lang || "fr";

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

  // Wire dict sidebar toggle button
  initDictSidebar();
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
   24. DICT SIDEBAR (3-column layout)
   Opens the dictionary as a persistent right column instead
   of an inline panel in the target panel.
---------------------------------------------------------- */
function initDictSidebar() {
  const translatorWrap  = document.querySelector(".translator-wrap");
  const dictSidebar     = document.getElementById("dictSidebar");
  const dictToggleBtn   = document.getElementById("dictToggleBtn");
  const dictSidebarClose= document.getElementById("dictSidebarClose");

  if (!dictToggleBtn || !dictSidebar || !translatorWrap) return;

  dictToggleBtn.addEventListener("click", () => {
    const isOpen = translatorWrap.classList.toggle("dict-sidebar-open");
    dictToggleBtn.classList.toggle("active", isOpen);
    dictToggleBtn.setAttribute("aria-pressed", String(isOpen));
    dictToggleBtn.title = isOpen ? "Fermer le dictionnaire" : "Ouvrir le dictionnaire";
    dictSidebar.setAttribute("aria-hidden", String(!isOpen));

    // Move dict panel content into sidebar or back
    const mainDictPanel  = document.getElementById("dictPanel");
    const sidebarContent = document.getElementById("dictSidebarContent");
    if (isOpen && mainDictPanel && sidebarContent) {
      // Show sidebar; hide inline dict-hint
      document.querySelector(".dict-hint-wrap")?.style.setProperty("display", "none");
    } else {
      document.querySelector(".dict-hint-wrap")?.style.removeProperty("display");
    }
  });

  if (dictSidebarClose) {
    dictSidebarClose.addEventListener("click", () => {
      translatorWrap.classList.remove("dict-sidebar-open");
      dictToggleBtn?.classList.remove("active");
      dictToggleBtn?.setAttribute("aria-pressed", "false");
      dictSidebar.setAttribute("aria-hidden", "true");
      document.querySelector(".dict-hint-wrap")?.style.removeProperty("display");
    });
  }
}

/* Override dict panel open behavior to also sync sidebar */
const _origDictOpen = window._dictPanelOpen;
document.addEventListener("_dictLoaded", () => {
  const dictSidebar   = document.getElementById("dictSidebar");
  const sidebarBody   = document.getElementById("dictSidebarBody");
  const dictBody      = document.getElementById("dictBody");
  const dictWordBadge = document.getElementById("dictWordBadge");
  const sidebarBadge  = document.getElementById("dictSidebarBadge");
  const translWrap    = document.querySelector(".translator-wrap");

  if (sidebarBody && dictBody && translWrap?.classList.contains("dict-sidebar-open")) {
    sidebarBody.innerHTML = dictBody.innerHTML;
    if (sidebarBadge && dictWordBadge) sidebarBadge.textContent = dictWordBadge.textContent;
  }
});

/* ----------------------------------------------------------
   CUSTOM SEARCHABLE LANGUAGE SELECT
   Wraps native <select> with a filterable dropdown.
   All existing code that reads .value / dispatches 'change'
   on the native select continues to work unchanged.
---------------------------------------------------------- */
function buildCustomSelect(nativeSelect) {
  if (!nativeSelect) return;

  // Build options array from native select
  const getOptions = () =>
    Array.from(nativeSelect.options).map(o => ({ value: o.value, label: o.textContent.trim() }));

  // Create wrapper
  const wrap = document.createElement("div");
  wrap.className = "cselect-wrap";

  // Visible trigger button
  const btn = document.createElement("button");
  btn.className    = "cselect-btn";
  btn.type         = "button";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");

  const updateBtn = () => {
    const opt = nativeSelect.options[nativeSelect.selectedIndex];
    btn.textContent = opt ? opt.textContent.trim() : "";
  };
  updateBtn();

  // Dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "cselect-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.hidden = true;

  // Search input
  const search = document.createElement("input");
  search.type        = "text";
  search.className   = "cselect-search";
  search.placeholder = "Rechercher…";
  search.setAttribute("aria-label", "Rechercher une langue");

  // Option list
  const list = document.createElement("ul");
  list.className = "cselect-list";

  const renderList = (filter = "") => {
    list.innerHTML = "";
    const q = filter.toLowerCase();
    getOptions().forEach(opt => {
      if (q && !opt.label.toLowerCase().includes(q)) return;
      const li = document.createElement("li");
      li.className   = "cselect-opt";
      li.textContent = opt.label;
      li.dataset.value = opt.value;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(opt.value === nativeSelect.value));
      if (opt.value === nativeSelect.value) li.classList.add("selected");
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        nativeSelect.value = opt.value;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        updateBtn();
        closeDropdown();
      });
      list.appendChild(li);
    });
  };

  const openDropdown = () => {
    dropdown.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    search.value = "";
    renderList();

    // ── Portal positioning ──────────────────────────────────────
    // The dropdown lives in <body> (not inside any transformed/filtered
    // ancestor) so position:fixed works correctly against the viewport.
    const rect    = btn.getBoundingClientRect();
    const ddWidth = 260;
    let   left    = rect.left;
    // Flip left if it overflows on the right
    if (left + ddWidth > window.innerWidth - 8) {
      left = Math.max(4, window.innerWidth - ddWidth - 8);
    }
    // Flip up if it overflows at the bottom
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const maxH       = 280; // search + list combined max height
    if (spaceBelow < maxH && rect.top > maxH) {
      // Open upward
      dropdown.style.top    = "";
      dropdown.style.bottom = (window.innerHeight - rect.top + 4) + "px";
    } else {
      dropdown.style.bottom = "";
      dropdown.style.top    = (rect.bottom + 4) + "px";
    }
    dropdown.style.left  = left + "px";
    dropdown.style.width = Math.min(ddWidth, window.innerWidth - 16) + "px";

    search.focus();
    // Scroll selected option into view
    const sel = list.querySelector(".selected");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  };

  const closeDropdown = () => {
    dropdown.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", () => {
    if (!dropdown.hidden) closeDropdown();
    else openDropdown();
  });

  search.addEventListener("input", () => renderList(search.value));

  // Close on outside click — check both wrap AND the body-portalled dropdown
  document.addEventListener("mousedown", (e) => {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
  });

  // Keyboard navigation in list
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDropdown(); btn.focus(); }
    if (e.key === "ArrowDown") {
      const first = list.querySelector(".cselect-opt");
      if (first) first.focus();
      e.preventDefault();
    }
  });

  list.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll(".cselect-opt")];
    const idx   = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { items[idx + 1]?.focus(); e.preventDefault(); }
    if (e.key === "ArrowUp") {
      if (idx <= 0) search.focus();
      else items[idx - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === "Enter" || e.key === " ") {
      document.activeElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      e.preventDefault();
    }
    if (e.key === "Escape") { closeDropdown(); btn.focus(); }
  });

  // Make list items focusable
  list.addEventListener("mouseenter", (e) => {
    if (e.target.classList.contains("cselect-opt")) e.target.setAttribute("tabindex", "0");
  }, true);

  dropdown.appendChild(search);
  dropdown.appendChild(list);

  // Insert wrapper before native select, hide native
  nativeSelect.style.display = "none";
  nativeSelect.parentNode.insertBefore(wrap, nativeSelect);
  wrap.appendChild(btn);
  wrap.appendChild(nativeSelect); // Keep native in DOM for value reading

  // ── Portal: append dropdown to <body> so position:fixed is never broken
  // by ancestor transforms / backdrop-filter / will-change.
  document.body.appendChild(dropdown);

  // Cleanup: remove portal on page unload
  window.addEventListener("unload", () => dropdown.remove(), { once: true });

  // Keep btn in sync when native select changes programmatically
  nativeSelect.addEventListener("change", updateBtn);
}

// Expose sync helper (used by swapBtn)
function syncCustomSelect(nativeSelect) {
  const wrap = nativeSelect.closest(".cselect-wrap")
             || nativeSelect.parentNode?.querySelector(".cselect-wrap");
  if (wrap) {
    const btn = wrap.querySelector(".cselect-btn");
    if (btn) {
      const opt = nativeSelect.options[nativeSelect.selectedIndex];
      if (opt) btn.textContent = opt.textContent.trim();
    }
  }
}

/* ----------------------------------------------------------
   SWIPE GESTURES — fermeture des panneaux
   Swipe vers la droite ferme l'historique.
   Swipe vers le bas ferme les paramètres.
   Swipe haut/bas ferme le mode conversation.
---------------------------------------------------------- */
function addSwipeToDismiss(element, direction, onDismiss) {
  let startX = 0, startY = 0;
  element.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  element.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const threshold = 60;
    if (direction === "right"  && dx >  threshold && Math.abs(dy) < threshold) onDismiss();
    if (direction === "down"   && dy >  threshold && Math.abs(dx) < threshold) onDismiss();
    if (direction === "up"     && dy < -threshold && Math.abs(dx) < threshold) onDismiss();
    if (direction === "any"    && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) onDismiss();
  }, { passive: true });
}

addSwipeToDismiss(historyPanel,    "right", closeHistory);
addSwipeToDismiss(settingsModal,   "down",  closeSettings);
addSwipeToDismiss(convOverlay,     "any",   closeConvMode);

/* ----------------------------------------------------------
   MOBILE BOTTOM BAR
---------------------------------------------------------- */
const mobileSwapBtn  = document.getElementById("mobileSwapBtn");
const mobileCopyBtn  = document.getElementById("mobileCopyBtn");
const mobileShareBtn = document.getElementById("mobileShareBtn");

if (mobileSwapBtn) mobileSwapBtn.addEventListener("click", () => swapBtn.click());
if (mobileCopyBtn) mobileCopyBtn.addEventListener("click", () => copyBtn.click());
if (mobileShareBtn) mobileShareBtn.addEventListener("click", () => shareBtn.click());

/* ----------------------------------------------------------
   23. KEYBOARD SHORTCUTS HELP
---------------------------------------------------------- */
function toggleKbHelp() {
  const open = kbHelpOverlay.classList.toggle("open");
  kbHelpOverlay.setAttribute("aria-hidden", String(!open));
  if (open) kbHelpClose.focus();
}
function closeKbHelp() {
  kbHelpOverlay.classList.remove("open");
  kbHelpOverlay.setAttribute("aria-hidden", "true");
}
kbHelpClose.addEventListener("click", closeKbHelp);
kbHelpOverlay.addEventListener("click", (e) => {
  if (e.target === kbHelpOverlay) closeKbHelp();
});

/* ----------------------------------------------------------
   24. DICTIONARY & SYNONYMS
   Free Dictionary API: https://api.dictionaryapi.dev
   Triggered by double-clicking a word in targetText.
---------------------------------------------------------- */
const DICT_LANG_MAP = {
  en:"en", fr:"fr", es:"es", de:"de", it:"it", pt:"pt",
  ru:"ru", hi:"hi", ar:"ar", ja:"ja", ko:"ko", nl:"nl",
  tr:"tr", pl:"pl", sv:"sv", uk:"uk",
  zh:"zh", vi:"vi", id:"id",
};

/* Languages supported via Wiktionary REST API —
   covers every language shown in the site's selectors.
   For zh/vi/id/hi/ar/ja/ko the Wiktionary edition may be sparse;
   we fall back to translating the word to EN and looking it up there. */
const WIKTIONARY_LANGS = new Set([
  "fr","de","it","es","pt","ru","nl","pl","sv","tr","uk",
  "hi","ar","ja","ko","zh","vi","id",
]);

/* Languages that have reliable Wiktionary REST coverage.
   Others use the translate-then-EN-lookup fallback. */
const WIKTIONARY_NATIVE = new Set(["fr","de","it","es","pt","ru","nl","pl","sv","tr","uk"]);

/* Map lang codes to Wiktionary edition subdomains */
const WIKI_SUBDOMAIN = {
  fr:"fr", de:"de", it:"it", es:"es", pt:"pt", ru:"ru",
  nl:"nl", pl:"pl", sv:"sv", tr:"tr", uk:"uk",
  hi:"hi", ar:"ar", ja:"ja", ko:"ko", zh:"zh",
  vi:"vi", id:"id",
};

async function fetchDictionary(word, lang) {
  const dictLang = DICT_LANG_MAP[lang];
  if (!dictLang) { showDictError(`Dictionnaire non disponible pour cette langue (${lang}).`); return; }

  openDictPanel(word);

  // ── 1. Free Dictionary API — meilleure couverture pour l'anglais ──
  if (lang === "en") {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
      if (res.status === 404) { showDictNotFound(word); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderDictData(data, lang);
      return;
    } catch (err) {
      console.warn("[OpenTrad] Dictionary EN error:", err);
    }
  }

  // ── 2. Wiktionary natif — langues à bonne couverture ─────────────
  if (WIKTIONARY_LANGS.has(lang)) {
    const subdomain = WIKI_SUBDOMAIN[lang] || lang;
    const useNative = WIKTIONARY_NATIVE.has(lang);

    // Tentative sur l'édition native de Wiktionary
    if (useNative) {
      try {
        const res = await fetch(
          `https://${subdomain}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`
        );
        if (res.ok) {
          const data = await res.json();
          renderWiktionaryData(data, word);
          return;
        }
        if (res.status !== 404) throw new Error(`Wiktionary HTTP ${res.status}`);
      } catch (err) {
        console.warn(`[OpenTrad] Wiktionary ${subdomain} error:`, err);
      }
    }

    // ── 3. Fallback : édition anglaise de Wiktionary pour le mot tel quel
    //    (marche souvent pour ja/ko/zh/ar/hi avec transcription latine)
    try {
      const res = await fetch(
        `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`
      );
      if (res.ok) {
        const data = await res.json();
        renderWiktionaryData(data, word, /* sourceIsEnWikt */ true);
        return;
      }
    } catch (err) {
      console.warn("[OpenTrad] Wiktionary EN fallback error:", err);
    }

    // ── 4. Dernier recours : traduction → EN puis Free Dictionary ────
    try {
      const translated = await translateToEnglish(word, lang);
      if (translated && translated.toLowerCase() !== word.toLowerCase()) {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(translated.toLowerCase())}`);
        if (res.ok) {
          const data = await res.json();
          // Indicate this is a translated lookup
          dictBody.innerHTML = `<p style="font-size:.72rem;color:var(--text-muted);margin-bottom:.5rem">
            📖 Définition via traduction : <em>${escapeHtml(translated)}</em>
          </p>`;
          renderDictData(data, "en", /* append */ true);
          syncSidebarDict();
          return;
        }
      }
    } catch (err) {
      console.warn("[OpenTrad] Dict translate fallback error:", err);
    }

    showDictNotFound(word);
    return;
  }

  showDictError(`Dictionnaire non disponible pour cette langue.`);
}

/** Translate a single word to English using the existing API stack */
async function translateToEnglish(word, sourceLangCode) {
  if (sourceLangCode === "en") return word;
  try {
    // Lightweight Google Translate call (single word)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLangCode}&tl=en&dt=t&q=${encodeURIComponent(word)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data?.[0]?.[0]?.[0] || "";
  } catch {
    return "";
  }
}

function openDictPanel(word) {
  dictWordBadge.textContent = word;
  dictBody.innerHTML = `<p class="dict-loading">Recherche de « ${escapeHtml(word)} »…</p>`;

  const translWrap = document.querySelector(".translator-wrap");
  if (translWrap?.classList.contains("dict-sidebar-open")) {
    // In sidebar mode: update sidebar badge & body, don't open inline panel
    const sidebarBadge = document.getElementById("dictSidebarBadge");
    const sidebarBody  = document.getElementById("dictSidebarBody");
    if (sidebarBadge) sidebarBadge.textContent = word;
    if (sidebarBody)  sidebarBody.innerHTML = dictBody.innerHTML;
  } else {
    dictPanel.classList.add("open");
    dictPanel.setAttribute("aria-hidden", "false");
  }
}

function closeDictPanel() {
  dictPanel.classList.remove("open");
  dictPanel.setAttribute("aria-hidden", "true");
}
dictCloseBtn.addEventListener("click", closeDictPanel);

function showDictError(msg) {
  dictBody.innerHTML = `<p class="dict-error">⚠ ${escapeHtml(msg)}</p>`;
  syncSidebarDict();
}
function showDictNotFound(word) {
  dictBody.innerHTML = `<p class="dict-not-found">Aucune définition trouvée pour « ${escapeHtml(word)} ».</p>`;
  syncSidebarDict();
}

/** Mirror dictBody content into the sidebar when sidebar mode is active */
function syncSidebarDict() {
  const translWrap   = document.querySelector(".translator-wrap");
  const sidebarBody  = document.getElementById("dictSidebarBody");
  if (translWrap?.classList.contains("dict-sidebar-open") && sidebarBody) {
    sidebarBody.innerHTML = dictBody.innerHTML;
    // Re-wire synonym clicks in sidebar copy
    sidebarBody.querySelectorAll(".dict-syn-tag").forEach(btn => {
      btn.addEventListener("click", () => fetchDictionary(btn.dataset.word, targetLang.value));
    });
  }
}

function renderDictData(data, lang, append = false) {
  if (!data || !data.length) { showDictNotFound(""); return; }
  const entry = data[0];
  let html = "";

  // Phonetic
  const phonetic = entry.phonetics?.find(p => p.text)?.text;
  if (phonetic) {
    html += `<p style="font-size:.75rem;color:var(--text-muted);margin-bottom:.6rem">${escapeHtml(phonetic)}</p>`;
  }

  (entry.meanings || []).slice(0, 4).forEach(meaning => {
    html += `<div class="dict-meaning">`;
    html += `<span class="dict-pos">${escapeHtml(meaning.partOfSpeech || "")}</span>`;

    (meaning.definitions || []).slice(0, 2).forEach(def => {
      html += `<p class="dict-def">${escapeHtml(def.definition || "")}</p>`;
      if (def.example) {
        html += `<p class="dict-example">"${escapeHtml(def.example)}"</p>`;
      }
    });

    const syns = (meaning.synonyms || []).slice(0, 6);
    const ants = (meaning.antonyms || []).slice(0, 4);
    if (syns.length || ants.length) {
      html += `<div class="dict-synonyms">`;
      if (syns.length) {
        html += `<span class="dict-syn-label">Syn :</span>`;
        syns.forEach(s => {
          html += `<button class="dict-syn-tag" data-word="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
        });
      }
      if (ants.length) {
        html += `<span class="dict-syn-label" style="margin-left:.4rem">Ant :</span>`;
        ants.forEach(a => {
          html += `<button class="dict-syn-tag" style="border-color:var(--spell-error);color:var(--spell-error)" data-word="${escapeHtml(a)}">${escapeHtml(a)}</button>`;
        });
      }
      html += `</div>`;
    }
    html += `</div>`;
  });

  if (append) {
    dictBody.innerHTML += html;
  } else {
    dictBody.innerHTML = html;
  }

  // Click on synonym tag — look it up
  dictBody.querySelectorAll(".dict-syn-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      fetchDictionary(btn.dataset.word, targetLang.value);
    });
  });

  // Mirror to sidebar if open
  syncSidebarDict();
}

/** Render Wiktionary REST API response (for French, German, etc.) */
function renderWiktionaryData(data, word) {
  // Wiktionary API returns { [lang]: [ { partOfSpeech, language, definitions: [{definition, parsedExamples, synonyms}] } ] }
  const allEntries = Object.values(data).flat();
  if (!allEntries.length) { showDictNotFound(word); return; }

  let html = "";
  allEntries.slice(0, 4).forEach(entry => {
    if (!entry.definitions?.length) return;
    html += `<div class="dict-meaning">`;
    html += `<span class="dict-pos">${escapeHtml(entry.partOfSpeech || "")}</span>`;

    entry.definitions.slice(0, 3).forEach(def => {
      // Strip HTML tags from definition
      const cleanDef = (def.definition || "").replace(/<[^>]*>/g, "").trim();
      if (!cleanDef) return;
      html += `<p class="dict-def">${escapeHtml(cleanDef)}</p>`;
      // Example
      const ex = def.parsedExamples?.[0]?.example || def.examples?.[0];
      if (ex) {
        const cleanEx = ex.replace(/<[^>]*>/g, "").trim();
        if (cleanEx) html += `<p class="dict-example">"${escapeHtml(cleanEx)}"</p>`;
      }
    });

    // Synonyms from Wiktionary
    const syns = (entry.definitions?.[0]?.synonyms || []).slice(0, 6);
    if (syns.length) {
      html += `<div class="dict-synonyms"><span class="dict-syn-label">Syn :</span>`;
      syns.forEach(s => {
        const label = typeof s === "string" ? s : s.word || "";
        if (label) html += `<button class="dict-syn-tag" data-word="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });

  if (!html) { showDictNotFound(word); return; }
  dictBody.innerHTML = html;

  dictBody.querySelectorAll(".dict-syn-tag").forEach(btn => {
    btn.addEventListener("click", () => fetchDictionary(btn.dataset.word, targetLang.value));
  });

  syncSidebarDict();
}

// ── WORD CROSS-HIGHLIGHT SYSTEM ──────────────────────────────

/** Wrap all occurrences of `word` in targetText with <mark class="word-highlight"> */
function highlightWordInTarget(word) {
  // Remove previous highlights
  clearTargetHighlights();
  if (!word || word.length < 2) return;

  const rawHtml = targetText.innerHTML;
  // Only highlight if no placeholder
  if (targetText.querySelector(".placeholder-hint")) return;

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(`(?<![\\w\\u00C0-\\u024F])(${escaped})(?![\\w\\u00C0-\\u024F])`, "gi");
  targetText.innerHTML = targetText.innerHTML.replace(
    /(<[^>]*>)|([^<]+)/g,
    (match, tag, text) => {
      if (tag) return tag; // skip HTML tags
      return text.replace(regex, `<mark class="word-highlight">$1</mark>`);
    }
  );
}

function clearTargetHighlights() {
  // Unwrap all <mark class="word-highlight"> nodes
  targetText.querySelectorAll("mark.word-highlight").forEach(mark => {
    const parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
}

/** Highlight word in source textarea via the spell overlay layer */
function highlightWordInSource(word) {
  clearSourceHighlights();
  if (!word || word.length < 2 || !sourceText.value) return;

  const text    = sourceText.value;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(`(?<![\\w\\u00C0-\\u024F])(${escaped})(?![\\w\\u00C0-\\u024F])`, "gi");

  let html   = "";
  let cursor = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    html += escapeHtml(text.slice(cursor, match.index));
    html += `<mark class="word-highlight src-highlight">${escapeHtml(match[1])}</mark>`;
    cursor = match.index + match[1].length;
  }
  html += escapeHtml(text.slice(cursor));

  // Use a dedicated overlay (reuse spellOverlay layer idea)
  let srcHL = document.getElementById("srcHighlightOverlay");
  if (!srcHL) {
    srcHL = document.createElement("div");
    srcHL.id = "srcHighlightOverlay";
    srcHL.className = "spell-overlay src-hl-overlay";
    srcHL.setAttribute("aria-hidden", "true");
    sourceText.parentNode.appendChild(srcHL);
  }
  srcHL.innerHTML = html;
}

function clearSourceHighlights() {
  const srcHL = document.getElementById("srcHighlightOverlay");
  if (srcHL) srcHL.innerHTML = "";
}

// Listen for selection changes
document.addEventListener("selectionchange", () => {
  const sel = window.getSelection()?.toString().trim();
  if (!sel || sel.length < 2 || sel.includes(" ") || sel.length > 60) {
    if (lastHighlightWord) {
      clearTargetHighlights();
      clearSourceHighlights();
      lastHighlightWord = "";
    }
    return;
  }

  if (sel === lastHighlightWord) return;
  lastHighlightWord = sel;

  // Determine context: did selection happen in source or target?
  const anchorNode = window.getSelection()?.anchorNode;
  const inTarget   = targetText.contains(anchorNode);
  const inSource   = sourceText === document.activeElement ||
                     (sourceText.parentElement?.contains(anchorNode));

  if (inTarget) {
    highlightWordInSource(sel);
    fetchDictionary(sel, targetLang.value);
  } else if (inSource) {
    highlightWordInTarget(sel);
    const lang = sourceLang.value === "auto" ? "en" : sourceLang.value;
    fetchDictionary(sel, lang);
  }
});

// Trigger on double-click in target output
targetText.addEventListener("dblclick", () => {
  const sel = window.getSelection()?.toString().trim();
  if (sel && sel.length >= 2 && sel.length <= 60 && !sel.includes(" ")) {
    highlightWordInSource(sel);
    fetchDictionary(sel, targetLang.value);
  }
});

// Trigger on double-click in source textarea
sourceText.addEventListener("dblclick", () => {
  const sel = window.getSelection()?.toString().trim()
           || sourceText.value.slice(sourceText.selectionStart, sourceText.selectionEnd).trim();
  if (sel && sel.length >= 2 && sel.length <= 60 && !sel.includes(" ")) {
    highlightWordInTarget(sel);
    const lang = sourceLang.value === "auto" ? "en" : sourceLang.value;
    fetchDictionary(sel, lang);
  }
});

// Clear highlights when translation updates
const _origTranslate = translate;
// Patch: clear highlights when new translation arrives
const _patchHighlightOnTranslate = () => {
  clearTargetHighlights();
  clearSourceHighlights();
  lastHighlightWord = "";
};
sourceLang.addEventListener("change", _patchHighlightOnTranslate);
targetLang.addEventListener("change", _patchHighlightOnTranslate);

/* ----------------------------------------------------------
   25. CONVERSATION MODE
   Split-screen view for face-to-face translation.
   Top half rotated 180° for the person opposite.
   Web Speech API for continuous voice recognition.
---------------------------------------------------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let convLangTop    = "fr";
let convLangBottom = "en";
let convRecTop     = null;
let convRecBottom  = null;
let convListeningTop    = false;
let convListeningBottom = false;

function toggleConvMode() {
  const isOpen = convOverlay.classList.contains("open");
  if (isOpen) closeConvMode();
  else openConvMode();
}

function openConvMode() {
  // Sync with current lang selections
  convLangTop    = sourceLang.value === "auto" ? "fr" : sourceLang.value;
  convLangBottom = targetLang.value;
  // Sync the in-overlay language selects
  if (convLangSelectTop)    convLangSelectTop.value    = convLangTop;
  if (convLangSelectBottom) convLangSelectBottom.value = convLangBottom;
  updateConvBar();
  convOverlay.classList.add("open");
  convOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeConvMode() {
  stopConvRec("top");
  stopConvRec("bottom");
  convOverlay.classList.remove("open");
  convOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateConvBar() {
  const getName = (code) => {
    const opt = document.querySelector(`#sourceLang option[value="${code}"]`)
             || document.querySelector(`#targetLang option[value="${code}"]`);
    if (!opt) return code.toUpperCase();
    return opt.textContent.replace(/^[^\s]+ /, "");
  };
  convBarLangs.textContent = `${getName(convLangTop)} ↔ ${getName(convLangBottom)}`;
  // Keep selects in sync
  if (convLangSelectTop    && convLangSelectTop.value    !== convLangTop)    convLangSelectTop.value    = convLangTop;
  if (convLangSelectBottom && convLangSelectBottom.value !== convLangBottom) convLangSelectBottom.value = convLangBottom;
}

convModeBtn.addEventListener("click", openConvMode);
convCloseBtn.addEventListener("click", closeConvMode);
if (convCloseMobile) convCloseMobile.addEventListener("click", closeConvMode);

// TTS in conversation mode
if (convTtsTop) {
  convTtsTop.addEventListener("click", () => {
    const text = convTextTop.dataset.raw || convTextTop.textContent.trim();
    if (text) speak(text, convLangTop, convTtsTop);
  });
}
if (convTtsBottom) {
  convTtsBottom.addEventListener("click", () => {
    const text = convTextBottom.dataset.raw || convTextBottom.textContent.trim();
    if (text) speak(text, convLangBottom, convTtsBottom);
  });
}

convSwapLangs.addEventListener("click", () => {
  [convLangTop, convLangBottom] = [convLangBottom, convLangTop];
  if (convLangSelectTop)    convLangSelectTop.value    = convLangTop;
  if (convLangSelectBottom) convLangSelectBottom.value = convLangBottom;
  updateConvBar();
  // Swap displayed texts
  const tmp = convTextTop.dataset.raw || "";
  convTextTop.dataset.raw    = convTextBottom.dataset.raw || "";
  convTextBottom.dataset.raw = tmp;
  renderConvText("top",    convTextTop.dataset.raw);
  renderConvText("bottom", convTextBottom.dataset.raw);
});

convClearBtn2.addEventListener("click", () => {
  renderConvText("top", "");
  renderConvText("bottom", "");
});

// Language selects inside conversation overlay
if (convLangSelectTop) {
  convLangSelectTop.addEventListener("change", () => {
    convLangTop = convLangSelectTop.value;
    updateConvBar();
    stopConvRec("top");
  });
}
if (convLangSelectBottom) {
  convLangSelectBottom.addEventListener("change", () => {
    convLangBottom = convLangSelectBottom.value;
    updateConvBar();
    stopConvRec("bottom");
  });
}

function renderConvText(side, text) {
  const el = side === "top" ? convTextTop : convTextBottom;
  el.dataset.raw = text || "";
  if (text && text.trim()) {
    el.textContent = text;
  } else {
    el.innerHTML = `<span class="conv-text-placeholder">Appuyez sur le micro et parlez…</span>`;
  }
}

async function translateConv(text, fromLang, toLang) {
  try {
    const prefs = loadPrefs();
    const selectedApi = prefs.api || "auto";
    if (selectedApi === "auto" || selectedApi === "google") {
      try { return await translateGoogle(text, fromLang, toLang); } catch {}
    }
    if (selectedApi === "auto" || selectedApi === "mymemory") {
      try { return await translateMyMemory(text, fromLang, toLang); } catch {}
    }
  } catch {}
  return null;
}

function stopConvRec(side) {
  if (side === "top" && convRecTop) {
    try { convRecTop.stop(); } catch {}
    convRecTop = null;
    convListeningTop = false;
    convMicTop.classList.remove("listening");
  }
  if (side === "bottom" && convRecBottom) {
    try { convRecBottom.stop(); } catch {}
    convRecBottom = null;
    convListeningBottom = false;
    convMicBottom.classList.remove("listening");
  }
}

function startConvRec(side) {
  if (!SpeechRecognition) {
    alert("Reconnaissance vocale non supportée dans ce navigateur (essayez Chrome/Edge).");
    return;
  }
  // Stop the other side first
  stopConvRec(side === "top" ? "bottom" : "top");

  const lang = side === "top" ? convLangTop : convLangBottom;
  const toLang = side === "top" ? convLangBottom : convLangTop;
  const micBtn = side === "top" ? convMicTop : convMicBottom;
  const outputEl = side === "top" ? convTextBottom : convTextTop;

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = LANG_TO_LOCALE[lang] || lang;

  if (side === "top") { convRecTop = rec; convListeningTop = true; }
  else { convRecBottom = rec; convListeningBottom = true; }
  micBtn.classList.add("listening");

  rec.onresult = async (event) => {
    let interim = "";
    let final   = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }

    const display = final || interim;
    // Show spoken text on the speaker's side
    const speakerEl = side === "top" ? convTextTop : convTextBottom;
    if (display) speakerEl.textContent = display;

    // Translate final result
    if (final.trim()) {
      outputEl.innerHTML = `<span class="conv-text-placeholder">Traduction…</span>`;
      const result = await translateConv(final.trim(), lang, toLang);
      if (result) {
        renderConvText(side === "top" ? "bottom" : "top", result);
      }
    }
  };

  rec.onend = () => {
    stopConvRec(side);
  };

  rec.onerror = (e) => {
    console.warn("[OpenTrad] Speech error:", e.error);
    stopConvRec(side);
  };

  try { rec.start(); } catch (e) { stopConvRec(side); }
}

convMicTop.addEventListener("click", () => {
  if (convListeningTop) stopConvRec("top");
  else startConvRec("top");
});

convMicBottom.addEventListener("click", () => {
  if (convListeningBottom) stopConvRec("bottom");
  else startConvRec("bottom");
});
