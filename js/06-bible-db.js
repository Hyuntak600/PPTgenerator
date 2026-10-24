"use strict";

// ---------------------------------------------------------------------
// 성경 DB 모드: 성경 책 + 장 + 절을 고르면 그 절의 내용이 왼쪽 4개 언어 칸에 올라온다.
//  - 조각(상자) 하나 = 슬라이드 하나(DB의 Page 값은 상자 순서대로 자동으로 매겨짐). 한 절이 길면 Enter로 나눠서 슬라이드를 늘린다.
//  - 절 칸에서 "시작 절 → 끝 절" 또는 [장 전체]를 고르면 여러 절을 한 화면에서 보고 고칠 수 있다(복사 창의 절 고르기와 같은 방식).
//  - [＋ 구절 추가]로 다른 성경·같은 권의 다른 장·떨어진 절을 같은 화면에 더 불러올 수 있다. 불러온 구절 묶음(구절 범위 목록 dbSegs)은 위쪽 알약으로 보이고,
//    위의 성경·장·절 칸은 "지금 고른 알약(dbActive)" 하나만 바꾼다. 서로 겹치는 절은 함께 올릴 수 없다(같은 절이 두 군데서 저장되는 일을 막음).
//    왼쪽 조각마다 "절 이름표"(data-v)가 붙어 있어서, 저장할 때는 그 이름표로만 절을 나눈다 → 절끼리 글이 섞이지 않는다.
//    이름표는 "화면에 올라온 순서의 번호(1, 2, 3 …)"이고, 번호 → 실제 {성경, 장, 절}은 dbCur.units 가 알려 준다(저장 키는 항상 성경|장|절).
//    (Enter로 나눈 조각은 같은 절에 남고, Backspace로 다른 절과 합치는 것은 막고, 이름표가 어긋나면 저장을 멈춘다)
//  - 글은 "절 하나씩" 브라우저에 초안으로 저장된다(다른 절·슬라이드 만들기 내용은 건드리지 않음).
//  - 화면에 올라오는 순서: ① 저장된 초안 → ② bibleDB/ 폴더의 장 파일(하드 코딩된 내용) → ③ 빈 화면
// ---------------------------------------------------------------------
const DB_KEY = "subtitleTool_db_v1", DB_SEL_KEY = "subtitleTool_dbSel_v1";
const DB_FIELD = { ko: "Kor", zh: "Chn", en: "Eng", id: "Ind" };
const dbRoot = document.documentElement;
const dbBook = document.getElementById("dbBook"), dbChap = document.getElementById("dbChap"),
      dbVerse = document.getElementById("dbVerse"),
      dbStat = document.getElementById("dbStat");
let dbBroken = false, dbSlideSnap = null, dbSeq = 0, dbMiss = false, dbToV = 1, dbMixWarned = false; // dbToV = 지금 고른 구절 범위의 끝 절(시작 절은 dbVerse 값)
let dbSegs = [], dbActive = 0;  // 화면에 올린 구절 범위들 [{en,ch,v,vEnd}…] · 위쪽 성경·장·절 칸이 바꾸는 범위의 번호
const DB_MAX_UNITS = 400;       // 한 화면에 올릴 수 있는 절 수 상한(너무 많으면 화면이 느려져서)
const dbChapSeen = new Map(); // "책|장" → 내용이 있는 절 수(열어 본 장만 앎)
let dbVerseHas = new Set();   // 지금 장에서 초안 또는 장 파일에 내용이 있는 절 번호
dbVerse.title = "절 고르기: 시작 절 → 끝 절을 차례로 누르거나 [장 전체] · ✎ 표시: 고쳤고 아직 안 보낸 절 · ✓ 표시: 고친 뒤 보냈다고 표시한 절 — 🧩 DB 코드 복사 ② 아직 안 보낸 것에서 모아 관리자에게 보내 주세요";
dbRoot.dataset.mode = "slide";

