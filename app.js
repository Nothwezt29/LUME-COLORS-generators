"use strict";

const form = document.querySelector("#generatorForm");
const resultSection = document.querySelector("#resultSection");
const resultBody = document.querySelector("#resultBody");
const resultSummary = document.querySelector("#resultSummary");
const formError = document.querySelector("#formError");
const successMessage = document.querySelector("#successMessage");
let generatedRows = [];
const VERIFY_BASE_URL = "http://verify.lumecolors.co.id/Genuine/scan/";
const HISTORY_KEY = "lumeBatchGenerator.history.v2";
const OLD_HISTORY_KEY = "lumeBatchGenerator.lastInput.v1";
let histories = {};
let activePrefix = "";

function extractCode(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const scanMarker = "/scan/";
  const markerIndex = trimmed.toLowerCase().lastIndexOf(scanMarker);
  const code = markerIndex >= 0 ? trimmed.slice(markerIndex + scanMarker.length) : trimmed;
  return decodeURIComponent(code.split(/[?#]/)[0]).trim();
}

function splitSequence(code) {
  const match = code.match(/^(.*?)(\d+)$/);
  if (!match) throw new Error("Kode harus diakhiri angka urut, misalnya 07500.");
  return { prefix: match[1], start: BigInt(match[2]), width: match[2].length };
}

function makeRows({ code, amount, productId, batchName, expiryDate }) {
  const { prefix, start, width } = splitSequence(code);
  return Array.from({ length: amount }, (_, index) => {
    const sequence = (start + BigInt(index)).toString().padStart(width, "0");
    const generatedCode = `${prefix}${sequence}`;
    return {
      code: generatedCode,
      productId,
      batchName,
      expiryDate,
      combined: `${VERIFY_BASE_URL}${generatedCode}`,
    };
  });
}

function getNextCode(code) {
  const { prefix, start, width } = splitSequence(code);
  return `${prefix}${(start + 1n).toString().padStart(width, "0")}`;
}

function getCodePrefix(code) {
  return extractCode(code).split(".")[0].trim().toUpperCase();
}

function renderHistory(selectedPrefix = activePrefix) {
  const section = document.querySelector("#lastInputSection");
  const entries = Object.entries(histories).sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt));
  if (!entries.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const history = histories[selectedPrefix];
  const active = document.querySelector("#activeHistory");
  active.hidden = !history;
  if (history) {
    activePrefix = selectedPrefix;
    document.querySelector("#history-title").textContent = `Riwayat ${selectedPrefix}`;
    document.querySelector("#lastStartCode").textContent = history.startCode;
    document.querySelector("#lastEndCode").textContent = history.endCode;
    document.querySelector("#nextCode").textContent = history.nextCode;
  }
  document.querySelector("#historyList").innerHTML = entries.map(([prefix, item]) => `
    <article class="history-item">
      <div><strong>${escapeHtml(prefix)}</strong><small>Terakhir: ${escapeHtml(item.endCode)}</small><small>Berikutnya: ${escapeHtml(item.nextCode)}</small></div>
      <div class="history-item-actions">
        <button class="history-mini-button" type="button" data-use-history="${escapeHtml(prefix)}">Gunakan</button>
        <button class="history-mini-button delete" type="button" data-delete-history="${escapeHtml(prefix)}" aria-label="Hapus riwayat ${escapeHtml(prefix)}">×</button>
      </div>
    </article>`).join("");
}

function saveHistory(rows) {
  const endCode = rows.at(-1).code;
  const prefix = getCodePrefix(rows[0].code);
  histories[prefix] = { startCode: rows[0].code, endCode, nextCode: getNextCode(endCode), savedAt: new Date().toISOString() };
  activePrefix = prefix;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
  } catch {
    // Hasil tetap dapat dibuat jika penyimpanan browser sedang dibatasi.
  }
  renderHistory(prefix);
}

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (stored && typeof stored === "object") histories = stored;
    const old = JSON.parse(localStorage.getItem(OLD_HISTORY_KEY));
    if (!Object.keys(histories).length && old?.startCode && old?.nextCode) {
      const prefix = getCodePrefix(old.startCode);
      histories[prefix] = old;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
    }
  } catch {
    histories = {};
  }
  const latest = Object.entries(histories).sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt))[0];
  activePrefix = latest?.[0] || "";
  renderHistory(activePrefix);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.hidden = false;
  window.setTimeout(() => { successMessage.hidden = true; }, 2600);
}

