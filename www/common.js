const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pn = s => parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
const p2 = n => String(n).padStart(2, '0');
const fmt = ms => { const d = new Date(ms); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const toLocalInput = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function close() { $('#modal').innerHTML = ''; }
function left(ms) {
  const d = ms - Date.now(), a = Math.abs(d);
  const days = Math.floor(a / 864e5), h = Math.floor(a % 864e5 / 36e5), m = Math.floor(a % 36e5 / 6e4);
  const t = days ? `${days} kun ${h} soat` : h ? `${h} soat ${m} daqiqa` : `${m} daqiqa`;
  return d >= 0 ? { t: `⏳ ${t} qoldi`, late: false } : { t: `⚠️ ${t} kechikdi`, late: true };
}
function balTxt(b, who) {
  return b > 0 ? (who === 'w' ? `Sizga berilishi kerak: ${money(b)} so'm` : `Berilishi kerak: ${money(b)} so'm`)
    : b < 0 ? `Avans ortiqcha olingan: ${money(-b)} so'm` : "Hisob teng: 0 so'm";
}
function form(title, fields, onSave) {
  $('#modal').innerHTML = `<div class="ov"><div class="sheet"><h3>${title}</h3>` + fields.map(f => {
    const id = 'f_' + f.k;
    if (f.type === 'check') return `<label class="chk"><input id="${id}" type="checkbox" ${f.value ? 'checked' : ''}> ${f.label}</label>`;
    if (f.type === 'area') return `<label>${f.label}</label><textarea id="${id}" rows="4">${esc(f.value)}</textarea>`;
    const t = { num: 'text', pin: 'text' }[f.type] || f.type || 'text';
    const ex = f.type === 'num' ? 'inputmode="decimal"' : f.type === 'pin' ? 'inputmode="numeric" maxlength="4"' : '';
    return `<label>${f.label}</label><input id="${id}" type="${t}" ${ex} value="${esc(f.value)}" ${f.list ? `list="dl_${f.k}"` : ''}>` +
      (f.list ? `<datalist id="dl_${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : '');
  }).join('') + `<div class="btns"><button class="b2" id="fc">Bekor</button><button id="fs">Saqlash</button></div></div></div>`;
  $('#fc').onclick = close;
  $('#fs').onclick = async () => {
    const v = {}; fields.forEach(f => { const e = $('#f_' + f.k); v[f.k] = f.type === 'check' ? e.checked : e.value.trim(); });
    $('#fs').disabled = true;
    try {
      const r = await onSave(v);
      if (r === false || typeof r === 'string') { if (r) alert(r); $('#fs').disabled = false; } else close();
    } catch (e) { alert('Xato: ' + (e.message || e)); $('#fs').disabled = false; }
  };
}

/* ---------- Hisob-kitob: ish = qarz (+, qizil), avans = (-, yashil) ---------- */
function calc(ws, as) {
  ws = ws.filter(x => !x.canceled); as = as.filter(x => !x.canceled);
  const w = ws.reduce((a, x) => a + x.qty * x.price, 0), a = as.reduce((s, x) => s + x.amount, 0);
  return { w, a, bal: w - a, hand: ws.filter(x => !x.done).reduce((s, x) => s + x.qty, 0), cnt: ws.reduce((s, x) => s + x.qty, 0) };
}
const balCls = b => b > 0 ? 'dn' : b < 0 ? 'up' : '';
const balLine = b => b > 0 ? `Qoldiq qarz: ${money(b)} so'm` : b < 0 ? `Avans ortiqcha: ${money(-b)} so'm` : "Hisob teng: 0 so'm";

/* ---------- PDF ---------- */
async function shareFile(name, b64) {
  try {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const { Filesystem, Share } = cap.Plugins;
      const r = await Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' });
      await Share.share({ title: name, url: r.uri, dialogTitle: 'Saqlash / yuborish' });
    } else {
      const a = document.createElement('a'); a.href = 'data:application/pdf;base64,' + b64; a.download = name; a.click();
    }
  } catch (e) { alert('Xato: ' + (e.message || e)); }
}
const savePdf = (d, name) => shareFile(name, d.output('datauristring').split(',')[1]);
function pdfStart(title, sub) {
  const d = new window.jspdf.jsPDF();
  d.setFontSize(16); d.text(title, 14, 18); d.setFontSize(10); d.text(sub, 14, 25); return d;
}
function colorCols(cols) {
  return data => { if (data.section === 'body' && cols[data.column.index]) data.cell.styles.textColor = cols[data.column.index]; };
}
const RED = [220, 38, 38], GRN = [22, 163, 74];
function pdfWorker(name, shop, works, advs) {
  const c = calc(works, advs);
  const d = pdfStart(`Hisobot: ${name}`, `${shop}  |  ${fmt(Date.now())}`);
  const ev = [
    ...works.filter(x => !x.canceled).map(x => ({ at: x.at, t: `${x.model}: ${x.qty} dona x ${money(x.price)}` + (x.quality ? ` (${x.quality})` : '') + (x.done ? '' : ' [qo\'lida]'), w: x.qty * x.price, a: 0 })),
    ...advs.filter(x => !x.canceled).map(x => ({ at: x.at, t: 'Avans' + (x.note ? ': ' + x.note : ''), w: 0, a: x.amount }))
  ].sort((p, q) => p.at - q.at);
  let run = 0;
  const body = ev.map(e => { run += e.w - e.a; return [fmt(e.at), e.t, e.w ? '+ ' + money(e.w) : '', e.a ? '- ' + money(e.a) : '', money(run)]; });
  body.push(['', 'JAMI', '+ ' + money(c.w), '- ' + money(c.a), money(c.bal)]);
  d.autoTable({ startY: 30, head: [['Sana', 'Tavsif', 'Ish (+)', 'Avans (-)', 'Qoldiq']], body, styles: { fontSize: 9 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }, didParseCell: colorCols({ 2: RED, 3: GRN }) });
  let y = d.lastAutoTable.finalY + 8; if (y > 260) { d.addPage(); y = 20; }
  d.setFontSize(11); d.setFont(undefined, 'bold'); d.text(balLine(c.bal), 14, y); d.setFont(undefined, 'normal');
  d.setFontSize(9); d.text("Ish (+) = ishchiga to'lanishi kerak, avans (-) = oldin berilgan. Qoldiq = ish - avans.", 14, y + 6);
  d.text('Ishchi imzosi: ____________________', 14, y + 20);
  return d;
}
function pdfShop(shop, rows) {
  const d = pdfStart(`Umumiy hisobot: ${shop}`, fmt(Date.now()));
  const tw = rows.reduce((a, r) => a + r.w, 0), ta = rows.reduce((a, r) => a + r.a, 0);
  const body = rows.map(r => [r.n, r.cnt, '+ ' + money(r.w), '- ' + money(r.a), money(r.bal)]);
  body.push(['JAMI', rows.reduce((a, r) => a + r.cnt, 0), '+ ' + money(tw), '- ' + money(ta), money(tw - ta)]);
  d.autoTable({ startY: 30, head: [['Ishchi', 'Berilgan ish (dona)', 'Ish (+)', 'Avans (-)', 'Qoldiq']], body, styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }, didParseCell: colorCols({ 2: RED, 3: GRN }) });
  const y = d.lastAutoTable.finalY + 8;
  d.setFontSize(11); d.setFont(undefined, 'bold'); d.text(balLine(tw - ta), 14, y);
  return d;
}
