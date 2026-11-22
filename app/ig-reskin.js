#!/usr/bin/env node
/**
 * ig-reskin.js — one-shot Instagram re-skin for page.tsx
 *
 *   node ig-reskin.js ./page.tsx          # applies (creates .ig-backup)
 *   node ig-reskin.js ./page.tsx --dry    # preview only
 *
 * Preserves: Netflix red, Claude orange, Xeno blue, Twitter verified blue.
 * Rewrites: every other inline hex / rgba literal → IG palette.
 * Replaces: the entire GlobalAppStyles component with the IG CSS.
 */

const fs = require("fs");
const path = require("path");

const argPath = process.argv[2] || "./page.tsx";
const dryRun = process.argv.includes("--dry");
const abs = path.resolve(argPath);

if (!fs.existsSync(abs)) {
  console.error("File not found: " + abs);
  process.exit(1);
}

let src = fs.readFileSync(abs, "utf8");
const original = src;

// ============================================================
// 1. Preserve brand colors
// ============================================================
const PRESERVED = [
  "#E50914", "#B81D24",
  "#cc5500", "#b34700", "#d97706",
  "#007bff", "#0069d9",
  "#1d9bf0",
  "#291508",
];
const brandMask = {};
PRESERVED.forEach((hex, i) => {
  const t = "__BPROT_" + i + "__";
  brandMask[t] = hex;
  const re = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  src = src.replace(re, t);
});

// ============================================================
// 2. Hex color map → Instagram palette
// ============================================================
const HEX_MAP = {
  // Blacks
  "#050811": "#000000", "#05080f": "#000000", "#05080F": "#000000",
  "#060a12": "#000000", "#060A12": "#000000",
  "#060a14": "#000000", "#060A14": "#000000",
  "#070b14": "#000000", "#070B14": "#000000",
  "#080c16": "#000000", "#080C16": "#000000",
  "#080d1a": "#000000", "#080D1A": "#000000",
  "#080e1a": "#000000", "#080E1A": "#000000",
  "#090e16": "#000000", "#090E16": "#000000",
  "#090f17": "#000000", "#090F17": "#000000",
  "#0a0e16": "#000000", "#0A0E16": "#000000",
  "#0a0f18": "#000000", "#0A0F18": "#000000",
  "#0a0f1d": "#000000", "#0A0F1D": "#000000",
  "#0a1018": "#000000", "#0A1018": "#000000",
  "#0a101b": "#000000", "#0A101B": "#000000",
  "#0a111a": "#000000", "#0A111A": "#000000",
  "#0b1120": "#000000", "#0B1120": "#000000",
  "#0b121e": "#000000", "#0B121E": "#000000",
  "#0b1329": "#000000", "#0B1329": "#000000",
  "#0c1322": "#000000", "#0C1322": "#000000",
  "#0d0f1d": "#000000", "#0D0F1D": "#000000",
  "#0d1624": "#000000", "#0D1624": "#000000",
  "#0e1726": "#000000", "#0E1726": "#000000",
  "#0f1622": "#000000", "#0F1622": "#000000",
  "#020617": "#000000",
  "#111827": "#121212",

  // Elevated
  "#101823": "#121212",
  "#141f2c": "#121212", "#141F2C": "#121212",
  "#151f2e": "#121212", "#151F2E": "#121212",
  "#1a2333": "#121212", "#1A2333": "#121212",
  "#0f172a": "#121212", "#0F172A": "#121212",
  "#1e293b": "#262626", "#1E293B": "#262626",

  // Amber / gold → IG gradient stops
  "#f59e0b": "#E1306C", "#F59E0B": "#E1306C",
  "#d97706": "#C13584", "#D97706": "#C13584",
  "#fbbf24": "#FCAF45", "#FBBF24": "#FCAF45",
  "#fde047": "#FFDC80", "#FDE047": "#FFDC80",
  "#fcd34d": "#FCAF45", "#FCD34D": "#FCAF45",
  "#fef08a": "#FFDC80", "#FEF08A": "#FFDC80",
  "#b45309": "#833AB4", "#B45309": "#833AB4",
  "#78350f": "#405DE6", "#78350F": "#405DE6",
  "#f97316": "#F77737", "#F97316": "#F77737",

  // Purple
  "#a855f7": "#C13584", "#A855F7": "#C13584",
  "#8b5cf6": "#833AB4", "#8B5CF6": "#833AB4",
  "#c084fc": "#E1306C", "#C084FC": "#E1306C",
  "#d8b4fe": "#F77737", "#D8B4FE": "#F77737",
  "#e9d5ff": "#FFDC80", "#E9D5FF": "#FFDC80",
  "#9333ea": "#833AB4", "#9333EA": "#833AB4",
  "#7c3aed": "#833AB4", "#7C3AED": "#833AB4",
  "#6366f1": "#5851DB", "#6366F1": "#5851DB",

  // Red
  "#ef4444": "#ED4956", "#EF4444": "#ED4956",
  "#dc2626": "#ED4956", "#DC2626": "#ED4956",
  "#b91c1c": "#C13584", "#B91C1C": "#C13584",
  "#f87171": "#ED4956", "#F87171": "#ED4956",
  "#fca5a5": "#F77737", "#FCA5A5": "#F77737",
  "#fecaca": "#FFDC80", "#FECACA": "#FFDC80",
  "#7f1d1d": "#833AB4", "#7F1D1D": "#833AB4",
  "#991b1b": "#C13584", "#991B1B": "#C13584",
  "#450a0a": "#405DE6", "#450A0A": "#405DE6",

  // Blue / cyan
  "#38bdf8": "#0095F6", "#38BDF8": "#0095F6",
  "#0ea5e9": "#0095F6", "#0EA5E9": "#0095F6",
  "#0284c7": "#0095F6", "#0284C7": "#0095F6",
  "#3b82f6": "#405DE6", "#3B82F6": "#405DE6",
  "#60a5fa": "#0095F6", "#60A5FA": "#0095F6",
  "#7dd3fc": "#0095F6", "#7DD3FC": "#0095F6",
  "#0c4a6e": "#1A1A1A", "#0C4A6E": "#1A1A1A",
  "#1d4ed8": "#405DE6", "#1D4ED8": "#405DE6",

  // Green
  "#10b981": "#58C322", "#10B981": "#58C322",
  "#059669": "#58C322",
  "#34d399": "#58C322", "#34D399": "#58C322",
  "#4ade80": "#58C322", "#4ADE80": "#58C322",
  "#6ee7b7": "#58C322", "#6EE7B7": "#58C322",
  "#22c55e": "#58C322", "#22C55E": "#58C322",
  "#16a34a": "#58C322", "#16A34A": "#58C322",
  "#047857": "#58C322",
  "#065f46": "#58C322", "#065F46": "#58C322",

  // Pink
  "#ec4899": "#E1306C", "#EC4899": "#E1306C",
  "#f472b6": "#E1306C", "#F472B6": "#E1306C",
  "#fbcfe8": "#F77737", "#FBCFE8": "#F77737",
  "#f43f5e": "#ED4956", "#F43F5E": "#ED4956",
  "#db2777": "#E1306C", "#DB2777": "#E1306C",
  "#be185d": "#C13584", "#BE185D": "#C13584",

  // Greys
  "#64748b": "#737373", "#64748B": "#737373",
  "#94a3b8": "#A8A8A8", "#94A3B8": "#A8A8A8",
  "#cbd5e1": "#F5F5F5", "#CBD5E1": "#F5F5F5",
  "#e2e8f0": "#F5F5F5", "#E2E8F0": "#F5F5F5",
  "#f1f5f9": "#F5F5F5", "#F1F5F9": "#F5F5F5",
  "#f8fafc": "#F5F5F5", "#F8FAFC": "#F5F5F5",
  "#475569": "#363636",
  "#334155": "#363636",
};

