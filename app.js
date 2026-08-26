(function () {
  'use strict';

  var API_BASE = 'https://proxy.playsattv.com/manage-api/v1';
  var STORAGE_TOKEN = 'playsat_web_session_token_v1';
  var STORAGE_DEVICE = 'playsat_web_device_id_v1';

  var state = {
    token: '',
    deviceId: '',
    revision: 0,
    playlists: [],
    editId: '',
    selectedType: 'xtream',
    deleteId: ''
  };

  function el(id) { return document.getElementById(id); }

  var ui = {
    loginView: el('loginView'),
    dashboardView: el('dashboardView'),
    loginForm: el('loginForm'),
    deviceId: el('deviceId'),
    deviceKey: el('deviceKey'),
    toggleDeviceKey: el('toggleDeviceKey'),
    loginButton: el('loginButton'),
    loginError: el('loginError'),
    logoutButton: el('logoutButton'),
    connectedDeviceId: el('connectedDeviceId'),
    playlistGrid: el('playlistGrid'),
    emptyState: el('emptyState'),
    loadingState: el('loadingState'),
    dashboardMessage: el('dashboardMessage'),
    dashboardError: el('dashboardError'),
    addPlaylistButton: el('addPlaylistButton'),
    emptyAddButton: el('emptyAddButton'),
    playlistModal: el('playlistModal'),
    closePlaylistModal: el('closePlaylistModal'),
    cancelPlaylistButton: el('cancelPlaylistButton'),
    playlistForm: el('playlistForm'),
    playlistModalTitle: el('playlistModalTitle'),
    playlistModalEyebrow: el('playlistModalEyebrow'),
    playlistName: el('playlistName'),
    playlistFormError: el('playlistFormError'),
    savePlaylistButton: el('savePlaylistButton'),
    xtreamFields: el('xtreamFields'),
    xtreamServerUrl: el('xtreamServerUrl'),
    xtreamUsername: el('xtreamUsername'),
    xtreamPassword: el('xtreamPassword'),
    m3uFields: el('m3uFields'),
    m3uUrl: el('m3uUrl'),
    m3uEpgUrl: el('m3uEpgUrl'),
    stalkerFields: el('stalkerFields'),
    stalkerPortalUrl: el('stalkerPortalUrl'),
    stalkerMac: el('stalkerMac'),
    generateStalkerMac: el('generateStalkerMac'),
    deleteModal: el('deleteModal'),
    deleteText: el('deleteText'),
    cancelDeleteButton: el('cancelDeleteButton'),
    confirmDeleteButton: el('confirmDeleteButton')
  };

  function show(node) { node.classList.remove('hidden'); }
  function hide(node) { node.classList.add('hidden'); }

  function setMessage(node, text) {
    node.textContent = text || '';
    if (text) show(node); else hide(node);
  }

  function normalizeDeviceId(value) {
    var hex = String(value || '').replace(/[^A-Fa-f0-9]/g, '').toUpperCase().slice(0, 12);
    var pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  function normalizeDeviceKey(value) {
    return String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  }

  function normalizeMac(value) {
    var hex = String(value || '').replace(/[^A-Fa-f0-9]/g, '').toUpperCase().slice(0, 12);
    var pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  function validUrl(value) {
    try {
      var parsed = new URL(String(value || '').trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function randomByte() {
    var array = new Uint8Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      return array[0];
    }
    return Math.floor(Math.random() * 256);
  }

  function generateStalkerMac() {
    function hex(v) { return ('0' + v.toString(16)).slice(-2).toUpperCase(); }
    return '00:1A:79:' + hex(randomByte()) + ':' + hex(randomByte()) + ':' + hex(randomByte());
  }

  function errorText(code) {
    var map = {
      invalid_login_fields: 'Check the Device ID and Device Key.',
      invalid_device_credentials: 'Device ID or Device Key is incorrect.',
      too_many_attempts: 'Too many attempts. Please wait before trying again.',
      invalid_or_expired_web_session: 'Your web session has expired. Please connect again.',
      missing_web_session: 'Your web session is missing. Please connect again.',
      invalid_playlist_name: 'Enter a playlist name.',
      invalid_xtream_fields: 'Enter Server URL, Username and Password.',
      invalid_m3u_fields: 'Enter a valid M3U URL.',
      invalid_epg_url: 'Enter a valid EPG URL or leave it empty.',
      invalid_stalker_fields: 'Enter a valid Portal URL and MAC Address.',
      playlist_not_found: 'The playlist could not be found.',
      web_manager_not_ready: 'Web Manager is temporarily unavailable.',
      web_manager_master_key_missing: 'Web Manager encryption is not available.'
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  function api(path, options) {
    options = options || {};
    var headers = options.headers || {};
    headers.Accept = 'application/json';
    if (options.body) headers['Content-Type'] = 'application/json';
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    options.headers = headers;

    return fetch(API_BASE + path, options).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
        if (!response.ok || data.ok === false) {
          var err = new Error(errorText(data.error));
          err.code = data.error || 'request_failed';
          err.status = response.status;
          throw err;
        }
        return data;
      });
    });
  }

  function saveSession(token, deviceId) {
    state.token = token || '';
    state.deviceId = deviceId || '';
    try {
      sessionStorage.setItem(STORAGE_TOKEN, state.token);
      sessionStorage.setItem(STORAGE_DEVICE, state.deviceId);
    } catch (e) {}
  }

  function clearSession() {
    state.token = '';
    state.deviceId = '';
    state.revision = 0;
    state.playlists = [];
    try {
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_DEVICE);
    } catch (e) {}
  }

  function restoreSession() {
    try {
      state.token = sessionStorage.getItem(STORAGE_TOKEN) || '';
      state.deviceId = sessionStorage.getItem(STORAGE_DEVICE) || '';
    } catch (e) {
      state.token = '';
      state.deviceId = '';
    }
  }

  function showLogin(message) {
    hide(ui.dashboardView);
    hide(ui.logoutButton);
    show(ui.loginView);
    if (state.deviceId) ui.deviceId.value = state.deviceId;
    setMessage(ui.loginError, message || '');
    window.scrollTo(0, 0);
  }

  function showDashboard() {
    hide(ui.loginView);
    show(ui.dashboardView);
    show(ui.logoutButton);
    ui.connectedDeviceId.textContent = state.deviceId;
    setMessage(ui.loginError, '');
    window.scrollTo(0, 0);
  }

  function forceSessionExpired() {
    clearSession();
    showLogin('Your web session has expired. Please connect again.');
  }

  function handleRequestError(err, target) {
    if (err && (err.status === 401 || err.code === 'invalid_or_expired_web_session')) {
      forceSessionExpired();
      return;
    }
    setMessage(target, err && err.message ? err.message : 'Something went wrong. Please try again.');
  }

  function login(event) {
    event.preventDefault();
    setMessage(ui.loginError, '');

    var deviceId = normalizeDeviceId(ui.deviceId.value);
    var deviceKey = normalizeDeviceKey(ui.deviceKey.value);
    ui.deviceId.value = deviceId;
    ui.deviceKey.value = deviceKey;

    if (!/^([A-F0-9]{2}:){5}[A-F0-9]{2}$/.test(deviceId) || deviceKey.length !== 8) {
      setMessage(ui.loginError, 'Enter the Device ID and 8-character Device Key shown in PlaySat TV.');
      return;
    }

    ui.loginButton.disabled = true;
    ui.loginButton.textContent = 'Connecting…';

    api('/web/login', {
      method: 'POST',
      body: JSON.stringify({ deviceId: deviceId, deviceKey: deviceKey })
    }).then(function (data) {
      ui.deviceKey.value = '';
      saveSession(data.sessionToken, data.deviceId || deviceId);
      showDashboard();
      return loadPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.loginError);
    }).finally(function () {
      ui.loginButton.disabled = false;
      ui.loginButton.textContent = 'Connect to device';
    });
  }

  function logout() {
    var tokenBefore = state.token;
    if (!tokenBefore) {
      clearSession();
      showLogin();
      return;
    }

    api('/web/logout', { method: 'POST' }).catch(function () {}).finally(function () {
      clearSession();
      showLogin();
    });
  }

  function loadPlaylists() {
    hide(ui.emptyState);
    ui.playlistGrid.textContent = '';
    show(ui.loadingState);
    setMessage(ui.dashboardError, '');

    return api('/web/playlists').then(function (data) {
      state.revision = Number(data.revision || 0);
      state.playlists = data.playlists || [];
      renderPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.dashboardError);
    }).finally(function () {
      hide(ui.loadingState);
    });
  }

  function typeLabel(type) {
    if (type === 'xtream') return 'Xtream Codes';
    if (type === 'm3u') return 'M3U';
    if (type === 'stalker') return 'Stalker Portal';
    return type || 'Playlist';
  }

  function typeAccent(type) {
    if (type === 'xtream') return '#20c8ff';
    if (type === 'm3u') return '#ffb23c';
    if (type === 'stalker') return '#ff19c8';
    return '#a34cff';
  }

  function addDetail(list, label, value, secret) {
    if (value == null || value === '') return;
    var row = document.createElement('div');
    var labelNode = document.createElement('div');
    var valueNode = document.createElement('div');
    row.className = 'detail-row';
    labelNode.className = 'detail-label';
    valueNode.className = 'detail-value' + (secret ? ' secret' : '');
    labelNode.textContent = label;
    valueNode.textContent = secret ? '••••••••' : String(value);
    row.appendChild(labelNode);
    row.appendChild(valueNode);
    list.appendChild(row);
  }

  function renderPlaylists() {
    ui.playlistGrid.textContent = '';
    if (!state.playlists.length) {
      show(ui.emptyState);
      return;
    }
    hide(ui.emptyState);

    state.playlists.forEach(function (playlist) {
      var card = document.createElement('article');
      var head = document.createElement('div');
      var titleArea = document.createElement('div');
      var badge = document.createElement('div');
      var title = document.createElement('h2');
      var actions = document.createElement('div');
      var edit = document.createElement('button');
      var remove = document.createElement('button');
      var details = document.createElement('div');

      card.className = 'playlist-card glass-card';
      card.style.setProperty('--accent', typeAccent(playlist.type));
      head.className = 'playlist-card-head';
      badge.className = 'type-badge';
      title.textContent = playlist.name || 'Playlist';
      badge.textContent = typeLabel(playlist.type);
      titleArea.appendChild(badge);
      titleArea.appendChild(title);

      actions.className = 'card-actions';
      edit.className = 'card-button';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () { openEdit(playlist.id); });
      remove.className = 'card-button danger';
      remove.type = 'button';
      remove.textContent = 'Delete';
      remove.addEventListener('click', function () { openDelete(playlist.id); });
      actions.appendChild(edit);
      actions.appendChild(remove);
      head.appendChild(titleArea);
      head.appendChild(actions);

      details.className = 'detail-list';
      if (playlist.type === 'xtream') {
        addDetail(details, 'Server', playlist.serverUrl, false);
        addDetail(details, 'Username', playlist.username, false);
        addDetail(details, 'Password', playlist.password, true);
      } else if (playlist.type === 'm3u') {
        addDetail(details, 'M3U URL', playlist.m3uUrl, false);
        addDetail(details, 'EPG URL', playlist.epgUrl, false);
      } else if (playlist.type === 'stalker') {
        addDetail(details, 'Portal', playlist.portalUrl, false);
        addDetail(details, 'MAC', playlist.macAddress, false);
      }

      card.appendChild(head);
      card.appendChild(details);
      ui.playlistGrid.appendChild(card);
    });
  }

  function setType(type) {
    state.selectedType = type;
    Array.prototype.forEach.call(document.querySelectorAll('.type-button'), function (button) {
      button.classList.toggle('active', button.getAttribute('data-type') === type);
    });
    if (type === 'xtream') {
      show(ui.xtreamFields); hide(ui.m3uFields); hide(ui.stalkerFields);
    } else if (type === 'm3u') {
      hide(ui.xtreamFields); show(ui.m3uFields); hide(ui.stalkerFields);
    } else {
      hide(ui.xtreamFields); hide(ui.m3uFields); show(ui.stalkerFields);
    }
  }

  function clearPlaylistForm() {
    ui.playlistForm.reset();
    ui.playlistName.value = '';
    ui.xtreamServerUrl.value = '';
    ui.xtreamUsername.value = '';
    ui.xtreamPassword.value = '';
    ui.m3uUrl.value = '';
    ui.m3uEpgUrl.value = '';
    ui.stalkerPortalUrl.value = '';
    ui.stalkerMac.value = '';
    setMessage(ui.playlistFormError, '');
  }

  function openAdd() {
    state.editId = '';
    clearPlaylistForm();
    setType('xtream');
    ui.playlistModalEyebrow.textContent = 'ADD PLAYLIST';
    ui.playlistModalTitle.textContent = 'Add playlist';
    ui.savePlaylistButton.textContent = 'Save playlist';
    show(ui.playlistModal);
    setTimeout(function () { ui.playlistName.focus(); }, 30);
  }

  function findPlaylist(id) {
    var found = null;
    state.playlists.some(function (item) {
      if (item.id === id) { found = item; return true; }
      return false;
    });
    return found;
  }

  function openEdit(id) {
    var playlist = findPlaylist(id);
    if (!playlist) return;
    state.editId = id;
    clearPlaylistForm();
    setType(playlist.type);
    ui.playlistModalEyebrow.textContent = 'EDIT PLAYLIST';
    ui.playlistModalTitle.textContent = 'Edit playlist';
    ui.savePlaylistButton.textContent = 'Save changes';
    ui.playlistName.value = playlist.name || '';
    if (playlist.type === 'xtream') {
      ui.xtreamServerUrl.value = playlist.serverUrl || '';
      ui.xtreamUsername.value = playlist.username || '';
      ui.xtreamPassword.value = playlist.password || '';
    } else if (playlist.type === 'm3u') {
      ui.m3uUrl.value = playlist.m3uUrl || '';
      ui.m3uEpgUrl.value = playlist.epgUrl || '';
    } else if (playlist.type === 'stalker') {
      ui.stalkerPortalUrl.value = playlist.portalUrl || '';
      ui.stalkerMac.value = playlist.macAddress || '';
    }
    show(ui.playlistModal);
    setTimeout(function () { ui.playlistName.focus(); }, 30);
  }

  function closePlaylistModal() {
    hide(ui.playlistModal);
    setMessage(ui.playlistFormError, '');
  }

  function buildPlaylistPayload() {
    var name = String(ui.playlistName.value || '').trim();
    var type = state.selectedType;
    var payload = { name: name, type: type };

    if (!name) throw new Error('Enter a playlist name.');

    if (type === 'xtream') {
      payload.serverUrl = String(ui.xtreamServerUrl.value || '').trim();
      payload.username = String(ui.xtreamUsername.value || '').trim();
      payload.password = String(ui.xtreamPassword.value || '');
      if (!validUrl(payload.serverUrl) || !payload.username || !payload.password) {
        throw new Error('Enter a valid Server URL, Username and Password.');
      }
    } else if (type === 'm3u') {
      payload.m3uUrl = String(ui.m3uUrl.value || '').trim();
      payload.epgUrl = String(ui.m3uEpgUrl.value || '').trim();
      if (!validUrl(payload.m3uUrl)) throw new Error('Enter a valid M3U URL.');
      if (payload.epgUrl && !validUrl(payload.epgUrl)) throw new Error('Enter a valid EPG URL or leave it empty.');
    } else if (type === 'stalker') {
      payload.portalUrl = String(ui.stalkerPortalUrl.value || '').trim();
      payload.macAddress = normalizeMac(ui.stalkerMac.value);
      ui.stalkerMac.value = payload.macAddress;
      if (!validUrl(payload.portalUrl) || !/^([A-F0-9]{2}:){5}[A-F0-9]{2}$/.test(payload.macAddress)) {
        throw new Error('Enter a valid Portal URL and MAC Address.');
      }
    }
    return payload;
  }

  function savePlaylist(event) {
    event.preventDefault();
    setMessage(ui.playlistFormError, '');
    var payload;
    try { payload = buildPlaylistPayload(); }
    catch (e) { setMessage(ui.playlistFormError, e.message); return; }

    var editing = !!state.editId;
    var path = editing ? '/web/playlists/' + encodeURIComponent(state.editId) : '/web/playlists';
    var method = editing ? 'PUT' : 'POST';
    ui.savePlaylistButton.disabled = true;
    ui.savePlaylistButton.textContent = editing ? 'Saving…' : 'Adding…';

    api(path, { method: method, body: JSON.stringify(payload) }).then(function () {
      closePlaylistModal();
      setMessage(ui.dashboardMessage, editing ? 'Playlist updated.' : 'Playlist added.');
      setTimeout(function () { setMessage(ui.dashboardMessage, ''); }, 3500);
      return loadPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.playlistFormError);
    }).finally(function () {
      ui.savePlaylistButton.disabled = false;
      ui.savePlaylistButton.textContent = editing ? 'Save changes' : 'Save playlist';
    });
  }

  function openDelete(id) {
    var playlist = findPlaylist(id);
    if (!playlist) return;
    state.deleteId = id;
    ui.deleteText.textContent = 'Delete “' + (playlist.name || 'this playlist') + '” from Web Manager?';
    show(ui.deleteModal);
  }

  function closeDelete() {
    state.deleteId = '';
    hide(ui.deleteModal);
  }

  function confirmDelete() {
    if (!state.deleteId) return;
    var id = state.deleteId;
    ui.confirmDeleteButton.disabled = true;
    ui.confirmDeleteButton.textContent = 'Deleting…';

    api('/web/playlists/' + encodeURIComponent(id), { method: 'DELETE' }).then(function () {
      closeDelete();
      setMessage(ui.dashboardMessage, 'Playlist deleted.');
      setTimeout(function () { setMessage(ui.dashboardMessage, ''); }, 3500);
      return loadPlaylists();
    }).catch(function (err) {
      closeDelete();
      handleRequestError(err, ui.dashboardError);
    }).finally(function () {
      ui.confirmDeleteButton.disabled = false;
      ui.confirmDeleteButton.textContent = 'Delete';
    });
  }

  ui.loginForm.addEventListener('submit', login);
  ui.logoutButton.addEventListener('click', logout);
  ui.addPlaylistButton.addEventListener('click', openAdd);
  ui.emptyAddButton.addEventListener('click', openAdd);
  ui.closePlaylistModal.addEventListener('click', closePlaylistModal);
  ui.cancelPlaylistButton.addEventListener('click', closePlaylistModal);
  ui.playlistForm.addEventListener('submit', savePlaylist);
  ui.cancelDeleteButton.addEventListener('click', closeDelete);
  ui.confirmDeleteButton.addEventListener('click', confirmDelete);

  ui.toggleDeviceKey.addEventListener('click', function () {
    var showKey = ui.deviceKey.type === 'password';
    ui.deviceKey.type = showKey ? 'text' : 'password';
    ui.toggleDeviceKey.textContent = showKey ? 'Hide' : 'Show';
    ui.toggleDeviceKey.setAttribute('aria-label', (showKey ? 'Hide' : 'Show') + ' Device Key');
  });

  ui.deviceId.addEventListener('input', function () { ui.deviceId.value = normalizeDeviceId(ui.deviceId.value); });
  ui.deviceKey.addEventListener('input', function () { ui.deviceKey.value = normalizeDeviceKey(ui.deviceKey.value); });
  ui.stalkerMac.addEventListener('input', function () { ui.stalkerMac.value = normalizeMac(ui.stalkerMac.value); });
  ui.generateStalkerMac.addEventListener('click', function () { ui.stalkerMac.value = generateStalkerMac(); });

  Array.prototype.forEach.call(document.querySelectorAll('.type-button'), function (button) {
    button.addEventListener('click', function () { setType(button.getAttribute('data-type')); });
  });

  ui.playlistModal.addEventListener('click', function (event) { if (event.target === ui.playlistModal) closePlaylistModal(); });
  ui.deleteModal.addEventListener('click', function (event) { if (event.target === ui.deleteModal) closeDelete(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (!ui.deleteModal.classList.contains('hidden')) closeDelete();
      else if (!ui.playlistModal.classList.contains('hidden')) closePlaylistModal();
    }
  });

  restoreSession();
  if (state.token && state.deviceId) {
    showDashboard();
    loadPlaylists();
  } else {
    showLogin();
  }
}());
