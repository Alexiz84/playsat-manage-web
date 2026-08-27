(function () {
  'use strict';

  var API_BASE = 'https://proxy.playsattv.com/manage-api/v1';
  var STORAGE_TOKEN = 'playsat_web_session_token_v1';
  var STORAGE_DEVICE = 'playsat_web_device_id_v1';
  var i18n = window.PlaySatI18n;

  function t(key, params) {
    return i18n ? i18n.t(key, params) : key;
  }

  var state = {
    token: '',
    deviceId: '',
    revision: 0,
    playlists: [],
    editId: '',
    selectedType: 'xtream',
    deleteId: '',
    pinId: '',
    unlockEditId: '',
    editPin: '',
    captchaId: ''
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
    languageSelect: el('languageSelect'),
    captchaImage: el('captchaImage'),
    captchaLoading: el('captchaLoading'),
    captchaAnswer: el('captchaAnswer'),
    refreshCaptchaButton: el('refreshCaptchaButton'),
    logoutButton: el('logoutButton'),
    connectedDeviceId: el('connectedDeviceId'),
    playlistGrid: el('playlistGrid'),
    emptyState: el('emptyState'),
    loadingState: el('loadingState'),
    dashboardMessage: el('dashboardMessage'),
    dashboardError: el('dashboardError'),
    addPlaylistButton: el('addPlaylistButton'),
    refreshPlaylistsButton: el('refreshPlaylistsButton'),
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
    playlistPin: el('playlistPin'),
    playlistPinField: el('playlistPinField'),
    playlistPinConfirm: el('playlistPinConfirm'),
    playlistPinConfirmField: el('playlistPinConfirmField'),
    playlistPinLabel: el('playlistPinLabel'),
    playlistPinHelp: el('playlistPinHelp'),
    deleteModal: el('deleteModal'),
    deleteText: el('deleteText'),
    deletePin: el('deletePin'),
    deletePinField: el('deletePinField'),
    deleteError: el('deleteError'),
    cancelDeleteButton: el('cancelDeleteButton'),
    confirmDeleteButton: el('confirmDeleteButton'),
    editUnlockModal: el('editUnlockModal'),
    editUnlockPin: el('editUnlockPin'),
    editUnlockError: el('editUnlockError'),
    cancelEditUnlockButton: el('cancelEditUnlockButton'),
    confirmEditUnlockButton: el('confirmEditUnlockButton'),
    pinModal: el('pinModal'),
    pinTitle: el('pinTitle'),
    pinText: el('pinText'),
    currentPinField: el('currentPinField'),
    currentPin: el('currentPin'),
    newPin: el('newPin'),
    confirmNewPin: el('confirmNewPin'),
    pinError: el('pinError'),
    cancelPinButton: el('cancelPinButton'),
    savePinButton: el('savePinButton')
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
      invalid_login_fields: 'loginFields',
      invalid_device_credentials: 'invalidCredentials',
      too_many_attempts: 'tooManyAttempts',
      invalid_or_expired_web_session: 'sessionExpired',
      missing_web_session: 'sessionExpired',
      invalid_playlist_name: 'ps_playlist_name_required',
      invalid_xtream_fields: 'ps_playlist_fill_all',
      invalid_m3u_fields: 'ps_playlist_m3u_required',
      invalid_epg_url: 'ps_playlist_epg_http',
      invalid_stalker_fields: 'ps_playlist_fill_all',
      playlist_not_found: 'playlistNotFound',
      web_manager_not_ready: 'webUnavailable',
      web_manager_master_key_missing: 'encryptionUnavailable',
      invalid_playlist_pin: 'invalidWebPin',
      playlist_pin_not_set: 'pinNotSet',
      playlist_pin_hash_failed: 'ps_playlist_request_failed',
      playlist_pin_verify_failed: 'ps_playlist_request_failed',
      playlist_pin_mismatch: 'pinMismatch',
      invalid_captcha: 'captchaInvalid',
      expired_captcha: 'captchaExpired',
      captcha_rate_limited: 'tooManyAttempts'
    };
    return t(map[code] || 'genericError');
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
    if (!state.captchaId) loadCaptcha();
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
    showLogin(t('sessionExpired'));
  }

  function handleRequestError(err, target) {
    if (err && (err.status === 401 || err.code === 'invalid_or_expired_web_session')) {
      forceSessionExpired();
      return;
    }
    setMessage(target, err && err.message ? err.message : t('genericError'));
  }

  function loadCaptcha() {
    state.captchaId = '';
    ui.captchaAnswer.value = '';
    hide(ui.captchaImage);
    show(ui.captchaLoading);
    ui.captchaLoading.textContent = t('captchaLoading');
    ui.refreshCaptchaButton.disabled = true;

    return api('/web/captcha', { method: 'GET' }).then(function (data) {
      if (!data.captchaId || !data.captchaImage) throw new Error(t('genericError'));
      state.captchaId = String(data.captchaId);
      ui.captchaImage.src = String(data.captchaImage);
      hide(ui.captchaLoading);
      show(ui.captchaImage);
    }).catch(function (err) {
      state.captchaId = '';
      hide(ui.captchaImage);
      show(ui.captchaLoading);
      ui.captchaLoading.textContent = err && err.message ? err.message : t('genericError');
    }).finally(function () {
      ui.refreshCaptchaButton.disabled = false;
    });
  }

  function login(event) {
    event.preventDefault();
    setMessage(ui.loginError, '');

    var deviceId = normalizeDeviceId(ui.deviceId.value);
    var deviceKey = normalizeDeviceKey(ui.deviceKey.value);
    var captchaAnswer = String(ui.captchaAnswer.value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
    ui.deviceId.value = deviceId;
    ui.deviceKey.value = deviceKey;
    ui.captchaAnswer.value = captchaAnswer;

    if (!/^([A-F0-9]{2}:){5}[A-F0-9]{2}$/.test(deviceId) || deviceKey.length !== 8) {
      setMessage(ui.loginError, t('loginFields'));
      return;
    }
    if (!state.captchaId || captchaAnswer.length !== 3) {
      setMessage(ui.loginError, t('captchaRequired'));
      return;
    }

    ui.loginButton.disabled = true;
    ui.loginButton.textContent = t('ps_common_please_wait');

    api('/web/login', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceId,
        deviceKey: deviceKey,
        captchaId: state.captchaId,
        captchaAnswer: captchaAnswer
      })
    }).then(function (data) {
      ui.deviceKey.value = '';
      ui.captchaAnswer.value = '';
      state.captchaId = '';
      saveSession(data.sessionToken, data.deviceId || deviceId);
      showDashboard();
      return loadPlaylists();
    }).catch(function (err) {
      setMessage(ui.loginError, err && err.message ? err.message : t('genericError'));
      loadCaptcha();
    }).finally(function () {
      ui.loginButton.disabled = false;
      ui.loginButton.textContent = t('ps_playlist_connect');
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

  function loadPlaylists(silent) {
    if (!silent) {
      hide(ui.emptyState);
      ui.playlistGrid.textContent = '';
      show(ui.loadingState);
      setMessage(ui.dashboardError, '');
    }

    return api('/web/playlists').then(function (data) {
      state.revision = Number(data.revision || 0);
      state.playlists = data.playlists || [];
      renderPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.dashboardError);
    }).finally(function () {
      if (!silent) hide(ui.loadingState);
    });
  }

  function typeLabel(type) {
    if (type === 'xtream') return t('ps_playlist_xtream');
    if (type === 'm3u') return t('ps_playlist_m3u');
    if (type === 'stalker') return t('ps_playlist_stalker');
    return type || t('ps_playlist_unnamed');
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
      var pin = document.createElement('button');
      var remove = document.createElement('button');
      var details = document.createElement('div');

      card.className = 'playlist-card glass-card';
      card.style.setProperty('--accent', typeAccent(playlist.type));
      head.className = 'playlist-card-head';
      badge.className = 'type-badge';
      title.textContent = playlist.name || t('ps_playlist_unnamed');
      badge.textContent = typeLabel(playlist.type);
      titleArea.appendChild(badge);
      titleArea.appendChild(title);

      actions.className = 'card-actions';
      edit.className = 'card-button';
      edit.type = 'button';
      edit.textContent = t('ps_common_edit');
      edit.addEventListener('click', function () { openEdit(playlist.id); });
      pin.className = 'card-button';
      pin.type = 'button';
      pin.textContent = playlist.pinSet ? t('changePin') : t('setPin');
      pin.addEventListener('click', function () { openPin(playlist.id); });
      remove.className = 'card-button danger';
      remove.type = 'button';
      remove.textContent = t('ps_common_delete');
      remove.addEventListener('click', function () { openDelete(playlist.id); });
      actions.appendChild(edit);
      actions.appendChild(pin);
      actions.appendChild(remove);
      head.appendChild(titleArea);
      head.appendChild(actions);

      details.className = 'detail-list';
      if (playlist.pinSet) {
        addDetail(details, t('webPin'), t('protected'), false);
      } else if (playlist.type === 'xtream') {
        addDetail(details, t('ps_playlist_server_url'), playlist.serverUrl, false);
        addDetail(details, t('ps_playlist_username'), playlist.username, false);
        addDetail(details, t('ps_playlist_password'), playlist.password, true);
      } else if (playlist.type === 'm3u') {
        addDetail(details, t('ps_playlist_m3u_url'), playlist.m3uUrl, false);
        addDetail(details, t('ps_playlist_epg_optional'), playlist.epgUrl, false);
      } else if (playlist.type === 'stalker') {
        addDetail(details, t('ps_playlist_portal_url'), playlist.portalUrl, false);
        addDetail(details, t('ps_playlist_mac_address'), playlist.macAddress, false);
      }
      addDetail(details, t('webPin'), playlist.pinSet ? t('protected') : t('notSet'), false);

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
    ui.playlistPin.value = '';
    ui.playlistPinConfirm.value = '';
    setMessage(ui.playlistFormError, '');
  }

  function openAdd() {
    state.editId = '';
    state.editPin = '';
    clearPlaylistForm();
    setType('xtream');
    ui.playlistModalEyebrow.textContent = t('ps_playlist_add_title');
    ui.playlistModalTitle.textContent = t('ps_playlist_add_title');
    ui.savePlaylistButton.textContent = t('ps_common_save');
    ui.playlistPinHelp.textContent = t('pinHelp');
    show(ui.playlistPinField);
    show(ui.playlistPinConfirmField);
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

    // An unprotected playlist is already returned with its provider details and can
    // be edited directly. PIN-protected playlists must be explicitly unlocked first.
    if (!playlist.pinSet) {
      openEditUnlocked(playlist, '');
      return;
    }

    state.unlockEditId = id;
    ui.editUnlockPin.value = '';
    setMessage(ui.editUnlockError, '');
    show(ui.editUnlockModal);
    setTimeout(function () { ui.editUnlockPin.focus(); }, 30);
  }

  function closeEditUnlock() {
    state.unlockEditId = '';
    ui.editUnlockPin.value = '';
    setMessage(ui.editUnlockError, '');
    hide(ui.editUnlockModal);
  }

  function confirmEditUnlock() {
    var id = state.unlockEditId;
    if (!id) return;
    var pin = String(ui.editUnlockPin.value || '').replace(/\D/g, '').slice(0, 4);
    ui.editUnlockPin.value = pin;
    setMessage(ui.editUnlockError, '');
    if (!/^\d{4}$/.test(pin)) {
      setMessage(ui.editUnlockError, t('invalidWebPin'));
      return;
    }

    ui.confirmEditUnlockButton.disabled = true;
    ui.confirmEditUnlockButton.textContent = t('checking');
    api('/web/playlists/' + encodeURIComponent(id) + '/reveal', {
      method: 'POST',
      body: JSON.stringify({ pin: pin })
    }).then(function (data) {
      var playlist = data.playlist;
      closeEditUnlock();
      openEditUnlocked(playlist, pin);
    }).catch(function (err) {
      handleRequestError(err, ui.editUnlockError);
    }).finally(function () {
      ui.confirmEditUnlockButton.disabled = false;
      ui.confirmEditUnlockButton.textContent = t('unlock');
    });
  }

  function openEditUnlocked(playlist, pin) {
    if (!playlist) return;
    state.editId = playlist.id;
    state.editPin = pin;
    clearPlaylistForm();
    setType(playlist.type);
    ui.playlistModalEyebrow.textContent = t('ps_playlist_edit');
    ui.playlistModalTitle.textContent = t('ps_playlist_edit');
    ui.savePlaylistButton.textContent = t('ps_common_save');
    hide(ui.playlistPinField);
    hide(ui.playlistPinConfirmField);
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
    state.editPin = '';
    show(ui.playlistPinField);
    show(ui.playlistPinConfirmField);
    setMessage(ui.playlistFormError, '');
  }

  function buildPlaylistPayload() {
    var name = String(ui.playlistName.value || '').trim();
    var type = state.selectedType;
    var payload = { name: name, type: type };

    if (!name) throw new Error(t('ps_playlist_name_required'));

    if (type === 'xtream') {
      payload.serverUrl = String(ui.xtreamServerUrl.value || '').trim();
      payload.username = String(ui.xtreamUsername.value || '').trim();
      payload.password = String(ui.xtreamPassword.value || '');
      if (!validUrl(payload.serverUrl) || !payload.username || !payload.password) {
        throw new Error(t('ps_playlist_fill_all'));
      }
    } else if (type === 'm3u') {
      payload.m3uUrl = String(ui.m3uUrl.value || '').trim();
      payload.epgUrl = String(ui.m3uEpgUrl.value || '').trim();
      if (!validUrl(payload.m3uUrl)) throw new Error(t('ps_playlist_m3u_required'));
      if (payload.epgUrl && !validUrl(payload.epgUrl)) throw new Error(t('ps_playlist_epg_http'));
    } else if (type === 'stalker') {
      payload.portalUrl = String(ui.stalkerPortalUrl.value || '').trim();
      payload.macAddress = normalizeMac(ui.stalkerMac.value);
      ui.stalkerMac.value = payload.macAddress;
      if (!validUrl(payload.portalUrl) || !/^([A-F0-9]{2}:){5}[A-F0-9]{2}$/.test(payload.macAddress)) {
        throw new Error(t('ps_playlist_fill_all'));
      }
    }

    if (state.editId) {
      // Protected edits carry the PIN used to unlock the playlist. Unprotected
      // playlists intentionally send an empty PIN.
      payload.pin = state.editPin || '';
    } else {
      var rawPin = String(ui.playlistPin.value || '').replace(/\D/g, '').slice(0, 4);
      var confirmPin = String(ui.playlistPinConfirm.value || '').replace(/\D/g, '').slice(0, 4);
      ui.playlistPin.value = rawPin;
      ui.playlistPinConfirm.value = confirmPin;

      if (!rawPin && !confirmPin) {
        payload.pin = '';
        payload.pinConfirm = '';
      } else {
        if (!/^\d{4}$/.test(rawPin)) {
          throw new Error(t('pinOrEmpty'));
        }
        if (!/^\d{4}$/.test(confirmPin)) {
          throw new Error(t('confirmPin4'));
        }
        if (rawPin !== confirmPin) {
          throw new Error(t('pinMismatch'));
        }
        payload.pin = rawPin;
        payload.pinConfirm = confirmPin;
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
    ui.savePlaylistButton.textContent = editing ? t('ps_playlist_saving_changes') : t('ps_playlist_adding');

    api(path, { method: method, body: JSON.stringify(payload) }).then(function () {
      closePlaylistModal();
      setMessage(ui.dashboardMessage, editing ? t('ps_playlist_updated') : t('ps_playlist_added'));
      setTimeout(function () { setMessage(ui.dashboardMessage, ''); }, 3500);
      return loadPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.playlistFormError);
    }).finally(function () {
      ui.savePlaylistButton.disabled = false;
      ui.savePlaylistButton.textContent = t('ps_common_save');
    });
  }

  function openDelete(id) {
    var playlist = findPlaylist(id);
    if (!playlist) return;
    state.deleteId = id;
    ui.deletePin.value = '';
    setMessage(ui.deleteError, '');
    ui.deleteText.textContent = t('ps_playlist_delete_confirm', [playlist.name || t('ps_playlist_unnamed')]);

    if (playlist.pinSet) {
      show(ui.deletePinField);
    } else {
      hide(ui.deletePinField);
    }

    show(ui.deleteModal);
    setTimeout(function () {
      if (playlist.pinSet) ui.deletePin.focus();
      else ui.confirmDeleteButton.focus();
    }, 30);
  }

  function closeDelete() {
    state.deleteId = '';
    ui.deletePin.value = '';
    setMessage(ui.deleteError, '');
    hide(ui.deleteModal);
  }

  function confirmDelete() {
    if (!state.deleteId) return;
    var id = state.deleteId;
    var playlist = findPlaylist(id);
    var protectedByPin = !!(playlist && playlist.pinSet);
    var pin = protectedByPin ? String(ui.deletePin.value || '').replace(/\D/g, '').slice(0, 4) : '';
    ui.deletePin.value = pin;
    setMessage(ui.deleteError, '');

    if (protectedByPin && !/^\d{4}$/.test(pin)) {
      setMessage(ui.deleteError, t('invalidWebPin'));
      return;
    }

    ui.confirmDeleteButton.disabled = true;
    ui.confirmDeleteButton.textContent = t('ps_playlist_deleting');

    api('/web/playlists/' + encodeURIComponent(id), {
      method: 'DELETE',
      body: JSON.stringify({ pin: pin })
    }).then(function () {
      closeDelete();
      setMessage(ui.dashboardMessage, t('ps_playlist_deleted'));
      setTimeout(function () { setMessage(ui.dashboardMessage, ''); }, 3500);
      return loadPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.deleteError);
    }).finally(function () {
      ui.confirmDeleteButton.disabled = false;
      ui.confirmDeleteButton.textContent = t('ps_common_delete');
    });
  }

  function openPin(id) {
    var playlist = findPlaylist(id);
    if (!playlist) return;
    state.pinId = id;
    ui.currentPin.value = '';
    ui.newPin.value = '';
    ui.confirmNewPin.value = '';
    setMessage(ui.pinError, '');

    if (playlist.pinSet) {
      ui.pinTitle.textContent = t('changeWebPin');
      ui.pinText.textContent = t('changePinText');
      show(ui.currentPinField);
    } else {
      ui.pinTitle.textContent = t('setWebPin');
      ui.pinText.textContent = t('choosePinDefault');
      hide(ui.currentPinField);
    }
    show(ui.pinModal);
    setTimeout(function () {
      (playlist.pinSet ? ui.currentPin : ui.newPin).focus();
    }, 30);
  }

  function closePin() {
    state.pinId = '';
    ui.currentPin.value = '';
    ui.newPin.value = '';
    ui.confirmNewPin.value = '';
    setMessage(ui.pinError, '');
    hide(ui.pinModal);
  }

  function savePin() {
    var playlist = findPlaylist(state.pinId);
    if (!playlist) return;

    var currentPin = String(ui.currentPin.value || '').replace(/\D/g, '').slice(0, 4);
    var newPin = String(ui.newPin.value || '').replace(/\D/g, '').slice(0, 4);
    var confirmPin = String(ui.confirmNewPin.value || '').replace(/\D/g, '').slice(0, 4);
    ui.currentPin.value = currentPin;
    ui.newPin.value = newPin;
    ui.confirmNewPin.value = confirmPin;
    setMessage(ui.pinError, '');

    if (playlist.pinSet && !/^\d{4}$/.test(currentPin)) {
      setMessage(ui.pinError, t('invalidWebPin'));
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setMessage(ui.pinError, t('invalidWebPin'));
      return;
    }
    if (newPin !== confirmPin) {
      setMessage(ui.pinError, t('pinMismatch'));
      return;
    }

    ui.savePinButton.disabled = true;
    ui.savePinButton.textContent = t('ps_playlist_saving_changes');

    api('/web/playlists/' + encodeURIComponent(playlist.id) + '/pin', {
      method: 'POST',
      body: JSON.stringify({
        currentPin: playlist.pinSet ? currentPin : '',
        newPin: newPin
      })
    }).then(function () {
      closePin();
      setMessage(ui.dashboardMessage, t('webPinSaved'));
      setTimeout(function () { setMessage(ui.dashboardMessage, ''); }, 3500);
      return loadPlaylists();
    }).catch(function (err) {
      handleRequestError(err, ui.pinError);
    }).finally(function () {
      ui.savePinButton.disabled = false;
      ui.savePinButton.textContent = t('savePin');
    });
  }

  ui.loginForm.addEventListener('submit', login);
  ui.languageSelect.addEventListener('change', function () {
    if (i18n) i18n.setLanguage(ui.languageSelect.value);
    renderPlaylists();
  });
  ui.refreshCaptchaButton.addEventListener('click', loadCaptcha);
  ui.logoutButton.addEventListener('click', logout);
  ui.addPlaylistButton.addEventListener('click', openAdd);
  ui.refreshPlaylistsButton.addEventListener('click', function () { loadPlaylists(false); });
  ui.emptyAddButton.addEventListener('click', openAdd);
  ui.closePlaylistModal.addEventListener('click', closePlaylistModal);
  ui.cancelPlaylistButton.addEventListener('click', closePlaylistModal);
  ui.playlistForm.addEventListener('submit', savePlaylist);
  ui.playlistPin.addEventListener('input', function () {
    ui.playlistPin.value = String(ui.playlistPin.value || '').replace(/\D/g, '').slice(0, 4);
  });
  ui.playlistPinConfirm.addEventListener('input', function () {
    ui.playlistPinConfirm.value = String(ui.playlistPinConfirm.value || '').replace(/\D/g, '').slice(0, 4);
  });
  ui.cancelDeleteButton.addEventListener('click', closeDelete);
  ui.confirmDeleteButton.addEventListener('click', confirmDelete);
  ui.cancelEditUnlockButton.addEventListener('click', closeEditUnlock);
  ui.confirmEditUnlockButton.addEventListener('click', confirmEditUnlock);
  ui.cancelPinButton.addEventListener('click', closePin);
  ui.savePinButton.addEventListener('click', savePin);

  ui.toggleDeviceKey.addEventListener('click', function () {
    var showKey = ui.deviceKey.type === 'password';
    ui.deviceKey.type = showKey ? 'text' : 'password';
    ui.toggleDeviceKey.textContent = showKey ? t('hide') : t('show');
    ui.toggleDeviceKey.setAttribute('aria-label', showKey ? t('hideDeviceKey') : t('showDeviceKey'));
  });

  ui.captchaAnswer.addEventListener('input', function () {
    ui.captchaAnswer.value = String(ui.captchaAnswer.value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
  });
  ui.deviceId.addEventListener('input', function () { ui.deviceId.value = normalizeDeviceId(ui.deviceId.value); });
  ui.deviceKey.addEventListener('input', function () { ui.deviceKey.value = normalizeDeviceKey(ui.deviceKey.value); });
  ui.deviceKey.addEventListener('paste', function (event) {
    var source = event.clipboardData || window.clipboardData;
    var pasted = source && source.getData ? source.getData('text') : '';
    if (pasted) {
      event.preventDefault();
      ui.deviceKey.value = normalizeDeviceKey(pasted);
      ui.deviceKey.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  ui.stalkerMac.addEventListener('input', function () { ui.stalkerMac.value = normalizeMac(ui.stalkerMac.value); });
  [ui.playlistPin, ui.deletePin, ui.editUnlockPin, ui.currentPin, ui.newPin, ui.confirmNewPin].forEach(function (input) {
    input.addEventListener('input', function () {
      input.value = String(input.value || '').replace(/\D/g, '').slice(0, 4);
    });
  });
  ui.generateStalkerMac.addEventListener('click', function () { ui.stalkerMac.value = generateStalkerMac(); });

  Array.prototype.forEach.call(document.querySelectorAll('.type-button'), function (button) {
    button.addEventListener('click', function () { setType(button.getAttribute('data-type')); });
  });

  ui.playlistModal.addEventListener('click', function (event) { if (event.target === ui.playlistModal) closePlaylistModal(); });
  ui.deleteModal.addEventListener('click', function (event) { if (event.target === ui.deleteModal) closeDelete(); });
  ui.editUnlockModal.addEventListener('click', function (event) { if (event.target === ui.editUnlockModal) closeEditUnlock(); });
  ui.pinModal.addEventListener('click', function (event) { if (event.target === ui.pinModal) closePin(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (!ui.pinModal.classList.contains('hidden')) closePin();
      else if (!ui.editUnlockModal.classList.contains('hidden')) closeEditUnlock();
      else if (!ui.deleteModal.classList.contains('hidden')) closeDelete();
      else if (!ui.playlistModal.classList.contains('hidden')) closePlaylistModal();
    }
  });

  window.setInterval(function () {
    if (state.token &&
        ui.dashboardView &&
        !ui.dashboardView.classList.contains('hidden') &&
        ui.playlistModal.classList.contains('hidden') &&
        ui.deleteModal.classList.contains('hidden') &&
        ui.editUnlockModal.classList.contains('hidden') &&
        ui.pinModal.classList.contains('hidden')) {
      loadPlaylists(true);
    }
  }, 10000);

  if (i18n) {
    i18n.apply(document);
    ui.languageSelect.value = i18n.getLanguage();
  }
  document.addEventListener('playsat-language-changed', function () {
    if (i18n) ui.languageSelect.value = i18n.getLanguage();
    if (state.playlists.length) renderPlaylists();
  });

  restoreSession();
  if (state.token && state.deviceId) {
    showDashboard();
    loadPlaylists();
  } else {
    showLogin();
  }
}());
