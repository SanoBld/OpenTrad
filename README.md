# 🌐 OpenTrad

**OpenTrad** is an ultra-modern, high-performance Translation Single Page Application (SPA). It combines a sleek, adaptive interface with a robust "Triple-Fallback" API system to ensure seamless, free translation anytime, anywhere.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg)

---

## ✨ Key Features

### 🚀 Smart Translation Engine
- **Triple-API Fallback:** Automatically switches between **Google Translate**, **MyMemory**, and **LibreTranslate** if one service fails or reaches its limit.
- **Auto-Detect:** Instantly identifies the source language.
- **Debounced Input:** Optimized API calls that trigger 500ms after you stop typing for a fluid experience.

### 🎨 Premium UI/UX (Adaptive Themes)
- **Six Distinct Themes:** - **Glassmorphism:** Elegant transparency and blur.
  - **Neumorphism:** Soft, sculpted UI.
  - **Midnight Aurora:** Dark mode with animated colorful glows.
  - **Bento:** Structured, grid-based layout.
  - **Paper White:** Minimalist and professional.
  - **Classic (V1):** Bold, neo-brutalist aesthetic.
- **Theme Modes:** Every theme supports **Light**, **Dark**, and **Auto (System)** modes.
- **Custom Accents:** Pick your favorite accent color (Blue, Purple, Green, Red).

### 📄 Document & Image Processing (OCR)
- **File Translation:** Upload **PDFs** or **Images** (JPG/PNG).
- **Text Extraction:** Uses `Tesseract.js` for OCR and `PDF.js` to extract text directly into the translator.

### 🛠 Practical Tools
- **Translation History:** Saves your recent translations locally with a "Favorite" (Star) system.
- **Text-to-Speech (TTS):** Listen to translations using high-quality native browser voices.
- **Multi-Language Interface:** The UI is available in **English**, **French**, and **Basque (Euskara)**.
- **Offline Notifications:** Smart connectivity check that notifies you only when status changes.

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Variables), Vanilla JavaScript (ES6+).
- **Icons:** [Lucide Icons](https://lucide.dev/).
- **OCR/PDF:** [Tesseract.js](https://tesseract.projectnaptha.com/) & [PDF.js](https://mozilla.github.io/pdf.js/).
- **PWA:** Service Workers and Manifest for mobile installation.

---

📱 Progressive Web App (PWA)
OpenTrad is fully installable on iOS, Android, and Desktop.

It works offline for previously cached assets.

Includes a custom install banner for easy access.

---

🌍 Localization
You can switch the interface language in the Settings (Gear Icon):

🇺🇸 English

🇫🇷 Français

🇪🇺 Euskara (Basque)

---

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

OpenTrad — Translating the world, one pixel at a time.