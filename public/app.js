const layout = document.querySelector('.layout');
const apiBase = layout?.dataset.apiBase ?? '/api/v1/green-api';

const els = {
  idInstance: document.getElementById('idInstance'),
  apiTokenInstance: document.getElementById('apiTokenInstance'),
  chatIdMessage: document.getElementById('chatIdMessage'),
  messageBody: document.getElementById('messageBody'),
  chatIdFile: document.getElementById('chatIdFile'),
  fileUrl: document.getElementById('fileUrl'),
  fileName: document.getElementById('fileName'),
  caption: document.getElementById('caption'),
  responseBody: document.getElementById('responseBody'),
  lastStatus: document.getElementById('lastStatus'),
  lastDuration: document.getElementById('lastDuration'),
  copyResponse: document.getElementById('copyResponse'),
  clearResponse: document.getElementById('clearResponse'),
  toast: document.getElementById('toast'),
};

/** @type {AbortController | null} */
let inFlight = null;

function setBusy(busy) {
  document.querySelectorAll('button.btn').forEach((btn) => {
    btn.disabled = busy;
  });
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function readCredentials() {
  return {
    idInstance: els.idInstance?.value?.trim() ?? '',
    apiTokenInstance: els.apiTokenInstance?.value?.trim() ?? '',
  };
}

function setStatus(kind, text) {
  if (!els.lastStatus) return;
  els.lastStatus.textContent = text;
  els.lastStatus.classList.remove('badge--ok', 'badge--err', 'badge--muted');
  if (kind === 'ok') els.lastStatus.classList.add('badge--ok');
  else if (kind === 'err') els.lastStatus.classList.add('badge--err');
  else els.lastStatus.classList.add('badge--muted');
}

async function postJson(path, body) {
  inFlight?.abort();
  inFlight = new AbortController();
  const started = performance.now();

  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: inFlight.signal,
    });

    const raw = await res.text();
    let parsed;
    try {
      parsed = raw.length ? JSON.parse(raw) : null;
    } catch {
      parsed = { parseError: true, raw };
    }

    const durationMs = Math.round(performance.now() - started);
    return { res, parsed, durationMs };
  } finally {
    inFlight = null;
  }
}

function renderResponse(parsed) {
  if (!els.responseBody) return;
  els.responseBody.value = JSON.stringify(parsed, null, 2);
}

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.getAttribute('data-action');
    const creds = readCredentials();

    setBusy(true);
    setStatus('muted', '…');
    if (els.lastDuration) els.lastDuration.textContent = '';

    try {
      if (action === 'get-settings') {
        const { res, parsed, durationMs } = await postJson(`${apiBase}/get-settings`, creds);
        renderResponse(parsed);
        if (els.lastDuration) els.lastDuration.textContent = `${durationMs} ms`;
        if (res.ok && parsed?.success) setStatus('ok', `${res.status} ok`);
        else setStatus('err', `${res.status} error`);
        return;
      }

      if (action === 'get-state-instance') {
        const { res, parsed, durationMs } = await postJson(
          `${apiBase}/get-state-instance`,
          creds,
        );
        renderResponse(parsed);
        if (els.lastDuration) els.lastDuration.textContent = `${durationMs} ms`;
        if (res.ok && parsed?.success) setStatus('ok', `${res.status} ok`);
        else setStatus('err', `${res.status} error`);
        return;
      }

      if (action === 'send-message') {
        const { res, parsed, durationMs } = await postJson(`${apiBase}/send-message`, {
          ...creds,
          chatId: els.chatIdMessage?.value?.trim() ?? '',
          message: els.messageBody?.value ?? '',
        });
        renderResponse(parsed);
        if (els.lastDuration) els.lastDuration.textContent = `${durationMs} ms`;
        if (res.ok && parsed?.success) setStatus('ok', `${res.status} ok`);
        else setStatus('err', `${res.status} error`);
        return;
      }

      if (action === 'send-file-by-url') {
        const payload = {
          ...creds,
          chatId: els.chatIdFile?.value?.trim() ?? '',
          fileUrl: els.fileUrl?.value?.trim() ?? '',
        };
        const fn = els.fileName?.value?.trim();
        const cap = els.caption?.value?.trim();
        if (fn) payload.fileName = fn;
        if (cap) payload.caption = cap;

        const { res, parsed, durationMs } = await postJson(
          `${apiBase}/send-file-by-url`,
          payload,
        );
        renderResponse(parsed);
        if (els.lastDuration) els.lastDuration.textContent = `${durationMs} ms`;
        if (res.ok && parsed?.success) setStatus('ok', `${res.status} ok`);
        else setStatus('err', `${res.status} error`);
      }
    } catch (e) {
      if (e?.name === 'AbortError') {
        setStatus('muted', 'aborted');
        return;
      }
      setStatus('err', 'network');
      renderResponse({ success: false, error: { message: String(e?.message ?? e) } });
    } finally {
      setBusy(false);
    }
  });
});

els.copyResponse?.addEventListener('click', async () => {
  const text = els.responseBody?.value ?? '';
  if (!text) {
    showToast('Нечего копировать');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Скопировано');
  } catch {
    showToast('Не удалось скопировать');
  }
});

els.clearResponse?.addEventListener('click', () => {
  if (els.responseBody) els.responseBody.value = '';
  setStatus('muted', 'idle');
  if (els.lastDuration) els.lastDuration.textContent = '';
});