function dbRead() {
  let raw = null;
  try { raw = localStorage.getItem(DB_KEY); } catch (e) { return { v: 1, d: {}, t: {}, s: {} }; }
  if (!raw) return { v: 1, d: {}, t: {}, s: {} };
  try {
    const o = JSON.parse(raw);
    if (o && o.v === 1 && o.d && typeof o.d === "object") { if (!o.t || typeof o.t !== "object") o.t = {}; if (!o.s || typeof o.s !== "object") o.s = {}; return o; } // o.t = 절마다 마지막으로 수정한 시각(ms) · o.s = 절마다 "관리자에게 보냈다"고 표시한 시각(ms)
    throw new Error("bad");
  } catch (e) { // 손상된 초안: 지우지 않고 따로 보관하고, 덮어쓰지 않도록 저장을 멈춤
    if (!dbBroken) {
      dbBroken = true;
      try { localStorage.setItem(DB_KEY + "_corrupt_" + Date.now(), raw); } catch (e2) { /* 무시 */ }
      showToast("DB 초안을 읽지 못해 원본을 따로 보관했어요. 덮어쓰지 않도록 저장을 멈춥니다.", true);
    }
    return { v: 1, d: {}, t: {}, s: {} };
  }
}
const dbKey = s => s.en + "|" + s.ch + "|" + s.v;
// 아직 안 보낸 수정인가: 보냈다고 표시한 기록이 없거나, 표시한 뒤에 다시 고쳤으면 true (수정 시각이 없는 옛 초안은 보낸 기록이 있어야만 "보냄")
function dbIsUnsent(o, k) { return !(o.s[k] && o.s[k] >= (o.t[k] || 0)); }
function columnsToMap() {
  const m = {};
  left.querySelectorAll(".col").forEach(c => { m[c.dataset.lang] = [...c.querySelectorAll(".box")].map(b => b._ta.value); });
  return m;
}
// 장 파일의 절별 내용(Map 절 → 행들). 한 번만 훑어서 여러 절을 다룰 때 매번 다시 찾지 않게 함
function dbFileByVerse(en, ch) {
  const m = new Map();
  if (window.BibleDB) BibleDB.rows(en, ch).forEach(r => { if (!m.has(r.Verse)) m.set(r.Verse, []); m.get(r.Verse).push(r); });
  return m;
}
// 장 파일의 절별 내용을 (성경|장)마다 한 번만 훑어 두는 도우미: fb(en, ch) → Map(절 → 행들)
function dbFileCache() {
  const c = new Map();
  return (en, ch) => { const k = en + "|" + ch; if (!c.has(k)) c.set(k, dbFileByVerse(en, ch)); return c.get(k); };
}
const dbUnitOf = ord => (dbCur && dbCur.units && dbCur.units[ord - 1]) || null; // 조각의 절 이름표(올라온 순서 번호) → 실제 {en, ch, v}
// 화면의 글을 "절 이름표(data-v)"로만 나눠, 이름표(번호) → 그 절의 페이지 목록으로 만든다. 다른 절의 조각은 절대 섞이지 않는다.
// (한 절 안에서는 뒤쪽의 빈 페이지는 버리고, 앞·사이의 빈 페이지는 빈 글로 둔다 — 예전 한 절 보기와 같은 규칙)
function dbPagesByVerse(o, fb) {
  const cols = readColumns(), rows = rowsOf(cols), meta = buildRowMap(), by = new Map(), res = new Map();
  rows.forEach((r, i) => { const v = meta[i] && meta[i].v; if (!v) return; if (!by.has(v)) by.set(v, []); by.get(v).push(r); });
  by.forEach((list, v) => {
    const u = dbUnitOf(v); if (!u) return;
    let need = 0;
    list.forEach((r, i) => { if (Object.values(r).some(it => it && it.filled)) need = i + 1; });
    const src = dbSourceWith(o, u.en, u.ch, u.v, fb(u.en, u.ch)).pages, pages = [];
    for (let i = 0; i < need; i++) {
      const p = {};
      LANGS.forEach(({ code }) => { const it = list[i][code]; p[DB_FIELD[code]] = it && it.filled ? it.value.trim() : ""; });
      if (src[i] && src[i].ChnVerseEnd) p.ChnVerseEnd = src[i].ChnVerseEnd;
      pages.push(p);
    }
    res.set(v, pages);
  });
  return res;
}
// 화면의 모든 조각이 지금 올라온 절들 중 하나의 이름표를 달고 있는지: 아니면 어느 절의 글인지 알 수 없으니 저장하지 않는다
function dbIntegrity() {
  const s = dbCur; if (!s || !s.units) return false;
  const n = s.units.length;
  return [...left.querySelectorAll(":scope > .col > .box")].every(b => { const v = +b.dataset.v; return Number.isInteger(v) && v >= 1 && v <= n; });
}
function saveDbNow() { // 지금 올라와 있는 절(들)만 저장(다른 절·다른 장·다른 성경은 그대로). 한 번에 한 번만 기록
  if (appMode !== "db" || !dbCur || dbBroken || localWiped) return;
  if (!dbIntegrity()) {
    saveWarnEl.hidden = false;
    if (!dbMixWarned) { dbMixWarned = true; showToast("절 표시가 맞지 않아 저장을 멈췄어요. 이 화면을 새로고침해 주세요(이전에 저장된 내용은 그대로예요).", true, 7000); }
    return;
  }
  try {
    const o = dbRead();
    if (dbBroken) return;
    const fb = dbFileCache(), byV = dbPagesByVerse(o, fb);
    byV.forEach((pages, ord) => { // 화면에 조각이 있는 절만 다룸(없는 절은 건드리지 않음). 저장 키는 이름표가 가리키는 실제 성경|장|절
      const u = dbUnitOf(ord); if (!u) return;
      const k = dbKey({ en: u.en, ch: u.ch, v: u.v }), fr = fb(u.en, u.ch).get(u.v) || [];
      const before = o.d[k] === undefined ? null : dbNormPages(o.d[k]);
      if (dbNormPages(pages) === dbNormPages(fr)) { delete o.d[k]; delete o.t[k]; delete o.s[k]; } // 장 파일과 같으면 초안이 필요 없음
      else if (pages.length || fr.length) { o.d[k] = pages; if (before !== dbNormPages(pages)) o.t[k] = Date.now(); } // 파일에 있는 절을 일부러 비운 경우는 빈 초안([])으로 기억 · 내용이 실제로 바뀐 때만 수정 시각 갱신
      else { delete o.d[k]; delete o.t[k]; delete o.s[k]; }
    });
    localStorage.setItem(DB_KEY, JSON.stringify(o));
    stateDirty = false; saveWarnEl.hidden = true;
    dbMarkVerses();
  } catch (e) { saveWarnEl.hidden = false; }
}
// 초안이 장 파일(하드 코딩된 내용)과 다른 절에 ✎ 표시 + 이 장에서 아직 코드에 반영 안 된 절 수를 상태줄에 표시
function dbHasSet(en, ch) { // 그 장에서 초안 또는 장 파일에 내용이 있는 절 번호들(빈 초안 = 일부러 비운 절은 뺌)
  const has = new Set(), filled = p => p && (p.Kor || p.Chn || p.Eng || p.Ind), pre = en + "|" + ch + "|", d = dbRead().d;
  if (window.BibleDB) BibleDB.rows(en, ch).forEach(r => { if (filled(r)) has.add(r.Verse); });
  Object.keys(d).forEach(k => { if (!k.startsWith(pre)) return; const v = parseInt(k.slice(pre.length), 10); if ((d[k] || []).some(filled)) has.add(v); else has.delete(v); });
  return has;
}
function dbNormPages(list) { return JSON.stringify((list || []).map(p => [p.Kor, p.Chn, p.Eng, p.Ind].map(x => (x || "").trim()).concat(p.ChnVerseEnd || 0))); }
function dbMarkVerses() {
  const s = dbCur; if (!s || !window.BibleDB) return;
  const pre = s.en + "|" + s.ch + "|", ob = dbRead(), d = ob.d, fileBy = new Map(), pend = new Set(), sentOk = new Set();
  BibleDB.rows(s.en, s.ch).forEach(r => { if (!fileBy.has(r.Verse)) fileBy.set(r.Verse, []); fileBy.get(r.Verse).push(r); });
  Object.keys(d).forEach(k => {
    if (!k.startsWith(pre)) return;
    const v = parseInt(k.slice(pre.length), 10);
    if (dbNormPages(d[k]) !== dbNormPages(fileBy.get(v))) { pend.add(v); if (!dbIsUnsent(ob, k)) sentOk.add(v); }
  });
  const has = new Set(), filled = p => p && (p.Kor || p.Chn || p.Eng || p.Ind); // 내용(한 글자라도)이 있는 절
  fileBy.forEach((rows, v) => { if (rows.some(filled)) has.add(v); });
  Object.keys(d).forEach(k => { if (!k.startsWith(pre)) return; const v = parseInt(k.slice(pre.length), 10); if ((d[k] || []).some(filled)) has.add(v); else has.delete(v); }); // 빈 초안 = 일부러 비운 절
  dbVerseHas = has; dbChapSeen.set(s.en + "|" + s.ch, has.size);
  [...dbVerse.options].forEach(o => { const t = o.value + (pend.has(+o.value) ? (sentOk.has(+o.value) ? " ✓" : " ✎") : ""); if (o.textContent !== t) o.textContent = t; });
  dbStat.textContent = dbMiss ? (dbSegs.length > 1 ? "⚠ 일부 장의 성경 데이터를 찾지 못했어요" : "⚠ 이 장의 성경 데이터를 찾지 못했어요") : ""; // 문제가 있을 때만 표시
}
function dbSourceWith(o, en, ch, v, fileBy) { // 초안이 있으면 초안, 없으면 장 파일, 그것도 없으면 빈 절
  const k = en + "|" + ch + "|" + v;
  if (o.d[k]) return { pages: o.d[k], src: "draft" };
  const rows = fileBy.get(v) || [];
  if (rows.length) return { pages: rows.map(r => ({ Kor: r.Kor || "", Chn: r.Chn || "", Eng: r.Eng || "", Ind: r.Ind || "", ChnVerseEnd: r.ChnVerseEnd || 0 })), src: "file" };
  return { pages: [], src: "empty" };
}
function dbSource(s) { return dbSourceWith(dbRead(), s.en, s.ch, s.v, dbFileByVerse(s.en, s.ch)); }
function dbVerseMax(s) { // 절 수: 장 파일의 BibleDB.ref → 없으면 이미 있는 절 중 가장 큰 번호 → 그래도 모르면 176(가장 긴 장)
  let m = window.BibleDB ? BibleDB.verses(s.en, s.ch) : 0;
  if (window.BibleDB) BibleDB.rows(s.en, s.ch).forEach(r => { m = Math.max(m, r.Verse); });
  const pre = s.en + "|" + s.ch + "|";
  Object.keys(dbRead().d).forEach(k => { if (k.startsWith(pre)) m = Math.max(m, parseInt(k.slice(pre.length), 10) || 0); });
  return m || 176;
}
function fillNum(sel, n, val) {
  sel.textContent = "";
  for (let i = 1; i <= n; i++) { const o = document.createElement("option"); o.value = o.textContent = String(i); sel.appendChild(o); }
  sel.value = String(Math.min(Math.max(1, val || 1), n));
}
// 왼쪽 칸 전체를 주어진 글로 바꿔 채운다(모드/절을 바꿀 때). 오른쪽 슬라이드는 왼쪽을 다시 비춘다.
function fillColumns(map, keepUndo) {
  if (!keepUndo) { undoStack.length = 0; redoStack.length = 0; updateUndoBtn(); }
  clearPicked();
  isRestoring = true;
  try {
    left.querySelectorAll(".box").forEach(b => b.remove());
    right.innerHTML = ""; uid = 0; slideSeq = 0;
    left.querySelectorAll(".col").forEach(col => {
      const code = col.dataset.lang, list = map[code] && map[code].length ? map[code] : [""];
      let prev = null;
      list.forEach(t => { // 성경 DB 모드는 {t: 글, v: 절 번호} — 조각마다 절 이름표(data-v)를 붙임
        const o = t !== null && typeof t === "object";
        prev = addBox(col, code, o ? t.t : t, prev, labelOf(code)).closest(".box");
        if (o && t.v) prev.dataset.v = String(t.v);
      });
      renumberColumn(col); resetColSelPreview(col);
    });
    syncSlides();
  } finally { isRestoring = false; }
  refreshInfo();
}
// 라벨에 쓸 절: 중국어가 여러 절을 묶은 구간(예: 16-18)에 들어 있는 절이면 그 구간으로 표시
function dbRefFor(en, ch, v) {
  const r = window.BibleDB ? BibleDB.rows(en, ch).find(x => x.Page === 1 && x.ChnVerseEnd >= v && x.Verse <= v && x.Chn) : null;
  return r ? { en, ch, v: r.Verse, vEnd: r.ChnVerseEnd } : { en, ch, v };
}
// 슬라이드마다 "자기 절"의 구절 표시를 넣는다(여러 절·여러 장·여러 성경을 한 화면에 볼 때 슬라이드마다 다름). 03-slides.js의 refreshInfo가 부름
function dbRefreshTags() {
  const s = dbCur; if (!s || !window.BibleDB || !s.units) return;
  const rows = buildRowMap(), blocks = right.children, cache = new Map();
  const text = ord => { let t = cache.get(ord); if (t === undefined) { const u = s.units[ord - 1]; t = u ? dbRefText(dbRefFor(u.en, u.ch, u.v)) : ""; cache.set(ord, t); } return t; };
  rows.forEach((r, i) => {
    const b = blocks[i]; if (!b || !b._row || !r.v) return;
    const tag = b._row.querySelector(".ref-tag"), t = text(r.v);
    if (tag && tag.textContent !== t) tag.textContent = t;
  });
  fitRefTags();
  dbRefStr = text(1); // 글자 맞춤 계산이 "위쪽 구절 자리가 있다"고 알게 하는 값
}
function dbRowRef(i) { const b = right.children[i], t = b && b._row && b._row.querySelector(".ref-tag"); return (t && t.textContent) || dbRefStr; } // 슬라이드 i번(0부터)의 구절 표시
// 왼쪽 조각 번호표의 구절 이름표(예: "레위기 10:6")가 칸이 좁아 잘리면 약어("레10:6" · 영어 화면은 "Lev 10:6")로 바꿔 보여 줌. 책 번호 1~66 순서.
// 전체 이름은 data-vl, 약어는 data-vs에 두고, 잘릴 때만 data-short를 켜서 CSS가 약어를 보여 줌(마우스를 올리면 전체 이름이 말풍선으로 뜸).
const VL_ABBR_KO = "창,출,레,민,신,수,삿,룻,삼상,삼하,왕상,왕하,대상,대하,스,느,에,욥,시,잠,전,아,사,렘,애,겔,단,호,욜,암,옵,욘,미,나,합,습,학,슥,말,마,막,눅,요,행,롬,고전,고후,갈,엡,빌,골,살전,살후,딤전,딤후,딛,몬,히,약,벧전,벧후,요일,요이,요삼,유,계".split(",");
const VL_ABBR_EN = "Gen,Exod,Lev,Num,Deut,Josh,Judg,Ruth,1 Sam,2 Sam,1 Kgs,2 Kgs,1 Chr,2 Chr,Ezra,Neh,Esth,Job,Ps,Prov,Eccl,Song,Isa,Jer,Lam,Ezek,Dan,Hos,Joel,Amos,Obad,Jonah,Mic,Nah,Hab,Zeph,Hag,Zech,Mal,Matt,Mark,Luke,John,Acts,Rom,1 Cor,2 Cor,Gal,Eph,Phil,Col,1 Thess,2 Thess,1 Tim,2 Tim,Titus,Phlm,Heb,Jas,1 Pet,2 Pet,1 John,2 John,3 John,Jude,Rev".split(",");
let vlFitQueued = false;
function fitVerseLabels() { // 잘리는 이름표만 약어로(읽기 → 쓰기를 한꺼번에 해서 화면 계산을 반복하지 않음)
  if (vlFitQueued) return;
  vlFitQueued = true;
  requestAnimationFrame(() => {
    vlFitQueued = false;
    const ns = [...left.querySelectorAll(".box-num[data-vl]")];
    ns.forEach(n => { if (n.dataset.short !== undefined) delete n.dataset.short; if (n.title === n.dataset.vl) n.removeAttribute("title"); });
    const clip = ns.map(n => !!n.dataset.vs && n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 1);
    ns.forEach((n, i) => { if (clip[i]) { n.dataset.short = "1"; n.title = n.dataset.vl; } });
  });
}
const vlRO = typeof ResizeObserver === "function" ? new ResizeObserver(() => fitVerseLabels()) : null;
if (vlRO) vlRO.observe(left);
window.addEventListener("resize", fitVerseLabels);
// 왼쪽 조각 번호표 옆에 "절 표시"(여러 절을 볼 때만) + 절이 바뀌는 자리의 구분선. 높이를 바꾸지 않는 표시만 써서 줄 맞춤이 어긋나지 않음
// 한 장이면 "16절", 여러 장이면 "3:16", 여러 성경이면 "요한복음 3:16"처럼 어느 장·성경의 절인지도 함께 보여 줌
function dbUpdateVerseChips() {
  const s = dbCur; if (!s || !s.units) return;
  const U = s.units, multi = U.length > 1, en = document.documentElement.lang === "en";
  const oneBk = U.every(u => u.en === U[0].en), oneCh = oneBk && U.every(u => u.ch === U[0].ch);
  const lab0 = (u, suf) => oneCh ? (en ? "v" + u.v + suf : u.v + suf + "절") : oneBk ? u.ch + ":" + u.v + suf : bkName(BibleDB.book(u.en)) + " " + u.ch + ":" + u.v + suf;
  const lab0s = (u, suf) => { const bi = BibleDB.book(u.en), n = bi ? (+bi.no > 0 ? +bi.no : BibleDB.books.indexOf(bi) + 1) - 1 : -1, a = (en ? VL_ABBR_EN : VL_ABBR_KO)[n]; return a ? a + (en ? " " : "") + u.ch + ":" + u.v + suf : ""; }; // 약어 이름표 (성경이 여러 개일 때만 이름이 들어가므로 그때만 만듦)
  left.querySelectorAll(":scope > .col").forEach(col => {
    if (vlRO) vlRO.observe(col); // 칸 너비가 바뀔 때마다 다시 판단
    const boxes = [...col.querySelectorAll(":scope > .box")], cnt = new Map(), seen = new Map();
    boxes.forEach(b => cnt.set(b.dataset.v, (cnt.get(b.dataset.v) || 0) + 1));
    let prevV = null, alt = false;
    boxes.forEach(b => {
      const v = b.dataset.v, first = v !== prevV;
      if (first) { if (prevV !== null) alt = !alt; prevV = v; }
      const k = seen.get(v) || 0; seen.set(v, k + 1);
      const u = U[(+v) - 1], suf = cnt.get(v) > 1 ? (k < 26 ? String.fromCharCode(97 + k) : "-" + (k + 1)) : "";
      const lab = multi && u ? lab0(u, suf) : "";
      const sh = lab && !oneBk ? lab0s(u, suf) : "";
      if (sh) { if (b._num.dataset.vs !== sh) b._num.dataset.vs = sh; } else if (b._num.dataset.vs !== undefined) delete b._num.dataset.vs;
      if (lab) { if (b._num.dataset.vl !== lab) b._num.dataset.vl = lab; } else if (b._num.dataset.vl !== undefined) { delete b._num.dataset.vl; delete b._num.dataset.short; }
      b.classList.toggle("vfirst", multi && first);
      b.classList.toggle("valt", multi && alt);
    });
  });
  fitVerseLabels();
}
// ---- 불러온 구절 범위들(dbSegs) 다루기 ----
const dbSegNorm = s => { // 범위 하나를 바르게 고침(없는 성경이면 null)
  const b = window.BibleDB && s ? BibleDB.book(s.en) : null; if (!b) return null;
  const ch = Math.min(Math.max(1, s.ch | 0), b.chapters || 1), v = Math.max(1, s.v | 0);
  return { en: s.en, ch, v, vEnd: Math.max(v, s.vEnd | 0) };
};
const dbSegHit = (a, b) => a.en === b.en && a.ch === b.ch && a.v <= b.vEnd && b.v <= a.vEnd; // 같은 절이 겹치는지
const dbSegName = s => bkName(BibleDB.book(s.en)) + " " + s.ch + ":" + (s.vEnd > s.v ? s.v + "-" + s.vEnd : s.v);
const dbSegCount = segs => segs.reduce((n, s) => n + (s.vEnd - s.v + 1), 0);
function dbSegsCheck(segs) { // 문제가 없으면 "", 있으면 알려 줄 글
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) if (dbSegHit(segs[i], segs[j])) return "이미 불러온 절과 겹쳐요. 겹치지 않는 절을 골라 주세요.";
  if (dbSegCount(segs) > DB_MAX_UNITS) return "한 화면에는 절을 최대 " + DB_MAX_UNITS + "절까지 불러올 수 있어요.";
  return "";
}
function dbSegsClean(list) { // 저장돼 있던 목록을 다시 불러올 때: 겹치거나 너무 많은 것은 조용히 뒤쪽부터 뺌
  const out = [];
  list.forEach(s => { const n = dbSegNorm(s); if (!n || out.some(o => dbSegHit(o, n)) || dbSegCount(out.concat([n])) > DB_MAX_UNITS) return; out.push(n); });
  return out;
}
function dbSelStore() { const a = dbSegs[dbActive] || { en: "Genesis", ch: 1, v: 1, vEnd: 1 }; return { en: a.en, ch: a.ch, v: a.v, vEnd: a.vEnd, segs: dbSegs, active: dbActive }; }
function dbSaveSel() { try { localStorage.setItem(DB_SEL_KEY, JSON.stringify(dbSelStore())); } catch (e) { /* 무시 */ } }
// 위쪽 성경·장·절 칸을 지금 고른 범위(dbActive)에 맞춤(화면의 글은 그대로 둠)
function dbSyncBar() {
  const s = dbSegs[dbActive]; if (!s || !window.BibleDB) return;
  dbBook.value = s.en; fillNum(dbChap, BibleDB.book(s.en).chapters, s.ch);
  fillNum(dbVerse, Math.max(dbVerseMax(s), s.vEnd), s.v);
  dbToV = s.vEnd;
  macSyncs.forEach(f => f());
}
// 범위 i의 첫 절 자리로 왼쪽·오른쪽 화면을 옮김(첫 범위면 맨 위)
function dbFocusSeg(i, smooth) {
  const s = dbCur; if (!s) return;
  const ord = s.starts[i] || 1;
  if (ord === 1) { left.scrollTop = 0; right.scrollTop = 0; return; }
  const place = sm => {
    if (dbCur !== s) return;
    const col = left.querySelector(":scope > .col"), box = col && col.querySelector(':scope > .box[data-v="' + ord + '"]');
    const ri = buildRowMap().findIndex(r => r.v === ord), blk = right.children[ri];
    if (box && box.isConnected) placeBoxAtTop(box, sm);
    if (blk) placeSlideAtTop(blk, sm);
  };
  requestAnimationFrame(() => requestAnimationFrame(() => { place(!!smooth); setTimeout(() => place(false), 300); })); // 상자 높이가 늦게 잡혀도 한 번 더 맞춤
}
function dbActivate(i) { // 알약을 눌러 그 범위를 "지금 고른 범위"로(성경·장·절 칸이 그 범위로 바뀜)
  const s = dbCur; if (!s || !dbSegs[i]) return;
  if (i !== dbActive) {
    dbActive = i; const a = dbSegs[i];
    s.active = i; s.en = a.en; s.ch = a.ch; s.v = a.v; s.vEnd = a.vEnd;
    dbSyncBar(); dbMarkVerses(); dbRenderSegs(); dbSaveSel();
  }
  dbFocusSeg(i, true);
}
function dbRemoveSeg(i) { // 화면에서만 뺌(고친 내용은 이미 저장돼 있음)
  if (!dbCur || dbSegs.length < 2 || !dbSegs[i]) return;
  const segs = dbSegs.filter((_, k) => k !== i);
  let a = dbActive; if (i < a) a--; else if (i === a) a = Math.min(i, segs.length - 1);
  dbGo({ segs, active: a });
  showToast("화면에서 뺐어요. 고친 내용은 저장돼 있어요.");
}
const dbSegsEl = document.getElementById("dbSegs");
let dbSegsSig = "";
function dbRenderSegs() {
  if (!dbSegsEl || !window.BibleDB) return;
  const many = dbSegs.length > 1;
  dbSegsEl.hidden = !many;
  const sig = many ? document.documentElement.lang + "|" + dbActive + "|" + dbSegs.map(dbSegName).join("§") : "";
  if (sig === dbSegsSig) return; dbSegsSig = sig;
  dbSegsEl.textContent = "";
  if (!many) return;
  dbSegs.forEach((s, i) => {
    const chip = document.createElement("span"); chip.className = "seg-chip" + (i === dbActive ? " active" : "");
    const b = document.createElement("button"); b.type = "button"; b.className = "seg-chip-b"; b.textContent = dbSegName(s);
    b.title = "눌러서 이 구절로 이동해요 (위의 성경·장·절이 이 구절 기준으로 바뀌어요)";
    b.addEventListener("click", () => dbActivate(i));
    const x = document.createElement("button"); x.type = "button"; x.className = "seg-chip-x"; x.textContent = "✕";
    x.title = "이 구절을 화면에서 빼요 (고친 내용은 저장돼 있어요)"; x.setAttribute("aria-label", "이 구절을 화면에서 빼요");
    x.addEventListener("click", () => dbRemoveSeg(i));
    chip.append(b, x); dbSegsEl.appendChild(chip);
  });
}
// sel = {en,ch,v,vEnd}: 지금 고른 범위(dbActive) 하나만 이 값으로 바꿔서 다시 올림 · {segs, active}: 구절 범위 목록 전체를 이 값으로 올림(복원·추가·빼기)
async function dbGo(sel) {
  if (!window.BibleDB) { saveDbNow(); dbCur = null; dbStat.textContent = "⚠ bibleDB/bibledb.js를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요."; return; }
  let segs, active;
  if (sel.segs) { // 목록 전체: 저장돼 있던 것을 되살리거나 추가·빼기한 결과
    segs = dbSegsClean(sel.segs); active = Math.min(Math.max(0, sel.active | 0), Math.max(0, segs.length - 1));
  } else { // 활성 범위 하나만 교체
    const one = dbSegNorm(sel);
    segs = dbSegs.length ? dbSegs.slice() : []; active = dbSegs.length ? Math.min(dbActive, segs.length - 1) : 0;
    if (one) { if (segs.length) segs[active] = one; else segs = [one]; }
    const bad = dbSegsCheck(segs);
    if (bad) { showToast(bad, true); if (dbCur) dbSyncBar(); return; } // 지금 화면은 그대로 두고 위쪽 칸만 원래대로
  }
  if (!segs.length) { segs = [{ en: "Genesis", ch: 1, v: 1, vEnd: 1 }]; active = 0; }
  saveDbNow(); dbCur = null; // 지금 절(들)을 먼저 저장하고, 불러오는 동안은 저장하지 않음
  const my = ++dbSeq;
  dbSegs = segs; dbActive = active;
  const act = segs[active];
  dbSaveSel();
  dbBook.value = act.en;
  fillNum(dbChap, BibleDB.book(act.en).chapters, act.ch);
  let miss = false;
  dbStat.textContent = "불러오는 중...";
  const seen = new Set();
  for (const s of segs) { // 필요한 장 파일을 차례로 불러옴(같은 장은 한 번만)
    const k = s.en + "|" + s.ch; if (seen.has(k)) continue; seen.add(k);
    try { await BibleDB.load(s.en, s.ch); } catch (e) { miss = true; }
    if (my !== dbSeq) return; // 그 사이 다른 절을 골랐으면 이 결과는 버림
  }
  segs.forEach(s => { s.vEnd = Math.min(s.vEnd, Math.max(dbVerseMax(s), s.v)); }); // 장의 마지막 절을 넘지 않게
  fillNum(dbVerse, Math.max(dbVerseMax(act), act.v), act.v);
  dbToV = act.vEnd;
  const o = dbRead(), fb = dbFileCache(), units = [], starts = [], items = [];
  segs.forEach(s => { // 범위마다 절을 차례로: 올라온 순서의 번호(1, 2, 3 …)가 곧 조각의 절 이름표
    starts.push(units.length + 1);
    for (let v = s.v; v <= s.vEnd; v++) { units.push({ en: s.en, ch: s.ch, v }); items.push({ ord: units.length, pages: dbSourceWith(o, s.en, s.ch, v, fb(s.en, s.ch)).pages }); }
  });
  setRefTags(dbRefText(dbRefFor(units[0].en, units[0].ch, units[0].v)));
  dbRefSrc = { en: act.en, ch: act.ch, v: act.v };
  const map = {};
  LANGS.forEach(({ code }) => {
    map[code] = [];
    items.forEach(({ ord, pages }) => { (pages.length ? pages : [{}]).forEach(p => map[code].push({ t: p[DB_FIELD[code]] || "", v: ord })); }); // 절마다 조각이 1개 이상, 모든 조각에 절 이름표
  });
  fillColumns(map);
  dbCur = { en: act.en, ch: act.ch, v: act.v, vEnd: act.vEnd, segs, active, units, starts }; // en·ch·v·vEnd = 지금 고른 범위(위쪽 칸 기준)
  dbMiss = miss; dbMixWarned = false;
  dbMarkVerses();
  dbRefreshTags(); dbUpdateVerseChips(); dbRenderSegs();
  macSyncs.forEach(f => f()); // 절 칸 글자(시작 ~ 끝)를 새 범위에 맞춤
  dbFocusSeg(active, false);
  dbSaveSel(); // 끝 절이 줄었을 수 있어 다시 저장
}
function dbSelNow() { const v = +dbVerse.value || 1; return { en: dbBook.value, ch: +dbChap.value || 1, v, vEnd: Math.max(v, dbToV | 0) }; }
function dbLoadSel() {
  try {
    const s = JSON.parse(localStorage.getItem(DB_SEL_KEY));
    if (s && BibleDB.book(s.en)) {
      const segs = Array.isArray(s.segs) ? dbSegsClean(s.segs) : [];
      if (segs.length) { const a = Math.min(Math.max(0, s.active | 0), segs.length - 1); return Object.assign({}, segs[a], { segs, active: a }); }
      const v = Math.max(1, s.v | 0); return { en: s.en, ch: Math.max(1, s.ch | 0), v, vEnd: Math.max(v, s.vEnd | 0) };
    }
  } catch (e) { /* 기본값 */ }
  return { en: "Genesis", ch: 1, v: 1, vEnd: 1 };
}
if (window.BibleDB) BibleDB.books.forEach(b => {
  const o = document.createElement("option"); o.value = b.en; o.textContent = b.no + ". " + b.ko + " (" + b.en + ")"; dbBook.appendChild(o);
});
dbBook.addEventListener("change", () => dbGo({ en: dbBook.value, ch: 1, v: 1, vEnd: 1 }));
dbChap.addEventListener("change", () => dbGo({ en: dbBook.value, ch: +dbChap.value, v: 1, vEnd: 1 }));
dbVerse.addEventListener("change", () => { const s = dbSelNow(); dbGo({ en: s.en, ch: s.ch, v: s.v, vEnd: s.v }); });
function dbStep(d) { // 여러 절을 보고 있으면: ‹ = 시작 절 바로 앞 절 하나, › = 끝 절 바로 뒤 절 하나
  const s = dbSelNow(), v = d < 0 ? s.v - 1 : s.vEnd + 1;
  if (v < 1 || v > dbVerse.options.length) { showToast(d < 0 ? "이 장의 첫 절이에요." : "이 장의 마지막 절이에요. 다음 장은 장 옆 › 버튼을 눌러 주세요."); return; }
  dbGo({ en: s.en, ch: s.ch, v, vEnd: v });
}
document.getElementById("dbPrev").addEventListener("click", () => dbStep(-1));
document.getElementById("dbNext").addEventListener("click", () => dbStep(1));
function dbStepChap(d) {
  if (!window.BibleDB) return;
  const s = dbSelNow(), ch = s.ch + d;
  if (ch >= 1 && ch <= BibleDB.book(s.en).chapters) { dbGo({ en: s.en, ch, v: 1, vEnd: 1 }); return; }
  const bs = Array.from(BibleDB.books), nb = bs[bs.findIndex(b => b.en === s.en) + d]; // 책 경계: 이전 책의 마지막 장 / 다음 책의 1장
  if (!nb) { showToast(d < 0 ? "성경의 첫 장이에요." : "성경의 마지막 장이에요."); return; }
  dbGo({ en: nb.en, ch: d < 0 ? BibleDB.book(nb.en).chapters : 1, v: 1, vEnd: 1 });
}
document.getElementById("dbChapPrev").addEventListener("click", () => dbStepChap(-1));
document.getElementById("dbChapNext").addEventListener("click", () => dbStepChap(1));
// 성경 DB 모드: 키보드 ← → 로 이전/다음 절 넘기기 (글 입력 중이거나 창이 열려 있을 때는 동작하지 않음)
document.addEventListener("keydown", e => {
  if (appMode !== "db" || e.defaultPrevented || imeBusy(e)) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName))) return;
  if (document.querySelector(".patch-overlay.open")) return;
  e.preventDefault();
  dbStep(e.key === "ArrowRight" ? 1 : -1);
});
// 드롭다운으로 고른 직후에도 바로 방향키가 먹도록 포커스를 풀어 줌
[dbBook, dbChap, dbVerse].forEach(el => el.addEventListener("change", () => el.blur()));
// ---- 맥 스타일 팝업 메뉴(성경·장·절) ----
// 원래 <select>는 숨겨 둔 채 값 저장소로만 쓰고(기존 코드는 그대로 동작), 화면에는 유리 질감의 메뉴를 띄운다. 고르면 select 값을 바꾸고 change를 보낸다.
// 데이터가 없는 항목은 흐리게: 절 = 초안·장 파일 어디에도 내용이 없는 절 / 장 = 열어 봤는데 비어 있던 장(안 열어 본 장의 파일 내용은 미리 알 수 없어 그대로 둠)
const macSyncs = [];
const bkName = b => b ? (document.documentElement.lang === "en" ? (b.en || b.ko) : (b.ko || b.en)) || "" : ""; // 화면 언어에 맞춘 책 이름(영어 화면이면 John, 한국어 화면이면 요한복음)
function macSelect(sel, isEmpty, lock) { // lock === true 이면 isEmpty 항목은 흐리게 보일 뿐 아니라 고를 수도 없다(성경 불러오기용)
  const btn = document.createElement("button"), lbl = document.createElement("span");
  btn.type = "button"; btn.className = "mac-sel"; lbl.className = "mac-lbl"; btn.appendChild(lbl);
  btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
  btn.style.fontSize = getComputedStyle(sel).fontSize;
  sel.parentNode.insertBefore(btn, sel); sel.style.display = "none";
  let menu = null, items = [], cur = -1, typed = "", typedT = 0;
  const sync = () => {
    const o = sel.options[sel.selectedIndex], t = o ? o.textContent : "";
    if (lbl.textContent !== t) lbl.textContent = t;
    if (btn.title !== sel.title) btn.title = sel.title;
  };
  macSyncs.push(sync);
  const syncAll = () => macSyncs.forEach(f => f()); // sel.value를 코드로 바꾸면 이벤트가 없어서, 어느 하나가 바뀔 때 셋 다 다시 맞춤
  new MutationObserver(syncAll).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title"] });
  sel.addEventListener("change", syncAll);
  sync();
  const locked = i => !!(items[i] && items[i].classList.contains("locked"));
  const nearest = (i, d) => { // i에서 d(+1/-1) 방향으로 고를 수 있는 가장 가까운 항목(없으면 -1). 잠긴 항목은 건너뜀
    for (let j = i; j >= 0 && j < items.length; j += d) if (!locked(j)) return j;
    return -1;
  };
  const hi = (i, kbd) => {
    if (items[cur]) items[cur].classList.remove("on");
    cur = i; const el = items[i]; if (!el) return;
    el.classList.add("on");
    if (kbd) { const t = el.offsetTop, b = t + el.offsetHeight; if (t < menu.scrollTop + 5) menu.scrollTop = t - 5; else if (b > menu.scrollTop + menu.clientHeight - 5) menu.scrollTop = b - menu.clientHeight + 5; }
  };
  function close() {
    if (!menu) return;
    menu.remove(); menu = null; btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey, true); document.removeEventListener("mousedown", onOutside, true);
    window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", close); window.removeEventListener("blur", close);
  }
  function pick(i) {
    if (locked(i)) return; // 내용 없는 항목은 눌러도 아무 일도 없고 메뉴도 그대로 열려 있음
    const o = sel.options[i]; close();
    if (o && sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  function onOutside(e) { if (menu && !menu.contains(e.target) && !btn.parentNode.contains(e.target)) close(); }
  function onScroll(e) { if (menu && !menu.contains(e.target)) close(); }
  function onKey(e) {
    const n = items.length, k = e.key; let i = cur < 0 ? 0 : cur;
    if (k === "Escape") { close(); btn.focus(); }
    else if (k === "Tab") { close(); return; }
    else if (k === "ArrowDown") { const j = nearest(Math.min(n - 1, cur + 1), 1); i = j < 0 ? cur : j; }
    else if (k === "ArrowUp") { const j = nearest(Math.max(0, cur - 1), -1); i = j < 0 ? cur : j; }
    else if (k === "PageDown") { const t = Math.min(n - 1, cur + 8); let j = nearest(t, 1); if (j < 0) j = nearest(t, -1); i = j < 0 ? cur : Math.max(j, cur); }
    else if (k === "PageUp") { const t = Math.max(0, cur - 8); let j = nearest(t, -1); if (j < 0) j = nearest(t, 1); i = j < 0 ? cur : Math.min(j, cur); }
    else if (k === "Home") { const j = nearest(0, 1); i = j < 0 ? cur : j; }
    else if (k === "End") { const j = nearest(n - 1, -1); i = j < 0 ? cur : j; }
    else if (k === "Enter" || k === " ") { if (cur >= 0) pick(cur); }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { // 글자·숫자를 치면 그걸로 시작하는 항목으로 (예: 절 "16")
      clearTimeout(typedT); typed += k.toLowerCase(); typedT = setTimeout(() => { typed = ""; }, 700);
      const j = [...sel.options].findIndex((o, x) => !locked(x) && o.textContent.replace(/^\d+\.\s+/, "").toLowerCase().startsWith(typed));
      if (j >= 0) i = j;
    } else if (k !== "ArrowLeft" && k !== "ArrowRight") return; // ← →는 메뉴가 열려 있는 동안 "절 넘기기" 단축키가 먹지 않게 여기서 삼킴
    e.preventDefault(); e.stopPropagation();
    if (menu && i !== cur) hi(i, true);
  }
  function open() {
    menu = document.createElement("div"); menu.className = "mac-menu"; menu.setAttribute("role", "listbox");
    items = [...sel.options].map((o, i) => {
      const el = document.createElement("div"), t = document.createElement("span");
      const emp = !!(isEmpty && isEmpty(o.value));
      el.className = "mac-item" + (emp ? " empty" : "") + (emp && lock ? " locked" : "");
      el.setAttribute("role", "option"); el.setAttribute("aria-selected", i === sel.selectedIndex ? "true" : "false");
      if (emp && lock) el.setAttribute("aria-disabled", "true");
      if (o.title) el.title = o.title; // 옵션에 title이 있으면 마우스를 올렸을 때 보여줌(구절 미리보기)
      t.textContent = o.textContent; el.appendChild(t);
      el.addEventListener("mousemove", () => { if (cur !== i && !locked(i)) hi(i); });
      el.addEventListener("click", () => pick(i));
      menu.appendChild(el); return el;
    });
    cur = sel.selectedIndex; typed = "";
    if (locked(cur)) cur = nearest(cur, 1) >= 0 ? nearest(cur, 1) : nearest(cur, -1);
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect(), below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 180 && above > below;
    menu.style.minWidth = r.width + "px"; menu.style.maxHeight = Math.min(340, up ? above : below) + "px";
    menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + "px";
    if (up) menu.style.bottom = innerHeight - r.top + 4 + "px"; else menu.style.top = r.bottom + 4 + "px";
    if (items[cur]) menu.scrollTop = items[cur].offsetTop - (menu.clientHeight - items[cur].offsetHeight) / 2;
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", onKey, true); document.addEventListener("mousedown", onOutside, true);
    window.addEventListener("scroll", onScroll, true); window.addEventListener("resize", close); window.addEventListener("blur", close);
  }
  btn.addEventListener("click", () => { if (menu) close(); else open(); });
  btn.addEventListener("keydown", e => { if (!menu && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); } });
  btn.addEventListener("keyup", e => { if (e.key === " ") e.preventDefault(); }); // 스페이스로 메뉴를 고른 직후 버튼이 다시 눌리지 않게
}
macSelect(dbBook);
macSelect(canvasHeightSelect); // 세부 설정의 "캔버스 높이"도 같은 맥 스타일 메뉴로 (값은 숨긴 <select>에 그대로 저장됨)
// ---- 성경 불러오기 전용 선택 창 ----
// 성경 = 검색 + 구약/신약 목록, 장·절 = 번호판. 원래 <select>는 숨겨 둔 값 저장소로만 쓰므로 기존 코드는 그대로 동작한다.
// 성경 → 장 → 절 순서로 고르면 다음 선택 창이 자동으로 열린다. 절은 "시작 → 끝" 두 번 누르면 범위(같은 절을 또 누르면 한 절).
let pkClose = null; // 지금 열려 있는 선택 창을 닫는 함수(한 번에 하나만)
function pkMake(hosts, labelFn, minW, make) {
  const sel = hosts[0], btn = document.createElement("button"), lbl = document.createElement("span");
  btn.type = "button"; btn.className = "mac-sel pk"; lbl.className = "mac-lbl"; btn.appendChild(lbl);
  btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
  btn.style.fontSize = getComputedStyle(sel).fontSize; btn.style.minWidth = minW + "px";
  sel.parentNode.insertBefore(btn, sel); hosts.forEach(h => { h.style.display = "none"; });
  const sync = () => { const t = labelFn(); if (lbl.textContent !== t.text) lbl.textContent = t.text; btn.classList.toggle("ph", !!t.ph); };
  macSyncs.push(sync);
  const mo = new MutationObserver(() => macSyncs.forEach(f => f()));
  hosts.forEach(h => { mo.observe(h, { childList: true, subtree: true, characterData: true }); h.addEventListener("change", () => macSyncs.forEach(f => f())); });
  sync();
  let menu = null, ctl = null;
  function close() {
    if (!menu) return;
    menu.remove(); menu = null; ctl = null; if (pkClose === close) pkClose = null; btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey, true); document.removeEventListener("mousedown", onOut, true);
    window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", close); window.removeEventListener("blur", close);
  }
  function onOut(e) { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) close(); }
  function onScroll(e) { if (menu && !menu.contains(e.target)) close(); }
  function onKey(e) {
    if (!menu) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); btn.focus(); return; }
    if (e.key === "Tab") { close(); return; }
    if (imeBusy(e)) return; // 한글 조합 중 Enter는 글자 확정용
    if (ctl.key(e)) { e.preventDefault(); e.stopPropagation(); }
  }
  function open() {
    if (pkClose) pkClose();
    ctl = make(close); menu = ctl.el; menu.classList.add("mac-menu", "pk-menu");
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect(), below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 260 && above > below;
    menu.style.maxHeight = Math.min(380, up ? above : below) + "px";
    menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + "px";
    if (up) menu.style.bottom = innerHeight - r.top + 4 + "px"; else menu.style.top = r.bottom + 4 + "px";
    btn.setAttribute("aria-expanded", "true"); pkClose = close;
    document.addEventListener("keydown", onKey, true); document.addEventListener("mousedown", onOut, true);
    window.addEventListener("scroll", onScroll, true); window.addEventListener("resize", close); window.addEventListener("blur", close);
    if (ctl.start) ctl.start();
  }
  btn.addEventListener("click", () => { if (menu) close(); else open(); });
  btn.addEventListener("keydown", e => { if (!menu && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); } });
  btn.addEventListener("keyup", e => { if (e.key === " ") e.preventDefault(); });
  btn.pkOpen = open;
  return btn;
}
function pkCenter(sc, el) { if (el) sc.scrollTop = el.offsetTop - (sc.clientHeight - el.offsetHeight) / 2; }
function pkNear(sc, el) { if (!el) return; const t = el.offsetTop, b = t + el.offsetHeight; if (t < sc.scrollTop) sc.scrollTop = t - 4; else if (b > sc.scrollTop + sc.clientHeight) sc.scrollTop = b - sc.clientHeight + 4; }
function pkGrid(n, textOf, lockedOf, titleOf, cols) {
  const g = document.createElement("div"), cells = []; g.className = "pk-grid"; g.style.setProperty("--cols", cols);
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div"); c.className = "pk-cell" + (lockedOf(i) ? " locked" : ""); c.setAttribute("role", "option");
    if (lockedOf(i)) c.setAttribute("aria-disabled", "true");
    c.textContent = textOf(i); const t = titleOf && titleOf(i); if (t) c.title = t; g.appendChild(c); cells.push(c);
  }
  return { g, cells };
}
function pkNav(e, cells, cur, locked) { // 번호판 방향키: { hit, pick, to }
  const k = e.key; let d = 0;
  if (k === "ArrowRight") d = 1; else if (k === "ArrowLeft") d = -1;
  else if (k === "ArrowDown" || k === "ArrowUp") { const cols = getComputedStyle(cells[0].parentNode).gridTemplateColumns.split(" ").length; d = k === "ArrowDown" ? cols : -cols; }
  else if (k === "Enter" || k === " ") return { hit: true, pick: true };
  else return { hit: false };
  let j = cur + d; while (j >= 0 && j < cells.length && locked(j)) j += d; // 잠긴 칸은 건너뜀
  return { hit: true, to: j >= 0 && j < cells.length ? j : -1 };
}
function pkBookMenu(close, after, C = pkImpCtx()) {
  const el = document.createElement("div"), inp = document.createElement("input"), sc = document.createElement("div"), none = document.createElement("div");
  inp.className = "pk-search"; inp.type = "text"; inp.placeholder = "책 이름 검색  (요한 · John · 43)"; inp.setAttribute("autocomplete", "off"); inp.spellcheck = false;
  sc.className = "pk-scroll"; none.className = "pk-none"; none.textContent = "찾는 책이 없어요"; none.hidden = true;
  el.style.width = "min(300px, 92vw)"; el.append(inp, sc); sc.appendChild(none);
  const rows = [], heads = [];
  let lastG = "";
  [...C.book.options].forEach((o, i) => {
    const b = BibleDB.book(o.value) || {}, no = +b.no > 0 ? +b.no : i + 1, g = no <= 39 ? "구약" : "신약";
    if (g !== lastG) { const h = document.createElement("div"); h.className = "pk-group"; h.textContent = g; h.dataset.g = g; sc.insertBefore(h, none); heads.push(h); lastG = g; }
    const r = document.createElement("div"), a = document.createElement("span"), k = document.createElement("span"), n = document.createElement("span");
    r.className = "mac-item pk-book"; r.setAttribute("role", "option"); r.setAttribute("aria-selected", i === C.book.selectedIndex ? "true" : "false");
    a.className = "pk-no"; a.textContent = no; k.className = "pk-ko"; k.textContent = b.ko || o.value; n.className = "pk-en"; n.textContent = b.en || "";
    r.append(a, k, n); r.dataset.g = g; sc.insertBefore(r, none);
    const hay = ((b.ko || "") + " " + (b.en || o.value) + " " + no).toLowerCase();
    rows.push({ el: r, i, hay, flat: hay.replace(/\s+/g, ""), on: true });
    r.addEventListener("mousemove", () => { const j = vis().findIndex(x => x.el === r); if (j >= 0 && j !== cur) mark(j); });
    r.addEventListener("click", () => pick(rows.findIndex(x => x.el === r)));
  });
  const vis = () => rows.filter(r => r.on);
  let cur = 0, shown = [];
  function mark(j, scroll) { const v = vis(); if (v[cur]) v[cur].el.classList.remove("on"); cur = j; if (v[j]) { v[j].el.classList.add("on"); if (scroll) pkNear(sc, v[j].el); } }
  function filter() {
    const q = inp.value.trim().toLowerCase(), qf = q.replace(/\s+/g, "");
    rows.forEach(r => { r.on = !q || r.hay.includes(q) || r.flat.includes(qf); r.el.hidden = !r.on; r.el.classList.remove("on"); });
    heads.forEach(h => { h.hidden = !rows.some(r => r.on && r.el.dataset.g === h.dataset.g); });
    none.hidden = vis().length > 0; cur = 0; mark(0, true); if (!q) pkCenter(sc, rows[C.book.selectedIndex].el);
  }
  function pick(ri) {
    const r = rows[ri]; if (!r) return; const o = C.book.options[r.i];
    close();
    if (o && C.book.value !== o.value) { C.book.value = o.value; C.book.dispatchEvent(new Event("change", { bubbles: true })); }
    after();
  }
  inp.addEventListener("input", filter);
  return {
    el,
    start() { inp.focus(); const v = vis(), j = v.findIndex(r => r.i === C.book.selectedIndex); mark(j < 0 ? 0 : j); pkCenter(sc, v[j < 0 ? 0 : j].el); },
    key(e) {
      const v = vis();
      if (e.key === "ArrowDown") { if (v.length) mark(Math.min(v.length - 1, cur + 1), true); return true; }
      if (e.key === "ArrowUp") { if (v.length) mark(Math.max(0, cur - 1), true); return true; }
      if (e.key === "Enter") { if (v[cur]) pick(rows.indexOf(v[cur])); return true; }
      return false; // 나머지 키는 검색창에 그대로 입력
    }
  };
}
function pkChapMenu(close, after, C = pkImpCtx()) {
  const n = C.chap.options.length, empty = i => dbChapSeen.get(C.book.value + "|" + (i + 1)) === 0;
  const lockE = C.lockEmpty !== false, locked = i => lockE && empty(i); // lockEmpty:false = 내용 없는 장도 고를 수 있음(흐리게만 보임)
  const el = document.createElement("div"), sc = document.createElement("div"), { g, cells } = pkGrid(n, i => String(i + 1), locked, null, C.cols || 7);
  if (!lockE) cells.forEach((c, i) => c.classList.toggle("dim", empty(i)));
  sc.className = "pk-scroll"; sc.appendChild(g); el.appendChild(sc); el.style.width = "min(316px, 92vw)";
  let cur = Math.max(0, C.chap.selectedIndex);
  if (cells[cur]) cells[cur].classList.add("sel");
  const mark = (j, scroll) => { if (cells[cur]) cells[cur].classList.remove("cur"); cur = j; cells[j].classList.add("cur"); if (scroll) pkNear(sc, cells[j]); };
  const pick = j => {
    if (locked(j)) return;
    close(); const v = String(j + 1);
    if (C.chap.value !== v) { C.chap.value = v; C.chap.dispatchEvent(new Event("change", { bubbles: true })); }
    after();
  };
  g.addEventListener("mouseover", e => { const c = e.target.closest(".pk-cell"), j = cells.indexOf(c); if (c && !locked(j)) mark(j); });
  g.addEventListener("click", e => { const c = e.target.closest(".pk-cell"); if (c) pick(cells.indexOf(c)); });
  return {
    el,
    start() { mark(cur); pkCenter(sc, cells[cur]); },
    key(e) { const r = pkNav(e, cells, cur, locked); if (!r.hit) return false; if (r.pick) pick(cur); else if (r.to >= 0) mark(r.to, true); return true; }
  };
}
// 번호판에서 하나만 고르는 메뉴 (성경 DB 상단바의 절). 항목 글자 = 드롭다운 항목 그대로(✎·✓ 표시 포함), 내용 없는 절은 흐리게(고를 수는 있음)
function pkOneMenu(close, C) {
  const el = document.createElement("div"), lg = document.createElement("div"), sc = document.createElement("div"), opts = [...C.sel.options];
  lg.className = "pk-legend"; lg.textContent = C.legend; sc.className = "pk-scroll"; el.style.width = "min(352px, 92vw)"; el.append(lg, sc);
  const { g, cells } = pkGrid(opts.length, i => opts[i].textContent, () => false, null, C.cols || 6);
  cells.forEach((c, i) => c.classList.toggle("dim", C.dim(+opts[i].value)));
  sc.appendChild(g);
  let cur = Math.max(0, C.sel.selectedIndex);
  if (cells[cur]) cells[cur].classList.add("sel");
  const mark = (j, scroll) => { if (cells[cur]) cells[cur].classList.remove("cur"); cur = j; cells[j].classList.add("cur"); if (scroll) pkNear(sc, cells[j]); };
  const pick = j => { const o = opts[j]; close(); if (o && C.sel.value !== o.value) { C.sel.value = o.value; C.sel.dispatchEvent(new Event("change", { bubbles: true })); } };
  g.addEventListener("mouseover", e => { const c = e.target.closest(".pk-cell"), j = cells.indexOf(c); if (c) mark(j); });
  g.addEventListener("click", e => { const c = e.target.closest(".pk-cell"); if (c) pick(cells.indexOf(c)); });
  return {
    el,
    start() { mark(cur); pkCenter(sc, cells[cur]); },
    key(e) { if (!cells.length) return false; const r = pkNav(e, cells, cur, () => false); if (!r.hit) return false; if (r.pick) pick(cur); else if (r.to >= 0) mark(r.to, true); return true; }
  };
}
function pkVerseMenu(close, C = pkImpCtx()) {
  const el = document.createElement("div"), top = document.createElement("div"), hint = document.createElement("span"), all = document.createElement("button"), sc = document.createElement("div");
  top.className = "pk-top"; sc.className = "pk-scroll"; all.type = "button"; all.className = "pk-all"; all.textContent = C.allText;
  el.style.width = "min(352px, 92vw)"; top.append(hint, all); el.append(top, sc);
  const cs = C.cells(), n = cs.length;
  if (!n) {
    hint.textContent = C.unit + " 선택"; all.hidden = true;
    const m = document.createElement("div"); m.className = "pk-none"; m.textContent = C.loaded() ? C.emptyMsg : "불러오는 중이에요…"; sc.appendChild(m);
    return { el, key: () => false };
  }
  const locked0 = i => cs[i].item < 0, taken = i => !!cs[i].taken, locked = i => locked0(i) || taken(i); // taken = 이미 화면에 있거나 추가 목록에 담긴 절(파란색, 누를 수 없음)
  const { g, cells } = pkGrid(n, i => cs[i].label, locked0, i => cs[i].title, 6);
  cells.forEach((c, i) => {
    if (cs[i].dim) c.classList.add("dim"); // 내용 없는 절은 흐리게만(고를 수는 있음) — 성경 DB 편집용
    if (taken(i)) { c.classList.add("taken"); c.setAttribute("aria-disabled", "true"); c.title = "이미 추가된 절이에요"; }
  });
  if (cells.some((c, i) => taken(i))) { const lg = document.createElement("div"); lg.className = "pk-legend pk-legend-taken"; lg.textContent = "파란색 = 이미 추가된 절"; el.insertBefore(lg, sc); }
  sc.appendChild(g);
  let anchor = -1, hov = -1, cur = -1;
  const range = () => { if (anchor >= 0) { const h = hov >= 0 ? hov : anchor; return [Math.min(anchor, h), Math.max(anchor, h)]; } return C.range() || [-1, -1]; };
  function paint() {
    const [a, b] = range();
    cells.forEach((c, i) => { c.classList.toggle("sel", i === a || i === b); c.classList.toggle("rng", i > a && i < b); c.classList.toggle("cur", i === cur); });
    hint.textContent = anchor < 0 ? (C.unit === "절" ? "시작 절을 누르세요" : "시작 슬라이드를 누르세요") : (C.unit === "절" ? "끝 절을 누르세요 (같은 절 = 한 절만)" : "끝 슬라이드를 누르세요 (같은 슬라이드 = 한 장만)");
  }
  function pick(i) {
    if (locked(i)) return;
    if (anchor < 0) { anchor = i; hov = -1; C.from.value = String(i); C.to.value = String(i); C.update(); paint(); return; }
    C.from.value = String(Math.min(anchor, i)); C.to.value = String(Math.max(anchor, i)); C.update(); close();
    if (C.commit) C.commit(); // 끝 절까지 고른 뒤에만 적용(성경 DB 화면은 고를 때마다 다시 불러오지 않게)
  }
  g.addEventListener("mouseover", e => { const c = e.target.closest(".pk-cell"), i = cells.indexOf(c); if (!c || locked(i)) return; cur = i; if (anchor >= 0) hov = i; paint(); });
  g.addEventListener("click", e => { const c = e.target.closest(".pk-cell"); if (c) pick(cells.indexOf(c)); });
  all.addEventListener("click", () => { close(); C.all(); });
  return {
    el,
    start() {
      const r = C.range(), a = r ? r[0] : -1; cur = a >= 0 ? a : cs.findIndex((c, i) => !locked(i));
      paint(); pkCenter(sc, cells[cur]);
    },
    key(e) {
      if (cur < 0) return false;
      const r = pkNav(e, cells, cur, locked); if (!r.hit) return false;
      if (r.pick) pick(cur); else if (r.to >= 0) { cur = r.to; if (anchor >= 0) hov = cur; paint(); pkNear(sc, cells[cur]); }
      return true;
    }
  };
}
// ---- 성경 DB 상단바: 장·절을 한 줄 목록 대신 번호판(박스)으로 한눈에 ----
// 장(7칸) · 절(6칸). 내용 없는 장·절은 흐리게만 보이고 그래도 고를 수 있어요(새로 입력하려고). 절의 ✎ 고침 / ✓ 보냄 표시도 그대로 보여요.
pkMake([dbChap], () => ({ text: dbChap.value || "-" }), 52, close => pkChapMenu(close, () => {}, { book: dbBook, chap: dbChap, lockEmpty: false, cols: 7 })).title = "장 고르기";
// 절: 복사 창과 같은 선택기. 시작 절 → 끝 절을 차례로 누르면(같은 절을 또 누르면 한 절) 그 범위가 한 화면에 올라오고, [장 전체]로 한 번에 고를 수도 있다.
// 선택기가 건드리는 값(from/to)은 임시 번호일 뿐이고, 끝 절까지 확정(commit)했을 때만 dbGo로 다시 불러온다.
const dbVPick = { f: 0, t: 0 };
const dbVCtx = {
  from: { get value() { return String(dbVPick.f); }, set value(x) { dbVPick.f = +x; } },
  to: { get value() { return String(dbVPick.t); }, set value(x) { dbVPick.t = +x; } },
  cells: () => [...dbVerse.options].map((o, i) => ({ label: o.textContent, item: i, title: "", dim: !dbVerseHas.has(+o.value) })), // 글자 = ✎ 고침 / ✓ 보냄 표시 포함, 내용 없는 절은 흐리게
  loaded: () => !!dbCur,
  range: () => { const s = dbSelNow(); return [s.v - 1, s.vEnd - 1]; },
  update: () => { /* 고르는 중에는 화면을 다시 불러오지 않음 */ },
  commit: () => { const s = dbSelNow(), a = Math.min(dbVPick.f, dbVPick.t) + 1, b = Math.max(dbVPick.f, dbVPick.t) + 1; dbGo({ en: s.en, ch: s.ch, v: a, vEnd: b }); },
  all: () => { const s = dbSelNow(); dbGo({ en: s.en, ch: s.ch, v: 1, vEnd: dbVerse.options.length }); },
  unit: "절", allText: "장 전체", emptyMsg: "이 장의 절 목록을 아직 불러오지 못했어요."
};
pkMake([dbVerse], () => {
  const o = dbVerse.options[dbVerse.selectedIndex]; if (!o) return { text: "-" };
  if (dbToV > +o.value) return { text: o.value + " ~ " + dbToV };
  return { text: o.textContent };
}, 60, close => pkVerseMenu(close, dbVCtx)).title = dbVerse.title;
// ---- 성경 DB 모드: [＋ 구절 추가] — 다른 성경 · 같은 권의 다른 장 · 떨어진 절을 같은 화면에 더 불러오기 ----
// 성경 → 장 → 절(시작 → 끝, 또는 장 전체)을 고르면 "지금 고른 구절 바로 뒤"에 새 범위로 들어간다. 이미 올라온 절과 겹치면 막는다.
// 올라온 범위들은 위쪽 알약으로 보이고, 알약을 누르면 위쪽 성경·장·절 칸이 그 범위 기준으로 바뀐다. 저장은 절마다 성경|장|절 키로 따로 된다.
const daOverlay = document.getElementById("daOverlay"), daBook = document.getElementById("daBook"), daChap = document.getElementById("daChap"),
      daFrom = document.getElementById("daFrom"), daTo = document.getElementById("daTo"), daSum = document.getElementById("daSum"), daGo = document.getElementById("daGo"),
      daAdd = document.getElementById("daAdd"), daTray = document.getElementById("daTray");
