# Buzl Fashion Helper
## Agentic Chrome Extension Development Blueprint

# PROJECT OVERVIEW

Buzl Fashion Helper is a Chrome Side Panel Extension designed for high-speed fashion product workflows.

The extension acts as a persistent right-side productivity cockpit for:
- Fashion catalog operations
- Shopify uploads
- WooCommerce uploads
- AI image pipelines
- Google Drive asset management
- Product workflow tracking

The extension must:
- Dock to the right side of Chrome
- Persist across tabs
- Load product data from Google Sheets CSV
- Track all actions
- Save everything locally
- Restore workflow automatically

---

# CORE WORKFLOW

Google Sheet
↓
Published CSV URL
↓
Buzl Fashion Helper
↓
Auto Parse CSV
↓
Sidebar Workflow
↓
Track Actions
↓
Local Persistence
↓
Export JSON Backup

---

# CORE FEATURES

## Chrome Side Panel
Use chrome.sidePanel API.

Requirements:
- Right docked panel
- Persistent across tabs
- Resizable
- Fast rendering
- Minimal modern UI

## Google Sheet CSV Loader
User pastes Google Sheet URL.
Extension converts:
https://docs.google.com/spreadsheets/d/XXXX/edit
into:
https://docs.google.com/spreadsheets/d/XXXX/export?format=csv

Then:
- Fetch CSV
- Parse data
- Validate rows
- Store locally

## Required CSV Columns
- product_name
- drive_folder
- reference_link

## Product Card UI
Each product card must contain:
- Completion checkbox
- Product name
- Drive folder URL
- Reference link
- Copy buttons
- Open buttons
- Action status indicators
- Timestamp
- Notes section

## Copy Actions
Required buttons:
- Copy Product Name
- Copy Drive Folder URL
- Copy Reference Link
- Open Drive Folder
- Open Reference Link

## Action Tracking
Track:
- nameCopied
- driveCopied
- referenceCopied
- driveOpened
- referenceOpened
- completed

Every action must:
- Auto save instantly
- Persist after browser restart

## Local Storage
Use chrome.storage.local.

Persist:
- Imported CSV data
- Product statuses
- Notes
- Progress
- Filters
- Last selected product
- Scroll position

## Filters
Required filters:
- All
- Pending
- In Progress
- Completed
- Rework

## Search
Search by:
- Product name
- Folder URL
- Reference URL

## Summary Dashboard
Display:
- Total products
- Completed count
- Pending count
- Progress percentage

## Export JSON
Export:
- Workflow state
- Statuses
- Notes
- Timestamps

Allow:
- Re-import backup
- Merge projects

---

# TECH STACK

| Layer | Technology |
|---|---|
| UI | React |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| CSV Parsing | PapaParse |
| Validation | Zod |
| Virtualization | react-window |
| Notifications | Sonner |
| Icons | Lucide |
| Types | TypeScript |
| Extension | Manifest V3 |

---

# FOLDER STRUCTURE

buzl-fashion-helper/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── sidepanel/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── styles/
├── package.json
├── vite.config.ts
└── tailwind.config.ts

---

# MANIFEST PERMISSIONS

{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "sidePanel",
    "tabs",
    "clipboardWrite"
  ],
  "host_permissions": [
    "https://docs.google.com/*"
  ]
}

---

# AGENTIC DEVELOPMENT STRATEGY

DO NOT build entire project at once.

Use modular AI-driven development phases.

Each phase must:
- have a specific scope
- generate reusable architecture
- avoid duplicated logic
- follow senior engineering practices

---

# PHASE 1 — FOUNDATION SETUP

PROMPT:

Create a production-grade Chrome extension project called "Buzl Fashion Helper".

Requirements:
- React
- Vite
- Tailwind CSS
- Zustand
- PapaParse
- Manifest V3
- Chrome SidePanel API
- TypeScript

Setup:
- proper folder architecture
- reusable component structure
- global types
- utility helpers
- storage service layer
- extension manifest
- Vite extension build config

The extension should support:
- right side panel
- persistent local storage
- scalable architecture
- future API integrations

Generate:
- folder structure
- package.json
- vite.config
- manifest.json
- Tailwind config
- initial React app
- sidepanel entry
- extension icons placeholders

Follow senior-level engineering practices.

---

# PHASE 2 — GOOGLE SHEET CSV ENGINE

PROMPT:

Build a Google Sheet CSV import system.

Features:
- Accept Google Sheet URL input
- Convert share URL into CSV export URL
- Validate URL format
- Fetch CSV
- Parse CSV using PapaParse
- Normalize rows
- Generate internal product IDs
- Handle invalid rows
- Handle empty columns
- Store parsed data in Zustand

Required columns:
- product_name
- drive_folder
- reference_link

Add:
- loading state
- import success state
- retry state
- error handling
- CSV validation UI

Create reusable utility functions.

