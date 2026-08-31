"use strict";

const $ = (selector) => document.querySelector(selector);
const form = $("#generatorForm");
const products = window.LUME_PRODUCTS || [];
const VERIFY_URL = "http://verify.lumecolors.co.id/Genuine/scan/";
const HISTORY_KEY = "lumeBatchGenerator.batches.v3";
let selectedProduct = null;
let generatedRows = [];
let histories = loadHistory();

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function extractCode(value) {
  const input = value.trim().replace(/\/+$/, "");
  const marker = input.toLowerCase().lastIndexOf("/scan/");
  const raw = marker >= 0 ? input.slice(marker + 6) : input;
  try { return decodeURIComponent(raw.split(/[?#]/)[0]).trim(); } catch { return raw.split(/[?#]/)[0].trim(); }
}

function splitCode(code) {
  const match = code.match(/^(.*?)(\d+)$/);
  if (!match) throw new Error("Kode harus diakhiri nomor urut, misalnya 01501.");
  const beforeNumber = match[1].replace(/\.$/, "");
  const dot = beforeNumber.indexOf(".");
  if (dot < 1) throw new Error("Format kode harus seperti CWD002.29-JUNI-2029.01501.");
  return { productCode: beforeNumber.slice(0, dot).toUpperCase(), batchCode: beforeNumber.slice(dot + 1), base: `${beforeNumber}.`, start: BigInt(match[2]), width: match[2].length };
}

function displayDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}

function expiryInputValue(value) {
  if (!value) return "";
  const months = { januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12,jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const parts = value.trim().toLowerCase().replaceAll("/", "-").split(/[-\s]+/);
  if (parts.length < 3) return "";
  const day = Number(parts[0]), month = /^\d+$/.test(parts[1]) ? Number(parts[1]) : months[parts[1]];
  let year = Number(parts[2]); if (year < 100) year += 2000;
  return day && month && year ? `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
}

function makeRows({ product, code, amount, productId, batchName, expiryDate }) {
  const parsed = splitCode(code);
  if (parsed.productCode !== product.code.toUpperCase()) throw new Error(`Kode awal harus memakai kode produk ${product.code}.`);
  return Array.from({ length: amount }, (_, index) => {
    const sequence = (parsed.start + BigInt(index)).toString().padStart(parsed.width, "0");
    const fullCode = `${parsed.base}${sequence}`;
    return { productName: product.name, productCode: product.code, code: fullCode, batchCode: parsed.batchCode, sequence, batchName, productId, expiryDate, displayDate: displayDate(expiryDate), combined: `${fullCode},${productId},${batchName}`, qr: `${VERIFY_URL}${fullCode}` };
  });
}

function showProduct(product) {
  selectedProduct = product;
  form.productCode.value = product.code;
  form.productId.value = product.id;
  form.batchName.value = product.batch || "";
  form.expiryDate.value = expiryInputValue(product.expiry);
  $("#productSearch").value = "";
  $("#productSearch").parentElement.hidden = true;
  $("#selectedCode").textContent = product.id !== "" ? `${product.code} · ID ${product.id}` : `${product.code} · ID belum tersedia`;
  $("#selectedName").textContent = product.name;
  $("#selectedProduct").hidden = false;
  $("#productOptions").hidden = true;
}

function clearProduct() {
  selectedProduct = null;
  form.productCode.value = "";
  form.productId.value = "";
  $("#selectedProduct").hidden = true;
  $("#productSearch").parentElement.hidden = false;
  $("#productSearch").focus();
  renderProducts("");
}

function renderProducts(query) {
  const term = query.trim().toLowerCase();
  const matches = products.filter((p) => !term || p.code.toLowerCase().includes(term) || p.name.toLowerCase().includes(term));
  $("#productOptions").innerHTML = matches.map((p) => `<button type="button" data-code="${escapeHtml(p.code)}"><span>${escapeHtml(p.code)}${p.id !== "" ? ` · ${escapeHtml(p.id)}` : ""}</span><strong>${escapeHtml(p.name)}</strong></button>`).join("");
  $("#productOptions").hidden = !matches.length;
}

$("#productSearch").addEventListener("focus", (event) => renderProducts(event.target.value));
$("#productSearch").addEventListener("input", (event) => renderProducts(event.target.value));
$("#productOptions").addEventListener("click", (event) => { const button = event.target.closest("[data-code]"); if (button) showProduct(products.find((p) => p.code === button.dataset.code)); });
$("#changeProduct").addEventListener("click", clearProduct);
document.addEventListener("click", (event) => { if (!event.target.closest(".product-picker")) $("#productOptions").hidden = true; });

function loadHistory() {
  try { const value = JSON.parse(localStorage.getItem(HISTORY_KEY)); return Array.isArray(value) ? value : []; } catch { return []; }
}

function persistHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(histories)); } catch { /* Tetap berjalan jika storage dibatasi. */ }
}

function saveHistory(rows) {
  const first = rows[0], last = rows.at(-1), parsed = splitCode(last.code);
  const next = (parsed.start + 1n).toString().padStart(parsed.width, "0");
  const savedAt = new Date().toISOString();
  const key = `${first.productCode}::${first.batchCode}::${first.batchName}::${savedAt}::${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const item = { key, productCode: first.productCode, productName: first.productName, batchCode: first.batchCode, batchName: first.batchName, productId: first.productId, expiryDate: first.expiryDate, startCode: first.code, endCode: last.code, nextCode: `${parsed.base}${next}`, amount: rows.length, savedAt };
  histories = [item, ...histories];
  persistHistory(); renderHistory();
}

function renderHistory() {
  $("#emptyHistory").hidden = histories.length > 0;
  $("#downloadAllHistoryButton").hidden = histories.length === 0;
  $("#historyList").innerHTML = histories.map((item) => `<article class="history-item"><div class="history-top"><span>${escapeHtml(item.productCode)}</span><button type="button" data-delete="${escapeHtml(item.key)}" aria-label="Hapus riwayat">&times;</button></div><strong>${escapeHtml(item.productName)}</strong><p>${escapeHtml(item.batchCode)} <i></i> ${escapeHtml(item.batchName)}</p><small>${escapeHtml(item.amount || historyAmount(item))} data · ${escapeHtml(item.startCode)} — ${escapeHtml(item.endCode)}</small><div class="history-row-actions"><button class="download-history-button" type="button" data-download-history="${escapeHtml(item.key)}">Unduh Excel</button><button class="continue-button" type="button" data-continue="${escapeHtml(item.key)}">Lanjut ${escapeHtml(item.nextCode.split(".").at(-1))} <b>&#8594;</b></button></div></article>`).join("");
}

function historyAmount(item) {
  try { return Number(splitCode(item.endCode).start - splitCode(item.startCode).start + 1n); } catch { return 1; }
}

function rowsFromHistory(item) {
  return makeRows({ product: { code: item.productCode, name: item.productName }, code: item.startCode, amount: Number(item.amount || historyAmount(item)), productId: String(item.productId), batchName: item.batchName, expiryDate: item.expiryDate });
}

$("#historyList").addEventListener("click", (event) => {
  const remove = event.target.closest("[data-delete]");
  if (remove) { histories = histories.filter((h) => h.key !== remove.dataset.delete); persistHistory(); renderHistory(); return; }
  const download = event.target.closest("[data-download-history]");
  if (download) { const item = histories.find((h) => h.key === download.dataset.downloadHistory); downloadWorkbook(rowsFromHistory(item), `${safeName(item.productCode)}-${safeName(item.batchName)}`); return; }
  const resume = event.target.closest("[data-continue]");
  if (!resume) return;
  const item = histories.find((h) => h.key === resume.dataset.continue);
  const product = products.find((p) => p.code === item.productCode);
  if (product) showProduct(product);
  form.startCode.value = item.nextCode; form.batchName.value = item.batchName; form.productId.value = item.productId; form.expiryDate.value = item.expiryDate;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#clearAllHistoryButton").addEventListener("click", () => { if (histories.length && confirm("Hapus seluruh riwayat batch dari browser ini?")) { histories = []; persistHistory(); renderHistory(); } });

function showError(message) { $("#formError").textContent = message; $("#formError").hidden = false; }
function showSuccess(message) { $("#successMessage").textContent = message; $("#successMessage").hidden = false; setTimeout(() => { $("#successMessage").hidden = true; }, 2600); }

form.addEventListener("submit", (event) => {
  event.preventDefault(); $("#formError").hidden = true;
  const amount = Number(form.amount.value), code = extractCode(form.startCode.value), batchName = form.batchName.value.trim(), productId = form.productId.value.trim(), expiryDate = form.expiryDate.value;
  if (!selectedProduct) return showError("Pilih produk dari katalog terlebih dahulu.");
  if (!code) return showError("Masukkan kode awal.");
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return showError("Jumlah data harus antara 1 sampai 100.000.");
  if (!productId || !batchName || !expiryDate) return showError("Lengkapi ID produk, nama batch, dan tanggal.");
  if ([productId, batchName].some((value) => value.includes(","))) return showError("ID produk dan nama batch tidak boleh mengandung koma.");
  try { generatedRows = makeRows({ product: selectedProduct, code, amount, productId, batchName, expiryDate }); saveHistory(generatedRows); renderRows(); } catch (error) { showError(error.message); }
});

function renderRows() {
  $("#resultBody").innerHTML = generatedRows.map((row, i) => `<tr><td data-label="No.">${i + 1}</td><td data-label="Produk"><strong>${escapeHtml(row.productName)}</strong></td><td data-label="Kode">${escapeHtml(row.code)}</td><td data-label="ID">${escapeHtml(row.productId)}</td><td data-label="Batch">${escapeHtml(row.batchName)}</td><td data-label="Tanggal">${escapeHtml(row.displayDate)}</td><td data-label="QR / URL">${escapeHtml(row.qr)}</td></tr>`).join("");
  $("#resultTitle").textContent = generatedRows[0].productName;
  $("#resultSummary").textContent = `${generatedRows.length.toLocaleString("id-ID")} baris · ${generatedRows[0].code} sampai ${generatedRows.at(-1).code}`;
  $("#resultSection").hidden = false; $("#resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#resetButton").addEventListener("click", () => { form.reset(); form.amount.value = "5"; clearProduct(); generatedRows = []; $("#resultSection").hidden = true; $("#formError").hidden = true; });
$("#copyButton").addEventListener("click", async () => { const text = generatedRows.map((r) => r.qr).join("\n"); try { await navigator.clipboard.writeText(text); } catch { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); } showSuccess("Semua URL QR berhasil disalin."); });

// Pembuat XLSX mandiri: workbook tetap dapat diunduh saat aplikasi dibuka offline.
const xmlEscape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function columnName(index) { let name = ""; for (; index; index = Math.floor((index - 1) / 26)) name = String.fromCharCode(65 + ((index - 1) % 26)) + name; return name; }
function worksheetXml(rows, widths) {
  const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => `<c r="${columnName(c + 1)}${r + 1}" t="inlineStr"${r === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`).join("")}</row>`).join("");
  const columns = widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${columnName(rows[0].length)}${rows.length}"/></worksheet>`;
}

const crcTable = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

function makeZip(files) {
  const encoder = new TextEncoder(), localParts = [], centralParts = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name), data = encoder.encode(content), crc = crc32(data);
    const local = new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,...nameBytes,...data]);
    const central = new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset),...nameBytes]);
    localParts.push(local); centralParts.push(central); offset += local.length;
  });
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0), count = centralParts.length;
  const end = new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(centralSize),...u32(offset),0,0]);
  return new Blob([...localParts, ...centralParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function buildWorkbook(rows) {
  const qrSheet = [["Produk", "QR"], ...rows.map((r) => [r.productName, r.qr])];
  const detailSheet = [["Produk", "Kode Lengkap", "Kode Produk", "Batch Kode", "Nomor Urut", "Nama Batch", "ID Produk", "Tanggal", "Data Gabungan"], ...rows.map((r) => [r.productName, r.code, r.productCode, r.batchCode, r.sequence, r.batchName, r.productId, r.displayDate, r.combined])];
  return makeZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="QR Produk" sheetId="1" r:id="rId1"/><sheet name="Detail Batch" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8F5660"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": worksheetXml(qrSheet, [32, 78]),
    "xl/worksheets/sheet2.xml": worksheetXml(detailSheet, [32, 34, 16, 24, 15, 20, 13, 20, 52]),
  });
}

const safeName = (value) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "batch";
function downloadWorkbook(rows, fileName) {
  if (!rows.length) return;
  const url = URL.createObjectURL(buildWorkbook(rows)), link = document.createElement("a");
  link.href = url; link.download = `${fileName}.xlsx`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("#xlsxButton").addEventListener("click", () => {
  if (!generatedRows.length) return;
  downloadWorkbook(generatedRows, `${safeName(generatedRows[0].productCode)}-${safeName(generatedRows[0].batchName)}`);
  showSuccess("Workbook Excel untuk input ini berhasil dibuat.");
});

$("#downloadAllHistoryButton").addEventListener("click", () => {
  try {
    const allRows = [...histories].reverse().flatMap(rowsFromHistory);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadWorkbook(allRows, `LUME-FULL-HISTORY-${stamp}`);
  } catch (error) { showError(`Riwayat tidak dapat diekspor: ${error.message}`); }
});

renderHistory();
