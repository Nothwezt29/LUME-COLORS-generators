"use strict";

const $ = (selector) => document.querySelector(selector);
const products = window.LUME_PRODUCTS || [];
const VERIFY_URL = "http://verify.lumecolors.co.id/Genuine/scan/";
let selected = [];
let resultRows = [];

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const xmlEscape = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const safeName = (value) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "bundling";

function renderOptions(query = "") {
  const term = query.trim().toLowerCase();
  const matches = products.filter((product) => !selected.some((item) => item.code === product.code) && (!term || product.code.toLowerCase().includes(term) || product.name.toLowerCase().includes(term)));
  $("#bundleProductOptions").innerHTML = matches.map((product) => `<button type="button" data-code="${escapeHtml(product.code)}"><span>${escapeHtml(product.code)}${product.id !== "" ? ` · ID ${escapeHtml(product.id)}` : ""}</span><strong>${escapeHtml(product.name)}</strong><i>+</i></button>`).join("");
  $("#bundleProductOptions").hidden = !matches.length;
}

function renderSelected() {
  $("#selectedCount").textContent = `${selected.length} produk`;
  $("#emptySelection").hidden = selected.length > 0;
  $("#selectedProducts").innerHTML = selected.map((product, index) => `<article class="selected-bundle-product"><span class="drag-index">${index + 1}</span><code>${escapeHtml(product.code)}</code><strong>${escapeHtml(product.name)}<small>${product.batch ? `Batch ${escapeHtml(product.batch)} · ${escapeHtml(product.expiry)}` : "Batch belum tersedia"}</small></strong><div class="product-order-actions"><button type="button" data-up="${index}" aria-label="Naikkan urutan" ${index === 0 ? "disabled" : ""}>&uarr;</button><button type="button" data-down="${index}" aria-label="Turunkan urutan" ${index === selected.length - 1 ? "disabled" : ""}>&darr;</button><button type="button" data-remove="${index}" aria-label="Hapus produk">&times;</button></div></article>`).join("");
}

$("#bundleProductSearch").addEventListener("focus", (event) => renderOptions(event.target.value));
$("#bundleProductSearch").addEventListener("input", (event) => renderOptions(event.target.value));
$("#bundleProductOptions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-code]"); if (!button) return;
  const product = products.find((item) => item.code === button.dataset.code);
  if (product) selected.push(product);
  $("#bundleProductSearch").value = ""; renderSelected(); renderOptions(""); $("#bundleProductSearch").focus();
});
document.addEventListener("click", (event) => { if (!event.target.closest(".bundle-picker")) $("#bundleProductOptions").hidden = true; });

$("#selectedProducts").addEventListener("click", (event) => {
  const up = event.target.closest("[data-up]"), down = event.target.closest("[data-down]"), remove = event.target.closest("[data-remove]");
  if (up) { const index = Number(up.dataset.up); [selected[index - 1], selected[index]] = [selected[index], selected[index - 1]]; }
  if (down) { const index = Number(down.dataset.down); [selected[index + 1], selected[index]] = [selected[index], selected[index + 1]]; }
  if (remove) selected.splice(Number(remove.dataset.remove), 1);
  renderSelected();
});

function dateCode(value) {
  const months = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
  const [year, month, day] = value.split("-").map(Number);
  return `${String(day).padStart(2, "0")}-${months[month - 1]}-${year}`;
}

function readableDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}

function showError(message) { $("#bundleError").textContent = message; $("#bundleError").hidden = false; }
function showSuccess(message) { $("#bundleSuccess").textContent = message; $("#bundleSuccess").hidden = false; setTimeout(() => { $("#bundleSuccess").hidden = true; }, 2600); }