for (const [from, to] of Object.entries(HEX_MAP)) {
  if (from.toLowerCase() === to.toLowerCase()) continue;
  const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  src = src.replace(re, to);
}

// ============================================================
// 3. rgba prefix map
// ============================================================
const RGBA_MAP = {
  "rgba(15, 23, 42,": "rgba(0, 0, 0,",
  "rgba(15,23,42,": "rgba(0, 0, 0,",
  "rgba(30, 41, 59,": "rgba(18, 18, 18,",
  "rgba(30,41,59,": "rgba(18, 18, 18,",
  "rgba(56, 189, 248,": "rgba(0, 149, 246,",
  "rgba(56,189,248,": "rgba(0, 149, 246,",
  "rgba(168, 85, 247,": "rgba(193, 53, 132,",
  "rgba(168,85,247,": "rgba(193, 53, 132,",
  "rgba(245, 158, 11,": "rgba(225, 48, 108,",
  "rgba(245,158,11,": "rgba(225, 48, 108,",
  "rgba(239, 68, 68,": "rgba(237, 73, 86,",
  "rgba(239,68,68,": "rgba(237, 73, 86,",
  "rgba(16, 185, 129,": "rgba(88, 195, 34,",
  "rgba(16,185,129,": "rgba(88, 195, 34,",
  "rgba(236, 72, 153,": "rgba(225, 48, 108,",
  "rgba(236,72,153,": "rgba(225, 48, 108,",
  "rgba(59, 130, 246,": "rgba(64, 93, 230,",
  "rgba(59,130,246,": "rgba(64, 93, 230,",
  "rgba(234, 179, 8,": "rgba(252, 175, 69,",
  "rgba(234,179,8,": "rgba(252, 175, 69,",
  "rgba(251, 191, 36,": "rgba(252, 175, 69,",
  "rgba(251,191,36,": "rgba(252, 175, 69,",
  "rgba(220, 38, 38,": "rgba(237, 73, 86,",
  "rgba(220,38,38,": "rgba(237, 73, 86,",
  "rgba(127, 29, 29,": "rgba(131, 58, 180,",
  "rgba(127,29,29,": "rgba(131, 58, 180,",
  "rgba(88, 28, 135,": "rgba(193, 53, 132,",
  "rgba(88,28,135,": "rgba(193, 53, 132,",
  "rgba(67, 56, 202,": "rgba(88, 81, 219,",
  "rgba(67,56,202,": "rgba(88, 81, 219,",
  "rgba(217, 119, 6,": "rgba(193, 53, 132,",
  "rgba(217,119,6,": "rgba(193, 53, 132,",
};
for (const [from, to] of Object.entries(RGBA_MAP)) src = src.split(from).join(to);

