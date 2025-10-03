(() => {
  'use strict';

  // Config (can be tweaked via query params)
  const params = new URLSearchParams(location.search);
  const CONFIG = {
    lanes: clamp(intParam(params.get('lanes'), 3), 2, 5),
    baseSpeed: clamp(floatParam(params.get('baseSpeed'), 220), 80, 600), // px/s
    // maxSpeed: set <=0 for no cap
    maxSpeed: floatParam(params.get('maxSpeed'), -1),
    accelPerSec: clamp(floatParam(params.get('accel'), 20), 5, 200), // default ramp (slower)
    // After multiplier threshold, ramp slows significantly
    slowAfterMul: clamp(floatParam(params.get('slowAfterMul'), 3.5), 1, 20),
    accelAfterPerSec: clamp(floatParam(params.get('accelAfter'), 6.7), 0, 200), // 1/3 slower acceleration after x3.5
    spawnEveryMs: clamp(intParam(params.get('spawnMs'), 800), 200, 2000),
    minSpawnMs: clamp(intParam(params.get('minSpawnMs'), 280), 120, 1200),
    spawnFactor: clamp(floatParam(params.get('spawnFactor'), 1.8), 0.5, 3.0),
    // Smooth exponential spawn pacing: larger => slower approach to minSpawnMs
    spawnSmoothK: clamp(floatParam(params.get('spawnK'), 500), 100, 2000),
    offerChance: clamp(floatParam(params.get('offerChance'), 0.12), 0.02, 0.8), // probability an object is an offer
    shieldChance: clamp(floatParam(params.get('shieldChance'), 0.03), 0.001, 0.1), // probability a shield spawns (rare but fair)
    lilyRadius: clamp(floatParam(params.get('lilyR'), 28), 16, 52),
    playerRadius: clamp(floatParam(params.get('playerR'), 24), 14, 38),
    duckYfromBottom: clamp(floatParam(params.get('duckY'), 110), 60, 220),
    codeBase: (params.get('codeBase') || 'flower').toLowerCase(),
    brand: params.get('brand') || 'Your Brand',
    drop: params.get('drop') || 'New Drop',
    maxPercent: clamp(intParam(params.get('maxPercent'), 30), 1, 100),
    sideGraceMs: clamp(intParam(params.get('sideGraceMs'), 4500), 500, 10000),
    sideCooldownMs: clamp(intParam(params.get('sideCooldownMs'), 350), 100, 1500),
    frontalDxFactor: clamp(floatParam(params.get('frontalDxFactor'), 0.6), 0.2, 1.0),
    gapBandPx: clamp(intParam(params.get('gapBand'), 220), 80, 480),
    pathWindowPx: clamp(intParam(params.get('pathWindow'), 300), 120, 560),
    rescueCooldownMs: clamp(intParam(params.get('rescueCooldown'), 300), 80, 2000),
    pathSamples: clamp(intParam(params.get('pathSamples'), 7), 3, 15),
    rescueMaxPerTick: clamp(intParam(params.get('rescueMax'), 2), 1, 5),
    // Attach offers near lilies to make pickups riskier
    offerAttach: intParam(params.get('offerAttach'), 1) ? 1 : 0,
    offerAttachWindowPx: clamp(intParam(params.get('attachWindow'), 180), 60, 400),
    offerAttachMarginPx: clamp(intParam(params.get('attachMargin'), 6), 0, 24),
    // Last-moment frontal graze forgiveness (px)
    lateFrontForgivenessPx: clamp(intParam(params.get('frontGracePx'), 12), 0, 48),
    // Offer gating: allow at most N offers to appear before a score threshold
    offerScoreThreshold: clamp(intParam(params.get('offerScoreThreshold'), 3000), 0, 1000000),
    offerMaxCount: clamp(intParam(params.get('offerMaxCount'), 2), 0, 50),
    // Wave rails (optional): make lanes curvy to follow river lines
    railMode: (params.get('rail') || '').toLowerCase(), // '' or 'wave'
    railAmp: clamp(floatParam(params.get('railAmp'), 42), 0, 200), // px amplitude (CSS px)
    railKy: clamp(floatParam(params.get('railKy'), 2.0), 0, 10),   // waves per canvas height
    railSpeed: clamp(floatParam(params.get('railSpeed'), 0.6), 0, 5), // cycles/sec
    railPhaseStep: clamp(floatParam(params.get('railPhaseStep'), 0.8), 0, 6.283), // rad per lane
    debugRails: intParam(params.get('debugRails'), 0) ? 1 : 0,
    // Straight rails (align to video dashed lines) - CALIBRATED VALUES v2
    railLeftPx: floatParam(params.get('railLeft'), NaN),  // Let it use default centered lanes
    railSpacingPx: floatParam(params.get('railSpacing'), NaN),  // Let it use default spacing
    railLeftPct: floatParam(params.get('railLeftPct'), NaN), // 0-100
    railSpacingPct: floatParam(params.get('railSpacingPct'), NaN), // 0-100
    calibrate: intParam(params.get('calibrate'), 0) ? 1 : 0,
    // Edge tilt (applies only to outer lanes in straight mode) - CALIBRATED VALUES v2
    railEdgeTiltPx: floatParam(params.get('railEdgeTilt'), 0),  // Calibrated: 0px (no tilt)
    railEdgeTiltPct: floatParam(params.get('railEdgeTiltPct'), NaN), // as % of canvas width across full height
    railEdgeTiltAnchor: (params.get('railEdgeTiltAnchor') || 'bottom').toLowerCase(), // Calibrated: bottom
  };

  // Canvas setup with HiDPI support
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('score');
  const hudSpeed = document.getElementById('speed');
  const hudBonus = document.getElementById('bonus');
  const hudShield = document.getElementById('shield-indicator');

  const overlayStart = document.getElementById('tap-to-start');
  const overlayPaused = document.getElementById('paused');
  const overlayGameOver = document.getElementById('game-over');
  const goverMsgEl = document.getElementById('gover-msg');
  const finalScoreEl = document.getElementById('final-score');
  const offerSectionEl = document.getElementById('offer-section');
  const startBtn = document.getElementById('start-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const copyBtn = document.getElementById('copy-code');
  const offerCodeEl = document.getElementById('offer-code');
  const offerDescEl = document.getElementById('offer-desc');
  const calReadout = document.getElementById('cal-readout');
  const videoLoadingEl = document.getElementById('video-loading');
  const musicToggleCheckbox = document.getElementById('checkboxInput');
  const backgroundMusic = document.getElementById('background-music');
  const gameoverSound = document.getElementById('gameover-sound');

  const noufaroSound = document.getElementById('noufaro-sound');
  const shieldSound = document.getElementById('shield-sound');
  const shieldBreakSound = document.getElementById('shieldbreak-sound');
  
  // Preload and prepare all sound effects for instant playback
  const soundEffects = [noufaroSound, shieldSound, shieldBreakSound];
  soundEffects.forEach(sound => {
    if (sound) {
      sound.preload = 'auto';
      sound.load(); // Force immediate loading
      // Set default volumes
      if (sound.id === 'noufaro-sound') sound.volume = 0.7;
      if (sound.id === 'shield-sound') sound.volume = 0.6;
      if (sound.id === 'shieldbreak-sound') sound.volume = 0.6;
    }
  });
  
  console.log('Sound effects preloaded and ready for instant playback');

  // Global audio state - controls all sounds (music + effects)
  let audioEnabled = true;
  
  // Global player name - set once at game start
  let globalPlayerName = null;

  // Helper function to play sounds instantly if audio is enabled
  function playSound(audioElement) {
    if (audioEnabled && audioElement) {
      // Reset to start for instant replay capability
      audioElement.currentTime = 0;
      // Use requestAnimationFrame for smoother audio timing
      requestAnimationFrame(() => {
        audioElement.play().catch(e => console.log('Sound blocked:', e));
      });
    }
  }

  // Device pixel ratio with mobile compensation
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  // For mobile, use a consistent DPR to avoid positioning issues
  if (isMobile && window.devicePixelRatio > 2) {
    dpr = 2; // Force DPR=2 on high-DPI mobile to maintain calibration
  }
  const classicMode = ((params.get('mode')||'').toLowerCase()==='classic') || (intParam(params.get('classic'),0) === 1);
  // Optional brand logo
  const LOGO_URL = (params.get('logo') || '').trim();
  let logoImg = null; let logoLoaded = false;
  if (LOGO_URL) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoImg = img; logoLoaded = true; };
    img.onerror = () => { logoLoaded = false; };
    img.src = LOGO_URL;
  }
  
  // Duck sprite image
  let duckImg = null; let duckLoaded = false;
  const duckImageUrl = 'Assets/ducky.png';
  if (duckImageUrl) {
    const img = new Image();
    img.onload = () => { duckImg = img; duckLoaded = true; };
    img.onerror = () => { duckLoaded = false; };
    img.src = duckImageUrl;
  }
  
  // Lily (noufaro) sprite image
  let lilyImg = null; let lilyLoaded = false;
  const lilyImageUrl = 'Assets/noufaro.png';
  if (lilyImageUrl) {
    const img = new Image();
    img.onload = () => { lilyImg = img; lilyLoaded = true; };
    img.onerror = () => { lilyLoaded = false; };
    img.src = lilyImageUrl;
  }

  // Shield sprite image
  let shieldImg = null; let shieldLoaded = false;
  const shieldImageUrl = 'Assets/Assets/shield.png'; // Fixed path
  if (shieldImageUrl) {
    const img = new Image();
    img.onload = () => { 
      shieldImg = img; 
      shieldLoaded = true; 
      console.log('Shield image loaded successfully');
    };
    img.onerror = () => { 
      shieldLoaded = false; 
      console.log('Shield image failed to load, using fallback graphics');
    };
    img.src = shieldImageUrl;
  }

  // Doro (offer/gift) sprite image
  let doroImg = null; let doroLoaded = false;
  const doroImageUrl = 'Assets/doro.png';
  if (doroImageUrl) {
    const img = new Image();
    img.onload = () => { 
      doroImg = img; 
      doroLoaded = true; 
      console.log('Doro image loaded successfully');
    };
    img.onerror = () => { 
      doroLoaded = false; 
      console.log('Doro image failed to load, using fallback graphics');
    };
    img.src = doroImageUrl;
  }

  // Optional river video background with mobile optimization
  const RIVER_MODE = (params.get('river') || 'video').toLowerCase(); // Default to 'video'
  let RIVER_SRC = (params.get('video') || 'Assets/river.mp4').trim(); // Default video source
  const RIVER_POSTER = (params.get('videoPoster') || '').trim();
  
  // Auto-detect mobile and use optimized video
  const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  if ((isMobileDevice || isSmallScreen) && RIVER_SRC === 'Assets/river.mp4') {
    RIVER_SRC = 'Assets/mobileriver.mov'; // Use mobile-optimized video
    console.log('Mobile detected: Using mobile-optimized video');
  }
  
  // Setup river video only when game starts (not on page load)
  let riverVideoSetup = false;
  function ensureRiverVideo() {
    if (riverVideoSetup || !RIVER_SRC || RIVER_MODE !== 'video') return;
    riverVideoSetup = true;
    setupRiverVideo(RIVER_SRC);
  }
  
  // Start loading video immediately for faster startup
  if (RIVER_MODE === 'video' && RIVER_SRC) {
    setTimeout(() => ensureRiverVideo(), 100); // Small delay to let page settle
  }
  
  let riverVideo = null; let riverReady = false;
  function setupRiverVideo(src){
    // Show loading indicator
    if (videoLoadingEl) videoLoadingEl.classList.remove('hidden');
    
    const vid = document.createElement('video');
    vid.muted = true; 
    vid.loop = true; 
    vid.playsInline = true; 
    vid.autoplay = true; 
    // Aggressive preloading for faster startup
    vid.preload = 'auto'; // Always preload full video for speed
    vid.defaultPlaybackRate = 1.0;
    // Add performance optimization attributes
    vid.setAttribute('playsinline', 'true');
    vid.setAttribute('webkit-playsinline', 'true');
    vid.setAttribute('x5-playsinline', 'true'); // WeChat browser
    vid.setAttribute('x5-video-player-type', 'h5');
    vid.setAttribute('x5-video-orientation', 'portraint');
    if (RIVER_POSTER) vid.poster = RIVER_POSTER;
    try { vid.crossOrigin = 'anonymous'; } catch {}
    
    // Optimized loading with multiple events
    let loadAttempted = false;
    const markReady = () => {
      if (!loadAttempted) {
        riverReady = true;
        loadAttempted = true;
        // Hide loading indicator
        if (videoLoadingEl) videoLoadingEl.classList.add('hidden');
        console.log('Video ready for playback:', src);
      }
    };
    
    vid.addEventListener('canplay', markReady);
    vid.addEventListener('canplaythrough', markReady);
    vid.addEventListener('loadeddata', markReady);
    vid.addEventListener('loadstart', () => console.log('Video loading started:', src));
    
    vid.addEventListener('error', () => {
      console.log('Video load error, trying fallbacks...', src);
      // Try mobile video if desktop video failed
      if (/Assets\/river\.mp4$/i.test(src)) {
        console.log('Trying mobile video...');
        try { setupRiverVideo('Assets/mobileriver.mov'); } catch {}
      }
      // Try lowercase path fallback
      else if (/Assets\/mobileriver\.mov$/i.test(src)) {
        console.log('Trying lowercase assets path...');
        try { setupRiverVideo('assets/mobileriver.mov'); } catch {}
      } 
      // Try original with lowercase
      else if (/mobileriver\.mov$/i.test(src)) {
        console.log('Trying original river video...');
        try { setupRiverVideo('assets/river.mp4'); } catch {}
      }
      else {
        console.log('Video failed completely, falling back to canvas background');
        // Hide loading indicator on failure
        if (videoLoadingEl) videoLoadingEl.classList.add('hidden');
        riverReady = false;
        riverVideo = null;
      }
    }, { once: true });
    
    riverVideo = vid;
    // Set source last for better loading performance
    vid.src = src;
    
    // Force load to start immediately
    try {
      vid.load();
    } catch(e) {
      console.log('Manual load() failed, relying on src loading');
    }
  }
  // Don't setup video immediately - wait for game start for faster loading
  // Video will be loaded only when start() is called
  // Auto-enable straight rails when a river video is present (can be overridden via ?rail=)
  if (!classicMode && !CONFIG.railMode && (RIVER_MODE === 'video' || riverVideo)) {
    CONFIG.railMode = 'straight';
  }
  if (!classicMode && CONFIG.calibrate && !CONFIG.railMode) {
    CONFIG.railMode = 'straight';
  }
  if (classicMode) {
    CONFIG.railMode = '';
    CONFIG.debugRails = 0;
    CONFIG.calibrate = 0;
    riverVideo = null; riverReady = false;
  }

  function timeSec(){
    if (riverVideo && !isNaN(riverVideo.currentTime)) return riverVideo.currentTime;
    return performance.now()*0.001;
  }

  function railEnabled(){ return CONFIG.railMode === 'wave' || CONFIG.railMode === 'straight'; }

  function getRailX(lane, y){
    const W = canvas.width || 1;
    // If straight rails: constant x per lane, calibrated to video dashed lines
    if (CONFIG.railMode === 'straight') {
      // Derive left/spacing from params or fall back to base computed lanesX
      let left = state.cal.leftDev != null ? state.cal.leftDev : (state.lanesX[0] || 0);
      let spacing = state.cal.spacingDev != null ? state.cal.spacingDev : ((state.lanesX[1] ? (state.lanesX[1]-state.lanesX[0]) : (W/CONFIG.lanes)) || (W/CONFIG.lanes));
      if (!Number.isNaN(CONFIG.railLeftPct)) left = (CONFIG.railLeftPct/100) * W;
      else if (!Number.isNaN(CONFIG.railLeftPx)) {
        left = CONFIG.railLeftPx * dpr;
        // Mobile adjustment: move rails further left on mobile devices (only actual mobile devices)
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          left = left - (80 * dpr); // Move 80px left on mobile (was 40px)
        }
      }
      if (!Number.isNaN(CONFIG.railSpacingPct)) spacing = (CONFIG.railSpacingPct/100) * W;
      else if (!Number.isNaN(CONFIG.railSpacingPx)) {
        spacing = CONFIG.railSpacingPx * dpr;
        // Mobile adjustment: slightly closer rails but keep middle rail centered (only actual mobile devices)
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          const originalSpacing = spacing;
          spacing = spacing * 0.92; // Reduce spacing by 8% (very subtle)
          // Adjust left position to keep middle rail (lane 1) in same position
          const spacingDiff = originalSpacing - spacing;
          left = left + spacingDiff; // Compensate for tighter spacing
        }
      }
      let x = left + lane * spacing;
      // Apply outer-lane tilt across height with anchor selection
      if (lane === 0 || lane === (CONFIG.lanes - 1)) {
        let tiltPx = (state.cal.edgeTiltDev != null) ? state.cal.edgeTiltDev : (CONFIG.railEdgeTiltPx * dpr);
        if (!Number.isNaN(CONFIG.railEdgeTiltPct)) tiltPx = (CONFIG.railEdgeTiltPct/100) * W;
        const H = canvas.height || 1;
        const yRatio = Math.max(0, Math.min(1, y / H));
        let f = yRatio; // default: top anchor 0 -> bottom tilt
        const anchor = CONFIG.railEdgeTiltAnchor;
        if (anchor === 'bottom') f = yRatio - 1; // 0 at bottom, -1 at top
        else if (anchor === 'center') f = (yRatio - 0.5) * 2; // -1 top, +1 bottom
        // anchor === 'top' keeps f = yRatio (0 at top, +1 at bottom)
        // Apply opposite sign to left/right outer lanes so they ανοίγουν/κλείνουν συμμετρικά
        const sign = (lane === 0) ? -1 : +1;
        x += sign * tiltPx * f;
      }
      return x;
    }
    // Wave rails (default when selected)
    const base = state.lanesX[lane] || 0;
    if (CONFIG.railMode !== 'wave') return base;
    const H = canvas.height || 1;
    const A = (CONFIG.railAmp||0) * dpr;
    if (A === 0) return base;
    const ky = Math.PI*2 * CONFIG.railKy; // cycles per height -> radians
    const omega = Math.PI*2 * CONFIG.railSpeed;
    const phiLane = CONFIG.railPhaseStep * lane;
    const t = timeSec();
    const phase = ky * (y / H) + omega * t + phiLane;
    return base + Math.sin(phase) * A;
  }
  function resize() {
    // keep aspect 480x800; robust against 0 clientWidth during early layout
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || canvas.clientWidth || canvas.width || 480;
    const cssHeight = rect.height || canvas.clientHeight || canvas.height || 800;
    const w = Math.max(1, Math.floor(cssWidth * dpr));
    const h = Math.max(1, Math.floor(cssHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  resize();
  window.addEventListener('resize', () => { 
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1)); 
    // Mobile DPR consistency fix
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile && window.devicePixelRatio > 2) {
      dpr = 2;
    }
    resize(); 
  });

  // Game state
  const state = {
    started: false,
    paused: false,
    t: 0,
    speed: CONFIG.baseSpeed,
    score: 0,
    lanesX: [],
    laneIndex: 1,
    player: { x: 0, y: 0, r: CONFIG.playerRadius, lane: 1, targetX: 0, hitCooldown: 0, hasShield: false },
    objects: [], // { type: 'lily'|'offer'|'shield', lane, x, y, r, speed }
    lastSpawn: 0,
    rng: mulberry32(Date.now() & 0xffffffff),
    touchStart: null,
    touchSwipeExecuted: false,
    lastSwipeTime: 0,
    gameOver: false,
    offerCode: null,
    offersCollected: 0,
    offersSpawned: 0,
    spawns: 0,
    wobbleUntil: 0,
    sideHitCooldown: 0,
    lastRescueMs: 0,
    particles: [], // visual particles
    cal: { leftDev: null, spacingDev: null, edgeTiltDev: null },
  };

  // Initialize lanes based on canvas width
  function recomputeLanes() {
    const W = canvas.width;
    const N = CONFIG.lanes;
    const margin = 0.12 * W; // side margins
    const usable = W - margin * 2;
    state.lanesX = [];
    for (let i = 0; i < N; i++) {
      const x = margin + usable * (i + 0.5) / N;
      state.lanesX.push(x);
    }
    state.laneIndex = Math.floor(N / 2);
    state.player.lane = state.laneIndex;
    state.player.x = state.player.targetX = getRailX(state.laneIndex, canvas.height - CONFIG.duckYfromBottom * dpr);
    state.player.y = canvas.height - CONFIG.duckYfromBottom * dpr;

    // Initialize calibration defaults for straight rails
    if (CONFIG.railMode === 'straight') {
      if (state.cal.leftDev == null) {
        if (!Number.isNaN(CONFIG.railLeftPct)) state.cal.leftDev = (CONFIG.railLeftPct/100) * W;
        else if (!Number.isNaN(CONFIG.railLeftPx)) state.cal.leftDev = CONFIG.railLeftPx * dpr;
        else state.cal.leftDev = state.lanesX[0];
      }
      if (state.cal.spacingDev == null) {
        if (!Number.isNaN(CONFIG.railSpacingPct)) state.cal.spacingDev = (CONFIG.railSpacingPct/100) * W;
        else if (!Number.isNaN(CONFIG.railSpacingPx)) state.cal.spacingDev = CONFIG.railSpacingPx * dpr;
        else state.cal.spacingDev = (state.lanesX[1] ? state.lanesX[1] - state.lanesX[0] : usable/N);
      }
    }
  }
  recomputeLanes();

  // Utility functions
  function intParam(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
  function floatParam(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function mulberry32(a){return function(){var t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}};
  function randRange(rng, min, max){return rng()*(max-min)+min}

  // Input
  function moveLeft(){ setLane(state.laneIndex - 1); }
  function moveRight(){ setLane(state.laneIndex + 1); }
  function setLane(idx){
    const N = CONFIG.lanes;
    state.laneIndex = clamp(idx, 0, N-1);
    state.player.lane = state.laneIndex;
    state.player.targetX = state.lanesX[state.laneIndex];
  }

  window.addEventListener('keydown', (e) => {
    // Calibration controls (before game start)
    if (CONFIG.calibrate && !state.started && CONFIG.railMode === 'straight') {
      const stepCss = (e.shiftKey ? 12 : (e.altKey ? 1 : 4));
      const stepDev = stepCss * dpr;
      const code = e.code || '';
      const key = e.key || '';
      if (key === 'ArrowLeft') { state.cal.leftDev = (state.cal.leftDev ?? state.lanesX[0]) - stepDev; e.preventDefault(); return; }
      if (key === 'ArrowRight') { state.cal.leftDev = (state.cal.leftDev ?? state.lanesX[0]) + stepDev; e.preventDefault(); return; }
      if (key === 'ArrowUp') { state.cal.spacingDev = (state.cal.spacingDev ?? (state.lanesX[1]-state.lanesX[0])) + stepDev; e.preventDefault(); return; }
      if (key === 'ArrowDown') { state.cal.spacingDev = Math.max(10*dpr, (state.cal.spacingDev ?? (state.lanesX[1]-state.lanesX[0])) - stepDev); e.preventDefault(); return; }
      // Tilt: support hardware scancodes and Greek letters
      if (code === 'KeyZ' || key === 'z' || key === 'Z' || key === 'ζ' || key === 'Ζ') {
        state.cal.edgeTiltDev = (state.cal.edgeTiltDev ?? (Number.isNaN(CONFIG.railEdgeTiltPx) ? 0 : CONFIG.railEdgeTiltPx*dpr)) - stepDev; e.preventDefault(); return;
      }
      if (code === 'KeyX' || key === 'x' || key === 'X' || key === 'χ' || key === 'Χ') {
        state.cal.edgeTiltDev = (state.cal.edgeTiltDev ?? (Number.isNaN(CONFIG.railEdgeTiltPx) ? 0 : CONFIG.railEdgeTiltPx*dpr)) + stepDev; e.preventDefault(); return;
      }
      if (e.key === 'c' || e.key === 'C') {
        // Copy URL params for the current calibration in CSS px
        const leftCss = Math.round((state.cal.leftDev ?? state.lanesX[0]) / dpr);
        const spacingCss = Math.round((state.cal.spacingDev ?? (state.lanesX[1]-state.lanesX[0])) / dpr);
        const tiltCss = Math.round((state.cal.edgeTiltDev ?? 0) / dpr);
        const qs = `rail=straight&railLeft=${leftCss}&railSpacing=${spacingCss}` + (tiltCss?`&railEdgeTilt=${tiltCss}`:"") + (CONFIG.debugRails?"&debugRails=1":"");
        try { navigator.clipboard.writeText(qs); } catch {}
        e.preventDefault(); return;
      }
      // Ensure background video tries to play and calibration loop runs
      if (riverVideo) { try { riverVideo.play().catch(()=>{}); } catch {} }
      startCalibrationLoop();
    }
    if (!state.started && (e.key === ' ' || e.key === 'Enter')) { start(); return; }
    if (e.key === 'p' || e.key === 'P') { togglePause(); }
    if (state.paused) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
  });

  // Touch swipe controls (Instant response - no wait for touchend)
  const SWIPE_THRESHOLD = 30;        // Minimum distance for swipe
  const INTENT_DISTANCE = 15;        // Minimum distance to start tracking
  const SWIPE_COOLDOWN = 150;        // Milliseconds between swipes
  const VERTICAL_TOLERANCE = 1.2;    // Horizontal must be 1.2x larger than vertical

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling while playing
    if (e.touches && e.touches[0]) {
      state.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
      state.touchSwipeExecuted = false; // Reset swipe flag
    }
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling while playing
    if (!state.touchStart || state.touchSwipeExecuted) return;
    
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    
    const dx = touch.clientX - state.touchStart.x;
    const dy = touch.clientY - state.touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const now = performance.now();
    
    // Check if we've moved enough to consider it intentional
    if (adx < INTENT_DISTANCE && ady < INTENT_DISTANCE) return;
    
    // Check cooldown to prevent too frequent swipes
    if (now - state.lastSwipeTime < SWIPE_COOLDOWN) return;
    
    // Must be primarily horizontal movement
    if (adx < SWIPE_THRESHOLD) return;
    if (adx < ady * VERTICAL_TOLERANCE) return; // Too much vertical movement
    
    // Execute the swipe immediately!
    if (dx < 0) {
      moveLeft();
    } else {
      moveRight();
    }
    
    // Mark this gesture as completed and set cooldown
    state.touchSwipeExecuted = true;
    state.lastSwipeTime = now;
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault(); // Prevent scrolling while playing
    // Just reset the touch state - swipe was already handled in touchmove
    state.touchStart = null;
    state.touchSwipeExecuted = false;
  }, { passive: false });

  // Buttons
  if (startBtn) startBtn.addEventListener('click', start);
  // Removed failsafe click - now only START button works
  if (resumeBtn) resumeBtn.addEventListener('click', togglePause);
  if (restartBtn) restartBtn.addEventListener('click', () => { restartGame(); });
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const code = offerCodeEl?.textContent || '';
    if (!code) {
      console.log('No code to copy');
      return;
    }
    
    try {
      // Modern clipboard API
      await navigator.clipboard.writeText(code);
      if (copyBtn) {
        copyBtn.textContent = '✓ Αντιγράφηκε!';
        copyBtn.style.backgroundColor = '#4caf50';
        setTimeout(() => {
          if (copyBtn) {
            copyBtn.textContent = 'Αντιγραφή';
            copyBtn.style.backgroundColor = '';
          }
        }, 1500);
      }
      console.log('Code copied:', code);
    } catch (err) {
      console.log('Clipboard API failed, trying fallback:', err);
      // Fallback για παλιότερους browsers ή iOS
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful && copyBtn) {
          copyBtn.textContent = '✓ Αντιγράφηκε!';
          copyBtn.style.backgroundColor = '#4caf50';
          setTimeout(() => {
            if (copyBtn) {
              copyBtn.textContent = 'Αντιγραφή';
              copyBtn.style.backgroundColor = '';
            }
          }, 1500);
          console.log('Code copied via fallback:', code);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackErr) {
        console.error('All copy methods failed:', fallbackErr);
        if (copyBtn) {
          copyBtn.textContent = '✗ Αποτυχία';
          copyBtn.style.backgroundColor = '#f44336';
          setTimeout(() => {
            if (copyBtn) {
              copyBtn.textContent = 'Αντιγραφή';
              copyBtn.style.backgroundColor = '';
            }
          }, 2000);
        }
        // Show the code so user can copy manually
        alert('Δεν μπόρεσε η αυτόματη αντιγραφή. Ο κωδικός σας:\n\n' + code + '\n\nΑντιγράψτε τον χειροκίνητα.');
      }
    }
  });

  // Firebase Leaderboard Event Listeners
  const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
  const leaderboardOverlay = document.getElementById('leaderboard-overlay');

  if (showLeaderboardBtn && leaderboardOverlay) {
    showLeaderboardBtn.addEventListener('click', async () => {
      leaderboardOverlay.classList.remove('hidden');
      await window.showLeaderboard(10); // Show top 10
    });
  }

  if (closeLeaderboardBtn && leaderboardOverlay) {
    closeLeaderboardBtn.addEventListener('click', () => {
      leaderboardOverlay.classList.add('hidden');
    });
  }

  // Player name input validation and Enter key support
  const initialPlayerNameInput = document.getElementById('initial-player-name');
  if (initialPlayerNameInput) {
    initialPlayerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        start();
      }
    });
    
    // Focus on the input when page loads
    setTimeout(() => {
      initialPlayerNameInput.focus();
    }, 500);
  }

  // Audio toggle functionality - controls all sounds (music + effects)
  if (musicToggleCheckbox && backgroundMusic) {
    // Initialize audio state: checked = muted (false), unchecked = unmuted (true)
    audioEnabled = !musicToggleCheckbox.checked;
    
    musicToggleCheckbox.addEventListener('change', () => {
      if (!musicToggleCheckbox.checked) {
        // Unchecked = unmuted = all audio plays
        audioEnabled = true;
        backgroundMusic.volume = 0.3; // Set volume to 30%
        backgroundMusic.play().catch(e => console.log('Music autoplay blocked:', e));
      } else {
        // Checked = muted = all audio stops
        audioEnabled = false;
        backgroundMusic.pause();
      }
    });
  }

  function start(){
    if (state.started) return;
    
    // Get player name if not already set (first time playing)
    if (!globalPlayerName) {
      const initialPlayerNameInput = document.getElementById('initial-player-name');
      if (initialPlayerNameInput) {
        const playerName = initialPlayerNameInput.value.trim();
        if (!playerName) {
          // Shake the input field and change placeholder
          initialPlayerNameInput.classList.add('shake');
          const originalPlaceholder = initialPlayerNameInput.getAttribute('data-original-placeholder');
          initialPlayerNameInput.placeholder = '⚠️ Παρακαλώ εισάγετε το όνομά σας!';
          initialPlayerNameInput.focus();
          
          // Remove shake class and restore placeholder after animation
          setTimeout(() => {
            initialPlayerNameInput.classList.remove('shake');
            initialPlayerNameInput.placeholder = originalPlaceholder || 'Εισάγετε το όνομά σας';
          }, 2000); // Longer timeout για να διαβάσει το μήνυμα
          
          return;
        }
        globalPlayerName = playerName;
        console.log('Player name set to:', globalPlayerName);
      }
    }
    
    // Load video only when game starts (not on page load)
    ensureRiverVideo();
    state.gameOver = false;
    overlayGameOver.classList.add('hidden');
    state.started = true;
    overlayStart.classList.add('hidden');
    
    // Show HUD when game starts
    const hud = document.getElementById('hud');
    if (hud) hud.classList.add('visible');
    
    state.offersCollected = clamp(intParam(params.get('startOffers'), 0), 0, CONFIG.maxPercent);
    state.offersSpawned = 0;
    if (riverVideo) {
      try { riverVideo.play().catch(()=>{}); } catch {}
    }
    
    // Restart music from beginning when game starts (if audio is enabled)
    if (backgroundMusic && audioEnabled && musicToggleCheckbox && !musicToggleCheckbox.checked) {
      backgroundMusic.currentTime = 0; // Reset to beginning
      backgroundMusic.volume = 0.3;
      backgroundMusic.play().catch(e => console.log('Music restart blocked:', e));
    }
    
    if (calReadout) calReadout.classList.add('hidden');
    updateHUD();
    state.t = performance.now();
    requestAnimationFrame(tick);
  }

  function togglePause(){
    if (!state.started || state.gameOver) return;
    state.paused = !state.paused;
    if (overlayPaused) overlayPaused.classList.toggle('hidden', !state.paused);
    if (!state.paused) {
      state.t = performance.now();
      requestAnimationFrame(tick);
    }
  }

  function gameOver(){
    if (state.gameOver) return;
    state.gameOver = true;
    state.started = false; // stop loop
    if (overlayPaused) overlayPaused.classList.add('hidden');
    
    // Stop background music when game ends
    if (backgroundMusic && !backgroundMusic.paused) {
      backgroundMusic.pause();
    }
    
    // Play game over sound (only if audio enabled)
    if (gameoverSound) {
      gameoverSound.volume = 0.5; // Set volume to 50%
      playSound(gameoverSound);
    }
    
    // Update Game Over UI
    if (finalScoreEl) finalScoreEl.textContent = String(Math.floor(state.score));
    const percent = Math.min(CONFIG.maxPercent, Math.max(0, state.offersCollected));
    if (percent > 0) {
      const code = `${CONFIG.codeBase}${percent}`;
      state.offerCode = code;
      if (offerCodeEl) offerCodeEl.textContent = code;
      if (offerDescEl) offerDescEl.textContent = `Κέρδισες ${percent}% για το ${CONFIG.drop} (${CONFIG.brand})`;
      if (offerSectionEl) offerSectionEl.classList.remove('hidden');
      if (goverMsgEl) goverMsgEl.textContent = 'Μπράβο! Κέρδισες προσφορά!';
      // Inform parent now (on game over)
      try {
        window.parent?.postMessage({ type: 'duck-surfers-offer-claimed', code, percent, score: Math.floor(state.score), brand: CONFIG.brand, drop: CONFIG.drop }, '*');
      } catch {}
      saveClaim(code, percent);
    } else {
      if (offerSectionEl) offerSectionEl.classList.add('hidden');
      if (goverMsgEl) goverMsgEl.textContent = 'Game Over — δεν κέρδισες προσφορά αυτή τη φορά.';
    }
    
    // Automatic score submission for scores above 100
    const scoreStatusEl = document.getElementById('score-status');
    const scoreMessageEl = document.getElementById('score-message');
    
    if (globalPlayerName && Math.floor(state.score) > 100 && window.submitScore) {
      if (scoreStatusEl) scoreStatusEl.classList.remove('hidden');
      if (scoreMessageEl) scoreMessageEl.textContent = 'Καταχώρηση σκορ...';
      
      // Submit score automatically
      window.submitScore(globalPlayerName, Math.floor(state.score))
        .then(success => {
          if (scoreMessageEl) {
            if (success) {
              scoreMessageEl.innerHTML = '🎉 Νέο υψηλό σκορ καταχωρήθηκε!';
            } else {
              scoreMessageEl.textContent = 'Το σκορ καταχωρήθηκε (δεν είναι νέο ρεκόρ)';
            }
          }
        })
        .catch(error => {
          console.error('Auto score submission error:', error);
          if (scoreMessageEl) {
            scoreMessageEl.textContent = 'Σφάλμα καταχώρησης σκορ';
          }
        });
    } else if (scoreStatusEl) {
      scoreStatusEl.classList.add('hidden');
    }
    
    if (overlayGameOver) overlayGameOver.classList.remove('hidden');
  }

  function restartGame(){
    // Reset state
    state.started = false;
    state.paused = false;
    state.t = 0;
    state.speed = CONFIG.baseSpeed;
    state.score = 0;
    state.objects = [];
    state.lastSpawn = 0;
    state.rng = mulberry32(Date.now() & 0xffffffff);
    state.touchStart = null;
    state.touchSwipeExecuted = false;
    state.lastSwipeTime = 0;
    
    // Hide HUD when game restarts
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('visible');
    state.gameOver = false;
    state.offerCode = null;
    state.offersCollected = 0;
    state.offersSpawned = 0;
    state.player.hasShield = false; // Reset shield status
    recomputeLanes();
    if (overlayGameOver) overlayGameOver.classList.add('hidden');
    if (overlayPaused) overlayPaused.classList.add('hidden');
    updateHUD();
    start();
  }

  // Offer storage (saved on Game Over)
  function saveClaim(code, percent){
    try {
      const key = 'duck_surfers_claims';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push({ code, percent, ts: Date.now(), score: Math.floor(state.score) });
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  // Spawning and game loop
  function offerAllowed() {
    if (state.offersCollected >= CONFIG.maxPercent) return false;
    if (state.score < CONFIG.offerScoreThreshold) {
      return state.offersSpawned < CONFIG.offerMaxCount;
    }
    // After threshold, behave like before (only limited by maxPercent)
    return true;
  }

  function maybeSpawn(dt){
    state.lastSpawn += dt;
    // Smooth spawn tempo: exponential approach from spawnEveryMs to minSpawnMs as speed rises
    const v = Math.max(0, state.speed - CONFIG.baseSpeed);
    const p = 1 - Math.exp(-v / CONFIG.spawnSmoothK);
    const currentSpawnMs = Math.max(CONFIG.minSpawnMs, CONFIG.spawnEveryMs * (1 - p) + CONFIG.minSpawnMs * p);
    if (state.lastSpawn >= currentSpawnMs) {
      state.lastSpawn = 0;
      let lane = Math.floor(state.rng() * CONFIG.lanes);
      let x = state.lanesX[lane];
      // Guarantee an early offer in the first couple of spawns if none collected yet
      const forceEarlyOffer = (state.offersCollected === 0 && state.spawns < 2);
      const allowOffer = offerAllowed();
      let isOffer = allowOffer && (forceEarlyOffer || (state.rng() < CONFIG.offerChance));
      let isShield = false;
      // Shield has very low chance and only spawns if no shield is active
      if (!isOffer && !state.player.hasShield && state.rng() < CONFIG.shieldChance) {
        isShield = true;
      }
      let skipSpawn = false;

      // Keep at least one free lane within a vertical band near the spawn
      const bandCenterY = -60 * dpr;
      const bandHalf = (CONFIG.gapBandPx * dpr) / 2;
      const occupied = new Set();
      for (const o of state.objects) {
        if (o.type !== 'lily') continue;
        if (Math.abs(o.y - bandCenterY) <= bandHalf) occupied.add(o.lane);
      }
      if (occupied.size >= CONFIG.lanes - 1) {
        // Identify the single free lane (if any)
        const free = [];
        for (let i=0;i<CONFIG.lanes;i++) if (!occupied.has(i)) free.push(i);
        if (free.length === 1) {
          // Do not block the last free lane. If we chose it, switch to an occupied lane.
          if (lane === free[0]) {
            const occArr = Array.from(occupied);
            lane = occArr[Math.floor(state.rng() * occArr.length)];
            x = state.lanesX[lane];
          }
        } else if (free.length === 0) {
          // All lanes are already blocked in this band.
          // If offers allowed, convert this spawn to a non-blocking offer.
          // Else, skip this spawn to avoid hard-blocking.
          if (allowOffer) isOffer = true; 
          else if (!state.player.hasShield && state.rng() < CONFIG.shieldChance * 3) isShield = true; // Higher chance when lanes blocked
          else skipSpawn = true;
        }
      }

      if (skipSpawn) {
        state.spawns++;
        return;
      }

      // Proactive prevention: avoid creating a triple-lane block within a vertical span
      if (!isOffer && !isShield && CONFIG.lanes >= 3) {
        const anchorY2 = -60 * dpr;
        const blockSpan = (CONFIG.pathWindowPx + CONFIG.lilyRadius * 3) * dpr;
        const lanesNear = new Set();
        for (let j=state.objects.length-1; j>=0; j--) {
          const obj = state.objects[j];
          if (obj.type !== 'lily') continue;
          if (Math.abs(obj.y - anchorY2) <= blockSpan) lanesNear.add(obj.lane);
        }
        if (lanesNear.size >= CONFIG.lanes - 1 && !lanesNear.has(lane)) {
          // Do not occupy the last remaining free lane in this span; switch to an occupied lane
          const occArr2 = Array.from(lanesNear);
          if (occArr2.length > 0) {
            lane = occArr2[Math.floor(state.rng() * occArr2.length)];
            x = state.lanesX[lane];
          }
        }
      }

      if (isOffer) {
        let yOffer = -50*dpr;
        const rOffer = CONFIG.playerRadius * 0.9 * dpr;
        if (CONFIG.offerAttach) {
          // Find a lily near the spawn band to attach the offer close to it
          const anchorY = -60 * dpr;
          const windowHalf = CONFIG.offerAttachWindowPx * dpr;
          let bestIdx = -1; let bestDist = Infinity;
          for (let j=state.objects.length-1; j>=0; j--) {
            const obj = state.objects[j];
            if (obj.type !== 'lily') continue;
            const dist = Math.abs(obj.y - anchorY);
            if (dist <= windowHalf && dist < bestDist) { bestDist = dist; bestIdx = j; }
          }
          if (bestIdx >= 0) {
            const anchor = state.objects[bestIdx];
            lane = anchor.lane; // same lane as lily
            x = state.lanesX[lane];
            // Place the offer just above the lily with a tiny margin to avoid overlap
            const margin = (CONFIG.offerAttachMarginPx||6) * dpr;
            yOffer = anchor.y - (anchor.r + rOffer + margin);
          }
        }
        const railX = getRailX(lane, yOffer);
        state.objects.push({ type: 'offer', lane, x: railX, y: yOffer, r: rOffer, speed: state.speed * 0.9 });
        state.offersSpawned++;
      } else if (isShield) {
        // Spawn a shield
        const yShield = -50*dpr;
        const rShield = CONFIG.playerRadius * 1.2 * dpr; // Slightly larger than offers
        const railX = getRailX(lane, yShield);
        state.objects.push({ type: 'shield', lane, x: railX, y: yShield, r: rShield, speed: state.speed * 0.85 });
        console.log('Shield spawned!'); // Debug log
      } else {
        // Compute lily radius with side clearance cap based on lane spacing
        let r = CONFIG.lilyRadius * dpr * randRange(state.rng, 0.9, 1.15);
        if (CONFIG.lanes > 1) {
          const gap = Math.abs(state.lanesX[1] - state.lanesX[0]);
          const maxR = Math.max(12*dpr, gap/2 - state.player.r*dpr - 8*dpr);
          r = Math.min(r, maxR);
        }
        const yL = -60*dpr;
        const railX = getRailX(lane, yL);
        state.objects.push({ type: 'lily', lane, x: railX, y: yL, r, speed: state.speed });
      }
      state.spawns++;
    }
  }

  function tick(now){
    if (!state.started || state.paused) return;
    const dt = Math.min(50, now - state.t); // clamp delta
    state.t = now;

    // Difficulty scaling
    const mult = state.speed / CONFIG.baseSpeed;
    let accelNow = (mult >= CONFIG.slowAfterMul) ? CONFIG.accelAfterPerSec : CONFIG.accelPerSec;
    
    // Reduce acceleration for mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      accelNow = accelNow * 0.6; // 40% slower acceleration for mobile
    }
    
    const ds = (dt/1000) * accelNow;
    state.speed = state.speed + ds;
    if (CONFIG.maxSpeed > 0) {
      state.speed = clamp(state.speed, CONFIG.baseSpeed, CONFIG.maxSpeed);
    }

    // Update score by distance
    state.score += (dt/1000) * state.speed * 0.25;
    updateHUD();

    // Update player toward target lane
    const px = state.player.x;
    // targetX follows the rail (curvy lane) at player's current y
    state.player.targetX = getRailX(state.laneIndex, state.player.y);
    const tx = state.player.targetX;
    
    // Different lerp speed for mobile vs desktop
    const basePow = isMobile ? 0.08 : 0.001; // Mobile: much smoother transition, Desktop: snappy
    const lerpK = 1 - Math.pow(basePow, dt/16);
    state.player.x = px + (tx - px) * lerpK;
    state.player.y = canvas.height - CONFIG.duckYfromBottom * dpr;
    if (state.player.hitCooldown > 0) state.player.hitCooldown -= dt;
    if (state.sideHitCooldown > 0) state.sideHitCooldown -= dt;

    // Spawn objects
    maybeSpawn(dt);

    // Move objects
    for (const o of state.objects) {
      o.y += o.speed * (dt/1000) * dpr;
      // make objects follow the rail in their lane
      o.x = getRailX(o.lane, o.y);
    }
    // Update particles
    for (const p of state.particles) {
      p.vx *= 0.99; p.vy += p.g || 0;
      p.x += p.vx * (dt/16) * dpr;
      p.y += p.vy * (dt/16) * dpr;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
    // Remove offscreen
    state.objects = state.objects.filter(o => o.y < canvas.height + 80*dpr);

    // Ensure a passable path near the duck (no dead-ends)
    ensurePathWindowClear();

    // Collisions
    for (let i=state.objects.length-1; i>=0; i--) {
      const o = state.objects[i];
      const dx = o.x - state.player.x;
      const dy = o.y - state.player.y;
      const dist2 = dx*dx + dy*dy;
      const rr = Math.pow((o.r + state.player.r*dpr) * 0.9, 2);
      if (dist2 <= rr) {
        if (o.type === 'offer') {
          state.objects.splice(i,1);
          if (state.offersCollected < CONFIG.maxPercent) {
            state.offersCollected = Math.min(CONFIG.maxPercent, state.offersCollected + 1);
          }
          // Play noufaro bonus sound ONLY for bonus pickup
          playSound(noufaroSound);
          updateHUD();
          spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 14);
        } else if (o.type === 'lily') {
          // Last-moment frontal graze forgiveness: if the lily's top is already
          // past the duck's front boundary (within a small margin), ignore.
          const playerTop = state.player.y - state.player.r * dpr;
          const lilyTop = o.y - o.r;
          if (lilyTop >= playerTop - CONFIG.lateFrontForgivenessPx * dpr) {
            state.objects.splice(i,1);
            shake(3, 160);
            spawnSplash(o.x, o.y - o.r, 8);
            continue;
          }

          // Determine frontal vs side hit
          const frontalThreshold = state.player.r * dpr * CONFIG.frontalDxFactor;
          const isFrontal = Math.abs(dx) <= frontalThreshold;
          if (isFrontal) {
            // Check if player has shield
            if (state.player.hasShield) {
              // Shield protects from frontal hit
              state.player.hasShield = false; // Shield is consumed
                  // Play shield break sound
                  if (shieldBreakSound) {
                    
                    
                    playSound(shieldBreakSound);
                  }
              // Play shield break sound
              if (shieldBreakSound) {
                
                
                playSound(shieldBreakSound);
              }
              state.objects.splice(i,1);
              shake(2, 120);
              spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 25); // Shield break effect
              updateHUD();
              continue;
            } else {
              gameOver();
              break;
            }
          } else {
            // Side hit: wobble grace. Avoid double-counting on same lily.
            if (state.sideHitCooldown <= 0) {
              const nowMs = performance.now();
              if (nowMs < state.wobbleUntil) {
                // second side hit within grace
                // Check if player has shield for side hit protection
                if (state.player.hasShield) {
                  // Shield protects from second side hit (game over)
                  state.player.hasShield = false; // Shield is consumed
                  // Play shield break sound
                  if (shieldBreakSound) {
                    
                    
                    playSound(shieldBreakSound);
                  }
                  state.objects.splice(i,1);
                  shake(2, 120);
                  spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 25); // Shield break effect
                  updateHUD();
                  // Reset wobble state
                  state.wobbleUntil = 0;
                  state.sideHitCooldown = CONFIG.sideCooldownMs;
                  continue;
                } else {
                  gameOver();
                  break;
                }
              } else {
                // start wobble grace and remove the obstacle to prevent repeated collisions
                state.wobbleUntil = nowMs + CONFIG.sideGraceMs;
                state.sideHitCooldown = CONFIG.sideCooldownMs;
                state.objects.splice(i,1);
                shake(4, 280);
                spawnSplash(o.x, o.y, 10);
              }
            }
          }
        } else if (o.type === 'shield') {
          state.objects.splice(i,1);
          state.player.hasShield = true;
          // Play shield sound when collected
          playSound(shieldSound);
          updateHUD();
          spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 20); // More sparkles for shield
          console.log('Shield collected! Player now has protection.');
        } else if (o.type === 'lily') {
          // Last-moment frontal graze forgiveness: if the lily's top is already
          // past the duck's front boundary (within a small margin), ignore.
          const playerTop = state.player.y - state.player.r * dpr;
          const lilyTop = o.y - o.r;
          if (lilyTop >= playerTop - CONFIG.lateFrontForgivenessPx * dpr) {
            state.objects.splice(i,1);
            shake(3, 160);
            spawnSplash(o.x, o.y - o.r, 8);
            continue;
          }

          // Determine frontal vs side hit
          const frontalThreshold = state.player.r * dpr * CONFIG.frontalDxFactor;
          const isFrontal = Math.abs(dx) <= frontalThreshold;
          if (isFrontal) {
            // Check if player has shield
            if (state.player.hasShield) {
              // Shield protects from frontal hit
              state.player.hasShield = false; // Shield is consumed
                  // Play shield break sound
                  if (shieldBreakSound) {
                    
                    
                    playSound(shieldBreakSound);
                  }
              // Play shield break sound
              if (shieldBreakSound) {
                
                
                playSound(shieldBreakSound);
              }
              state.objects.splice(i,1);
              shake(2, 120);
              spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 25); // Shield break effect
              updateHUD();
              continue;
            } else {
              gameOver();
              break;
            }
          } else {
            // Side hit: wobble grace. Avoid double-counting on same lily.
            if (state.sideHitCooldown <= 0) {
              const nowMs = performance.now();
              if (nowMs < state.wobbleUntil) {
                // second side hit within grace
                // Check if player has shield for side hit protection
                if (state.player.hasShield) {
                  // Shield protects from second side hit (game over)
                  state.player.hasShield = false; // Shield is consumed
                  // Play shield break sound
                  if (shieldBreakSound) {
                    
                    
                    playSound(shieldBreakSound);
                  }
                  state.objects.splice(i,1);
                  shake(2, 120);
                  spawnSparkles(state.player.x, state.player.y - state.player.r * dpr, 25); // Shield break effect
                  updateHUD();
                  // Reset wobble state
                  state.wobbleUntil = 0;
                  state.sideHitCooldown = CONFIG.sideCooldownMs;
                  continue;
                } else {
                  gameOver();
                  break;
                }
              } else {
                // start wobble grace and remove the obstacle to prevent repeated collisions
                state.wobbleUntil = nowMs + CONFIG.sideGraceMs;
                state.sideHitCooldown = CONFIG.sideCooldownMs;
                state.objects.splice(i,1);
                shake(4, 280);
                spawnSplash(o.x, o.y, 10);
              }
            }
          }
        }
      }
    }

    // Render
    draw(dt);

    requestAnimationFrame(tick);
  }

  // Simple screen shake
  let shakeAmp = 0, shakeTime = 0, shakeDur = 0;
  function shake(amp, dur){ shakeAmp = amp * dpr; shakeTime = 0; shakeDur = dur; }

  function draw(dt){
    const W = canvas.width, H = canvas.height;
    // Screen shake offset applied as small translate
    if (shakeDur > 0) {
      shakeTime += dt;
      const p = clamp(shakeTime / shakeDur, 0, 1);
      const a = shakeAmp * (1 - p);
      const ox = (state.rng()*2-1) * a;
      const oy = (state.rng()*2-1) * a;
      ctx.setTransform(1,0,0,1, ox, oy);
    } else {
      ctx.setTransform(1,0,0,1, 0, 0);
    }
    drawRiverBackground(W, H);

    // Lanes guide (toggle between straight and wave rails)
    if (CONFIG.debugRails) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2 * dpr;
      for (let lane=0; lane<CONFIG.lanes; lane++){
        ctx.strokeStyle = ['#ff7a7a','#7aff7a','#7aa7ff','#ffe27a','#ff7ae2'][lane%5];
        ctx.beginPath();
        for (let y=0; y<=H; y+= 18*dpr){
          const x = getRailX(lane, y);
          if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Calibration HUD
      if (CONFIG.calibrate && CONFIG.railMode === 'straight'){
        const leftCss = Math.round((state.cal.leftDev ?? state.lanesX[0]) / dpr);
        const spacingCss = Math.round((state.cal.spacingDev ?? (state.lanesX[1]-state.lanesX[0])) / dpr);
        const tiltCss = Math.round((state.cal.edgeTiltDev ?? 0) / dpr);
        const txt = `Calibrate: lanes=${CONFIG.lanes} | left=${leftCss}px | spacing=${spacingCss}px | tilt=${tiltCss}px  (←/→ left, ↑/↓ spacing, Z/X tilt, Shift=coarse, Alt=fine, C=copy)`;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const pad = 6*dpr; const bx = pad; const by = pad; const bw = Math.min(W-pad*2, ctx.measureText ? (ctx.measureText(txt).width + 16*dpr) : 320*dpr); const bh = 24*dpr;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
        ctx.fillText(txt, bx + 8*dpr, by + 16*dpr);
      }
    } else {
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 * dpr;
      for (let lane=0; lane<CONFIG.lanes; lane++){
        const x = getRailX(lane, 0);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(getRailX(lane, H), H); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Particles behind objects for subtle layering
    drawParticles(0.85);

    // Objects
    for (const o of state.objects) {
      if (o.type === 'lily') drawLily(o.x, o.y, o.r);
      else if (o.type === 'offer') drawFlower(o.x, o.y, o.r);
      else if (o.type === 'shield') drawShield(o.x, o.y, o.r);
    }

    // Player (duck) with wobble tilt during side-hit grace
    let tilt = 0;
    const nowMs = performance.now();
    if (nowMs < state.wobbleUntil) {
      const remain = state.wobbleUntil - nowMs;
      const p = clamp(remain / CONFIG.sideGraceMs, 0, 1);
      const amp = 0.25 * p; // radians, decays
      tilt = amp * Math.sin(nowMs * 0.02 * Math.PI); // gentle wobble
    }
    // Subtle bobbing
    const t = performance.now() * 0.001;
    const bob = Math.sin(t * 5) * 2 * dpr;
    drawDuck(state.player.x, state.player.y + bob, state.player.r * dpr, state.player.hitCooldown > 0 ? 0.6 : 1, tilt);
    // reset any transform for future UI drawing if needed
    ctx.setTransform(1,0,0,1, 0, 0);

    // Foreground particles
    drawParticles(1);

    // Optional brand logo (small, top-left inside canvas)
    if (logoLoaded && logoImg) {
      const lw = Math.min(120*dpr, W*0.25);
      const lh = lw * (logoImg.height / (logoImg.width || 1));
      ctx.globalAlpha = 0.85;
      ctx.drawImage(logoImg, 8*dpr, 8*dpr, lw, lh);
      ctx.globalAlpha = 1;
    }
  }

  function drawLily(x, y, r){
    ctx.save();
    ctx.translate(x, y);
    
    if (lilyLoaded && lilyImg) {
      // Draw the lily image
      const size = r * 2.5; // Make image size based on radius
      ctx.drawImage(lilyImg, -size/2, -size/2, size, size);
    } else {
      // Fallback to original lily drawing if image not loaded
      // shadow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#0a2c1a';
      ctx.beginPath(); ctx.ellipse(0, r*0.1, r*1.02, r*0.9, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // leaf body
      const g = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.2, 0, 0, r);
      g.addColorStop(0, '#49b26a');
      g.addColorStop(1, '#2f8f4f');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      // notch
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r*0.75, -0.25*Math.PI, 0.25*Math.PI, false);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // veins
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = Math.max(1.2, r*0.06);
      for (let k=0;k<4;k++){
        ctx.beginPath();
        const a = (-0.6 + k*0.4) * Math.PI;
        ctx.arc(-r*0.2, -r*0.2, r*0.7, a, a+0.5);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  function drawFlower(x, y, r){
    ctx.save();
    ctx.translate(x, y);
    
    if (doroLoaded && doroImg) {
      // Draw the doro (gift) image
      const size = r * 2.2; // Make image size based on radius
      ctx.drawImage(doroImg, -size/2, -size/2, size, size);
    } else {
      // Fallback to original flower drawing if image not loaded
      // Petals + center to match the flower code theme
      const petals = 6;
      const pr = r * 0.9;
      for (let i=0;i<petals;i++){
        const a = (i/petals) * Math.PI*2;
        const px = Math.cos(a) * pr*0.6;
        const py = Math.sin(a) * pr*0.6;
        ctx.fillStyle = '#ff9bd2';
        ctx.beginPath();
        ctx.ellipse(px, py, pr*0.5, pr*0.25, a, 0, Math.PI*2);
        ctx.fill();
      }
      // center
      ctx.fillStyle = '#ffe07a';
      ctx.beginPath(); ctx.arc(0, 0, pr*0.28, 0, Math.PI*2); ctx.fill();
      // subtle outline
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = Math.max(1, r*0.05);
      ctx.beginPath(); ctx.arc(0, 0, pr*0.9, 0, Math.PI*2); ctx.stroke();
    }
    
    ctx.restore();
  }

  function drawShield(x, y, r){
    ctx.save();
    ctx.translate(x, y);
    
    if (shieldLoaded && shieldImg) {
      // Draw the shield image
      const size = r * 2.8; // Make image size based on radius
      ctx.drawImage(shieldImg, -size/2, -size/2, size, size);
    } else {
      // Fallback to original shield drawing if image not loaded
      // Shield shape (rounded rectangle)
      const w = r * 1.6;
      const h = r * 1.8;
      const cornerR = r * 0.3;
      
      // Shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      roundRect(ctx, -w/2 + 2, -h/2 + 2, w, h, cornerR);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Main shield body (blue gradient)
      const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
      gradient.addColorStop(0, '#4a90e2');
      gradient.addColorStop(1, '#2c5aa0');
      ctx.fillStyle = gradient;
      roundRect(ctx, -w/2, -h/2, w, h, cornerR);
      ctx.fill();
      
      // Golden border
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = Math.max(2, r*0.1);
      roundRect(ctx, -w/2, -h/2, w, h, cornerR);
      ctx.stroke();
      
      // Inner highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = Math.max(1, r*0.05);
      roundRect(ctx, -w/2 + 3, -h/2 + 3, w - 6, h - 6, cornerR);
      ctx.stroke();
      
      // Center emblem (cross)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = Math.max(2, r*0.08);
      ctx.beginPath();
      ctx.moveTo(0, -r*0.4);
      ctx.lineTo(0, r*0.4);
      ctx.moveTo(-r*0.3, 0);
      ctx.lineTo(r*0.3, 0);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawDuck(x, y, r, alpha=1, tilt=0){
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.globalAlpha = alpha;
    
    if (duckLoaded && duckImg) {
      // Draw the duck image
      const size = r * 2.2; // Make image slightly bigger than original duck
      ctx.drawImage(duckImg, -size/2, -size/2, size, size);
    } else {
      // Fallback to original duck drawing if image not loaded
      // body
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(0, 0, r*1.0, r*0.85, 0, 0, Math.PI*2);
      ctx.fill();
      // head
      ctx.fillStyle = '#ffea85';
      ctx.beginPath();
      ctx.arc(0, -r*0.9, r*0.6, 0, Math.PI*2);
      ctx.fill();
      // beak
      ctx.fillStyle = '#ff7a38';
      ctx.beginPath();
      ctx.ellipse(r*0.45, -r*0.9, r*0.35, r*0.18, 0, 0, Math.PI*2);
      ctx.fill();
      // eye
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-r*0.2, -r*1.0, r*0.1, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  function drawRiverBackground(W, H){
    // Try video frame first (regardless of param if a video was set up)
    if (riverVideo && riverReady && riverVideo.readyState >= 2) {
      try { ctx.drawImage(riverVideo, 0, 0, W, H); return; } catch {}
    }
    // Fallback gradient water + sine ribbons
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#135a8b');
    g.addColorStop(1, '#0d3f60');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() * 0.001;
    // broad ribbons
    const layers = [
      { a: 0.10, w: 32*dpr, c: 'rgba(255,255,255,0.08)' },
      { a: 0.16, w: 22*dpr, c: 'rgba(182,227,255,0.10)' },
      { a: 0.22, w: 16*dpr, c: 'rgba(255,255,255,0.06)' },
    ];
    for (const L of layers){
      ctx.strokeStyle = L.c;
      ctx.lineWidth = 2 * dpr;
      for (let y = ((t*60)%L.w)-L.w; y < H; y += L.w) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(W*0.33, y+8*dpr*Math.sin(t+L.a), W*0.66, y-8*dpr*Math.cos(t+L.a), W, y);
        ctx.stroke();
      }
    }
  }

  function drawParticles(alpha=1){
    if (!state.particles.length) return;
    ctx.save();
    for (const p of state.particles){
      ctx.globalAlpha = Math.max(0, (p.life/p.life0)) * alpha;
      ctx.fillStyle = p.color || '#fff';
      if (p.kind === 'spark') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      } else if (p.kind === 'splash') {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, p.rot||0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function spawnSparkles(x, y, n=12){
    for (let i=0;i<n;i++){
      const a = Math.random() * Math.PI*2;
      const sp = 0.8 + Math.random()*1.6;
      state.particles.push({
        kind: 'spark', x, y,
        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        r: 2.2 * dpr * (0.8 + Math.random()*0.6),
        life: 400 + Math.random()*300, life0: 500,
        color: Math.random() < 0.5 ? '#ffe07a' : '#ff9bd2',
        g: 0.002 * dpr,
      });
    }
  }

  function spawnSplash(x, y, n=8){
    for (let i=0;i<n;i++){
      const a = -Math.PI/2 + (Math.random()-0.5)*1.2;
      const sp = 0.6 + Math.random()*1.2;
      state.particles.push({
        kind: 'splash', x, y,
        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp*0.8,
        rx: 2.5*dpr, ry: 1.2*dpr, rot: Math.random()*Math.PI,
        life: 300 + Math.random()*250, life0: 450,
        color: 'rgba(182,227,255,0.35)',
        g: 0.003 * dpr,
      });
    }
  }

  // Handle dynamic lane recomputation on resize
  try {
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => { resize(); recomputeLanes(); });
      ro.observe(canvas);
    }
  } catch {}

  // HUD updater
  function updateHUD(){
    if (hudScore) hudScore.textContent = String(Math.floor(state.score));
    if (hudSpeed) hudSpeed.textContent = (state.speed/CONFIG.baseSpeed).toFixed(1) + 'x';
    if (hudBonus) {
      const percent = Math.min(CONFIG.maxPercent, Math.max(0, state.offersCollected));
      hudBonus.textContent = `${percent}%`;
    }
    if (hudShield) {
      if (state.player.hasShield) {
        hudShield.classList.remove('hidden');
      } else {
        hudShield.classList.add('hidden');
      }
    }
  }

  // Guarantee a clear lane around the player's Y window
  function ensurePathWindowClear(){
    const nowMs = performance.now();
    if (nowMs - state.lastRescueMs < CONFIG.rescueCooldownMs) return;
    const y = state.player.y;
    const yMin = y - CONFIG.pathWindowPx * dpr;
    const yMax = y + state.player.r * dpr + 12*dpr;

    const samples = Math.max(3, CONFIG.pathSamples|0);
    const step = (yMax - yMin) / (samples - 1);

    function lanesBlockedAtY(yy){
      const blocked = new Set();
      for (let i=0; i<state.objects.length; i++){
        const o = state.objects[i];
        if (o.type !== 'lily') continue;
        const top = o.y - o.r;
        const bot = o.y + o.r;
        if (yy >= top && yy <= bot) blocked.add(o.lane);
      }
      return blocked;
    }

    let converted = 0;
    while (converted < CONFIG.rescueMaxPerTick) {
      let badY = null;
      // find a sample y where all lanes are blocked
      for (let s=0; s<samples; s++){
        const yy = yMin + step * s;
        if (lanesBlockedAtY(yy).size >= CONFIG.lanes) { badY = yy; break; }
      }
      if (badY == null) break; // all good

      // pick the nearest lily to the player that blocks at badY and convert it
      let bestIdx = -1, bestY = -Infinity;
      for (let i=0; i<state.objects.length; i++){
        const o = state.objects[i];
        if (o.type !== 'lily') continue;
        const top = o.y - o.r;
        const bot = o.y + o.r;
        if (badY >= top && badY <= bot) {
          if (o.y > bestY) { bestY = o.y; bestIdx = i; }
        }
      }
      if (bestIdx >= 0) {
        const o = state.objects[bestIdx];
        if (offerAllowed()) {
          o.type = 'offer';
          o.r = state.player.r * dpr * 0.9;
          o.speed = o.speed * 0.9;
          state.offersSpawned++;
        } else {
          // Remove lily instead of converting to avoid giving extra gifts past the cap/threshold
          state.objects.splice(bestIdx, 1);
        }
        converted++;
        state.lastRescueMs = nowMs;
      } else {
        break;
      }
    }
  }

  // Calibration-only drawing loop (before Start)
  let calibrateRAF = 0;
  function drawCalibrationFrame(){
    if (state.started || !(CONFIG.calibrate || CONFIG.debugRails)) return;
    resize();
    const W = canvas.width, H = canvas.height;
    drawRiverBackground(W, H);
    // Draw colored rails regardless of debugRails
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2 * dpr;
    for (let lane=0; lane<CONFIG.lanes; lane++){
      ctx.strokeStyle = ['#ff7a7a','#7aff7a','#7aa7ff','#ffe27a','#ff7ae2'][lane%5];
      ctx.beginPath();
      for (let y=0; y<=H; y+= 18*dpr){
        const x = getRailX(lane, y);
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // HUD text (only for straight mode calibration)
    if (CONFIG.railMode === 'straight' && CONFIG.calibrate) {
      const leftCss = Math.round((state.cal.leftDev ?? state.lanesX[0]) / dpr);
      const spacingCss = Math.round((state.cal.spacingDev ?? (state.lanesX[1]-state.lanesX[0])) / dpr);
      const tiltCss = Math.round((state.cal.edgeTiltDev ?? 0) / dpr);
      const txt = `Calibrate (straight rails): lanes=${CONFIG.lanes} | left=${leftCss}px | spacing=${spacingCss}px | tilt=${tiltCss}px [anchor=${CONFIG.railEdgeTiltAnchor}] — Keys: ←/→ left, ↑/↓ spacing, Z/X tilt, Shift=coarse, Alt=fine, C=copy. Space/Enter: Start`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(8*dpr, 8*dpr, Math.min(W-16*dpr, 980*dpr), 28*dpr);
      ctx.fillStyle = '#fff';
      ctx.font = `${12*dpr}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      ctx.fillText(txt, 14*dpr, 26*dpr);
      if (calReadout) calReadout.textContent = `left=${leftCss}px spacing=${spacingCss}px tilt=${tiltCss}px anchor=${CONFIG.railEdgeTiltAnchor}`;
    }
  }

  function startCalibrationLoop(){
    if (calibrateRAF) return;
    const loop = () => {
      if (state.started || !(CONFIG.calibrate || CONFIG.debugRails)) { calibrateRAF = 0; return; }
      drawCalibrationFrame();
      calibrateRAF = requestAnimationFrame(loop);
    };
    calibrateRAF = requestAnimationFrame(loop);
  }

  // Auto-start preview/calibration loop if needed on load
  if ((CONFIG.calibrate || CONFIG.debugRails) && !state.started) {
    if (overlayStart) overlayStart.classList.add('hidden');
    if (riverVideo) { try { riverVideo.play().catch(()=>{}); } catch {} }
    if (calReadout && CONFIG.railMode === 'straight') calReadout.classList.remove('hidden');
    startCalibrationLoop();
  }
  // Game will only start when user clicks the start button

})();