function renderRows(rows) {
  resultBody.innerHTML = rows.map((row, index) => `
    <tr>
      <td data-label="No.">${index + 1}</td>
      <td data-label="Kode">${escapeHtml(row.code)}</td>
      <td data-label="ID produk">${escapeHtml(row.productId || "—")}</td>
      <td data-label="Batch">${escapeHtml(row.batchName)}</td>
      <td data-label="Tanggal">${escapeHtml(row.expiryDate)}</td>
      <td data-label="URL lengkap">${escapeHtml(row.combined)}</td>
    </tr>
  `).join("");
  resultSummary.textContent = `${rows.length.toLocaleString("id-ID")} baris · ${rows[0].code} sampai ${rows.at(-1).code}`;
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.hidden = true;

  const code = extractCode(form.startCode.value);
  const amount = Number(form.amount.value);
  const batchName = form.batchName.value.trim();
  const expiryDate = form.expiryDate.value;

  if (!code) return showError("Masukkan URL atau kode awal.");
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return showError("Jumlah data harus antara 1 sampai 100.000.");
  if (!batchName) return showError("Masukkan nama batch.");
  if (!expiryDate) return showError("Pilih tanggal secara manual.");
  if ([form.productId.value, batchName].some((value) => value.includes(","))) return showError("ID produk dan nama batch tidak boleh mengandung koma.");

  try {
    generatedRows = makeRows({
      code,
      amount,
      productId: form.productId.value.trim(),
      batchName,
      expiryDate,
    });
    saveHistory(generatedRows);
    renderRows(generatedRows);
  } catch (error) {
    showError(error.message);
  }
});

document.querySelector("#useNextButton").addEventListener("click", () => {
  const history = histories[activePrefix];
  if (!history) return;
  form.startCode.value = `${VERIFY_BASE_URL}${history.nextCode}`;
  form.startCode.focus();
  window.scrollTo({ top: form.offsetTop - 90, behavior: "smooth" });
});

form.startCode.addEventListener("input", () => {
  const prefix = getCodePrefix(form.startCode.value);
  if (prefix && histories[prefix]) activePrefix = prefix;
  renderHistory(histories[prefix] ? prefix : "");
});

document.querySelector("#historyList").addEventListener("click", (event) => {
  const useButton = event.target.closest("[data-use-history]");
  const deleteButton = event.target.closest("[data-delete-history]");
  if (useButton) {
    const prefix = useButton.dataset.useHistory;
    activePrefix = prefix;
    form.startCode.value = `${VERIFY_BASE_URL}${histories[prefix].nextCode}`;
    renderHistory(prefix);
    form.startCode.focus();
    window.scrollTo({ top: form.offsetTop - 90, behavior: "smooth" });
  }
  if (deleteButton) {
    const prefix = deleteButton.dataset.deleteHistory;
    delete histories[prefix];
    if (activePrefix === prefix) activePrefix = "";
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(histories)); } catch { /* Penyimpanan mungkin dibatasi browser. */ }
    renderHistory(activePrefix);
  }
});

document.querySelector("#clearAllHistoryButton").addEventListener("click", () => {
  if (!window.confirm("Hapus seluruh riwayat kode dari browser ini?")) return;
  histories = {};
  activePrefix = "";
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(OLD_HISTORY_KEY);
  } catch { /* Penyimpanan mungkin dibatasi browser. */ }
  renderHistory("");
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  form.amount.value = "5";
  generatedRows = [];
  resultSection.hidden = true;
  formError.hidden = true;
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  const content = generatedRows.map((row) => row.combined).join("\n");
  try {
    await navigator.clipboard.writeText(content);
    showSuccess("Semua hasil berhasil disalin.");
  } catch {
    const area = document.createElement("textarea");
    area.value = content;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showSuccess("Semua hasil berhasil disalin.");
  }
});

function downloadFile(content, fileName, type) {
  const blob = new Blob(["\ufeff", content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilePart(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "batch";
}

document.querySelector("#csvButton").addEventListener("click", () => {
  const content = generatedRows.map((row) => row.combined).join("\r\n");
  downloadFile(content, `${safeFilePart(generatedRows[0].batchName)}.csv`, "text/csv;charset=utf-8");
  showSuccess("File CSV berhasil diunduh.");
});

document.querySelector("#txtButton").addEventListener("click", () => {
  const content = generatedRows.map((row) => row.combined).join("\r\n");
  downloadFile(content, `${safeFilePart(generatedRows[0].batchName)}.txt`, "text/plain;charset=utf-8");
  showSuccess("File TXT berhasil diunduh.");
});

loadHistory();