let daSeq = 0, daInited = false, daLoaded = false, daLoading = null, daCells = [];
let daQueue = []; // 이 창에서 "목록에 담아" 둔 새 구절 범위들(아직 화면에는 안 올라감). [추가하기]를 누르면 한꺼번에 올라간다
function daFill(sel, placeholder) {
  sel.textContent = "";
  const ph = document.createElement("option"); ph.value = ""; ph.textContent = placeholder; sel.appendChild(ph);
  daCells.forEach((c, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = c.label; if (c.title) o.title = c.title; sel.appendChild(o); });
  sel.value = "";
}
function daRange() { // 고른 범위 [처음 번호, 끝 번호] (시작 절을 안 골랐으면 null)
  if (daFrom.value === "" || !daCells[+daFrom.value]) return null;
  const a = +daFrom.value, b = daTo.value === "" || !daCells[+daTo.value] ? a : +daTo.value;
  return [Math.min(a, b), Math.max(a, b)];
}
function daSeg() { const r = daRange(); return r ? { en: daBook.value, ch: +daChap.value || 1, v: r[0] + 1, vEnd: r[1] + 1 } : null; }
// 화면에 올라갈 전체 목록: 담아 둔 구절들(+ 지금 고른 구절)이 지금 고른 범위 바로 뒤에 순서대로 들어간다
function daList(seg) { const l = dbSegs.slice(); l.splice(dbActive + 1, 0, ...daQueue, ...(seg ? [seg] : [])); return l; }
// 지금 장의 v절이 이미 화면에 있거나 담아 둔 목록에 있는지(파란색으로 표시)
function daTaken(v) { const en = daBook.value, ch = +daChap.value || 1; return dbSegs.concat(daQueue).some(s => s.en === en && s.ch === ch && v >= s.v && v <= s.vEnd); }
function daChip(text, cls, onX) {
  const c = document.createElement("span"); c.className = "seg-chip " + cls;
  const b = document.createElement("button"); b.type = "button"; b.className = "seg-chip-b"; b.textContent = text; b.tabIndex = -1; b.style.pointerEvents = "none"; c.appendChild(b);
  if (onX) { const x = document.createElement("button"); x.type = "button"; x.className = "seg-chip-x"; x.textContent = "✕"; x.title = "목록에서 빼요"; x.setAttribute("aria-label", "목록에서 빼요"); x.addEventListener("click", onX); c.appendChild(x); b.style.pointerEvents = ""; b.tabIndex = 0; b.style.cursor = "default"; }
  return c;
}
function daRenderTray() { // 이미 올라온 구절(파란색) + 이 창에서 담아 둔 구절(✕로 뺄 수 있음)
  daTray.textContent = "";
  const row = (label, chips) => {
    const r = document.createElement("div"); r.className = "dbsegs da-row";
    const l = document.createElement("span"); l.className = "dbsegs-l"; l.textContent = label; r.appendChild(l);
    chips.forEach(c => r.appendChild(c)); daTray.appendChild(r);
  };
  row("이미 불러온 구절", dbSegs.map(s => daChip(dbSegName(s), "loaded")));
  if (daQueue.length) row("추가할 구절 " + daQueue.length + "개", daQueue.map((s, i) => daChip(dbSegName(s), "queued", () => { daQueue.splice(i, 1); daUpdateSum(); })));
}
function daUpdateSum() {
  macSyncs.forEach(f => f());
  daRenderTray();
  const seg = daSeg(), n = daQueue.length;
  let msg = "", segOk = false;
  if (!daLoaded) msg = "불러오는 중...";
  else if (!seg) msg = n ? "더 담거나 [추가하기]를 눌러 한꺼번에 불러오세요." : "절을 골라 주세요.";
  else { const bad = dbSegsCheck(daList(seg)); if (bad) msg = bad; else { msg = dbSegName(seg) + " · " + (seg.vEnd - seg.v + 1) + "절"; segOk = true; } }
  daSum.textContent = msg;
  daAdd.disabled = !segOk;
  const total = n + (segOk ? 1 : 0);
  daGo.disabled = total === 0 || !!dbSegsCheck(daList(segOk ? seg : null));
  daGo.textContent = total > 1 ? total + "개 한꺼번에 추가" : "추가하기";
}
async function daLoad() {
  const my = ++daSeq, en = daBook.value, ch = +daChap.value || 1;
  daCells = []; daLoaded = false; daFill(daFrom, "시작 절 선택"); daFill(daTo, "끝 절 선택"); daUpdateSum();
  try { await BibleDB.load(en, ch); } catch (e) { /* 장 파일이 없으면 초안만 보임 */ }
  if (my !== daSeq) return; // 그 사이 다른 장을 골랐으면 이 결과는 버림
  const top = Math.max(dbVerseMax({ en, ch }), 1), has = dbHasSet(en, ch);
  for (let v = 1; v <= top; v++) daCells.push({ label: String(v), item: v - 1, title: has.has(v) ? "" : "아직 데이터가 없어요", dim: !has.has(v) }); // 내용 없는 절도 고를 수 있음(새로 입력하려고)
  daFill(daFrom, "시작 절 선택"); daFill(daTo, "끝 절 선택");
  dbChapSeen.set(en + "|" + ch, has.size);
  daLoaded = true; daUpdateSum();
}
function daInit() {
  if (daInited) return; daInited = true;
  BibleDB.books.forEach(b => { const o = document.createElement("option"); o.value = b.en; o.textContent = b.no + ". " + b.ko + " (" + b.en + ")"; daBook.appendChild(o); });
  const ctx = { book: daBook, chap: daChap, lockEmpty: false, cols: 7 };
  let chapBtn = null, verseBtn = null;
  const afterChap = () => { const seq = daSeq; Promise.resolve(daLoading).then(() => { if (seq === daSeq && daOverlay.classList.contains("open") && !pkClose) verseBtn.pkOpen(); }); };
  pkMake([daBook], () => { const b = daBook.value ? BibleDB.book(daBook.value) : null; return { text: b ? bkName(b) : "성경 선택", ph: !b }; }, 118, close => pkBookMenu(close, () => chapBtn.pkOpen(), ctx)).title = "성경 고르기 (이름·영어·번호로 검색)";
  chapBtn = pkMake([daChap], () => ({ text: daChap.value ? daChap.value + "장" : "장", ph: !daChap.value }), 64, close => pkChapMenu(close, afterChap, ctx)); chapBtn.title = "장 고르기";
  const vctx = { book: null, chap: null, from: daFrom, to: daTo, cells: () => daCells.map(c => ({ ...c, taken: daTaken(c.item + 1) })), loaded: () => daLoaded, range: daRange, update: daUpdateSum,
    all: () => { if (!daCells.length) return; daFrom.value = "0"; daTo.value = String(daCells.length - 1); daUpdateSum(); }, unit: "절", allText: "장 전체", emptyMsg: "이 장의 절 목록을 아직 불러오지 못했어요." };
  verseBtn = pkMake([daFrom, daTo], () => {
    const r = daRange();
    if (!r) return { text: daLoaded || !daSeq ? "절 선택" : "불러오는 중…", ph: true };
    const a = daCells[r[0]].label, b = daCells[r[1]].label;
    return { text: a === b ? a + "절" : a + " ~ " + b + "절" };
  }, 108, close => pkVerseMenu(close, vctx)); verseBtn.title = "절 고르기 (시작 절 → 끝 절)";
  daBook.addEventListener("change", () => { fillNum(daChap, BibleDB.book(daBook.value).chapters, 1); daLoading = daLoad(); });
  daChap.addEventListener("change", () => { daLoading = daLoad(); });
  daFrom.addEventListener("change", () => { // 시작 절을 고르면 끝 절이 비었거나 시작보다 앞일 때 같은 절로 맞춤(= 한 절만)
    if (daFrom.value === "") daTo.value = "";
    else if (daTo.value === "" || +daTo.value < +daFrom.value) daTo.value = daFrom.value;
    daUpdateSum();
  });
  daTo.addEventListener("change", () => { if (daTo.value !== "" && (daFrom.value === "" || +daTo.value < +daFrom.value)) daFrom.value = daTo.value; daUpdateSum(); });
  daAdd.addEventListener("click", () => { // 지금 고른 구절을 목록에 담고, 절 선택만 비워서 이어서 다음 구절을 고르게 함(창은 닫지 않음)
    const seg = daSeg(); if (!seg || dbSegsCheck(daList(seg))) return;
    daQueue.push(seg);
    daFrom.value = ""; daTo.value = "";
    daUpdateSum();
    if (verseBtn) verseBtn.focus();
  });
  daGo.addEventListener("click", () => { // 담아 둔 구절 전부(+ 지금 고른 구절이 있으면 그것도)를 한꺼번에 화면에 올림
    if (!dbCur) return;
    const seg = daSeg(), segOk = !!seg && !dbSegsCheck(daList(seg));
    const segs = daList(segOk ? seg : null), bad = dbSegsCheck(segs);
    if (segs.length === dbSegs.length) return;
    if (bad) { showToast(bad, true); return; }
    daQueue = [];
    daOverlay.classList.remove("open");
    dbGo({ segs, active: dbActive + 1 });
  });
  const close = () => daOverlay.classList.remove("open");
  document.getElementById("daClose").addEventListener("click", close);
  daOverlay.addEventListener("click", e => { if (e.target === daOverlay) close(); });
}
document.getElementById("dbAddSeg").addEventListener("click", e => {
  if (e.detail > 0) e.currentTarget.blur();
  if (!window.BibleDB) { showToast("bibleDB 폴더를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요.", true); return; }
  if (!dbCur) { showToast("절을 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.", true); return; }
  daInit();
  daQueue = daQueue.filter((s, i, arr) => !dbSegs.some(o => dbSegHit(o, s)) && !arr.slice(0, i).some(o => dbSegHit(o, s))); // 닫았다 다시 열었을 때: 그 사이 화면에 올라온 절과 겹치는 것은 뺌
  const a = dbSegs[dbActive] || dbSelNow();
  daBook.value = a.en; fillNum(daChap, BibleDB.book(a.en).chapters, a.ch);
  daOverlay.classList.add("open"); daLoading = daLoad();
});
macSyncs.push(() => { if (appMode === "db" && dbCur) { dbRenderSegs(); dbUpdateVerseChips(); } }); // 화면 언어를 바꾸면 알약·절 표시 글자도 새 언어로
// ---- 데이터 ▾ → [작업 내용 지우기] (성경 DB 모드) ----
// 이 브라우저에 저장된 "내가 고친 구절"(DB 초안 = DB_KEY)만 지우고, 화면은 원래(장 파일) 내용으로 다시 불러온다.
// 슬라이드 만들기 모드의 원고·백업·설정·번역 캐시는 건드리지 않고, 반대로 슬라이드 모드의 [작업 내용 지우기]·[모든 데이터 삭제]도 DB 초안은 지우지 않는다(서로 영향 없음).
// 마지막에 보던 구절(DB_SEL_KEY)은 그대로 둬서 같은 자리에서 이어서 볼 수 있다. 홈페이지에 배포된 원본(bibleDB 폴더)은 읽기만 한다.
async function dbResetWork() {
  if (appMode !== "db") return;
  if (!window.BibleDB || !dbCur) { showToast("절을 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.", true); return; }
  saveDbNow(); // 화면에서 막 고치던 글도 세어 보도록 먼저 저장
  const o = dbRead(), keys = Object.keys(o.d), unsent = keys.filter(k => dbIsUnsent(o, k)).length;
  if (!keys.length && !dbBroken) { showToast("지울 수정 내용이 없어요."); return; }
  const msg = "성경 DB에서 내가 고친 구절 " + keys.length + "개(아직 안 보낸 것 " + unsent + "개)를 모두 지우고 원래 내용으로 되돌려요.\n\n· 슬라이드 만들기 모드의 원고·백업·설정은 그대로예요.\n· 지운 내용은 되돌릴 수 없어요. 아직 안 보낸 수정이 있으면 먼저 DB 코드 복사로 보내 두세요.\n\n계속할까요?";
  if (!(await macConfirm(msg, { title: "작업 내용 지우기", ok: "지우기", danger: true }))) return;
  const segs = dbSegs.map(s => ({ en: s.en, ch: s.ch, v: s.v, vEnd: s.vEnd })), active = dbActive;
  try { localStorage.removeItem(DB_KEY); } catch (e) { showToast("지우지 못했어요. 브라우저 저장소를 쓸 수 없는 상태예요.", true); return; }
  dbBroken = false;
  dbCur = null; // 화면에 남은 고친 글이 다시 초안으로 저장되지 않게(다시 불러오는 동안 저장 멈춤)
  await dbGo({ segs, active });
  showToast("고친 구절 " + keys.length + "개를 지우고 원래 내용으로 되돌렸어요.");
}
document.getElementById("dbResetBtn").addEventListener("click", dbResetWork);
// ---- 슬라이드 만들기 모드에서 성경 DB 구절 불러오기 ----
// 성경·장·시작 절·끝 절을 드롭다운으로 고른다(처음엔 아무것도 선택돼 있지 않음). 시작 절만 고르면 그 절 하나, 끝 절까지 고르면 그 사이 전부.
// 한 절이 여러 페이지면 드롭다운에는 "16 (a)", "16 (b)"로 나뉘어 보이지만, 조각에 붙는 표시는 "16a"로 저장하고 슬라이드에는 숫자(16)만 보인다(refDisplay).
// 내용이 없는 절은 드롭다운에서 흐리게 보이고 고를 수 없다. 고른 페이지는 원고 맨 뒤(기본) 또는 선택한 조각 바로 아래에 조각으로 들어간다(언어별 칸에 각 언어 글이 들어가고, N번 조각 = N번 슬라이드). 기존 원고는 그대로 두고, 넣기 직전 상태는 자동 백업.
const impOverlay = document.getElementById("impOverlay"), impBook = document.getElementById("impBook"), impChap = document.getElementById("impChap"),
      impFrom = document.getElementById("impFrom"), impTo = document.getElementById("impTo"), impAllBtn = document.getElementById("impAll"),
      impSum = document.getElementById("impSum"), impGo = document.getElementById("impGo"), impPrev = document.getElementById("impPrev");
