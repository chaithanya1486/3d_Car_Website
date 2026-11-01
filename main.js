/**
 * NOCTIS — Main Engine
 * Vanilla JavaScript · Zero Dependencies · High-Performance Scrollytelling
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. STATE & ENVIRONMENT DETECTION
  // --------------------------------------------------------------------------
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  let isMobile = window.innerWidth < 768;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Frame Cache
  const heroCache = new Array(CONFIG.hero.frameCount).fill(null);
  const dismantleCache = new Array(CONFIG.dismantle.frameCount).fill(null);
  const heroLoadedIndices = new Set();
  const dismantleLoadedIndices = new Set();

  // Scrolly Physics State
  let heroProgress = 0;
  let heroCurrentFrame = 0;
  let heroTargetFrame = 0;
  let heroLastDrawnFrame = -1;

  let dismantleProgress = 0;
  let dismantleCurrentFrame = 0;
  let dismantleTargetFrame = 0;
  let dismantleLastDrawnFrame = -1;

  // DOM Elements
  const heroWrapper = document.getElementById('hero');
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;

  const dismantleWrapper = document.getElementById('dismantle');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const dismantleCtx = dismantleCanvas ? dismantleCanvas.getContext('2d') : null;

  const hudChapter = document.getElementById('hud-chapter');
  const hudSpeed = document.getElementById('hud-speed');
  const hudDistance = document.getElementById('hud-distance');

  const heroProgressBar = document.getElementById('hero-progress-line');
  const dismantleProgressBar = document.getElementById('dismantle-progress-line');

  const preloaderEl = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCounter = document.getElementById('preloader-counter');

  const navEl = document.getElementById('main-nav');
  let lastScrollY = window.scrollY;

  // Cursor state
  const cursorEl = document.getElementById('cursor-headlight');
  const cursorLabel = document.getElementById('cursor-label');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let cursorTargetLabel = '';
  let isHovering = false;

  // --------------------------------------------------------------------------
  // 2. PATH FORMATTERS
  // --------------------------------------------------------------------------
  function getHeroFrameUrl(index) {
    const padded = String(index).padStart(4, '0');
    const template = isMobile ? CONFIG.hero.mobilePath : CONFIG.hero.desktopPath;
    return template.replace('%s', padded);
  }

  function getDismantleFrameUrl(index) {
    const padded = String(index).padStart(4, '0');
    const template = isMobile ? CONFIG.dismantle.mobilePath : CONFIG.dismantle.desktopPath;
    return template.replace('%s', padded);
  }

  // --------------------------------------------------------------------------
  // 3. IMAGE PRELOADER & BACKGROUND PIPELINE
  // --------------------------------------------------------------------------
  function loadSingleFrame(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      if (img.decode) {
        img.decode()
          .then(() => resolve(img))
          .catch(() => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
          });
      } else {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      }
    });
  }

  async function initPreloader() {
    const initialBatchCount = Math.min(CONFIG.preloader.heroInitialFrames, CONFIG.hero.frameCount);
    let loadedCount = 0;

    // Load initial 40 hero frames with progress tracking
    const initialPromises = [];
    for (let i = 1; i <= initialBatchCount; i++) {
      const p = loadSingleFrame(getHeroFrameUrl(i)).then((img) => {
        if (img) {
          heroCache[i - 1] = img;
          heroLoadedIndices.add(i - 1);
        }
        loadedCount++;
        const pct = Math.round((loadedCount / initialBatchCount) * 100);
        if (preloaderBar) preloaderBar.style.width = pct + '%';
        if (preloaderCounter) preloaderCounter.textContent = String(pct).padStart(3, '0');
      });
      initialPromises.push(p);
    }

    await Promise.all(initialPromises);

    // Initial batch loaded: brighten line and fade out preloader
    if (preloaderBar) preloaderBar.classList.add('brighten');

    setTimeout(() => {
      document.body.classList.remove('loading');
      if (preloaderEl) {
        preloaderEl.classList.add('fade-out');
        setTimeout(() => {
          preloaderEl.remove();
        }, 850);
      }
      // Trigger initial canvas render
      resizeCanvases();
      drawHeroFrame(0);
      drawDismantleFrame(0);

      // Start background sequential loading for rest of hero and dismantle
      loadRemainingFramesBackground();
    }, 250);
  }

  function loadRemainingFramesBackground() {
    const initialBatchCount = CONFIG.preloader.heroInitialFrames;

    // Helper to sequentially load a list of frame tasks in background
    let heroQueueIdx = initialBatchCount + 1;
    function pumpHero() {
      if (heroQueueIdx > CONFIG.hero.frameCount) {
        // Hero done, pump dismantle
        pumpDismantle();
        return;
      }
      const idx = heroQueueIdx++;
      loadSingleFrame(getHeroFrameUrl(idx)).then((img) => {
        if (img) {
          heroCache[idx - 1] = img;
          heroLoadedIndices.add(idx - 1);
        }
        // Small yield so scroll interaction has 100% main thread priority
        if (window.requestIdleCallback) {
          window.requestIdleCallback(pumpHero, { timeout: 50 });
        } else {
          setTimeout(pumpHero, 8);
        }
      });
    }

    let dismantleQueueIdx = 1;
    function pumpDismantle() {
      if (dismantleQueueIdx > CONFIG.dismantle.frameCount) {
        return; // All frames loaded!
      }
      const idx = dismantleQueueIdx++;
      loadSingleFrame(getDismantleFrameUrl(idx)).then((img) => {
        if (img) {
          dismantleCache[idx - 1] = img;
          dismantleLoadedIndices.add(idx - 1);
        }
        if (window.requestIdleCallback) {
          window.requestIdleCallback(pumpDismantle, { timeout: 50 });
        } else {
          setTimeout(pumpDismantle, 8);
        }
      });
    }

    pumpHero();
  }

  // --------------------------------------------------------------------------
  // 4. NEAREST LOADED FRAME RETRIEVER
  // --------------------------------------------------------------------------
  function getNearestLoadedImage(cache, loadedSet, targetIdx, maxCount) {
    if (loadedSet.has(targetIdx) && cache[targetIdx]) {
      return cache[targetIdx];
    }
    // Search outward: -1, +1, -2, +2...
    for (let offset = 1; offset < maxCount; offset++) {
      const left = targetIdx - offset;
      if (left >= 0 && loadedSet.has(left) && cache[left]) {
        return cache[left];
      }
      const right = targetIdx + offset;
      if (right < maxCount && loadedSet.has(right) && cache[right]) {
        return cache[right];
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // 5. CANVAS DRAWING (Cover-fit landscape / Contain-fit portrait)
  // --------------------------------------------------------------------------
  function drawImageFit(ctx, img, canvasW, canvasH, isLandscape) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    let scale;
    if (isLandscape) {
      // Cover-fit
      scale = Math.max(canvasW / iw, canvasH / ih);
    } else {
      // Contain-fit vertically centered on #07080A
      scale = Math.min(canvasW / iw, canvasH / ih);
    }

    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (canvasW - dw) / 2;
    const dy = (canvasH - dh) / 2;

    ctx.fillStyle = '#07080A';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawHeroFrame(frameIndex) {
    if (!heroCtx || !heroCanvas) return;
    const img = getNearestLoadedImage(heroCache, heroLoadedIndices, frameIndex, CONFIG.hero.frameCount);
    if (!img) return;

    const w = heroCanvas.width / dpr;
    const h = heroCanvas.height / dpr;
    const isLandscape = w >= h;

    heroCtx.save();
    heroCtx.scale(dpr, dpr);
    drawImageFit(heroCtx, img, w, h, isLandscape);

    // Over the last 5% of scroll (0.95 to 1.0), fade canvas to solid black
    if (heroProgress > CONFIG.hero.fadeToBlackStart) {
      const alpha = Math.min(1, (heroProgress - CONFIG.hero.fadeToBlackStart) / (1 - CONFIG.hero.fadeToBlackStart));
      heroCtx.fillStyle = '#07080A';
      heroCtx.globalAlpha = alpha;
      heroCtx.fillRect(0, 0, w, h);
    }
    heroCtx.restore();

    heroLastDrawnFrame = frameIndex;
  }

  function drawDismantleFrame(frameIndex) {
    if (!dismantleCtx || !dismantleCanvas) return;
    const img = getNearestLoadedImage(dismantleCache, dismantleLoadedIndices, frameIndex, CONFIG.dismantle.frameCount);
    if (!img) return;

    const w = dismantleCanvas.width / dpr;
    const h = dismantleCanvas.height / dpr;
    const isLandscape = w >= h;

    dismantleCtx.save();
    dismantleCtx.scale(dpr, dpr);
    drawImageFit(dismantleCtx, img, w, h, isLandscape);
    dismantleCtx.restore();

    dismantleLastDrawnFrame = frameIndex;
  }

  function resizeCanvases() {
    isMobile = window.innerWidth < 768;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (heroCanvas) {
      heroCanvas.width = Math.round(vw * dpr);
      heroCanvas.height = Math.round(vh * dpr);
      heroCanvas.style.width = vw + 'px';
      heroCanvas.style.height = vh + 'px';
    }

    if (dismantleCanvas) {
      dismantleCanvas.width = Math.round(vw * dpr);
      dismantleCanvas.height = Math.round(vh * dpr);
      dismantleCanvas.style.width = vw + 'px';
      dismantleCanvas.style.height = vh + 'px';
    }

    // Force redraw
    heroLastDrawnFrame = -1;
    dismantleLastDrawnFrame = -1;
    drawHeroFrame(Math.round(heroCurrentFrame));
    drawDismantleFrame(Math.round(dismantleCurrentFrame));
  }

  // --------------------------------------------------------------------------
  // 6. SCROLL PROGRESS COMPUTATION & RAF LOOP
  // --------------------------------------------------------------------------
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function updateScrollyProgress() {
    const vh = window.innerHeight;

    // 1. Hero calculation
    if (heroWrapper) {
      const rect = heroWrapper.getBoundingClientRect();
      const scrollable = heroWrapper.offsetHeight - vh;
      if (scrollable > 0) {
        heroProgress = clamp(-rect.top / scrollable, 0, 1);
      } else {
        heroProgress = 0;
      }
      heroTargetFrame = Math.round(heroProgress * (CONFIG.hero.frameCount - 1));
    }

    // 2. Dismantle calculation
    if (dismantleWrapper) {
      const rect = dismantleWrapper.getBoundingClientRect();
      const scrollable = dismantleWrapper.offsetHeight - vh;
      if (scrollable > 0) {
        dismantleProgress = clamp(-rect.top / scrollable, 0, 1);
      } else {
        dismantleProgress = 0;
      }
      dismantleTargetFrame = Math.round(dismantleProgress * (CONFIG.dismantle.frameCount - 1));
    }

    // 3. Statement word-by-word reveal
    updateStatementReveal();

    // 4. Update Nav visibility
    updateNav();
  }

  function updateNav() {
    if (!navEl) return;
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 120) {
      navEl.classList.add('nav-hidden');
      navEl.classList.remove('nav-visible');
    } else {
      navEl.classList.remove('nav-hidden');
      navEl.classList.add('nav-visible');
    }
    lastScrollY = currentY;
  }

  function updateStatementReveal() {
    const section = document.getElementById('statement');
    const words = document.querySelectorAll('.statement-word');
    if (!section || words.length === 0) return;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // Progress starts when section enters viewport and completes when centered
    const totalDist = vh + rect.height;
    const scrolled = vh - rect.top;
    const progress = clamp(scrolled / (totalDist * 0.75), 0, 1);

    const totalWords = words.length;
    words.forEach((word, idx) => {
      const wordStart = idx / totalWords;
      const wordEnd = (idx + 1) / totalWords;
      let opacity = 0.15;
      if (progress >= wordEnd) {
        opacity = 1.0;
      } else if (progress > wordStart) {
        const factor = (progress - wordStart) / (wordEnd - wordStart);
        opacity = 0.15 + 0.85 * factor;
      }
      word.style.opacity = opacity.toFixed(2);
    });
  }

  function updateHeroUI() {
    // HUD speed & distance
    if (hudSpeed) {
      const spd = Math.round(heroProgress * CONFIG.hero.hud.maxSpeed);
      hudSpeed.textContent = String(spd).padStart(3, '0');
    }
    if (hudDistance) {
      const dist = (heroProgress * CONFIG.hero.hud.maxDistance).toFixed(1);
      hudDistance.textContent = dist;
    }

    // Chapter range detection
    let currentChapterLabel = '01/04';
    CONFIG.hero.chapters.forEach((ch, idx) => {
      const el = document.getElementById(`hero-${ch.id}`);
      const isActive = heroProgress >= ch.start && heroProgress <= ch.end;
      if (el) {
        if (isActive) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
      if (isActive) {
        currentChapterLabel = ch.label;
      }
    });

    if (hudChapter) hudChapter.textContent = currentChapterLabel;

    // Progress line
    if (heroProgressBar) {
      heroProgressBar.style.width = (heroProgress * 100) + '%';
    }
  }

  function updateDismantleUI() {
    if (dismantleProgressBar) {
      dismantleProgressBar.style.width = (dismantleProgress * 100) + '%';
    }

    // Callouts visibility
    CONFIG.dismantle.callouts.forEach((callout) => {
      const el = document.getElementById(`callout-${callout.id}`);
      if (el) {
        if (dismantleProgress >= callout.progress) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }

  // Unified Physics Animation Loop
  function animationLoop() {
    if (!isReducedMotion) {
      // Lerp hero
      const heroDiff = heroTargetFrame - heroCurrentFrame;
      if (Math.abs(heroDiff) > 0.001) {
        heroCurrentFrame += heroDiff * CONFIG.animation.lerpFactor;
      } else {
        heroCurrentFrame = heroTargetFrame;
      }
      const roundedHero = Math.round(heroCurrentFrame);
      if (roundedHero !== heroLastDrawnFrame || heroProgress > CONFIG.hero.fadeToBlackStart) {
        drawHeroFrame(roundedHero);
      }

      // Lerp dismantle
      const dismantleDiff = dismantleTargetFrame - dismantleCurrentFrame;
      if (Math.abs(dismantleDiff) > 0.001) {
        dismantleCurrentFrame += dismantleDiff * CONFIG.animation.lerpFactor;
      } else {
        dismantleCurrentFrame = dismantleTargetFrame;
      }
      const roundedDismantle = Math.round(dismantleCurrentFrame);
      if (roundedDismantle !== dismantleLastDrawnFrame) {
        drawDismantleFrame(roundedDismantle);
      }

      // UI updates
      updateHeroUI();
      updateDismantleUI();
    }

    // Cursor Lerp on fine pointer
    if (isFinePointer && cursorEl) {
      cursorX += (mouseX - cursorX) * CONFIG.animation.cursorLerp;
      cursorY += (mouseY - cursorY) * CONFIG.animation.cursorLerp;
      cursorEl.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    }

    requestAnimationFrame(animationLoop);
  }

  // --------------------------------------------------------------------------
  // 7. INITIALIZE STATEMENT SECTION WORDS
  // --------------------------------------------------------------------------
  function initStatementSentence() {
    const sentenceEl = document.getElementById('statement-sentence');
    if (!sentenceEl) return;
    const text = sentenceEl.textContent.trim();
    const words = text.split(/\s+/);
    sentenceEl.innerHTML = words
      .map((w) => `<span class="statement-word">${w}</span>`)
      .join(' ');
  }

  // --------------------------------------------------------------------------
  // 8. INITIALIZE DISMANTLE CALLOUTS
  // --------------------------------------------------------------------------
  function initDismantleCallouts() {
    const container = document.getElementById('dismantle-callouts');
    if (!container) return;

    container.innerHTML = '';
    CONFIG.dismantle.callouts.forEach((c) => {
      const calloutDiv = document.createElement('div');
      calloutDiv.className = 'dismantle-callout';
      calloutDiv.id = `callout-${c.id}`;

      // Calculate distance between dot and label for 1px hairline
      const dx = c.dot.x - c.label.x;
      const dy = c.dot.y - c.label.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      calloutDiv.innerHTML = `
        <div class="callout-dot" style="left: ${c.dot.x}%; top: ${c.dot.y}%;"></div>
        <div class="callout-line" style="left: ${c.label.x}%; top: ${c.label.y}%; width: ${Math.max(40, length * 8)}px; transform: rotate(${angle}deg);"></div>
        <div class="callout-content" style="left: ${c.label.x}%; top: ${c.label.y}%;">
          <div class="callout-title">${c.title}</div>
          <div class="callout-desc">${c.subtitle}</div>
        </div>
      `;
      container.appendChild(calloutDiv);
    });
  }

  // --------------------------------------------------------------------------
  // 9. INITIALIZE LINEUP ACCORDION
  // --------------------------------------------------------------------------
  let hoverTimeout = null;

  function initLineupAccordion() {
    const accordionEl = document.getElementById('lineup-accordion');
    if (!accordionEl) return;

    accordionEl.innerHTML = '';

    CONFIG.lineup.forEach((car, index) => {
      const slide = document.createElement('div');
      slide.className = `lineup-slide ${car.openByDefault ? 'is-open' : ''}`;
      slide.id = `slide-${car.id}`;
      slide.setAttribute('role', 'tab');
      slide.setAttribute('tabindex', '0');
      slide.setAttribute('aria-expanded', car.openByDefault ? 'true' : 'false');
      slide.setAttribute('aria-selected', car.openByDefault ? 'true' : 'false');
      slide.setAttribute('data-id', car.id);
      slide.setAttribute('data-cursor-lineup', car.openByDefault ? 'CONFIGURE' : 'OPEN');

      const swatchesHtml = car.swatches
        .map(
          (color, sIdx) =>
            `<span class="color-swatch ${sIdx === car.activeSwatch ? 'active' : ''}" style="background-color: ${color};" data-color="${color}"></span>`
        )
        .join('');

      const specsHtml = car.specs
        .map(
          (sp) => `
          <div class="spec-cell">
            <span class="spec-label">${sp.label}</span>
            <span class="spec-value">${sp.value}</span>
          </div>
        `
        )
        .join('');

      slide.innerHTML = `
        <!-- Closed Header -->
        <div class="slide-closed-header" aria-hidden="true">
          <span class="slide-num">${car.num}</span>
          <span class="slide-vertical-name">${car.name}</span>
        </div>

        <!-- Car Image with Floor Line -->
        <div class="slide-car-container">
          <div class="slide-floor-line" aria-hidden="true"></div>
          <img src="${car.image}" alt="${car.alt}" class="slide-car-img" loading="lazy">
        </div>

        <!-- Open Content -->
        <div class="slide-open-content">
          <div class="slide-top-details">
            <span class="slide-num">${car.num} — MODEL</span>
            <h3 class="slide-model-title">${car.name}</h3>
          </div>

          <div class="slide-bottom-details">
            <p class="slide-tagline">${car.tagline}</p>
            <div class="slide-spec-row">
              ${specsHtml}
            </div>
            <div class="slide-actions-row">
              <div class="slide-swatches" aria-label="Available Finishes">
                ${swatchesHtml}
              </div>
              <a href="#reserve" class="slide-cta-link" data-cursor="CONFIGURE">Configure →</a>
            </div>
          </div>
        </div>
      `;

      // Event Listeners: Hover with 80ms debounce (desktop)
      slide.addEventListener('mouseenter', () => {
        if (isMobile) return;
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          openLineupSlide(car.id);
        }, CONFIG.animation.hoverDebounceMs);
      });

      // Click or Tap
      slide.addEventListener('click', (e) => {
        // If clicking configure link, allow navigation
        if (e.target.closest('.slide-cta-link')) return;
        clearTimeout(hoverTimeout);
        openLineupSlide(car.id);
      });

      // Keyboard arrow navigation
      slide.addEventListener('keydown', (e) => {
        let targetIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          targetIndex = (index + 1) % CONFIG.lineup.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          targetIndex = (index - 1 + CONFIG.lineup.length) % CONFIG.lineup.length;
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLineupSlide(car.id);
        }

        if (targetIndex >= 0) {
          const nextCar = CONFIG.lineup[targetIndex];
          openLineupSlide(nextCar.id);
          const nextSlide = document.getElementById(`slide-${nextCar.id}`);
          if (nextSlide) nextSlide.focus();
        }
      });

      accordionEl.appendChild(slide);
    });

    // IntersectionObserver for staggered entrance animation
    const lineupSection = document.getElementById('lineup');
    if (lineupSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              lineupSection.classList.add('in-view');
              observer.unobserve(lineupSection);
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(lineupSection);
    } else if (lineupSection) {
      lineupSection.classList.add('in-view');
    }
  }

  function openLineupSlide(carId) {
    const slides = document.querySelectorAll('.lineup-slide');
    slides.forEach((slide) => {
      const isTarget = slide.getAttribute('data-id') === carId;
      if (isTarget) {
        slide.classList.add('is-open');
        slide.setAttribute('aria-expanded', 'true');
        slide.setAttribute('aria-selected', 'true');
        slide.setAttribute('data-cursor-lineup', 'CONFIGURE');
      } else {
        slide.classList.remove('is-open');
        slide.setAttribute('aria-expanded', 'false');
        slide.setAttribute('aria-selected', 'false');
        slide.setAttribute('data-cursor-lineup', 'OPEN');
      }
    });

    // Update cursor text if currently hovering over accordion
    updateCursorHoverState();
  }

  // --------------------------------------------------------------------------
  // 10. CUSTOM CURSOR INTERACTIONS
  // --------------------------------------------------------------------------
  function initCustomCursor() {
    if (!isFinePointer || !cursorEl) return;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      updateCursorHoverState(e.target);
    });

    window.addEventListener('mousedown', () => {
      cursorEl.classList.add('is-down');
      setTimeout(() => {
        cursorEl.classList.remove('is-down');
      }, 120);
    });

    document.addEventListener('mouseleave', () => {
      cursorEl.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      cursorEl.style.opacity = '1';
    });
  }

  function updateCursorHoverState(targetEl) {
    if (!isFinePointer || !cursorEl) return;

    const el = targetEl || document.elementFromPoint(mouseX, mouseY);
    if (!el) return;

    const linkEl = el.closest('a, button, [role="button"], .hero-cta-link, .reserve-btn, .footer-link-btn');
    const slideEl = el.closest('.lineup-slide');

    if (slideEl && !el.closest('.slide-cta-link')) {
      const mode = slideEl.getAttribute('data-cursor-lineup') || 'OPEN';
      cursorTargetLabel = mode;
      isHovering = true;
    } else if (linkEl) {
      const customLabel = linkEl.getAttribute('data-cursor');
      cursorTargetLabel = customLabel || 'VIEW';
      isHovering = true;
    } else {
      cursorTargetLabel = '';
      isHovering = false;
    }

    if (isHovering) {
      cursorEl.classList.add('is-hovering');
      if (cursorLabel) cursorLabel.textContent = cursorTargetLabel;
    } else {
      cursorEl.classList.remove('is-hovering');
      if (cursorLabel) cursorLabel.textContent = '';
    }
  }

  // --------------------------------------------------------------------------
  // 11. FILM GRAIN OVERLAY ENGINE
  // Offscreen canvas noise pattern shifted 8 times/sec, 3.5% opacity
  // --------------------------------------------------------------------------
  function initFilmGrain() {
    const grainCanvas = document.getElementById('film-grain');
    if (!grainCanvas) return;

    const ctx = grainCanvas.getContext('2d');
    if (!ctx) return;

    // Create 256x256 offscreen noise tile
    const tileSize = 256;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileSize;
    tileCanvas.height = tileSize;
    const tileCtx = tileCanvas.getContext('2d');
    const imgData = tileCtx.createImageData(tileSize, tileSize);
    const buffer = new Uint32Array(imgData.data.buffer);

    for (let i = 0; i < buffer.length; i++) {
      const noise = (Math.random() * 255) | 0;
      // ABGR format: full alpha, noise grayscale
      buffer[i] = (255 << 24) | (noise << 16) | (noise << 8) | noise;
    }
    tileCtx.putImageData(imgData, 0, 0);

    const pattern = ctx.createPattern(tileCanvas, 'repeat');

    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    resizeGrain();
    window.addEventListener('resize', resizeGrain);

    // Shift pattern ~8 times per second (every 125ms)
    setInterval(() => {
      ctx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
      ctx.save();
      const ox = (Math.random() * tileSize) | 0;
      const oy = (Math.random() * tileSize) | 0;
      ctx.translate(ox, oy);
      ctx.fillStyle = pattern;
      ctx.fillRect(-tileSize, -tileSize, grainCanvas.width + tileSize * 2, grainCanvas.height + tileSize * 2);
      ctx.restore();
    }, 1000 / CONFIG.animation.filmGrainFps);
  }

  // --------------------------------------------------------------------------
  // 12. REDUCED MOTION STATIC FALLBACKS
  // --------------------------------------------------------------------------
  function initReducedMotionMode() {
    if (!isReducedMotion) return;

    // Hero: load and draw static frames at 0%
    loadSingleFrame(getHeroFrameUrl(1)).then((img) => {
      if (img && heroCtx && heroCanvas) {
        heroCache[0] = img;
        heroLoadedIndices.add(0);
        drawHeroFrame(0);
      }
    });

    // Dismantle: load and draw first frame
    loadSingleFrame(getDismantleFrameUrl(1)).then((img) => {
      if (img && dismantleCtx && dismantleCanvas) {
        dismantleCache[0] = img;
        dismantleLoadedIndices.add(0);
        drawDismantleFrame(0);
      }
    });

    // Reveal all hero narrative chapters cleanly
    const chapters = document.querySelectorAll('.hero-chapter');
    chapters.forEach((ch) => ch.classList.add('active'));

    // Reveal dismantle callouts
    const callouts = document.querySelectorAll('.dismantle-callout');
    callouts.forEach((co) => co.classList.add('active'));

    // Reveal statement
    const words = document.querySelectorAll('.statement-word');
    words.forEach((w) => (w.style.opacity = '1'));
  }

  // --------------------------------------------------------------------------
  // 13. FOOTER QUICK MODEL SELECTOR
  // --------------------------------------------------------------------------
  function initFooterLinks() {
    const modelBtns = document.querySelectorAll('.footer-link-btn[data-model]');
    modelBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const modelId = btn.getAttribute('data-model');
        openLineupSlide(modelId);
        const lineupSection = document.getElementById('lineup');
        if (lineupSection) {
          lineupSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    const reserveBtn = document.getElementById('reserve-btn');
    if (reserveBtn) {
      reserveBtn.addEventListener('click', () => {
        const textSpan = reserveBtn.querySelector('.reserve-btn-text');
        if (textSpan) {
          const original = textSpan.textContent;
          textSpan.textContent = 'ALLOCATION CONFIRMED — 2026';
          setTimeout(() => {
            textSpan.textContent = original;
          }, 3500);
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // 14. BOOTSTRAP APPLICATION
  // --------------------------------------------------------------------------
  function init() {
    // 1. Initialize DOM components
    initStatementSentence();
    initDismantleCallouts();
    initLineupAccordion();
    initCustomCursor();
    initFilmGrain();
    initFooterLinks();

    // 2. Setup resize listener with debounced re-computation
    window.addEventListener('resize', () => {
      resizeCanvases();
      updateScrollyProgress();
    });

    // 3. Setup scroll listener
    window.addEventListener('scroll', updateScrollyProgress, { passive: true });

    // 4. Initial calculations
    resizeCanvases();
    updateScrollyProgress();

    // 5. Start animation loop
    requestAnimationFrame(animationLoop);

    // 6. Launch preloader or reduced motion mode
    if (isReducedMotion) {
      document.body.classList.remove('loading');
      if (preloaderEl) preloaderEl.remove();
      initReducedMotionMode();
    } else {
      initPreloader();
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

