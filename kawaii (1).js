
const SONGS = [
  {
    id: 1,
    title: "Sara Perche Ti Amo",
    artist: "Ricchi e Poveri",
    img: "image/anime1.jpeg",
    genre: "lo-fi",
    duration: "3:03",
    palette: ["#f9b8d8", "#c9b8f8", "#fde2f0", "#ffffff", "#e86fa8"],
    src: "music/sara.mp3",       
  },
  {
    id: 2,
    title: "Lovers",
    artist: "Anna of the North",
    img: "image/anime2.jpeg",
    genre: "city pop",
    duration: "4:15",
    palette: ["#b8dff9", "#fff3b8", "#dff0ff", "#ffffff", "#6ab4e8"],
    src: "music/Lovers.mp3",
  },
  {
    id: 3,
    title: "I Like Me Better",
    artist: "Lauv",
    img: "image/anime3.jpg",
    genre: "huz",
    duration: "3:58",
    palette: ["#b8f5e4", "#c9b8f8", "#e8e0ff", "#ffffff", "#9b7de8"],
    src: "music/lauv.mp3",
  },
  {
    id: 4,
    title: "Manchild",
    artist: "sabrina carpenter",
    img: "image/anime4.jpg",
    genre: "j-pop",
    duration: "3:21",
    palette: ["#ffd6b8", "#f9b8d8", "#fff3b8", "#ffffff", "#e86fa8"],
    src: "music/manchild.mp3",
  },
];