Generate:
- csvService.ts
- sheetUtils.ts
- validation helpers
- Zustand store integration
- import UI component

---

# PHASE 3 — SIDEBAR UI SYSTEM

PROMPT:

Create a modern Chrome sidepanel UI for Buzl Fashion Helper.

Requirements:
- responsive sidebar
- clean industrial fashion-tech aesthetic
- Tailwind CSS only
- support light/dark mode

Sections:
1. Header
2. Import area
3. Search/filter area
4. Summary dashboard
5. Product list
6. Footer progress bar

Add:
- sticky header
- sticky filters
- scrollable virtualized list
- compact mode
- animations

Style inspiration:
- Linear
- Framer
- Shopify Polaris
- Notion

Generate reusable components.

---

# PHASE 4 — PRODUCT WORKFLOW ENGINE

PROMPT:

Build reusable ProductCard components.

Each card must support:
- completion checkbox
- product name
- drive folder URL
- reference URL
- copy actions
- open link actions
- action status indicators
- notes
- timestamps

Track statuses:
- nameCopied
- driveCopied
- referenceCopied
- driveOpened
- referenceOpened
- completed

Requirements:
- auto-save every action
- local persistence
- optimistic UI updates
- toast notifications
- keyboard shortcuts

Generate:
- ProductCard.tsx
- action handlers
- clipboard service
- keyboard manager
- storage sync logic

---

# PHASE 5 — STORAGE ENGINE

PROMPT:

Create a scalable local persistence layer for the extension.

Use:
- chrome.storage.local

Requirements:
- save only modified products
- debounce writes
- restore session on startup
- restore filters
- restore selected product
- restore scroll position

Add:
- storage versioning
- migration support
- corruption recovery
- backup snapshots

Generate:
- storageService.ts
- persistence middleware
- recovery utilities

---

# PHASE 6 — FILTER + SEARCH SYSTEM

PROMPT:

Build a performant search and filter system.

Filters:
- all
- pending
- in progress
- completed
- rework

Search:
- product name
- folder link
- reference link

Requirements:
- instant filtering
- debounce search
- virtualized rendering
- optimized memoization

Generate reusable hooks and selectors.

---

# PHASE 7 — EXPORT ENGINE

PROMPT:

Build JSON export/import functionality.

Requirements:
- export workflow state
- export timestamps
- export statuses
- export notes

Support:
- re-import backup
- merge projects
- duplicate detection

Generate:
- export service
- import restore service
- backup utilities

---

# PHASE 8 — PERFORMANCE OPTIMIZATION

PROMPT:

Optimize the extension for large datasets.

Requirements:
- support 10,000+ products
- reduce re-renders
- virtualized list rendering
- lazy loading
- memoized selectors
- optimized Zustand usage

Audit:
- performance bottlenecks
- unnecessary state updates
- memory usage

Refactor where needed.

---

# PHASE 9 — UX POLISH

PROMPT:

Enhance UX polish for the extension.

Add:
- smooth transitions
- loading skeletons
- hover interactions
- empty states
- keyboard navigation
- accessibility improvements
- compact mode
- dark mode
- success animations
- action indicators

Maintain minimal professional UI.

---

# PHASE 10 — PRODUCTION AUDIT

PROMPT:

Audit the Chrome extension for production readiness.

Check:
- manifest permissions
- CSP compatibility
- memory leaks
- sidepanel stability
- storage performance
- TypeScript issues
- accessibility
- error boundaries

Generate:
- production checklist
- security recommendations
- extension packaging steps

---

# CRITICAL AGENTIC RULES

## Never Build Everything at Once
Always modularize.

## Force Refactoring
Analyze the current codebase and refactor for:
- maintainability
- scalability
- performance
- reduced duplication
- reusable architecture

## Use Senior-Level Engineering Constraints
- Avoid shortcuts
- Prefer scalable reusable architecture

## Use Architecture Reviews
Review the current architecture.
Identify future scaling issues.
Suggest improvements before continuing.

## Dependency Audits
Review dependencies.
Remove unnecessary packages.
Suggest lighter alternatives.

---

# FUTURE FEATURES

## Google Drive API Integration
Auto-fetch:
- thumbnails
- image counts
- missing assets

## Shopify Automation
Generate:
- handles
- tags
- descriptions
- alt text

## AI Workflow Assistant
AI can:
- detect missing links
- detect duplicate folders
- auto-classify products
- suggest next actions

---

# LONG TERM VISION

Chrome Extension
↓
Local Workflow Engine
↓
Cloud Sync
↓
Team Collaboration
↓
AI Production Assistant

---

# FINAL DEVELOPMENT PHILOSOPHY

Your role:
- Vision director
- Workflow architect
- Product strategist

AI role:
- System architect
- Frontend engineer
- Extension specialist
- Refactor engine
- QA assistant

You guide the system.
The agents construct the machinery.