let impSeq = 0, impInited = false, impSel = null, impLoading = null, impLoaded = false;
let impItems = [];  // 가져올 수 있는 페이지들(내용 있음): { page, ref, label }
let impCells = [];  // 드롭다운 항목 전체(내용 없는 절 포함), 순서대로: { label, item(impItems 번호, 없으면 -1), title }
const pageHas = p => !!(p && (p.Kor || p.Chn || p.Eng || p.Ind));
const impMark = i => i < 26 ? String.fromCharCode(97 + i) : String(i + 1);                    // a, b, c … (26쪽을 넘으면 숫자)
const impLabel = (v, i, n) => n < 2 ? String(v) : v + (i < 26 ? impMark(i) : "-" + (i + 1));  // 조각에 저장하는 표시: 16a
const impShow = (v, i, n) => n < 2 ? String(v) : v + " (" + impMark(i) + ")";                 // 드롭다운에 보이는 표시: 16 (a)
const impIsEmpty = val => val !== "" && !!impCells[+val] && impCells[+val].item < 0;
function impFill(sel, placeholder) {
  sel.textContent = "";
  const ph = document.createElement("option"); ph.value = ""; ph.textContent = placeholder; sel.appendChild(ph);
  impCells.forEach((c, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = c.label; if (c.title) o.title = c.title; sel.appendChild(o); });
  sel.value = "";
}
function impRange() { // 고른 범위 [처음 항목 번호, 끝 항목 번호] (시작 절을 안 골랐으면 null)
  if (impFrom.value === "") return null;
  const a = +impFrom.value, b = impTo.value === "" ? a : +impTo.value;
  return [Math.min(a, b), Math.max(a, b)];
}
function impPicked() {
  const r = impRange();
  return r ? impCells.slice(r[0], r[1] + 1).filter(c => c.item >= 0).map(c => impItems[c.item]) : [];
}
function impUpdateSum() {
  macSyncs.forEach(f => f()); // 코드로 값을 바꿨을 때 드롭다운 글자도 맞춤
  const picks = impPicked();
  if (!impItems.length) return;
  if (!picks.length) { impSum.textContent = impRange() ? "고른 범위에 내용이 있는 절이 없어요." : "절을 골라 주세요."; impPrev.textContent = ""; impGo.disabled = true; return; }
  const first = picks[0].label, last = picks[picks.length - 1].label, bk = BibleDB.book(impBook.value), nm = bkName(bk) || impBook.value;
  impSum.textContent = nm + " " + impChap.value + ":" + (picks.length > 1 ? first + " ~ " + last : first) + " · " + picks.length + "개 조각";
  const p0 = picks[0].page, tx = (p0.Kor || p0.Eng || p0.Chn || p0.Ind || "").replace(/\s+/g, " ").trim();
  impPrev.textContent = tx.length > 72 ? tx.slice(0, 72) + "…" : tx; // 첫 절 미리보기
  impGo.disabled = false;
}
async function impLoad() {
  const my = ++impSeq, en = impBook.value, ch = +impChap.value || 1;
  impSel = { en, ch }; impItems = []; impCells = []; impLoaded = false; impSum.textContent = "불러오는 중..."; impPrev.textContent = ""; impGo.disabled = true; impAllBtn.disabled = true;
  impFill(impFrom, "시작 절 선택"); impFill(impTo, "끝 절 선택"); macSyncs.forEach(f => f());
  try { await BibleDB.load(en, ch); } catch (e) { /* 장 파일이 없으면 초안만 보임 */ }
  if (my !== impSeq) return; // 그 사이 다른 장을 골랐으면 이 결과는 버림
  const d = dbRead().d, by = new Map(), pre = en + "|" + ch + "|";
  BibleDB.rows(en, ch).forEach(r => { if (!by.has(r.Verse)) by.set(r.Verse, []); by.get(r.Verse).push({ Kor: r.Kor || "", Chn: r.Chn || "", Eng: r.Eng || "", Ind: r.Ind || "", ChnVerseEnd: r.ChnVerseEnd || 0 }); });
  Object.keys(d).forEach(k => { const v = k.startsWith(pre) ? parseInt(k.slice(pre.length), 10) : 0; if (v > 0) by.set(v, d[k] || []); }); // 초안이 있으면 초안이 우선(dbSource와 같은 규칙)
  let top = 0; try { top = +BibleDB.verses(en, ch) || 0; } catch (e) { /* 절 수를 모르면 내용이 있는 마지막 절까지만 */ }
  by.forEach((pgs, v) => { if (pgs.some(pageHas)) top = Math.max(top, v); });
  let filled = 0;
  for (let v = 1; v <= top; v++) {
    const pgs = (by.get(v) || []).filter(pageHas);
    if (!pgs.length) { impCells.push({ label: String(v), item: -1, title: "아직 데이터가 없어요" }); continue; }
    filled++;
    pgs.forEach((p, i) => {
      const rangeEnd = p.ChnVerseEnd > v ? p.ChnVerseEnd : 0;
      const label = rangeEnd ? v + "-" + rangeEnd : impShow(v, i, pgs.length);
      const refLabel = rangeEnd ? v + "~" + rangeEnd : impLabel(v, i, pgs.length);
      const item = impItems.push({ page: p, ref: bibleRefKey(en, ch, refLabel), label }) - 1;
      impCells.push({ label, item, title: (p.Kor || p.Eng || p.Chn || p.Ind).replace(/\s+/g, " ").slice(0, 80) });
    });
  }
  impFill(impFrom, "시작 절 선택"); impFill(impTo, "끝 절 선택");
  dbChapSeen.set(en + "|" + ch, filled);
  impLoaded = true;
  if (impItems.length) { impAllBtn.disabled = false; impSum.textContent = "절을 골라 주세요."; impUpdateSum(); macSyncs.forEach(f => f()); }
  else { impSum.textContent = "이 장에는 아직 불러올 내용이 없어요."; impGo.disabled = true; }
}
// ---- 넣을 위치: "원고 맨 뒤"(기본) · "선택한 조각 아래" ----
// 기준 조각 = 눌러 고른 성경 줄 → Ctrl/⌘+클릭으로 고른 조각 → 마지막으로 커서가 있던 조각 순서. 줄(슬라이드) 단위로 그 줄 바로 아래에 들어간다.
let impAnchor = null, impLastBox = null, impWhere = "end";
left.addEventListener("focusin", e => { const b = e.target.closest && e.target.closest(".box"); if (b) impLastBox = b; });
function impFindAnchor() { // {box, explicit}: explicit = 사용자가 줄을 일부러 골라 둔 경우
  if (refSelBox && refSelBox.isConnected) return { box: refSelBox, explicit: true };
  const pk = [...picked].filter(b => b.isConnected);
  if (pk.length) { const rows = buildRowMap(); pk.sort((x, y) => rowIndexOf(x, rows) - rowIndexOf(y, rows)); return { box: pk[pk.length - 1], explicit: true }; }
  if (impLastBox && impLastBox.isConnected && left.contains(impLastBox)) return { box: impLastBox, explicit: false };
  return { box: null, explicit: false };
}
function impWhereSync() {
  const seg = document.getElementById("impWhereSeg"), aft = seg.querySelector('[data-where="after"]');
  const i = impAnchor && impAnchor.isConnected ? rowIndexOf(impAnchor) : -1;
  aft.disabled = i < 0;
  aft.textContent = i < 0 ? "선택한 조각 아래" : "슬라이드 " + (i + 1) + " 아래";
  aft.title = i < 0 ? "원고에서 조각을 하나 고르거나 커서를 두면 그 아래에 넣을 수 있어요" : "슬라이드 " + (i + 1) + " 바로 아래에 넣어요";
  if (i < 0) impWhere = "end";
  seg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.where === impWhere));
  impGo.textContent = impWhere === "after" ? "선택한 조각 아래에 넣기" : "원고 뒤에 넣기";
}
// 줄 i 아래에 넣을 자리: s = 몇 번째 구간(성경 줄로 나뉜 덩어리), pre = 그 구간에서 앞에 남길 줄 수
function impTarget(rows, i) {
  let s = 0, start = 0;
  for (let k = 0; k < i; k++) if (rows[k].anchor) { s++; start = k + 1; }
  if (rows[i].anchor) return { s: s + 1, pre: 0 };
  return { s, pre: i - start + 1 };
}
function impInsertIndex(refs, t) { // 한 언어 칸(조각 목록)에서 실제로 끼워 넣을 위치
  const anc = []; refs.forEach((r, k) => { if (r) anc.push(k); });
  const start = t.s === 0 ? 0 : (anc[t.s - 1] === undefined ? refs.length : anc[t.s - 1] + 1);
  if (t.pre === 0) return start;
  const end = anc[t.s] === undefined ? refs.length : anc[t.s];
  return Math.min(start + t.pre, end);
}
function impImport() {
  const pickItems = impPicked(), picks = pickItems.map(x => x.page);
  if (!picks.length) return;
  const rows0 = buildRowMap(), at = impWhere === "after" && impAnchor && impAnchor.isConnected ? rowIndexOf(impAnchor, rows0) : -1;
  const tgt = at >= 0 ? impTarget(rows0, at) : null;
  const before = serializeState(); if (textCount(before) > 0) pushBackup(before, "성경 불러오기 직전", true);
  pushUndo("성경 불러오기");
  const map = columnsToMap(), out = {}, newOwn = {}, oldOwn = readOwnRefs(), insAt = {};
  LANGS.forEach(({ code }) => {
    let base = (map[code] || []).slice(), refs = base.map((_, k) => (oldOwn[code] || [])[k] || "");
    const add = picks.map(p => p[DB_FIELD[code]] || ""), addRefs = pickItems.map(x => x.ref);
    if (!tgt) {
      while (base.length && !NON_BLANK.test(base[base.length - 1]) && !refs[refs.length - 1]) { base.pop(); refs.pop(); } // 맨 뒤의 빈 조각은 버리고
      insAt[code] = base.length;
      base = base.concat(add); refs = refs.concat(addRefs);                  // 성경 조각은 모든 언어 칸의 맨 뒤에 붙임(기준점이라 같은 줄에 옴)
    } else {
      const idx = impInsertIndex(refs, tgt); insAt[code] = idx;               // 선택한 줄 아래: 그 구간을 둘로 나눠 사이에 끼움
      base.splice(idx, 0, ...add); refs.splice(idx, 0, ...addRefs);
    }
    out[code] = base; newOwn[code] = refs;                                    // 기존 표시는 그대로, 새 조각엔 "책 장:절" 표시
  });
  fillColumns(out, true);
  applyOwnRefs(newOwn);
  const total = buildRowMap().length, n = picks.length, first = tgt ? at + 1 : Math.max(0, total - n);
  if (tgt) { while (slideOpts.length < rows0.length) slideOpts.push({ size: 0, align: "" }); slideOpts.splice(first, 0, ...picks.map(() => ({ size: 0, align: "" }))); } // 뒤 슬라이드의 글자 크기·정렬이 같이 밀리게
  for (let k = 0; k < total; k++) if (!slideOpts[k]) slideOpts[k] = { size: 0, align: "" };
  for (let k = first; k < first + n && k < total; k++) slideOpts[k].align = dbAlign; // 새 성경 슬라이드는 성경 DB 모드 정렬(기본 오른쪽)로
  syncSlides(); refreshInfo(); saveStateDebounced();
  impOverlay.classList.remove("open");
  showToast(tgt ? n + "개 조각을 슬라이드 " + (at + 1) + " 아래에 넣었어요." : n + "개 조각을 원고 뒤에 넣었어요.");
  const col = left.querySelector(".col"), box = col && col.querySelectorAll(":scope > .box")[insAt[col.dataset.lang]];
  if (box) { box.scrollIntoView({ behavior: smoothBehavior(), block: "center" }); flash(box); }
}
function pkImpCtx() { // 성경 불러오기 창이 쓰는 선택기 값 묶음
  return { book: impBook, chap: impChap, from: impFrom, to: impTo, cells: () => impCells, loaded: () => impLoaded, range: impRange, update: impUpdateSum,
    all: () => impAllBtn.click(), unit: "절", allText: "장 전체", emptyMsg: "이 장에는 아직 불러올 내용이 없어요." };
}
function impInit() {
  if (impInited) return; impInited = true;
  BibleDB.books.forEach(b => { const o = document.createElement("option"); o.value = b.en; o.textContent = b.no + ". " + b.ko + " (" + b.en + ")"; impBook.appendChild(o); });
  // 성경(검색) → 장(번호판) → 절(번호판) 순서로 고르면 다음 창이 자동으로 열림. 열어 보니 비어 있던 장·내용 없는 절은 흐리게 + 고를 수 없음
  let chapBtn = null, verseBtn = null;
  const afterChap = () => { const seq = impSeq; Promise.resolve(impLoading).then(() => { if (seq === impSeq && impOverlay.classList.contains("open") && !pkClose) verseBtn.pkOpen(); }); };
  pkMake([impBook], () => { const b = impBook.value ? BibleDB.book(impBook.value) : null; return { text: b ? bkName(b) : "성경 선택", ph: !b }; }, 118, close => pkBookMenu(close, () => chapBtn.pkOpen())).title = "성경 고르기 (이름·영어·번호로 검색)";
  chapBtn = pkMake([impChap], () => ({ text: impChap.value ? impChap.value + "장" : "장", ph: !impChap.value }), 64, close => pkChapMenu(close, afterChap)); chapBtn.title = "장 고르기";
  verseBtn = pkMake([impFrom, impTo], () => {
    if (impFrom.value === "" || !impCells[+impFrom.value]) return { text: impLoaded || !impSeq ? "절 선택" : "불러오는 중…", ph: true };
    const a = impCells[+impFrom.value].label, b = impTo.value === "" || !impCells[+impTo.value] ? a : impCells[+impTo.value].label;
    return { text: a === b ? a + "절" : a + " ~ " + b + "절" };
  }, 108, pkVerseMenu); verseBtn.title = "절 고르기 (시작 절 → 끝 절)";
  impBook.addEventListener("change", () => { fillNum(impChap, BibleDB.book(impBook.value).chapters, 1); impLoading = impLoad(); });
  impChap.addEventListener("change", () => { impLoading = impLoad(); });
  impFrom.addEventListener("change", () => { // 시작 절을 고르면 끝 절이 비었거나 시작보다 앞일 때 같은 절로 맞춤(= 한 절만)
    if (impFrom.value === "") impTo.value = "";
    else if (impTo.value === "" || +impTo.value < +impFrom.value) impTo.value = impFrom.value;
    impUpdateSum();
  });
  impTo.addEventListener("change", () => { // 끝 절이 시작보다 앞이면 시작도 그 절로 끌어옴
    if (impTo.value !== "" && (impFrom.value === "" || +impTo.value < +impFrom.value)) impFrom.value = impTo.value;
    impUpdateSum();
  });
  impAllBtn.addEventListener("click", () => { // 장 전체: 내용이 있는 첫 항목 ~ 마지막 항목
    const has = impCells.map((c, i) => c.item >= 0 ? i : -1).filter(i => i >= 0);
    if (!has.length) return;
    impFrom.value = String(has[0]); impTo.value = String(has[has.length - 1]); impUpdateSum();
  });
  impGo.addEventListener("click", impImport);
  document.getElementById("impWhereSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled) return; impWhere = b.dataset.where; impWhereSync(); });
  const close = () => impOverlay.classList.remove("open");
  document.getElementById("impClose").addEventListener("click", close);
  impOverlay.addEventListener("click", e => { if (e.target === impOverlay) close(); });
}
document.getElementById("bibImpBtn").addEventListener("click", () => {
  if (!window.BibleDB) { showToast("bibleDB 폴더를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요.", true); return; }
  impInit();
  const sel = impSel || dbLoadSel();
  impBook.value = sel.en; fillNum(impChap, BibleDB.book(sel.en).chapters, sel.ch);
  const an = impFindAnchor(); impAnchor = an.box; impWhere = an.explicit ? "after" : "end"; impWhereSync(); // 줄을 일부러 골라 둔 때만 처음부터 "아래"로, 커서만 있으면 맨 뒤(전과 같음)
  impOverlay.classList.add("open"); impLoad();
});

// 모드 전환: 어느 쪽이든 지금 모드의 내용을 먼저 저장한 뒤 바꾼다. 두 모드의 저장 공간은 완전히 따로다.
// 모드마다 보던 자리(왼쪽·오른쪽 스크롤, 커서가 있던 조각)를 기억했다가 돌아오면 그대로 복원
const viewSnap = { slide: null, db: null };
function captureView() {
  const ae = document.activeElement; let focus = null;
  if (ae && ae.tagName === "TEXTAREA" && left.contains(ae)) {
    const box = ae.closest(".box"), col = box && box.parentElement;
    if (col) focus = { lang: col.dataset.lang, idx: [...col.querySelectorAll(":scope > .box")].indexOf(box), s: ae.selectionStart, e: ae.selectionEnd };
  }
  return { lt: left.scrollTop, ll: left.scrollLeft, rt: right.scrollTop, rl: right.scrollLeft, focus };
}
function restoreView(v) {
  if (!v) return;
  const apply = () => { left.scrollTop = v.lt; left.scrollLeft = v.ll; right.scrollTop = v.rt; right.scrollLeft = v.rl; };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    apply();
    if (v.focus) { // 커서가 있던 조각에 다시 커서를 둠(스크롤은 그대로)
      const col = left.querySelector('.col[data-lang="' + v.focus.lang + '"]'), box = col && col.querySelectorAll(":scope > .box")[v.focus.idx];
      if (box && !box.dataset.ref) { box._ta.focus({ preventScroll: true }); try { box._ta.setSelectionRange(v.focus.s, v.focus.e); } catch (err) { /* 무시 */ } }
    }
    apply();
  }));
  setTimeout(() => { if (Math.abs(left.scrollTop - v.lt) > 2 || Math.abs(right.scrollTop - v.rt) > 2) { left.scrollTop = v.lt; left.scrollLeft = v.ll; right.scrollTop = v.rt; right.scrollLeft = v.rl; } }, 300); // 글꼴·높이가 늦게 잡혀 위치가 밀렸을 때 한 번 더
}
const dbGuideOverlay = document.getElementById("dbGuideOverlay");
// 성경 DB 사용 안내: 처음 DB 모드에 들어갈 때 딱 한 번만 저절로 열린다(그 뒤로는 위쪽 "ℹ️ 사용 안내" 버튼으로만).
// 키는 "로컬 데이터 지우기"가 지우는 subtitleTool_ 계열이 아니라서, 지운 뒤에도 다시 뜨지 않는다.
const DB_GUIDE_SEEN_KEY = "subtitleDbGuideSeen";
function dbGuideFirstTime() {
  try {
    if (localStorage.getItem(DB_GUIDE_SEEN_KEY) === "1") return;
    localStorage.setItem(DB_GUIDE_SEEN_KEY, "1");
  } catch (e) { return; } // 저장소를 못 쓰면 매번 뜨지 않도록 아예 띄우지 않음
  dbGuideOverlay.classList.add("open");
}
// 위쪽 안내 버튼: 슬라이드 만들기 = "ℹ️ 시작 안내"(원래대로), 성경 DB = "ℹ️ 사용 안내"
function syncGuideBtn() {
  const b = document.getElementById("patchReopenBtn"), db = appMode === "db";
  b.innerHTML = (typeof icon === "function" ? icon("info") : "") + (db ? "사용 안내" : "시작 안내");
  b.title = db ? "성경 DB 작업 안내(수정한 내용 보내는 법, 로컬 데이터 등)를 다시 봐요" : "사용법 · 번역 체험 · 최신 패치노트 · 개발자 노트";
}
document.getElementById("dbGuideClose").addEventListener("click", () => dbGuideOverlay.classList.remove("open"));
dbGuideOverlay.addEventListener("click", e => { if (e.target === dbGuideOverlay) dbGuideOverlay.classList.remove("open"); });
function setMode(m) {
  if (m === appMode || !stateReady) return;
  viewSnap[appMode] = captureView(); clearRefSel();
  saveStateNow();
  try {
  if (m === "db") {
    if (!window.BibleDB) { showToast("bibleDB 폴더를 찾지 못해 DB 모드를 열 수 없어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더를 두세요.", true); return; }
    dbSlideSnap = { opts: slideOpts, map: columnsToMap(), refs: readOwnRefs() };
    slideAlignSnap = defaultAlign;
    appMode = "db"; dbRoot.dataset.mode = "db"; slideOpts = [];
    setDefaultAlign(dbAlign); // 성경 DB 모드 기본 정렬 = 오른쪽
    lockDbLangOrder(true);    // 슬라이드 만들기와 같은 언어 순서·설정을 그대로 씀
    dbGo(dbLoadSel()).then(() => restoreView(viewSnap.db));
    dbGuideFirstTime();
  } else {
    dbSeq++; dbCur = null; appMode = "slide"; dbRoot.dataset.mode = "slide"; dbRefSrc = null; setRefTags("");
    const sn = dbSlideSnap || { opts: [], map: {} };
    lockDbLangOrder(false);   // 슬라이드 만들기의 언어 순서로 되돌림
    slideOpts = sn.opts; setDefaultAlign(slideAlignSnap); fillColumns(sn.map); applyOwnRefs(sn.refs || {}); refreshInfo();
    restoreView(viewSnap.slide);
  }
  } finally { // 위 작업 중 어디서 오류가 나도 버튼 색(선택 표시)과 안내 버튼 글자는 항상 지금 모드를 따라가게
    document.querySelectorAll("#modeSeg button").forEach(b => b.classList.toggle("active", b.dataset.mode === appMode));
    syncGuideBtn();
  }
}
document.querySelectorAll("#modeSeg button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

// 성경 DB 모드에 처음 들어갈 때 기다리지 않도록: 페이지가 한가해지면 "마지막으로 보던 구절"의 장 파일만 미리 읽어 둔다(성경 전체가 아니라 그 장 하나씩).
// BibleDB.load는 같은 장을 한 번만 읽고 결과를 기억하므로, 나중에 dbGo가 같은 장을 부르면 이미 받아 둔 것을 곧바로 씀. 파일이 없어도 조용히 무시.
(function prefetchLastChapter() {
  if (!window.BibleDB) return;
  const run = () => {
    try {
      const s = dbLoadSel(), segs = s.segs && s.segs.length ? s.segs : [s], seen = new Set();
      segs.forEach(g => { const k = g.en + "|" + g.ch; if (seen.has(k) || seen.size >= 5) return; seen.add(k); BibleDB.load(g.en, g.ch).catch(() => {}); });
    } catch (e) { /* 미리 읽기는 못 해도 괜찮음: 들어갈 때 읽음 */ }
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2500 }); else setTimeout(run, 800);
})();