// ============================================================
// 4. Restore preserved brand colors
// ============================================================
for (const [t, hex] of Object.entries(brandMask)) src = src.split(t).join(hex);

// ============================================================
// 5. Replace GlobalAppStyles with IG version
// ============================================================
const NEW_CSS = String.raw`

/* ============================================================
   INSTAGRAM-STYLE UI SKIN
   ============================================================ */

@keyframes marqueeSmooth {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}
@keyframes igFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

:root {
  --ig-gradient: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  --ig-gradient-full: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D, #F56040, #F77737, #FCAF45, #FFDC80);
  --ig-blue: #0095f6;
  --ig-blue-hover: #1877f2;
  --ig-red: #ed4956;
  --ig-green: #58c322;
  --ig-yellow: #ffd600;

  --ig-bg: #000000;
  --ig-surface-card: #121212;
  --ig-surface-elevated: #1a1a1a;
  --ig-surface-hover: #1a1a1a;
  --ig-border: #262626;
  --ig-border-strong: #363636;

  --ig-text: #f5f5f5;
  --ig-text-secondary: #a8a8a8;
  --ig-text-muted: #737373;

  --ig-radius: 8px;
  --ig-radius-lg: 12px;
  --ig-radius-xl: 16px;

  color-scheme: dark;

  --ast-bg: var(--ig-bg);
  --ast-surface-solid: var(--ig-surface-card);
  --ast-surface-hover: var(--ig-surface-hover);
  --ast-border: var(--ig-border);
  --ast-border-strong: var(--ig-border-strong);
  --ast-text: var(--ig-text);
  --ast-text-muted: var(--ig-text-secondary);
  --ast-accent: var(--ig-blue);
  --ast-accent-strong: var(--ig-blue-hover);
  --ast-accent-soft: rgba(0, 149, 246, 0.12);
}

html[data-theme="light"] {
  --ig-bg: #ffffff;
  --ig-surface-card: #ffffff;
  --ig-surface-elevated: #fafafa;
  --ig-surface-hover: #f2f2f2;
  --ig-border: #dbdbdb;
  --ig-border-strong: #c7c7c7;
  --ig-text: #262626;
  --ig-text-secondary: #8e8e8e;
  --ig-text-muted: #a8a8a8;
  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  background: var(--ig-bg) !important;
  color: var(--ig-text) !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  padding: 0;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  min-height: 100% !important;
  -webkit-overflow-scrolling: touch;
}
html[data-theme="light"] body { background: #ffffff !important; }

* { scrollbar-width: thin; scrollbar-color: rgba(115,115,115,0.4) transparent; }
*::-webkit-scrollbar { width: 6px; height: 6px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: rgba(115,115,115,0.4); border-radius: 999px; }

button { appearance: none; -webkit-appearance: none; border: none; outline: none; background: transparent; font-family: inherit; cursor: pointer; color: inherit; }

input, textarea, select {
  font-family: inherit;
  background: var(--ig-surface-elevated) !important;
  color: var(--ig-text) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius) !important;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}
input::placeholder, textarea::placeholder { color: var(--ig-text-muted); }
input:focus, textarea:focus, select:focus { border-color: var(--ig-border-strong) !important; box-shadow: none !important; }

.app-shell {
  min-height: 100vh;
  height: auto !important;
  background: var(--ig-bg) !important;
  color: var(--ig-text) !important;
  padding-bottom: 5rem;
  overflow: visible !important;
  position: relative;
  isolation: isolate;
}
.app-shell::before, .app-shell::after { content: none !important; }

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100% !important;
  min-height: 54px !important;
  padding: 8px 16px !important;
  background: var(--ig-bg) !important;
  border-bottom: 1px solid var(--ig-border) !important;
  box-shadow: none !important;
  position: sticky; top: 0; z-index: 40;
  gap: 12px !important;
  flex-wrap: nowrap !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
.logo {
  display: inline-flex !important;
  align-items: center; gap: 8px !important;
  flex: 1 1 auto !important; min-width: 0 !important;
  max-width: calc(100% - 200px) !important;
  text-decoration: none; white-space: nowrap !important;
}
.logo-icon {
  width: 36px !important; height: 36px !important;
  min-width: 36px !important; min-height: 36px !important;
  border-radius: 10px !important;
  background: var(--ig-gradient) !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  color: #ffffff !important;
  flex: 0 0 36px !important;
  filter: none !important;
  box-shadow: 0 2px 8px rgba(225,48,108,0.35) !important;
}
.logo-icon svg { width: 22px !important; height: 22px !important; color: #ffffff !important; }
.brand-name {
  display: inline-block !important;
  font-size: clamp(1rem, 2vw, 1.2rem) !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  line-height: 1 !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: var(--ig-text) !important;
  color: var(--ig-text) !important;
  text-shadow: none !important;
}
.temp-badge {
  display: inline-flex !important; align-items: center !important;
  height: 24px !important; padding: 0 8px !important;
  font-size: 10px !important; font-weight: 700 !important;
  letter-spacing: 0.4px !important; line-height: 1 !important;
  border-radius: 999px !important;
  background: rgba(0,149,246,0.15) !important;
  color: var(--ig-blue) !important;
  border: 1px solid rgba(0,149,246,0.3) !important;
  box-shadow: none !important;
  flex: 0 0 auto !important;
}
.navbar > div {
  display: flex !important; flex-direction: row !important;
  align-items: center !important; justify-content: flex-end !important;
  gap: 6px !important; flex: 0 0 auto !important;
  width: auto !important; min-width: 0 !important;
}
.navbar > div .sub,
.navbar > div .theme-toggle,
.navbar > div .icon-button {
  height: 34px !important; min-height: 34px !important; max-height: 34px !important;
  padding: 0 10px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 12px !important; font-weight: 600 !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  gap: 5px !important; margin: 0 !important;
}
.navbar > div .theme-toggle,
.navbar > div .icon-button {
  width: 34px !important; padding: 0 !important;
  background: transparent !important;
  border: 1px solid var(--ig-border) !important;
}
.navbar > div .theme-toggle:hover,
.navbar > div .icon-button:hover {
  background: var(--ig-surface-hover) !important;
  color: var(--ig-text) !important;
}
.icon-button { color: var(--ig-text) !important; padding: 6px !important; border-radius: var(--ig-radius) !important; background: transparent !important; display: flex; align-items: center; justify-content: center; transition: all 0.12s ease; }
.icon-button:hover { background: var(--ig-surface-hover) !important; }

@media (max-width: 720px) {
  .navbar { padding: 6px 10px !important; gap: 8px !important; min-height: 50px !important; }
  .navbar .logo { max-width: calc(100% - 140px) !important; gap: 6px !important; }
  .navbar .logo-icon { width: 32px !important; height: 32px !important; flex-basis: 32px !important; border-radius: 9px !important; }
  .navbar .logo-icon svg { width: 20px !important; height: 20px !important; }
  .navbar .brand-name { font-size: 1rem !important; }
  .navbar .temp-badge { display: none !important; }
  .navbar > div { gap: 4px !important; }
  .navbar > div .sub { height: 32px !important; padding: 0 8px !important; font-size: 11px !important; }
  .navbar > div .theme-toggle, .navbar > div .icon-button { width: 32px !important; height: 32px !important; }
}

.banner-pill {
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  box-shadow: none !important;
  border-radius: var(--ig-radius) !important;
  display: flex; align-items: center;
  padding: 6px 12px;
  max-width: 94%; width: 620px;
  margin: 10px auto 4px auto;
  position: relative; z-index: 30;
}
.banner-icon-bubble {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--ig-gradient) !important;
  border: none !important;
  display: flex; align-items: center; justify-content: center;
  color: #ffffff !important; box-shadow: none !important;
  flex-shrink: 0;
}
.banner-marquee-wrap { overflow: hidden !important; position: relative !important; flex-grow: 1 !important; margin: 0 10px !important; width: 100% !important; }
.banner-marquee-content {
  display: inline-flex !important; white-space: nowrap !important;
  will-change: transform !important;
  animation: marqueeSmooth 22s linear infinite !important;
  color: var(--ig-text) !important;
  font-size: 12.5px !important; font-weight: 500 !important; letter-spacing: 0 !important;
}
.banner-close-btn { color: var(--ig-text-secondary) !important; padding: 4px !important; border-radius: 50% !important; background: transparent !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; flex-shrink: 0 !important; }
.banner-close-btn:hover { color: var(--ig-text) !important; background: var(--ig-surface-hover) !important; }

.wrap { max-width: 640px !important; margin: 0 auto; padding: 0 16px; }
.hero { text-align: center; padding: 28px 0 20px 0; }
.eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--ig-text-secondary) !important; margin-bottom: 8px; text-transform: uppercase; }
.hero h1 { font-size: 26px !important; font-weight: 700 !important; line-height: 1.2 !important; margin: 0 0 8px 0 !important; color: var(--ig-text) !important; letter-spacing: -0.3px !important; text-shadow: none !important; }
.hero h1 span {
  background: var(--ig-gradient) !important;
  -webkit-background-clip: text !important; background-clip: text !important;
  -webkit-text-fill-color: transparent !important; color: transparent !important;
  font-weight: 700 !important; display: inline-block !important; text-shadow: none !important;
}
.hero-copy { color: var(--ig-text-secondary) !important; font-size: 14px; max-width: 480px; margin: 0 auto; line-height: 1.5; }

.card {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  box-shadow: none !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 16px; margin-top: 16px;
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
}
.card::before { content: none !important; }
.card:hover { border-color: var(--ig-border-strong) !important; }
.generator-card { border: 1px solid var(--ig-border) !important; box-shadow: none !important; background: var(--ig-surface-card) !important; }

.email-display-box {
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 14px 16px;
  display: flex; flex-direction: column; align-items: stretch;
  gap: 12px; box-shadow: none !important;
}
.email-address {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 16px !important; font-weight: 600 !important;
  color: var(--ig-text) !important;
  word-break: break-all; text-align: left;
  text-shadow: none !important; letter-spacing: -0.2px;
}
@media (min-width: 640px) { .email-address { font-size: 18px !important; } }
.mailbox-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-start; }

.primary {
  background: var(--ig-blue) !important;
  border: 1px solid var(--ig-blue) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  padding: 8px 16px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; box-shadow: none !important;
  transition: background-color 0.12s ease, border-color 0.12s ease;
  animation: none !important;
}
.primary:hover { background: var(--ig-blue-hover) !important; border-color: var(--ig-blue-hover) !important; transform: none !important; }
.primary:active { background: #0b6dc4 !important; }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.primary.full { width: 100%; }

.sub {
  background: transparent !important;
  border: 1px solid var(--ig-border) !important;
  color: var(--ig-text) !important;
  padding: 8px 14px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important; font-weight: 600 !important;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease;
  user-select: none; box-shadow: none !important;
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
}
.sub:hover { background: var(--ig-surface-hover) !important; border-color: var(--ig-border-strong) !important; color: var(--ig-text) !important; transform: none !important; box-shadow: none !important; }
.sub:disabled { opacity: 0.5; cursor: not-allowed; }

.copy-button {
  background: var(--ig-blue) !important;
  border: 1px solid var(--ig-blue) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  padding: 8px 16px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; transition: background-color 0.12s ease;
  box-shadow: none !important; animation: none !important;
}
.copy-button:hover { background: var(--ig-blue-hover) !important; border-color: var(--ig-blue-hover) !important; transform: none !important; }
.copy-button.copied { background: var(--ig-green) !important; border-color: var(--ig-green) !important; }

.claim-button {
  background: transparent !important;
  border: 1px solid var(--ig-border-strong) !important;
  color: var(--ig-text) !important;
  font-weight: 600 !important;
  padding: 8px 16px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important;
  cursor: pointer;
  transition: background-color 0.12s ease;
  animation: none !important;
}
.claim-button:hover { background: var(--ig-surface-hover) !important; border-color: var(--ig-text-secondary) !important; color: var(--ig-text) !important; transform: none !important; }

.claimed-badge {
  background: rgba(88,195,34,0.12) !important;
  border: 1px solid rgba(88,195,34,0.4) !important;
  color: var(--ig-green) !important;
  font-size: 12px; font-weight: 600;
  padding: 6px 12px; border-radius: var(--ig-radius);
}

.custom-controls, .actions, .saved-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.field {
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  color: var(--ig-text) !important;
  padding: 8px 12px !important;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important;
  flex: 1 1 180px; outline: none;
  box-shadow: none !important;
}
.field:focus { border-color: var(--ig-border-strong) !important; box-shadow: none !important; }
.restore-row { display: flex; gap: 6px; flex: 1 1 240px; }

.gmail-app-container {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  box-shadow: none !important;
  min-height: 480px; margin-top: 16px;
  width: 100%; position: relative;
  display: flex; flex-direction: column; overflow: hidden;
}
.gmail-drawer-sidebar {
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 240px;
  background: var(--ig-bg) !important;
  border-right: 1px solid var(--ig-border) !important;
  padding: 16px 12px;
  display: none; flex-direction: column; gap: 4px;
  z-index: 50; box-shadow: none !important;
  transform: translateX(-100%);
  transition: transform 0.22s ease-in-out;
}
.gmail-drawer-sidebar.is-open { display: flex !important; transform: translateX(0%); }
.gmail-drawer-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.65) !important; z-index: 40; }
html[data-theme="light"] .gmail-drawer-backdrop { background: rgba(0,0,0,0.35) !important; }

.gmail-compose-pill {
  background: var(--ig-blue) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 10px 16px !important;
  border-radius: var(--ig-radius) !important;
  display: inline-flex; align-items: center; gap: 8px;
  border: none !important; cursor: pointer;
  margin-bottom: 12px; box-shadow: none !important;
}
.gmail-compose-pill:hover { background: var(--ig-blue-hover) !important; transform: none !important; }

.gmail-nav-link {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--ig-radius) !important;
  font-size: 13px !important; font-weight: 500;
  color: var(--ig-text) !important;
  cursor: pointer; user-select: none;
  background: transparent !important;
  transition: background-color 0.12s ease;
}
.gmail-nav-link:hover { background: var(--ig-surface-hover) !important; }
.gmail-nav-link.active { background: var(--ig-surface-hover) !important; color: var(--ig-text) !important; font-weight: 700 !important; }
.gmail-nav-count { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--ig-text-secondary) !important; background: transparent !important; }
.gmail-nav-link.active .gmail-nav-count { color: var(--ig-text) !important; }

.gmail-top-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ig-border) !important;
  background: var(--ig-surface-card) !important;
  gap: 8px; flex-wrap: wrap;
}
.gmail-tool-icon-btn {
  color: var(--ig-text-secondary) !important;
  cursor: pointer; border-radius: 50%;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent !important; border: none !important;
  flex-shrink: 0;
  transition: all 0.12s ease;
}
.gmail-tool-icon-btn:hover { background: var(--ig-surface-hover) !important; color: var(--ig-text) !important; }

.gmail-search-box {
  display: flex; align-items: center; gap: 6px;
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: 999px !important;
  padding: 6px 14px;
  flex: 1 1 140px; max-width: 280px;
}
.gmail-search-box:focus-within { border-color: var(--ig-border-strong) !important; box-shadow: none !important; }
.gmail-search-input { background: transparent !important; border: none !important; outline: none; color: var(--ig-text) !important; font-size: 13px !important; width: 100%; padding: 0 !important; }

.gmail-tabs-bar { display: flex; border-bottom: 1px solid var(--ig-border) !important; background: var(--ig-surface-card) !important; overflow-x: auto; scrollbar-width: none; }
.gmail-tabs-bar::-webkit-scrollbar { display: none; }
.gmail-tab-item {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px;
  cursor: pointer; font-size: 12px; font-weight: 600;
  color: var(--ig-text-secondary) !important;
  border-bottom: 2px solid transparent !important;
  white-space: nowrap; user-select: none;
  background: transparent !important;
  text-transform: uppercase; letter-spacing: 0.5px;
  transition: all 0.12s ease;
}
.gmail-tab-item:hover { color: var(--ig-text) !important; background: transparent !important; }
.gmail-tab-item.active { color: var(--ig-text) !important; border-bottom: 2px solid var(--ig-text) !important; background: transparent !important; }
.gmail-tab-count { background: transparent !important; color: var(--ig-text-secondary) !important; font-size: 11px; padding: 0; font-weight: 600; }
.gmail-tab-item.active .gmail-tab-count { color: var(--ig-text) !important; }

.gmail-checkbox-btn, .gmail-star-btn {
  background: transparent !important; border: none !important;
  color: var(--ig-text-muted) !important;
  padding: 4px !important; margin: 0 !important;
  border-radius: 4px !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  cursor: pointer !important; flex-shrink: 0 !important;
  transition: all 0.15s ease !important;
}
.gmail-checkbox-btn:hover { color: var(--ig-text) !important; background: var(--ig-surface-hover) !important; }
.gmail-checkbox-btn.checked { color: var(--ig-blue) !important; }
.gmail-star-btn:hover { color: var(--ig-yellow) !important; background: transparent !important; }
.gmail-star-btn.starred { color: var(--ig-yellow) !important; }

.gmail-rows-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; width: 100%; }
.gmail-row-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ig-border) !important;
  cursor: pointer; position: relative;
  background: var(--ig-surface-card) !important;
  width: 100%; min-width: 0;
  transition: background-color 0.12s ease;
}
.gmail-row-item:hover { background: var(--ig-surface-hover) !important; box-shadow: none !important; }

.gmail-sender-col { width: 110px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--ig-text) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (min-width: 640px) { .gmail-sender-col { width: 140px; font-size: 13.5px; } }
.gmail-content-col { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gmail-subject-text { color: var(--ig-text) !important; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; }
.gmail-snippet-text { color: var(--ig-text-secondary) !important; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 2; }
.gmail-badge-otp {
  background: rgba(0,149,246,0.12) !important;
  border: 1px solid rgba(0,149,246,0.3) !important;
  color: var(--ig-blue) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-weight: 700; font-size: 11px;
  padding: 2px 6px; border-radius: 4px;
  display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;
}
.gmail-date-col { flex-shrink: 0; color: var(--ig-text-secondary) !important; font-size: 11.5px; font-weight: 400; white-space: nowrap; padding-left: 8px; }

.gmail-full-reader-view {
  padding: 16px 16px 40px 16px;
  background: var(--ig-surface-card) !important;
  display: flex; flex-direction: column;
  width: 100%; min-width: 0;
  animation: igFadeIn 0.18s ease-out;
}
@media (min-width: 640px) { .gmail-full-reader-view { padding: 20px 24px 48px 24px; } }
.gmail-reader-subject-bar {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 12px; margin-bottom: 14px;
  gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid var(--ig-border) !important;
}
.gmail-reader-subject-title { font-size: 20px !important; font-weight: 700 !important; color: var(--ig-text) !important; word-break: break-word; line-height: 1.3; letter-spacing: -0.3px; }
@media (min-width: 640px) { .gmail-reader-subject-title { font-size: 22px !important; } }
.gmail-reader-sender-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; width: 100%; }
.gmail-reader-sender-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.gmail-reader-sender-name { font-size: 14px; font-weight: 700; color: var(--ig-text) !important; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.gmail-reader-sender-email { font-size: 12.5px; color: var(--ig-text-secondary) !important; font-weight: 400; }
.gmail-to-me-btn { font-size: 12px; color: var(--ig-text-secondary) !important; display: inline-flex; align-items: center; gap: 3px; cursor: pointer; user-select: none; }
.gmail-to-me-btn:hover { color: var(--ig-text) !important; }

.gmail-dropdown-card {
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius) !important;
  padding: 12px 14px; margin: 6px 0 14px 0;
  font-size: 12.5px; color: var(--ig-text-secondary) !important; line-height: 1.7;
}

.gmail-email-canvas {
  background: var(--ig-surface-elevated) !important;
  color: var(--ig-text) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 20px 18px;
  box-shadow: none !important;
  font-size: 14px; line-height: 1.65;
  word-break: break-word; overflow-wrap: anywhere;
  margin: 8px 0 20px 0; width: 100%;
}
@media (min-width: 640px) { .gmail-email-canvas { padding: 28px 32px; font-size: 14.5px; } }
.gmail-email-canvas h1, .gmail-email-canvas h2, .gmail-email-canvas h3 { color: var(--ig-text) !important; font-weight: 700; margin-bottom: 8px; }
.gmail-email-canvas p { margin: 0 0 14px 0; color: var(--ig-text) !important; }
.gmail-email-canvas a { color: var(--ig-blue) !important; text-decoration: none; font-weight: 600; }
.gmail-email-canvas a:hover { text-decoration: underline; }
.gmail-email-canvas img { max-width: 100%; height: auto; border-radius: var(--ig-radius); }
html[data-theme="light"] .gmail-email-canvas { background: #ffffff !important; }

.gmail-otp-hero-card {
  background: var(--ig-surface-elevated) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 16px 18px; margin: 10px 0 18px 0;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.gmail-otp-digits {
  font-size: 26px; font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  color: var(--ig-text) !important;
  letter-spacing: 0.15em;
  background: var(--ig-surface-card) !important;
  padding: 8px 16px; border-radius: var(--ig-radius) !important;
  border: 1px solid var(--ig-border) !important;
  display: inline-block;
}
.gmail-otp-copy-action {
  background: var(--ig-blue) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 10px 18px !important;
  border-radius: var(--ig-radius) !important;
  border: none !important;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.gmail-otp-copy-action:hover { background: var(--ig-blue-hover) !important; transform: none !important; }

.gmail-bottom-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--ig-border) !important; flex-wrap: wrap; }
.gmail-pill-btn {
  background: transparent !important;
  border: 1px solid var(--ig-border) !important;
  color: var(--ig-text) !important;
  padding: 8px 16px !important;
  border-radius: 999px !important;
  font-size: 13px !important; font-weight: 600;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer;
}
.gmail-pill-btn:hover { background: var(--ig-surface-hover) !important; border-color: var(--ig-border-strong) !important; }

.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85) !important;
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 16px;
  animation: igFadeIn 0.18s ease-out;
}
html[data-theme="light"] .overlay { background: rgba(0,0,0,0.65) !important; }
.modal {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-xl) !important;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important;
  padding: 24px; width: 100%; max-width: 520px;
  position: relative; color: var(--ig-text) !important;
}
.modal::before { content: none !important; }
.modal-subtitle { color: var(--ig-text-secondary) !important; font-size: 13px; margin-bottom: 16px; line-height: 1.5; }
.modal .close {
  position: absolute; top: 14px; right: 14px;
  color: var(--ig-text-secondary) !important;
  cursor: pointer; font-size: 22px; line-height: 1;
  padding: 4px 8px; border-radius: 50%;
  background: transparent !important;
  transition: all 0.15s;
}
.modal .close:hover { color: var(--ig-text) !important; background: var(--ig-surface-hover) !important; }
.modal h2 { font-size: 18px !important; font-weight: 700 !important; color: var(--ig-text) !important; margin: 0 0 6px 0; letter-spacing: -0.2px; }

.feature-section { margin-top: 32px; }
.feature-section h2 { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: var(--ig-text-secondary) !important; text-align: center; margin-bottom: 16px; text-transform: uppercase; }
.feature-stack { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.feature-card {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 16px; display: flex; gap: 12px; align-items: flex-start;
  transition: border-color 0.15s ease;
}
.feature-card:hover { border-color: var(--ig-border-strong) !important; transform: none !important; box-shadow: none !important; }
.feature-icon {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--ig-gradient) !important;
  border: none !important;
  display: flex; align-items: center; justify-content: center;
  color: #ffffff !important; flex-shrink: 0;
}
.feature-card h3 { font-size: 14px; font-weight: 700; color: var(--ig-text) !important; margin: 0 0 4px 0; }
.feature-card p { font-size: 13px; color: var(--ig-text-secondary) !important; margin: 0; line-height: 1.5; }

.faq-section { margin-top: 32px; }
.faq-section h2 { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: var(--ig-text-secondary) !important; text-align: center; margin-bottom: 16px; text-transform: uppercase; }
.faq-section details {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: var(--ig-radius-lg) !important;
  padding: 14px 16px; margin-bottom: 8px;
  transition: border-color 0.15s ease;
  cursor: pointer;
}
.faq-section details[open] { border-color: var(--ig-border-strong) !important; }
.faq-section summary { font-weight: 600; font-size: 14px; color: var(--ig-text) !important; outline: none; user-select: none; }
.faq-section details p { color: var(--ig-text-secondary) !important; font-size: 13px; margin-top: 10px; line-height: 1.6; }

.admin-inspector-modal { max-width: 720px !important; background: var(--ig-surface-card) !important; border: 1px solid var(--ig-border) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important; }
.admin-inspector-search { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.admin-inspector-actions { display: flex; gap: 6px; }

.site-footer { text-align: center; padding: 40px 16px 24px 16px; color: var(--ig-text-secondary) !important; font-size: 12.5px; }
.site-footer a { color: var(--ig-text-secondary) !important; text-decoration: none; }
.site-footer a:hover { color: var(--ig-text) !important; }

.sender-favicon-container {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  border-radius: 50%; padding: 2px;
  position: relative; box-shadow: none !important;
}
.sender-favicon-container::before {
  content: "";
  position: absolute; inset: -2px;
  border-radius: 50%; padding: 2px;
  background: var(--ig-gradient-full);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
.sender-favicon-container img { border-radius: 50% !important; object-fit: cover; }

.gmail-avatar {
  border-radius: 50% !important;
  background: var(--ig-gradient) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  box-shadow: none !important;
  border: 2px solid var(--ig-surface-card) !important;
  position: relative;
}
.gmail-avatar::before {
  content: "";
  position: absolute; inset: -3px;
  border-radius: 50%; padding: 2px;
  background: var(--ig-gradient-full);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none; z-index: -1;
}

.fleet-chat-container {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  box-shadow: 0 -8px 32px rgba(0,0,0,0.7) !important;
}
.floating-music-player {
  background: var(--ig-surface-card) !important;
  border: 1px solid var(--ig-border) !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.6) !important;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

/* ============================================================
   TAILWIND BRIDGE — force remaining utility colors to IG palette
   ============================================================ */
.text-emerald-400, .text-emerald-300, .text-emerald-200 { color: #58C322 !important; }
.bg-emerald-500, .bg-emerald-600 { background-color: #58C322 !important; }
.text-sky-400, .text-sky-300, .text-sky-200 { color: #0095F6 !important; }
.bg-sky-500, .bg-sky-600 { background-color: #0095F6 !important; }
.text-amber-400, .text-amber-300, .text-amber-200 { color: #E1306C !important; }
.bg-amber-500, .bg-amber-600 { background-color: #E1306C !important; }
.text-rose-400, .text-rose-300, .text-red-400, .text-red-300 { color: #ED4956 !important; }
.bg-rose-500, .bg-rose-600, .bg-red-500, .bg-red-600 { background-color: #ED4956 !important; }
.text-purple-400, .text-purple-300, .text-violet-400, .text-violet-300 { color: #C13584 !important; }
.bg-purple-500, .bg-violet-500 { background-color: #C13584 !important; }
.text-pink-400, .text-pink-300 { color: #E1306C !important; }
.bg-pink-500, .bg-pink-600 { background-color: #E1306C !important; }

.bg-neutral-900, .bg-slate-900 { background-color: #121212 !important; }
.bg-neutral-800, .bg-slate-800 { background-color: #1A1A1A !important; }
.bg-black { background-color: #000000 !important; }
.border-neutral-800, .border-slate-800 { border-color: #262626 !important; }
.border-neutral-700, .border-slate-700 { border-color: #363636 !important; }
.text-neutral-200, .text-neutral-100, .text-slate-200, .text-slate-100 { color: #F5F5F5 !important; }
.text-neutral-300, .text-slate-300 { color: #A8A8A8 !important; }
.text-neutral-400, .text-slate-400 { color: #737373 !important; }
.text-neutral-500, .text-slate-500 { color: #737373 !important; }
.text-neutral-600, .text-slate-600 { color: #575757 !important; }

html[data-theme="light"] .text-emerald-400, html[data-theme="light"] .text-emerald-300 { color: #58C322 !important; }
html[data-theme="light"] .text-neutral-200, html[data-theme="light"] .text-neutral-100 { color: #262626 !important; }
html[data-theme="light"] .bg-neutral-900 { background-color: #FFFFFF !important; }
html[data-theme="light"] .bg-neutral-800 { background-color: #FAFAFA !important; }
html[data-theme="light"] .border-neutral-800 { border-color: #DBDBDB !important; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 640px) {
  .wrap { padding: 0 12px; }
  .hero { padding: 20px 0 16px 0; }
  .hero h1 { font-size: 22px !important; }
  .card { padding: 14px; }
  .email-display-box { padding: 12px; }
  .email-address { font-size: 14px !important; }
  .gmail-tab-item { padding: 10px 12px; font-size: 11px; }
}
`;