function generatePixelArt(palette) {
  const size = 16;                       // grid cells
  const scale = 12;                      // pixels per cell → 192×192 output
  const canvas = document.createElement('canvas');
  canvas.width  = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');

  // Simple pseudo-random seeded by palette string
  let seed = palette.join('').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Draw coloured pixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Pick a colour from palette; bias toward index 4 (accent) in centre
      const dist = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      const idx = Math.floor(rand() * (dist < 0.4 ? 2 : palette.length));
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  // Add a cute heart shape in the centre
  const heart = [
    '  xxx  xxx  ',
    ' xxxxx xxxxx',
    '   xxxxxxxxx',
    '    xxxxxxx ',
    '     xxxxx  ',
    '      xxx   ',
    '       x    ',
  ];
  const heartColor = palette[4] || '#e86fa8';
  const ox = Math.floor(size / 2) - 6;
  const oy = Math.floor(size / 2) - 3;
  heart.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch === 'x') {
        ctx.fillStyle = heartColor;
        ctx.fillRect((ox + rx) * scale, (oy + ry) * scale, scale, scale);
      }
    });
  });

  // Grid lines for pixel art look
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= size; i++) {
    ctx.beginPath();
    ctx.moveTo(i * scale, 0);
    ctx.lineTo(i * scale, size * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * scale);
    ctx.lineTo(size * scale, i * scale);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

// Pre-generate art for all songs once at startup
const albumArts = SONGS.map(song => generatePixelArt(song.palette));


const state = {
  currentIndex: 0,      // which song is loaded
  isPlaying: false,     // play/pause
  isShuffle: false,     // shuffle mode
  volume: 0.75,         // 0–1
  favorites: new Set(), // set of song ids that are hearted
};


/* ══════════════════════════════════════════════════
   4. DOM REFERENCES
   ══════════════════════════════════════════════════ */
const audio        = document.getElementById('audioEl');
const albumImg     = document.getElementById('albumImg');
const albumArt     = document.getElementById('albumArt');
const albumRing    = document.getElementById('albumRing');
const songTitle    = document.getElementById('songTitle');
const songArtist   = document.getElementById('songArtist');
const genrePill    = document.getElementById('genrePill');
const trackNumEl   = document.getElementById('trackNumDisplay');
const trackTotalEl = document.getElementById('trackTotalDisplay');
const currentTimeEl= document.getElementById('currentTime');
const totalTimeEl  = document.getElementById('totalTime');
const progressBar  = document.getElementById('progressBar');
const playBtn      = document.getElementById('playBtn');
const playIcon     = document.getElementById('playIcon');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const shuffleBtn   = document.getElementById('shuffleBtn');
const heartBtn     = document.getElementById('heartBtn');
const volumeBar    = document.getElementById('volumeBar');
const volPct       = document.getElementById('volPct');
const volIcon      = document.getElementById('volIcon');
const visualiser   = document.getElementById('visualiser');
const playlistEl   = document.getElementById('playlistEl');
const playlistCount= document.getElementById('playlistCount');
const playerCard   = document.getElementById('playerCard');
const dragHandle   = document.getElementById('dragHandle');
const bgCanvas     = document.getElementById('bgCanvas');


/* ══════════════════════════════════════════════════
   5. AUDIO ENGINE
   Loads a song, wires up the <audio> element,
   and drives the progress bar in real time.
   ══════════════════════════════════════════════════ */

/** Load a song by index without auto-playing */
function loadSong(index) {
  const song = SONGS[index];
  state.currentIndex = index;

  // Set audio source (empty string = demo mode, no audio)
  audio.src = song.src || '';
  audio.volume = state.volume;

  // Update visuals
albumImg.src = song.img ? song.img : albumArts[index];
albumImg.style.display = 'block';
albumImg.style.width = '100%';
albumImg.style.height = '100%';
albumImg.style.objectFit = 'cover';
albumImg.style.borderRadius = '50%';
  songTitle.textContent    = song.title;
  songArtist.textContent   = song.artist;
  genrePill.textContent    = song.genre;
  trackNumEl.textContent   = String(index + 1).padStart(2, '0');
  trackTotalEl.textContent = String(SONGS.length).padStart(2, '0');

  // Reset progress bar
  progressBar.value = 0;
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent   = song.duration; // fallback label

  // Reset progress track fill CSS variable
  updateProgressFill(0);

  // Update heart state
  updateHeartBtn();

  // Highlight active item in playlist
  updatePlaylistActive();
}

/** Start playback */
function playSong() {
  state.isPlaying = true;
  if (audio.src && audio.src !== window.location.href) {
    audio.play().catch(() => {
      // Browser blocked autoplay — keep UI in playing state anyway
    });
  }
  // UI feedback
  playIcon.textContent = '⏸';
  albumArt.classList.add('spinning');
  albumRing.classList.add('playing');
  visualiser.classList.add('active');
  playerCard.style.animation = 'none'; // pause float so it doesn't jitter
}

/** Pause playback */
function pauseSong() {
  state.isPlaying = false;
  audio.pause();
  playIcon.textContent = '▶';
  albumArt.classList.remove('spinning');
  albumRing.classList.remove('playing');
  visualiser.classList.remove('active');
  playerCard.style.animation = 'float 5s ease-in-out infinite';
}

/** Toggle play / pause */
function togglePlay() {
  if (state.isPlaying) {
    pauseSong();
  } else {
    playSong();
  }
}

/** Go to next track */
function nextTrack() {
  let idx;
  if (state.isShuffle) {
    // Pick a random track that isn't the current one
    do { idx = Math.floor(Math.random() * SONGS.length); }
    while (idx === state.currentIndex && SONGS.length > 1);
  } else {
    idx = (state.currentIndex + 1) % SONGS.length;
  }
  loadSong(idx);
  if (state.isPlaying) playSong();
}

/** Go to previous track */
function prevTrack() {
  // If more than 3 seconds in, restart current track
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const idx = (state.currentIndex - 1 + SONGS.length) % SONGS.length;
  loadSong(idx);
  if (state.isPlaying) playSong();
}


/* ══════════════════════════════════════════════════
   6. UI UPDATERS
   ══════════════════════════════════════════════════ */

/** Format seconds → "m:ss" string */
function formatTime(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Update the CSS gradient fill on the progress bar */
function updateProgressFill(pct) {
  progressBar.style.setProperty('--progress-pct', `${pct}%`);
}

/** Update the CSS gradient fill on the volume bar */
function updateVolumeFill(val) {
  const pct = val * 100;
  volumeBar.style.setProperty('--vol-pct', `${pct}%`);
  volPct.textContent = `${Math.round(pct)}%`;
}

/** Sync the heart button appearance with state */
function updateHeartBtn() {
  const song = SONGS[state.currentIndex];
  if (state.favorites.has(song.id)) {
    heartBtn.textContent = '♥';
    heartBtn.classList.add('active');
  } else {
    heartBtn.textContent = '♡';
    heartBtn.classList.remove('active');
  }
}

/** Highlight active row in playlist and re-render fav hearts */
function updatePlaylistActive() {
  document.querySelectorAll('.playlist-item').forEach((item, i) => {
    item.classList.toggle('active', i === state.currentIndex);
    const song = SONGS[i];
    item.classList.toggle('fav', state.favorites.has(song.id));
  });
}

/** Update shuffle button style */
function updateShuffleBtn() {
  if (state.isShuffle) {
    shuffleBtn.style.background = 'linear-gradient(135deg, #c9b8f8, #f9b8d8)';
    shuffleBtn.style.color = 'white';
    shuffleBtn.style.boxShadow = '0 4px 14px rgba(180,130,255,0.4)';
  } else {
    shuffleBtn.style.background = '';
    shuffleBtn.style.color = '';
    shuffleBtn.style.boxShadow = '';
  }
}

/** Update the volume icon based on level */
function updateVolIcon(val) {
  if (val === 0)      volIcon.textContent = '🔇';
  else if (val < 0.4) volIcon.textContent = '🔈';
  else if (val < 0.7) volIcon.textContent = '🔉';
  else                volIcon.textContent = '🔊';
}


/* ══════════════════════════════════════════════════
   7. EVENT LISTENERS — CONTROLS
   ══════════════════════════════════════════════════ */

// Play / Pause
playBtn.addEventListener('click', togglePlay);

// Next / Previous
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// Shuffle toggle
shuffleBtn.addEventListener('click', () => {
  state.isShuffle = !state.isShuffle;
  updateShuffleBtn();
});

// Heart / Favorite toggle
heartBtn.addEventListener('click', () => {
  const song = SONGS[state.currentIndex];
  if (state.favorites.has(song.id)) {
    state.favorites.delete(song.id);
  } else {
    state.favorites.add(song.id);
  }
  updateHeartBtn();
  updatePlaylistActive();
});

// Progress bar: user seeks
progressBar.addEventListener('input', () => {
  const pct = parseFloat(progressBar.value);
  updateProgressFill(pct);
  if (audio.duration) {
    audio.currentTime = (pct / 100) * audio.duration;
  }
});

// Audio: update progress bar as track plays
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressBar.value = pct;
  updateProgressFill(pct);
  currentTimeEl.textContent = formatTime(audio.currentTime);
  totalTimeEl.textContent   = formatTime(audio.duration);
});

