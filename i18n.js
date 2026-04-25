/* =============================================================
   OPENTRAD — i18n / Localisation
   All UI translations live here.

   Supported languages:
     fr  — Français         (~320M speakers)
     en  — English          (~1.5B speakers)
     zh  — 中文 (Mandarin)  (~1.1B speakers)
     es  — Español          (~560M speakers)
     hi  — हिन्दी (Hindi)    (~600M speakers)
     eu  — Euskara (Basque) (regional — original language)

   Auto-detection: on first visit navigator.language is mapped
   to the closest supported lang (see detectLang()).
   Manual override: saved in localStorage via Settings.
============================================================= */

const I18N = {

  /* ── French ──────────────────────────────────────────────── */
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

  /* ── English ─────────────────────────────────────────────── */
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

  /* ── Mandarin Chinese ────────────────────────────────────── */
  zh: {
    historyTabAll:    "最近",
    historyTabFav:    "⭐ 收藏",
    favEmpty:         "暂无收藏记录。",
    heroTitle:        "即时",
    heroAccent:       "翻译",
    heroSub:          "拼写检查 · 三重 API · 离线模式 · 拖放文件",
    sourcePlaceholder:"在此输入或拖入文件…",
    targetPlaceholder:"翻译结果将显示在这里…",
    translating:      "翻译中…",
    history:          "历史记录",
    historyTitle:     "最近 10 条翻译",
    clearHistory:     "全部清除",
    historyEmpty:     "没有保存的翻译记录。",
    settingsHeading:  "设置",
    settingsLang:     "界面语言",
    settingsTheme:    "界面风格",
    settingsDark:     "深色模式",
    settingsAccent:   "强调色",
    modeLight:        "浅色",
    modeDark:         "深色",
    modeAuto:         "自动（系统）",
    connected:        "已连接",
    connRestored:     "连接已恢复",
    connLost:         "连接已断开",
    offline:          "离线",
    installMsg:       "📲 将 OpenTrad 安装为应用",
    install:          "安装",
    ocrLoading:       "提取中…",
    ocrDone:          "提取完成！",
    allApiFailed:     "所有翻译服务均不可用，请稍后重试。",
    settingsApi:      "翻译 API",
    settingsApiHint:  "自动模式下，应用将依次尝试每个服务，直到成功为止。",
    justNow:          "刚刚",
    minutesAgo:       (m) => `${m} 分钟前`,
    hoursAgo:         (h) => `${h} 小时前`,
    daysAgo:          (d) => `${d} 天前`,
  },

  /* ── Spanish ─────────────────────────────────────────────── */
  es: {
    historyTabAll:    "Reciente",
    historyTabFav:    "⭐ Favoritos",
    favEmpty:         "No hay favoritos guardados.",
    heroTitle:        "Traduce",
    heroAccent:       " al instante",
    heroSub:          "Corrección ortográfica · Triple API · Sin conexión · Arrastrar y soltar",
    sourcePlaceholder:"Escribe o arrastra un archivo aquí…",
    targetPlaceholder:"La traducción aparecerá aquí…",
    translating:      "Traduciendo…",
    history:          "Historial",
    historyTitle:     "Últimas 10 traducciones",
    clearHistory:     "Borrar todo",
    historyEmpty:     "No hay traducciones guardadas.",
    settingsHeading:  "Ajustes",
    settingsLang:     "Idioma de la interfaz",
    settingsTheme:    "Estilo de la interfaz",
    settingsDark:     "Modo oscuro",
    settingsAccent:   "Color de acento",
    modeLight:        "Claro",
    modeDark:         "Oscuro",
    modeAuto:         "Auto (sistema)",
    connected:        "Conectado",
    connRestored:     "Conexión restablecida",
    connLost:         "Conexión perdida",
    offline:          "Sin conexión",
    installMsg:       "📲 Instalar OpenTrad como aplicación",
    install:          "Instalar",
    ocrLoading:       "Extrayendo…",
    ocrDone:          "¡Extraído!",
    allApiFailed:     "Todos los servicios de traducción no están disponibles. Inténtalo más tarde.",
    settingsApi:      "API de traducción",
    settingsApiHint:  "En modo Auto, la app prueba cada servicio uno tras otro si el anterior falla.",
    justNow:          "Ahora mismo",
    minutesAgo:       (m) => `Hace ${m} min`,
    hoursAgo:         (h) => `Hace ${h} h`,
    daysAgo:          (d) => `Hace ${d} d`,
  },

  /* ── Hindi ───────────────────────────────────────────────── */
  hi: {
    historyTabAll:    "हाल का",
    historyTabFav:    "⭐ पसंदीदा",
    favEmpty:         "कोई पसंदीदा सहेजा नहीं गया।",
    heroTitle:        "अनुवाद करें",
    heroAccent:       " तुरंत",
    heroSub:          "वर्तनी जाँच · ट्रिपल API · ऑफ़लाइन · खींचें और छोड़ें",
    sourcePlaceholder:"यहाँ टाइप करें या फ़ाइल छोड़ें…",
    targetPlaceholder:"अनुवाद यहाँ दिखाई देगा…",
    translating:      "अनुवाद हो रहा है…",
    history:          "इतिहास",
    historyTitle:     "पिछले 10 अनुवाद",
    clearHistory:     "सब हटाएँ",
    historyEmpty:     "कोई अनुवाद सहेजा नहीं गया।",
    settingsHeading:  "सेटिंग्स",
    settingsLang:     "इंटरफ़ेस भाषा",
    settingsTheme:    "इंटरफ़ेस शैली",
    settingsDark:     "डार्क मोड",
    settingsAccent:   "एक्सेंट रंग",
    modeLight:        "लाइट",
    modeDark:         "डार्क",
    modeAuto:         "स्वतः (सिस्टम)",
    connected:        "कनेक्टेड",
    connRestored:     "कनेक्शन बहाल हुआ",
    connLost:         "कनेक्शन खो गया",
    offline:          "ऑफ़लाइन",
    installMsg:       "📲 OpenTrad को ऐप के रूप में इंस्टॉल करें",
    install:          "इंस्टॉल करें",
    ocrLoading:       "निकाला जा रहा है…",
    ocrDone:          "निकाला गया!",
    allApiFailed:     "सभी अनुवाद सेवाएँ अनुपलब्ध हैं। बाद में पुनः प्रयास करें।",
    settingsApi:      "अनुवाद API",
    settingsApiHint:  "स्वतः मोड में, ऐप प्रत्येक सेवा को क्रम से आज़माता है यदि पिछली विफल हो जाए।",
    justNow:          "अभी",
    minutesAgo:       (m) => `${m} मिनट पहले`,
    hoursAgo:         (h) => `${h} घंटे पहले`,
    daysAgo:          (d) => `${d} दिन पहले`,
  },

  /* ── Basque (Euskara) ────────────────────────────────────── */
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

/* =============================================================
   LANGUAGE AUTO-DETECTION
   Maps navigator.language (BCP-47) to a supported UI lang.
   Only runs on first visit (no lang saved in prefs yet).
============================================================= */
function detectLang() {
  const nav = (navigator.language || navigator.userLanguage || "en").toLowerCase();
  if (nav.startsWith("fr"))  return "fr";
  if (nav.startsWith("zh"))  return "zh";
  if (nav.startsWith("es"))  return "es";
  if (nav.startsWith("hi"))  return "hi";
  if (nav.startsWith("eu"))  return "eu";
  return "en"; // default fallback
}

/* Export to global scope for app.js */
window.I18N       = I18N;
window.detectLang = detectLang;