const newComponent =
  "const GlobalAppStyles = React.memo(function GlobalAppStyles() {\n" +
  "  return (\n" +
  "    <style\n" +
  "      dangerouslySetInnerHTML={{\n" +
  "        __html: " + JSON.stringify(NEW_CSS) + ",\n" +
  "      }}\n" +
  "    />\n" +
  "  )\n" +
  "})\n";

const gsRe = /const GlobalAppStyles = React\.memo\(function GlobalAppStyles\(\) \{[\s\S]*?\r?\n  \)\r?\n\}\)\r?\n/;

if (!gsRe.test(src)) {
  console.error("Could not locate GlobalAppStyles block. Aborting before write.");
  process.exit(2);
}
src = src.replace(gsRe, newComponent);

// ============================================================
// 6. Report + write
// ============================================================
if (src === original) {
  console.log("No changes needed.");
  process.exit(0);
}

const delta = src.length - original.length;

if (dryRun) {
  console.log("[DRY RUN] " + abs);
  console.log("  Before: " + original.length.toLocaleString() + " bytes");
  console.log("  After:  " + src.length.toLocaleString() + " bytes");
  console.log("  Delta:  " + delta.toLocaleString() + " bytes");
  console.log("  Run without --dry to apply.");
  process.exit(0);
}

const backup = abs + ".ig-backup";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, original, "utf8");
  console.log("  Backup: " + backup);
}

fs.writeFileSync(abs, src, "utf8");
console.log("Re-skinned: " + abs);
console.log("  " + original.length.toLocaleString() + " -> " + src.length.toLocaleString() + " bytes");
console.log("  Rollback: cp \"" + backup + "\" \"" + abs + "\"");
