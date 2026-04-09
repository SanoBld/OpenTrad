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
}

/* ----------------------------------------------------------
   9. LOADING / ERROR / BADGE HELPERS
---------------------------------------------------------- */
function showLoading() {
  loadingOverlay.classList.add("active");
  loadingOverlay.setAttribute("aria-hidden", "false");
  clearError(); hideBadge();
}
function hideLoading() {
  loadingOverlay.classList.remove("active");
  loadingOverlay.setAttribute("aria-hidden", "true");
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
  if (!res.ok) throw new Error(`Google API HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !data[0]) throw new Error("Google: unexpected response");
  const translated = data[0].filter(Boolean).map(c => c[0]).join("");
  if (!translated) throw new Error("Google: empty translation");
  return translated;
}

async function translateMyMemory(text, from, to) {
  const langPair = `${from === "auto" ? "en" : from}|${to}`;
  const url = `https://api.mymemory.translated.net/get`
            + `?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(`MyMemory: ${data.responseDetails || data.responseStatus}`);
  const translated = data.responseData?.translatedText;
  if (!translated) throw new Error("MyMemory: empty");
  return translated;
}

async function translateLibre(text, from, to) {
  const res = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: from === "auto" ? "auto" : from, target: to, format: "text" }),
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const data = await res.json();
  if (!data.translatedText) throw new Error("LibreTranslate: empty");
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

    try   { result = await translateGoogle(text, from, to);    apiUsed = "google"; }
    catch { /* fallthrough */ }

    if (!result) {
      try   { result = await translateMyMemory(text, from, to); apiUsed = "mymemory"; }
      catch { /* fallthrough */ }
    }

    if (!result) {
      try   { result = await translateLibre(text, from, to);   apiUsed = "libre"; }
      catch { /* fallthrough */ }
    }

    if (result) {
      targetText.textContent = result;
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

  clearTimeout(debounceTimer);
  translate();
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
   17. KEYBOARD SHORTCUTS
---------------------------------------------------------- */
sourceText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    clearTimeout(debounceTimer);
    translate();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (historyPanel.classList.contains("open"))  closeHistory();
    if (settingsModal.classList.contains("open")) closeSettings();
    if (document.body.classList.contains("focus-mode")) toggleFocusMode();
  }
  // Ctrl+Shift+S → swap languages
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    swapBtn.click();
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
  historyBackdrop.classList.add("visible");
  closeHistoryBtn.focus();
  document.body.style.overflow = "hidden";
}

function closeHistory() {
  historyPanel.classList.remove("open");
  historyPanel.setAttribute("aria-hidden", "true");
  historyBackdrop.classList.remove("visible");
  document.body.style.overflow = "";
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
    setTimeout(() => { spellStatus.textContent = ""; }, 2000);
  }
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
      setTimeout(() => { spellStatus.textContent = ""; }, 3000);
    } else {
      const parts = [];
      if (errorCount > 0) parts.push(`${errorCount} faute${errorCount > 1 ? "s" : ""}`);
      if (warnCount  > 0) parts.push(`${warnCount} suggestion${warnCount > 1 ? "s" : ""}`);
      spellStatus.textContent = "⚠ " + parts.join(", ");
      spellStatus.classList.add("has-errors");
      renderSpellPanel(text, spellErrors);
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
  let html = `<strong>${err.message}</strong>`;
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
  updateCharCount();  // Reset char counter
  syncSettingsUI();   // Sync settings buttons
  initHistoryTabs();  // Wire history tab buttons

  if (sourceText.value) updateCharCount();

  // Ping-based connection check on load (3s auto-dismiss if connected)
  checkInitialConnection();
}

init();
