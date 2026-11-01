# NOCTIS — Electric Hypercar Brand

> **"The city is asleep. It doesn't need the city's light. It brings its own."**

A premium, minimal, single-page scrollytelling website for **NOCTIS**, an electric hypercar brand born from total blackout darkness. Built with pure vanilla web technologies: zero external JavaScript/CSS libraries, zero frameworks, zero build tools.

---

## ⚡ Visual Aesthetics & Design System

- **Atmosphere**: A city plunged in total blackout at night, where the vehicle's xenon light signature and crimson taillights are the only illumination in the world.
- **Design Tokens**:
  - `--asphalt`: `#07080A` (Deep dark canvas background)
  - `--graphite`: `#121418` (Structural depth)
  - `--fog`: `#8A8F98` (HUD metadata & secondary typography)
  - `--bone`: `#EDEAE4` (Primary high-contrast type)
  - `--xenon`: `#CFE3FF` (Cold electric front light bar accent)
  - `--taillight`: `#E1251B` (Laser taillight red accent)
  - `--hairline`: `rgba(237, 234, 228, 0.12)` (1px precision dividers)
- **Strict Visual Rules**:
  - Pure flat solid colors and 1px hairlines.
  - Zero gradients, zero glassmorphism / blurs, zero glows, zero drop shadows.
- **Typography** (Google Fonts):
  - **Display**: Archivo variable font (`wdth` 125 expanded, weights 300/400).
  - **Body**: Inter 400, line-height 1.6, max 52ch.
  - **HUD**: JetBrains Mono 400, letter-spacing 0.12em.

---

## 🏎️ Key Features

1. **Scroll-Scrubbed Canvas Engine**:
   - Scrubbed image sequences rendered on high-performance `<canvas>` elements scaled by `devicePixelRatio` (capped at 2).
   - Landscape cover-fit / portrait contain-fit with letterbox centering so the vehicle is never cropped.
   - Smooth lerp physics (`lerp = 0.15`) that repaints exclusively when the rounded frame advances.
   - Nearest-loaded-frame fallback ensuring zero blank or flashing frames during scrubbing.
   - Automatic viewport detection (`< 768px`) switching dynamically between desktop (1600px) and mobile (960px) WebP sequences.

2. **Section Breakdown**:
   - **Hero (Pinned ~600vh)**: 600-frame continuous sequence through the silent blackout city. Left HUD tracking speed (000 → 118 KM/H), distance (0.0 → 4.2 KM), chapter progress, line-masked text reveals in the open sky space, and smooth fade-to-black transition at 95% progress.
   - **Statement (100vh)**: Philosophical engineering statement with scroll-driven word-by-word opacity reveal (15% → 100%).
   - **Dismantle (Pinned ~350vh)**: Exploded structural view of the vehicle taking it apart and assembling it back under scroll, featuring 4 interactive hairlines and xenon callouts (Body Monocoque, LED Signature, Structural Pack, and Axial-Flux Motors).
   - **The Lineup (100vh)**: 5-slide interactive accordion (GT-E, S, X, R, ONE). Debounced hover, 6% slide-in entrance motion, 3-column performance specs, color finish swatches, and full keyboard arrow navigation.
   - **Reserve (100vh)**: High-contrast acquisition section with custom xenon outline button, laser red indicator tick, and instant state feedback.
   - **Global Effects**: 8fps procedural film grain overlay, directional auto-hiding navigation (`mix-blend-mode: difference`), and "The Headlight" custom cursor.

3. **Accessibility & Reduced Motion**:
   - Semantic headings, ARIA attributes, and accessible keyboard focus outlines.
   - Native `prefers-reduced-motion` detection that disables pinned scrolling, presents static keyframes, and preserves system cursors.

---

## 📂 Project Structure

```
├── index.html                  # Semantic single-page HTML structure
├── styles.css                  # Design system, responsive layout, tokens
├── main.js                     # Canvas scrubber, RAF loop, HUD, cursor engine
├── config.js                   # Tunable frame counts, callouts, heights & lineup
├── assets/
│   ├── frames/
│   │   ├── hero/               # 600 Desktop WebP frames (1600x900)
│   │   ├── hero-mobile/        # 600 Mobile WebP frames (960x540)
│   │   ├── dismantle/          # 200 Desktop WebP frames (1600x900)
│   │   └── dismantle-mobile/   # 200 Mobile WebP frames (960x540)
│   └── cars/                   # 5 Bespoke studio profile product images (1600x900)
│       ├── gt-e.webp
│       ├── s.webp
│       ├── x.webp
│       ├── r.webp
│       ├── one.webp
│       └── placeholder.webp
└── README.md
```

---

## 🚀 Running Locally

The site requires no compilation or build steps. Serve it using any local static server:

```powershell
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx serve .
```

Navigate to `http://localhost:8000` in your web browser.
