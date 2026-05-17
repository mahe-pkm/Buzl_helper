# Buzl Fashion Helper — Setup Guide

## Quick Install (No Build Needed)
The `dist/` folder is already compiled and ready to load.

1. Open **Edge** → `edge://extensions` (or Chrome → `chrome://extensions`)
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder inside `buzl-fashion-helper/`
5. Click the extension icon → Open Side Panel

---

## Full Dev Setup (To Continue Development)

### Requirements
- Node.js 18+ — https://nodejs.org
- Any Chromium browser (Edge, Chrome, Brave, etc.)

### Steps

```bash
# 1. Navigate to project folder
cd buzl-fashion-helper

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# Opens at http://localhost:5173/

# 4. Build production extension
npm run build
# Output goes to dist/
```

### Load in Browser (Dev Mode)
1. `edge://extensions` → Enable Developer Mode
2. Load unpacked → select the `dist/` folder
3. After any code change, run `npm run build` and click the reload icon on the extension

---

## CSV Format
The extension accepts two CSV formats:

**New format (Google Drive export style):**
```
Name, Path, Type, View Link, Download Link
Lavender silk Blend, Lavender silk Blend, Folder, https://drive.google.com/..., 
```

**Legacy format:**
```
product_name, drive_folder, reference_link
Lavender silk Blend, https://drive.google.com/..., https://ref-link.com
```

---

## Project Structure
```
buzl-fashion-helper/
├── src/
│   ├── components/
│   │   ├── ImportSection.tsx   ← Upload + header with reference URL
│   │   ├── Dashboard.tsx       ← Progress + search + filters
│   │   ├── ProductCard.tsx     ← Individual product card
│   │   └── ProductList.tsx     ← Virtualized product list
│   ├── store/
│   │   └── useCsvStore.ts      ← Zustand state (persisted to localStorage)
│   ├── utils/
│   │   └── csvParser.ts        ← CSV import + export logic
│   ├── types/
│   │   └── index.ts            ← TypeScript interfaces
│   └── App.tsx                 ← Root component
├── dist/                       ← Built extension (load this in browser)
├── manifest.json               ← Chrome Extension Manifest v3
├── package.json
└── vite.config.ts
```

---

## Key Features
- ✅ Upload CSV via drag & drop or click
- ✅ Global reference URL pinned in header with one-click copy
- ✅ Product cards with name copy, drive link open/copy, reference link
- ✅ Progress tracker (0% → 100% as you complete items)
- ✅ Search + filter (All / Pending / Completed)
- ✅ Export current state back to CSV
- ✅ Notes per product (auto-saved)
- ✅ Fully offline — no external APIs
- ✅ Works on Edge, Chrome, Brave, and all Chromium-based browsers
