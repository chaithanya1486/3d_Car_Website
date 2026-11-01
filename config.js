/**
 * NOCTIS Configuration
 * Central configuration file for section heights, frame sequences,
 * chapter ranges, dismantle callout coordinates, and lineup data.
 */

const CONFIG = {
  // Brand details
  brand: {
    name: 'NOCTIS',
    tagline: 'The city is asleep.',
    year: 2026,
  },

  // Hero Scrollytelling Section
  hero: {
    wrapperHeight: '600vh',
    frameCount: 600,
    desktopPath: 'assets/frames/hero/frame_%s.webp',
    mobilePath: 'assets/frames/hero-mobile/frame_%s.webp',
    // Chapter ranges in scroll progress (0 to 1)
    chapters: [
      { id: 'ch1', start: 0.00, end: 0.14, label: '01 / 04' },
      { id: 'ch2', start: 0.22, end: 0.40, label: '02 / 04' },
      { id: 'ch3', start: 0.50, end: 0.68, label: '03 / 04' },
      { id: 'ch4', start: 0.80, end: 1.00, label: '04 / 04' },
    ],
    // Speed HUD: 0 -> 118 km/h, Distance: 0.0 -> 4.2 km
    hud: {
      maxSpeed: 118,
      maxDistance: 4.2,
    },
    // Progress point after which canvas fades to solid black
    fadeToBlackStart: 0.95,
  },

  // Dismantle Scrollytelling Section
  dismantle: {
    wrapperHeight: '350vh',
    frameCount: 200,
    desktopPath: 'assets/frames/dismantle/frame_%s.webp',
    mobilePath: 'assets/frames/dismantle-mobile/frame_%s.webp',
    // Callouts appear after 70% scroll progress (0.70 to 1.00)
    calloutStartProgress: 0.70,
    callouts: [
      {
        id: 'body',
        progress: 0.72,
        title: 'BODY',
        subtitle: 'Carbon composite monocoque',
        // Dot coordinates on the car canvas (% of container)
        dot: { x: 50, y: 32 },
        // Label anchor coordinates (% of container)
        label: { x: 20, y: 24 },
        lineSide: 'left', // line direction
      },
      {
        id: 'light',
        progress: 0.78,
        title: 'LIGHT',
        subtitle: 'Single-line LED signature',
        dot: { x: 22, y: 72 },
        label: { x: 8, y: 64 },
        lineSide: 'left',
      },
      {
        id: 'battery',
        progress: 0.84,
        title: 'BATTERY',
        subtitle: '110 kWh structural pack',
        dot: { x: 46, y: 77 },
        label: { x: 26, y: 88 },
        lineSide: 'left',
      },
      {
        id: 'drive',
        progress: 0.90,
        title: 'DRIVE',
        subtitle: 'Dual axial-flux motors, 680 kW',
        dot: { x: 74, y: 44 },
        label: { x: 78, y: 56 },
        lineSide: 'right',
      },
    ],
  },

  // Lineup Accordion Data
  lineup: [
    {
      id: 'gt-e',
      num: '01',
      name: 'GT-E',
      tagline: 'The grand tourer.',
      image: 'assets/cars/gt-e.webp',
      alt: 'NOCTIS GT-E matte graphite grand tourer coupe',
      specs: [
        { label: 'RANGE', value: '640 KM' },
        { label: '0–100 KM/H', value: '3.1 S' },
        { label: 'POWER', value: '680 KW' },
      ],
      swatches: ['#1A1C20', '#2E323A', '#8A8F98', '#EDEAE4'],
      activeSwatch: 0,
      openByDefault: true,
    },
    {
      id: 's',
      num: '02',
      name: 'S',
      tagline: 'Four doors, no compromise.',
      image: 'assets/cars/s.webp',
      alt: 'NOCTIS S four-door sport sedan in satin bone white',
      specs: [
        { label: 'RANGE', value: '600 KM' },
        { label: '0–100 KM/H', value: '3.6 S' },
        { label: 'POWER', value: '520 KW' },
      ],
      swatches: ['#EDEAE4', '#D0CCC4', '#8A8F98', '#121418'],
      activeSwatch: 0,
      openByDefault: false,
    },
    {
      id: 'x',
      num: '03',
      name: 'X',
      tagline: 'Higher, never heavier.',
      image: 'assets/cars/x.webp',
      alt: 'NOCTIS X SUV with coupe roofline in midnight blue',
      specs: [
        { label: 'RANGE', value: '560 KM' },
        { label: '0–100 KM/H', value: '4.2 S' },
        { label: 'POWER', value: '480 KW' },
      ],
      swatches: ['#121D30', '#1C2B44', '#8A8F98', '#EDEAE4'],
      activeSwatch: 0,
      openByDefault: false,
    },
    {
      id: 'r',
      num: '04',
      name: 'R',
      tagline: 'Built for the track.',
      image: 'assets/cars/r.webp',
      alt: 'NOCTIS R track coupe in satin black with red accents',
      specs: [
        { label: 'RANGE', value: '420 KM' },
        { label: '0–100 KM/H', value: '2.4 S' },
        { label: 'POWER', value: '900 KW' },
      ],
      swatches: ['#0E0F12', '#181A1E', '#E1251B', '#EDEAE4'],
      activeSwatch: 0,
      openByDefault: false,
    },
    {
      id: 'one',
      num: '05',
      name: 'ONE',
      tagline: 'The future, early.',
      image: 'assets/cars/one.webp',
      alt: 'NOCTIS ONE liquid silver concept hypercar',
      specs: [
        { label: 'RANGE', value: '750 KM' },
        { label: '0–100 KM/H', value: '1.9 S' },
        { label: 'POWER', value: 'CONCEPT' },
      ],
      swatches: ['#CFD3DA', '#9EA4B0', '#121418', '#CFE3FF'],
      activeSwatch: 0,
      openByDefault: false,
    },
  ],

  // Preloader initial batch
  preloader: {
    heroInitialFrames: 40,
  },

  // Motion and Smoothing parameters
  animation: {
    lerpFactor: 0.15, // canvas scrub smoothing
    cursorLerp: 0.18, // custom cursor follow speed
    hoverDebounceMs: 80, // debounce time for accordion hover
    filmGrainFps: 8, // noise grain shift speed (fps)
  },
};

// Freeze config so it cannot be mutated accidentally
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
}

