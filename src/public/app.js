const urlsEl = document.querySelector('#urls');
const submitEl = document.querySelector('#submit');
const panelEl = document.querySelector('#job-panel');
const summaryEl = document.querySelector('#summary');
const itemsEl = document.querySelector('#items');
const downloadEl = document.querySelector('#download');
const progressBarEl = document.querySelector('#progress-bar');
const progressTextEl = document.querySelector('#progress-text');

let polling = null;

submitEl.addEventListener('click', async () => {
  const urls = urlsEl.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    alert('請至少輸入一筆 URL');
    return;
  }

  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls })
  });

  const payload = await res.json();

  if (!res.ok) {
    alert(payload.error || '建立 Job 失敗');
    return;
  }

  panelEl.classList.remove('hidden');
  downloadEl.classList.add('hidden');
  startPolling(payload.jobId);
});

function startPolling(jobId) {
  if (polling) {
    clearInterval(polling);
  }

  fetchAndRender(jobId);
  polling = setInterval(() => fetchAndRender(jobId), 2000);
}

async function fetchAndRender(jobId) {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) {
    return;
  }

  const { job } = await res.json();
  const percent = job.total > 0 ? Math.floor((job.completed / job.total) * 100) : 0;
  progressBarEl.style.width = `${percent}%`;
  progressTextEl.textContent = `${percent}%`;
  summaryEl.textContent = `狀態: ${job.status} | 完成: ${job.completed}/${job.total} | 成功: ${job.success} | 失敗: ${job.failed}`;

  itemsEl.innerHTML = '';
  job.items.forEach((item) => {
    const li = document.createElement('li');
    const errorCode = item.errorCode ? ` (${item.errorCode})` : '';
    const debug = item.debugImagePath ? ` | debug: ${item.debugImagePath}` : '';
    li.textContent = `[${item.status}] ${item.url}${errorCode}${debug}`;
    itemsEl.appendChild(li);
  });

  if (job.status === 'completed') {
    if (polling) {
      clearInterval(polling);
      polling = null;
    }

    if (job.success > 0 && job.zipPath) {
      downloadEl.classList.remove('hidden');
      downloadEl.href = `/api/jobs/${jobId}/download`;
    } else {
      downloadEl.classList.add('hidden');
    }
  }
}