// Audio: auto-advance to next when finished
audio.addEventListener('ended', nextTrack);

// Audio: when metadata loads, show real duration
audio.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audio.duration);
});

// Volume slider
volumeBar.addEventListener('input', () => {
  state.volume = parseFloat(volumeBar.value);
  audio.volume = state.volume;
  updateVolumeFill(state.volume);
  updateVolIcon(state.volume);
});

// Click speaker icon to toggle mute
volIcon.addEventListener('click', () => {
  if (audio.volume > 0) {
    state._prevVol = state.volume;
    state.volume = 0;
  } else {
    state.volume = state._prevVol || 0.75;
  }
  audio.volume = state.volume;
  volumeBar.value = state.volume;
  updateVolumeFill(state.volume);
  updateVolIcon(state.volume);
  volPct.textContent = `${Math.round(state.volume * 100)}%`;
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Avoid triggering when typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch (e.key) {
    case ' ':      e.preventDefault(); togglePlay();  break;
    case 'ArrowRight': nextTrack(); break;
    case 'ArrowLeft':  prevTrack(); break;
    case 'm': case 'M':
      volIcon.click(); break;
  }
});


/* ══════════════════════════════════════════════════
   8. PLAYLIST RENDERER
   Builds the <li> elements for every song.
   ══════════════════════════════════════════════════ */
function renderPlaylist() {
  playlistEl.innerHTML = '';
  playlistCount.textContent = `${SONGS.length} tracks`;

  SONGS.forEach((song, i) => {
    const li = document.createElement('li');
    li.className = 'playlist-item' +
      (i === state.currentIndex ? ' active' : '') +
      (state.favorites.has(song.id) ? ' fav' : '');
    li.setAttribute('role', 'listitem');
    li.setAttribute('aria-label', `${song.title} by ${song.artist}`);
    li.setAttribute('tabindex', '0');

    // Mini album thumbnail
    const thumb = document.createElement('img');
    thumb.className = 'playlist-item__thumb';
    thumb.src = SONGS[i].img ? SONGS[i].img : albumArts[i];
    thumb.alt = song.title;

    // Text info
    const info = document.createElement('div');
    info.className = 'playlist-item__info';
    info.innerHTML = `
      <div class="playlist-item__title">${song.title}</div>
      <div class="playlist-item__artist">${song.artist}</div>
    `;

    // Duration + fav indicator
    const meta = document.createElement('div');
    meta.className = 'playlist-item__meta';
    meta.innerHTML = `
      <span class="playlist-item__dur">${song.duration}</span>
      <span class="playlist-item__heart">♥</span>
    `;

    li.append(thumb, info, meta);

    // Click to load song
    li.addEventListener('click', () => {
      loadSong(i);
      playSong();
    });

    // Keyboard: Enter or Space to select
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loadSong(i);
        playSong();
      }
    });

    playlistEl.appendChild(li);
  });
}


/* ══════════════════════════════════════════════════
   9. DRAG-TO-MOVE PLAYER CARD
   Click the drag handle bar, hold, and drag the
   entire player card anywhere on screen.
   ══════════════════════════════════════════════════ */
