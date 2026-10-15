/* First Tee Atlas — independent operator-player controls. */
(() => {
  'use strict';

  const cameras = CAMERAS;
  const byId = new Map(cameras.map(camera => [camera.id, camera]));
  const embeddable = cameras.filter(camera => camera.embed);
  const queueOrder = [...new Set(['pebble-beach', 'victoria-golf', 'kingsdown', 'otaki', ...embeddable.map(camera => camera.id)])].map(id => byId.get(id)).filter(camera => camera?.embed);
  const state = {
    mode: 'focus',
    focusId: byId.has('pebble-beach') ? 'pebble-beach' : cameras[0]?.id,
    wallIds: ['pebble-beach', 'victoria-golf', 'kingsdown', 'otaki'].filter(id => byId.get(id)?.embed),
    stopped: false,
    cinema: false
  };
  let root;
  let renderedMode;
  let bound = false;
  let cinemaReturnFocus = null;
  const cinemaInert = new Map();
  const tileNodes = new Map();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const location = camera => [...new Set([camera.city, camera.state].filter(Boolean))].join(', ');
  const time = camera => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: camera.timezone }).format(new Date());
  const snapshot = () => ({ ...state, wallIds: [...state.wallIds] });
  const announce = message => window.dispatchEvent(new CustomEvent('atlas:announce', { detail: message }));
  const sourceLink = (camera, label = 'Official camera ↗', className = 'source-link') => `<a class="${className}" href="${escape(camera.source)}" target="_blank" rel="noopener noreferrer">${label}</a>`;

  function courseOptions(selected, onlyEmbeds = false, excluded = []) {
    const available = cameras.filter(camera => (!onlyEmbeds || camera.embed) && (!excluded.includes(camera.id) || camera.id === selected));
    const countries = [...new Set(available.map(camera => camera.country))].sort();
    return countries.map(country => `<optgroup label="${escape(country)}">${available.filter(camera => camera.country === country).map(camera => `<option value="${escape(camera.id)}"${camera.id === selected ? ' selected' : ''}>${escape(camera.name)}${camera.embed ? '' : camera.format ? ' · updated image' : ' · operator website'}</option>`).join('')}</optgroup>`).join('');
  }

  function scrollToPlayer() {
    const section = document.getElementById('watch-section');
    section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  function setCinemaBackground(inert) {
    if (!inert) {
      for (const [element, previous] of cinemaInert) {
        if (previous === null) element.removeAttribute('inert');
        else element.setAttribute('inert', previous);
      }
      cinemaInert.clear();
      return;
    }
    let branch = document.getElementById('watch-section');
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement?.children || []) {
        if (sibling === branch || sibling.matches('#toast, script')) continue;
        if (!cinemaInert.has(sibling)) cinemaInert.set(sibling, sibling.getAttribute('inert'));
        sibling.inert = true;
      }
      branch = branch.parentElement;
    }
  }

  function keepCinemaFocus() {
    if (!state.cinema || document.querySelector('dialog[open]')) return;
    const section = document.getElementById('watch-section');
    if (section && !section.contains(document.activeElement)) {
      document.getElementById('cinema-toggle')?.focus({ preventScroll: true });
    }
  }

  function handleCinemaKey(event) {
    if (!state.cinema || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      toggleCinema();
      return;
    }
    if (event.key !== 'Tab') return;
    const section = document.getElementById('watch-section');
    if (!section) return;
    const focusable = [...section.querySelectorAll('a[href], button, input, select, textarea, iframe, [tabindex]')].filter(element => element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) return;
    if (!section.contains(document.activeElement) || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  }

  function updateControls() {
    const focus = document.getElementById('mode-focus');
    const wall = document.getElementById('mode-wall');
    const cinema = document.getElementById('cinema-toggle');
    const playback = document.getElementById('playback-toggle');
    const next = document.getElementById('next-camera');
    [focus, wall].forEach((button, index) => {
      if (!button) return;
      const active = state.mode === (index ? 'wall' : 'focus');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (cinema) {
      cinema.setAttribute('aria-pressed', String(state.cinema));
      const cinemaLabel = state.cinema ? 'Exit cinema mode' : 'Enter cinema mode';
      cinema.setAttribute('aria-label', cinemaLabel);
      cinema.title = cinemaLabel;
    }
    if (playback) {
      const hasPlayers = state.mode === 'wall' ? state.wallIds.length > 0 : Boolean(byId.get(state.focusId)?.embed);
      playback.disabled = !hasPlayers;
      playback.setAttribute('aria-pressed', String(state.stopped));
      playback.textContent = state.stopped ? 'Resume feeds' : state.mode === 'wall' ? 'Stop all feeds' : 'Stop feed';
      playback.title = state.stopped ? 'Reconnect the selected operator players' : 'Unload the selected operator players';
    }
    if (next) {
      next.textContent = state.mode === 'wall' ? 'Rotate a camera →' : 'Next camera →';
      next.setAttribute('aria-label', state.mode === 'wall' ? 'Replace the first wall slot with another camera' : 'Watch the next camera');
    }
    const note = document.getElementById('player-mode-note');
    if (note) {
      const camera = byId.get(state.focusId);
      note.textContent = state.stopped ? 'Feeds paused' : state.mode === 'wall' ? `${state.wallIds.length} / 4 screens · operator feeds` : camera?.embed ? 'One course. Front-row seat.' : camera?.format ? 'Updated still-image webcam' : 'View on operator website';
    }
    document.body.classList.toggle('cinema-mode', state.cinema);
    keepCinemaFocus();
    window.dispatchEvent(new CustomEvent('atlas:playbackchange', { detail: snapshot() }));
  }

  function mountMedia(media, camera) {
    media.replaceChildren();
    media.classList.toggle('hdrelay-player', Boolean(camera.embed?.includes('manage.hdrelay.com')));
    media.classList.toggle('media-stopped', state.stopped && Boolean(camera.embed));
    media.classList.toggle('media-external', !camera.embed);
    if (camera.embed && !state.stopped) {
      const frame = document.createElement('iframe');
      frame.src = camera.embed;
      frame.title = `${camera.name} first-tee camera — operator player`;
      frame.allow = 'autoplay; fullscreen; picture-in-picture';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.dataset.playerCamera = camera.id;
      media.append(frame);
      return;
    }
    const poster = document.createElement('div');
    poster.className = 'player-poster';
    poster.innerHTML = `<img src="${escape(camera.image)}" alt="${escape(camera.imageAlt)}"><span class="still-label">${escape(camera.imageLabel || 'STATIC PREVIEW · NOT LIVE')}</span>`;
    const overlay = document.createElement('div');
    overlay.className = 'player-message';
    if (camera.embed) {
      overlay.innerHTML = '<span class="message-symbol" aria-hidden="true">Ⅱ</span><h3>A moment of quiet.</h3><p>The operator player is stopped.</p><button class="primary-button" type="button" data-resume>Resume feeds <span aria-hidden="true">↗</span></button>';
      overlay.querySelector('[data-resume]').addEventListener('click', togglePlayback);
    } else {
      overlay.innerHTML = `<span class="message-symbol" aria-hidden="true">↗</span><h3>${camera.format ? 'A fresh view, one frame at a time.' : 'Your next view is just a click away.'}</h3><p>${camera.format ? 'This webcam publishes updated still images. Check the timestamp on the operator’s page.' : 'Open the course’s website for its first-tee camera.'}</p>${sourceLink(camera, camera.format ? 'View latest webcam image ↗' : 'Open first-tee camera ↗', 'primary-button')}`;
    }
    poster.append(overlay);
    media.append(poster);
  }

  function renderFocus() {
    const camera = byId.get(state.focusId);
    if (!camera) return;
    const restorePlayerFocus = root.contains(document.activeElement);
    const current = queueOrder.findIndex(item => item.id === camera.id);
    const queue = [];
    for (let offset = 1; offset <= queueOrder.length && queue.length < 3; offset += 1) {
      const candidate = queueOrder[(Math.max(current, -1) + offset) % queueOrder.length];
      if (candidate && candidate.id !== camera.id) queue.push(candidate);
    }
    tileNodes.clear();
    root.innerHTML = `<div class="focus-layout"><div class="focus-main"><div class="stream-label"><span class="feed-dot" aria-hidden="true"></span>${camera.embed ? 'OPERATOR FEED' : camera.format ? 'UPDATED IMAGE · ON OPERATOR SITE' : 'CAMERA · ON OPERATOR SITE'}<span class="stream-place">${escape(camera.country)}</span></div><div class="player-media"></div><div class="focus-footer"><div class="focus-info"><div class="eyebrow">${escape(camera.country)} <span aria-hidden="true">/</span> <span class="local-time" data-player-time="${escape(camera.id)}">${time(camera)} local</span></div><h2>${escape(camera.name)}</h2><p>${escape(location(camera))} <span aria-hidden="true">·</span> ${escape(camera.view)}</p></div><div class="player-actions">${sourceLink(camera)}${camera.embed ? '<button class="reload-button" type="button" data-reload-focus aria-label="Reload this camera">↻ Reload</button>' : ''}</div></div><label class="course-picker"><span>Change course</span><select aria-label="Choose a first-tee camera" id="focus-course">${courseOptions(camera.id)}</select></label></div><aside class="watch-rail" aria-label="More first-tee cameras"><div class="rail-heading"><span>NEXT ON THE TEE</span><span aria-hidden="true">↗</span></div>${queue.map((item, index) => `<button class="queue-card" type="button" data-queue-watch="${escape(item.id)}"><span class="queue-image"><img src="${escape(item.image)}" alt="${escape(item.imageAlt)}" loading="lazy"><span class="queue-preview">STATIC PREVIEW</span><span class="queue-number">0${index + 1}</span></span><span class="queue-copy"><span class="queue-country">${escape(item.country)}</span><strong>${escape(item.name)}</strong><span class="queue-time" data-player-time="${escape(item.id)}">${time(item)} local</span></span><span class="queue-arrow" aria-hidden="true">↗</span></button>`).join('')}<p class="rail-note">A window onto the opening shot. Feeds are supplied by each course; availability can change. Use the official camera link if a player is unavailable.</p></aside></div>`;
    mountMedia(root.querySelector('.player-media'), camera);
    root.querySelector('#focus-course').addEventListener('change', event => watch(event.target.value, false));
    root.querySelector('[data-reload-focus]')?.addEventListener('click', () => {
      if (state.stopped) {
        state.stopped = false;
        updateControls();
      }
      mountMedia(root.querySelector('.player-media'), camera);
      announce(`Reconnecting to ${camera.name}.`);
    });
    root.querySelectorAll('[data-queue-watch]').forEach(button => button.addEventListener('click', () => watch(button.dataset.queueWatch, false)));
    if (restorePlayerFocus) root.querySelector('#focus-course').focus({ preventScroll: true });
  }

  function createTile(camera) {
    const tile = document.createElement('article');
    tile.className = 'wall-tile';
    tile.dataset.cameraId = camera.id;
    tile.innerHTML = `<div class="tile-header"><span class="tile-number" aria-hidden="true"></span><label class="tile-picker"><span class="sr-only">Choose camera for this screen</span><select aria-label="Choose camera for this screen">${courseOptions(camera.id, true)}</select></label><button class="tile-remove" type="button" aria-label="Remove ${escape(camera.name)} from camera wall" title="Remove camera">×</button></div><div class="player-media"></div><div class="tile-footer"><div><h3>${escape(camera.name)}</h3><p>${escape(camera.country)} <span aria-hidden="true">·</span> <span data-player-time="${escape(camera.id)}">${time(camera)} local</span></p></div><div class="tile-actions">${sourceLink(camera, 'Source ↗')}<button class="reload-button" type="button" aria-label="Reload ${escape(camera.name)}" title="Reload camera">↻</button></div></div>`;
    mountMedia(tile.querySelector('.player-media'), camera);
    tile.querySelector('select').addEventListener('change', event => replaceTile(camera.id, event.target.value));
    tile.querySelector('.tile-remove').addEventListener('click', () => {
      const focusIndex = state.wallIds.indexOf(camera.id);
      state.wallIds = state.wallIds.filter(id => id !== camera.id);
      syncWall();
      updateControls();
      const remaining = [...root.querySelectorAll('.wall-tile select')];
      (remaining[Math.min(focusIndex, remaining.length - 1)] || root.querySelector('.empty-tile select'))?.focus({ preventScroll: true });
      announce(`${camera.name} removed. ${state.wallIds.length} of 4 screens in use.`);
    });
    tile.querySelector('.reload-button').addEventListener('click', () => {
      if (state.stopped) {
        announce('Resume the feeds before reloading a camera.');
        return;
      }
      mountMedia(tile.querySelector('.player-media'), camera);
      announce(`Reconnecting to ${camera.name}.`);
    });
    return tile;
  }

  function syncWall() {
    const grid = root.querySelector('.wall-grid');
    if (!grid) return;
    for (const [id, node] of tileNodes) {
      if (!state.wallIds.includes(id)) {
        node.remove();
        tileNodes.delete(id);
      }
    }
    grid.querySelector('.empty-tile')?.remove();
    state.wallIds.forEach((id, index) => {
      let tile = tileNodes.get(id);
      if (!tile) {
        tile = createTile(byId.get(id));
        tileNodes.set(id, tile);
        const followingNode = state.wallIds.slice(index + 1).map(nextId => tileNodes.get(nextId)).find(node => node?.isConnected);
        grid.insertBefore(tile, followingNode || null);
      }
      tile.querySelector('.tile-number').textContent = String(index + 1).padStart(2, '0');
      tile.querySelector('select').setAttribute('aria-label', `Choose camera for screen ${index + 1}`);
    });
    if (state.wallIds.length < 4) {
      const empty = document.createElement('div');
      empty.className = 'empty-tile';
      empty.innerHTML = `<span class="empty-plus" aria-hidden="true">＋</span><h3>Another corner of the world.</h3><p>Add a first tee to your camera wall.</p><label class="sr-only" for="empty-wall-course">Camera to add to wall</label><select id="empty-wall-course">${courseOptions('', true, state.wallIds)}</select><button class="primary-button" type="button">Add camera <span aria-hidden="true">＋</span></button>`;
      empty.querySelector('button').addEventListener('click', () => add(empty.querySelector('select').value));
      grid.append(empty);
    }
  }

  function replaceTile(oldId, newId) {
    if (oldId === newId) return;
    const slot = state.wallIds.indexOf(oldId);
    if (slot < 0 || !byId.get(newId)?.embed) return;
    if (state.wallIds.includes(newId)) {
      tileNodes.get(oldId).querySelector('select').value = oldId;
      announce(`${byId.get(newId).name} is already on your wall. Choose another course.`);
      return;
    }
    state.wallIds[slot] = newId;
    syncWall();
    tileNodes.get(newId)?.querySelector('select').focus({ preventScroll: true });
    updateControls();
    announce(`Screen ${slot + 1} now shows ${byId.get(newId).name}.`);
  }

  function render() {
    if (!root) return;
    if (state.mode === 'focus') {
      renderFocus();
    } else {
      if (renderedMode !== 'wall') {
        tileNodes.clear();
        root.innerHTML = '<div class="wall-grid" aria-label="First-tee camera wall"></div>';
      }
      syncWall();
    }
    renderedMode = state.mode;
    updateControls();
  }

  function watch(id, scroll = true) {
    if (!byId.has(id)) return snapshot();
    const alreadyPlaying = state.mode === 'focus' && state.focusId === id && !state.stopped;
    state.focusId = id;
    state.mode = 'focus';
    state.stopped = false;
    if (!alreadyPlaying) render();
    if (scroll) scrollToPlayer();
    announce(byId.get(id).embed ? `Viewing ${byId.get(id).name}.` : `${byId.get(id).name} is available on its operator’s website.`);
    return snapshot();
  }

  function add(id) {
    const camera = byId.get(id);
    if (!camera) return snapshot();
    if (!camera.embed) {
      watch(id);
      announce(`${camera.name} opens on the operator’s page. Use the official camera link below.`);
      return snapshot();
    }
    const duplicate = state.wallIds.includes(id);
    const full = state.wallIds.length >= 4;
    if (!duplicate && !full) state.wallIds.push(id);
    const switching = state.mode !== 'wall';
    state.mode = 'wall';
    if (switching || (!duplicate && !full)) render();
    scrollToPlayer();
    if (duplicate) announce(`${camera.name} is already on your camera wall.`);
    else if (full) announce('Your wall has four cameras. Remove a screen or use its course selector to replace one.');
    else announce(`${camera.name} added. ${state.wallIds.length} of 4 screens in use.`);
    return snapshot();
  }

  function setMode(mode) {
    if (!['focus', 'wall'].includes(mode) || mode === state.mode) return snapshot();
    state.mode = mode;
    render();
    announce(mode === 'wall' ? 'Camera wall. Up to four operator feeds at once.' : 'Focus view. One course, front and center.');
    return snapshot();
  }

  function toggleCinema() {
    if (!state.cinema) cinemaReturnFocus = document.activeElement;
    state.cinema = !state.cinema;
    setCinemaBackground(state.cinema);
    updateControls();
    if (state.cinema) {
      scrollToPlayer();
      document.getElementById('cinema-toggle')?.focus({ preventScroll: true });
    } else {
      const target = cinemaReturnFocus?.isConnected && !cinemaReturnFocus.closest('[inert]') ? cinemaReturnFocus : document.getElementById('cinema-toggle');
      target?.focus({ preventScroll: true });
      cinemaReturnFocus = null;
    }
    announce(state.cinema ? 'Cinema view on. Press Escape to return.' : 'Cinema view off.');
    return snapshot();
  }

  function togglePlayback() {
    if (state.mode === 'focus' && !byId.get(state.focusId)?.embed || state.mode === 'wall' && !state.wallIds.length) return snapshot();
    state.stopped = !state.stopped;
    if (state.mode === 'wall') {
      state.wallIds.forEach(id => mountMedia(tileNodes.get(id).querySelector('.player-media'), byId.get(id)));
    } else {
      mountMedia(root.querySelector('.player-media'), byId.get(state.focusId));
    }
    updateControls();
    announce(state.stopped ? 'All selected feeds stopped.' : 'Reconnecting the selected operator feeds.');
    return snapshot();
  }

  function next() {
    if (!embeddable.length) return snapshot();
    if (state.mode === 'focus') {
      const index = embeddable.findIndex(camera => camera.id === state.focusId);
      return watch(embeddable[(index + 1) % embeddable.length].id, false);
    }
    const currentSlot = embeddable.findIndex(camera => camera.id === state.wallIds[0]);
    for (let offset = 1; offset <= embeddable.length; offset += 1) {
      const candidate = embeddable[(currentSlot + offset) % embeddable.length];
      if (!state.wallIds.includes(candidate.id)) {
        if (state.wallIds.length) replaceTile(state.wallIds[0], candidate.id);
        else add(candidate.id);
        break;
      }
    }
    return snapshot();
  }

  function init() {
    root = document.getElementById('player-root');
    if (!root || bound) return;
    bound = true;
    document.getElementById('mode-focus')?.addEventListener('click', () => setMode('focus'));
    document.getElementById('mode-wall')?.addEventListener('click', () => setMode('wall'));
    document.getElementById('cinema-toggle')?.addEventListener('click', toggleCinema);
    document.getElementById('playback-toggle')?.addEventListener('click', togglePlayback);
    document.getElementById('next-camera')?.addEventListener('click', next);
    document.addEventListener('keydown', handleCinemaKey);
    document.addEventListener('focusin', keepCinemaFocus);
    render();
    setInterval(() => {
      root.querySelectorAll('[data-player-time]').forEach(element => {
        const camera = byId.get(element.dataset.playerTime);
        if (camera) element.textContent = `${time(camera)} local`;
      });
    }, 60000);
  }

  window.AtlasPlayer = { watch, add, setMode, getState: snapshot, toggleCinema, togglePlayback, next };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
