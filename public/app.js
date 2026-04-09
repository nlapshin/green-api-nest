const page = document.querySelector('.page');
const apiBase = (page?.dataset.apiBase ?? '/api/v1/green-api').replace(/\/$/, '');

const $ = (id) => document.getElementById(id);

function setStatus(kind, text) {
  const el = $('status');
  if (!el) return;
  el.className = 'status';
  if (kind) el.classList.add(`status--${kind}`);
  el.textContent = text || '';
}

function setOutput(text) {
  const out = $('output');
  if (out) out.textContent = text || '';
}

function formatGatewayBody(body) {
  if (body === null || body === undefined) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'number' || typeof body === 'boolean') {
    return String(body);
  }
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function setLoading(isLoading) {
  document.querySelectorAll('button.btn').forEach((b) => {
    b.disabled = isLoading;
  });
  if (isLoading) setStatus('loading', 'loading…');
}

function readCredentials() {
  return {
    idInstance: $('idInstance')?.value.trim() ?? '',
    apiTokenInstance: $('apiTokenInstance')?.value.trim() ?? '',
  };
}

function readSendMessage() {
  return {
    chatId: $('sm_chatId')?.value.trim() ?? '',
    message: $('sm_message')?.value ?? '',
  };
}

function readSendFileByUrl() {
  return {
    chatId: $('sf_chatId')?.value.trim() ?? '',
    fileUrl: $('sf_fileUrl')?.value.trim() ?? '',
    fileName: $('sf_fileName')?.value.trim() ?? '',
    caption: $('sf_caption')?.value.trim() ?? '',
  };
}

async function callGateway(path, jsonBody) {
  setLoading(true);
  setOutput('');
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify(jsonBody),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      setStatus('err', 'Ошибка: сервер вернул не-JSON');
      setOutput(text);
      return;
    }
    if (data === null || typeof data !== 'object') {
      setStatus('err', 'Ошибка: неожиданный ответ сервера');
      setOutput(text);
      return;
    }
    if (!res.ok || !data.success) {
      const msg =
        data?.error?.message || data?.error?.code || 'Ошибка';
      setStatus('err', msg);
      setOutput(JSON.stringify(data, null, 2));
      return;
    }
    setStatus('ok', 'ok');
    const d = data.data;
    if (d != null && Object.prototype.hasOwnProperty.call(d, 'body')) {
      setOutput(formatGatewayBody(d.body));
    } else {
      setOutput(JSON.stringify(d ?? data, null, 2));
    }
  } catch (e) {
    setStatus('err', 'Ошибка сети');
    setOutput(String(e));
  } finally {
    setLoading(false);
  }
}

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.getAttribute('data-action');
  const creds = readCredentials();

  if (action === 'getSettings') {
    return callGateway(`${apiBase}/get-settings`, creds);
  }
  if (action === 'getStateInstance') {
    return callGateway(`${apiBase}/get-state-instance`, creds);
  }
  if (action === 'sendMessage') {
    return callGateway(`${apiBase}/send-message`, {
      ...creds,
      ...readSendMessage(),
    });
  }
  if (action === 'sendFileByUrl') {
    const fn = $('sf_fileName');
    if (fn && !fn.value.trim()) {
      fn.reportValidity();
      setStatus('err', 'Укажите fileName');
      setOutput('');
      return;
    }
    const p = readSendFileByUrl();
    const body = {
      ...creds,
      chatId: p.chatId,
      fileUrl: p.fileUrl,
    };
    if (p.fileName) body.fileName = p.fileName;
    if (p.caption) body.caption = p.caption;
    return callGateway(`${apiBase}/send-file-by-url`, body);
  }
});