(function initDrag() {
  let isDragging = false;
  let startX, startY, origLeft, origTop;

  // Position the card absolutely on first drag
  function makeAbsolute() {
    if (playerCard.style.position === 'absolute') return;
    const rect = playerCard.getBoundingClientRect();
    playerCard.style.position = 'absolute';
    playerCard.style.left = rect.left + 'px';
    playerCard.style.top  = rect.top  + 'px';
    playerCard.style.margin = '0';
    // Also pin app-wrapper to fill viewport
    document.querySelector('.app-wrapper').style.position = 'fixed';
    document.querySelector('.app-wrapper').style.inset = '0';
    document.querySelector('.app-wrapper').style.pointerEvents = 'none';
    playerCard.style.pointerEvents = 'auto';
  }

  dragHandle.addEventListener('mousedown', e => {
    isDragging = true;
    makeAbsolute();
    startX   = e.clientX;
    startY   = e.clientY;
    origLeft = parseInt(playerCard.style.left) || 0;
    origTop  = parseInt(playerCard.style.top)  || 0;
    playerCard.style.transition = 'none';
    playerCard.style.cursor = 'grabbing';
    playerCard.style.animation = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    playerCard.style.left = (origLeft + dx) + 'px';
    playerCard.style.top  = (origTop  + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    playerCard.style.cursor = '';
    playerCard.style.transition = '';
    // Resume floating animation after drag
    playerCard.style.animation = state.isPlaying ? 'none' : 'float 5s ease-in-out infinite';
  });

  // Touch support (mobile drag)
  dragHandle.addEventListener('touchstart', e => {
    const t = e.touches[0];
    isDragging = true;
    makeAbsolute();
    startX   = t.clientX;
    startY   = t.clientY;
    origLeft = parseInt(playerCard.style.left) || 0;
    origTop  = parseInt(playerCard.style.top)  || 0;
    playerCard.style.transition = 'none';
    playerCard.style.animation = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const t = e.touches[0];
    playerCard.style.left = (origLeft + t.clientX - startX) + 'px';
    playerCard.style.top  = (origTop  + t.clientY - startY) + 'px';
  }, { passive: true });

  document.addEventListener('touchend', () => { isDragging = false; });
})();


/* ══════════════════════════════════════════════════
   10. ANIMATED BACKGROUND CANVAS
   Draws floating hearts ♥ and sparkles ✦ that gently
   drift upward and fade out, then loop.
   ══════════════════════════════════════════════════ */
(function initCanvas() {
  const ctx = bgCanvas.getContext('2d');

  // Resize canvas to fill viewport
  function resize() {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Particle types and colours
  const SYMBOLS  = ['♥', '✦', '✿', '⋆', '˚', '·', '✧'];
  const COLORS   = ['#c9b8f8','#f9b8d8','#b8dff9','#b8f5e4','#fff3b8','#e86fa8','#9b7de8'];

  // Create a pool of particles
  const COUNT = 55;
  const particles = Array.from({ length: COUNT }, () => createParticle(true));

  function createParticle(randomY = false) {
    return {
      x:      Math.random() * window.innerWidth,
      y:      randomY ? Math.random() * window.innerHeight : window.innerHeight + 20,
      size:   Math.random() * 14 + 8,
      speed:  Math.random() * 0.6 + 0.2,
      drift:  (Math.random() - 0.5) * 0.4,   // gentle horizontal sway
      alpha:  Math.random() * 0.55 + 0.15,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      wobble: Math.random() * Math.PI * 2,    // phase offset for sine sway
    };
  }

  function drawFrame() {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    particles.forEach(p => {
      // Move upward + gentle sway
      p.y -= p.speed;
      p.wobble += 0.02;
      p.x += Math.sin(p.wobble) * p.drift;

      // Fade near the top
      const alphaFactor = p.y / window.innerHeight;
      ctx.globalAlpha = p.alpha * Math.min(1, alphaFactor * 3);
      ctx.font = `${p.size}px serif`;
      ctx.fillStyle = p.color;
      ctx.fillText(p.symbol, p.x, p.y);

      // Reset when off-screen
      if (p.y < -20) {
        Object.assign(p, createParticle(false));
      }
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(drawFrame);
  }

  drawFrame();
})();


/* ══════════════════════════════════════════════════
   11. INIT — run on page load
   ══════════════════════════════════════════════════ */
function init() {
  // Render playlist first so album arts are ready
  renderPlaylist();

  // Load first song (no autoplay per browser policy)
  loadSong(0);

  // Set initial volume fill
  updateVolumeFill(state.volume);
  updateVolIcon(state.volume);
  updateShuffleBtn();
}

init();