$("#bundleForm").addEventListener("submit", (event) => {
  event.preventDefault(); $("#bundleError").hidden = true;
  const title = $("#bundleTitle").value.trim(), bundleCode = $("#bundleCode").value.trim().toUpperCase(), customBatchName = $("#bundleBatchName").value.trim(), date = $("#bundleDate").value, sequence = $("#bundleSequence").value.trim();
  if (!title || !bundleCode || !date || !sequence) return showError("Lengkapi judul, kode bundling, tanggal, dan nomor awal.");
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(bundleCode)) return showError("Kode bundling hanya boleh berisi huruf, angka, dan tanda hubung.");
  if (!/^\d+$/.test(sequence)) return showError("Nomor awal harus berupa angka. Nol di depan akan dipertahankan.");
  if (!selected.length) return showError("Pilih minimal satu produk untuk bundling.");
  const parentCode = bundleCode.replace(/-[^-]+$/, "");
  resultRows = [
    { name: bundleCode, url: `${VERIFY_URL}${parentCode}.${dateCode(date)}.${sequence}`, isBundle: true },
    ...selected.map((product) => {
      const fullCode = `${product.code}.${bundleCode}-${sequence}`;
      const productBatch = (customBatchName || product.batch || bundleCode).replaceAll(",", " ");
      const productDate = product.expiry || readableDate(date);
      return { name: product.name, url: `${VERIFY_URL}${fullCode}`, isBundle: false, fullCode, productCode: product.code, batchCode: bundleCode, sequence, batchName: productBatch, productId: product.id, date: productDate, combined: `${fullCode},${product.id},${productBatch}` };
    }),
  ];
  $("#bundleResultTitle").textContent = title; $("#bundleSummary").textContent = `${selected.length} produk · ${bundleCode}`; $("#previewTitle").textContent = title;
  $("#previewRows").innerHTML = resultRows.map((row) => `<div class="preview-row"><span>${escapeHtml(row.name)}</span><a href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">${escapeHtml(row.url)}</a></div>`).join("");
  $("#bundleResult").hidden = false; $("#bundleResult").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#copyBundleButton").addEventListener("click", async () => {
  const text = resultRows.map((row) => `${row.name}\t${row.url}`).join("\n");
  try { await navigator.clipboard.writeText(text); } catch { const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
  showSuccess("Nama produk dan URL berhasil disalin.");
});

const crcTable = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
function makeZip(files) {
  const encoder = new TextEncoder(), locals = [], centrals = []; let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name), data = encoder.encode(content), crc = crc32(data);
    const local = new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,...nameBytes,...data]);
    const central = new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset),...nameBytes]);
    locals.push(local); centrals.push(central); offset += local.length;
  });
  const size = centrals.reduce((sum, part) => sum + part.length, 0), count = centrals.length;
  return new Blob([...locals,...centrals,new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(size),...u32(offset),0,0])], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function workbookBlob(title, rows) {
  const rowXml = rows.map((row, index) => `<row r="${index + 2}"><c r="A${index + 2}" t="inlineStr"><is><t>${xmlEscape(row.name)}</t></is></c><c r="B${index + 2}" t="inlineStr" s="2"><is><t>${xmlEscape(row.url)}</t></is></c></row>`).join("");
  const links = rows.map((row, index) => `<hyperlink ref="B${index + 2}" r:id="rId${index + 1}"/>`).join("");
  const relationships = rows.map((row, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEscape(row.url)}" TargetMode="External"/>`).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols><col min="1" max="1" width="43" customWidth="1"/><col min="2" max="2" width="78" customWidth="1"/></cols><sheetData><row r="1" ht="24" customHeight="1"><c r="A1" t="inlineStr" s="1"><is><t>${xmlEscape(title)}</t></is></c></row>${rowXml}</sheetData><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells><hyperlinks>${links}</hyperlinks></worksheet>`;
  const details = rows.filter((row) => !row.isBundle);
  const headers = ["Produk","Kode Lengkap","Kode Produk","Batch Kode","Nomor Urut","Nama Batch","ID Produk","Tanggal","Data Gabungan"];
  const detailValues = details.map((row) => [row.name,row.fullCode,row.productCode,row.batchCode,row.sequence,row.batchName,row.productId,row.date,row.combined]);
  const detailRows = [headers,...detailValues].map((values, rowIndex) => `<row r="${rowIndex + 1}">${values.map((value, columnIndex) => `<c r="${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xmlEscape(value ?? "")}</t></is></c>`).join("")}</row>`).join("");
  const detailSheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="36" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="16" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/><col min="5" max="5" width="15" customWidth="1"/><col min="6" max="6" width="45" customWidth="1"/><col min="7" max="7" width="13" customWidth="1"/><col min="8" max="8" width="20" customWidth="1"/><col min="9" max="9" width="65" customWidth="1"/></cols><sheetData>${detailRows}</sheetData><autoFilter ref="A1:I${detailValues.length + 1}"/></worksheet>`;
  return makeZip({
    "[Content_Types].xml":`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels":`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml":`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bundling Produk" sheetId="1" r:id="rId1"/><sheet name="Detail Batch" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml":`<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Calibri"/></font><font><u/><color rgb="FF0563C1"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD12B2F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml":sheet,
    "xl/worksheets/sheet2.xml":detailSheet,
    "xl/worksheets/_rels/sheet1.xml.rels":`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`,
  });
}

$("#downloadBundleButton").addEventListener("click", () => {
  if (!resultRows.length) return;
  const title = $("#bundleTitle").value.trim(), code = $("#bundleCode").value.trim().toUpperCase();
  const url = URL.createObjectURL(workbookBlob(title, resultRows)), link = document.createElement("a");
  link.href = url; link.download = `${safeName(code)}-BUNDLING.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  showSuccess("Excel bundling berhasil dibuat.");
});

renderSelected();
