"use strict";

// ---------------------------------------------------------------------
// 성경 DB 모드: 성경 책 + 장 + 절을 고르면 그 절의 내용이 왼쪽 4개 언어 칸에 올라온다.
//  - 조각(상자) 하나 = 슬라이드 하나(DB의 Page 값은 상자 순서대로 자동으로 매겨짐). 한 절이 길면 Enter로 나눠서 슬라이드를 늘린다.
//  - 글은 "절 하나씩" 브라우저에 초안으로 저장된다(다른 절·슬라이드 만들기 내용은 건드리지 않음).
//  - 화면에 올라오는 순서: ① 저장된 초안 → ② bibleDB/ 폴더의 장 파일(하드 코딩된 내용) → ③ 빈 화면
// ---------------------------------------------------------------------
const DB_KEY = "subtitleTool_db_v1", DB_SEL_KEY = "subtitleTool_dbSel_v1";
const DB_FIELD = { ko: "Kor", zh: "Chn", en: "Eng", id: "Ind" };
const dbRoot = document.documentElement;
const dbBook = document.getElementById("dbBook"), dbChap = document.getElementById("dbChap"),
      dbVerse = document.getElementById("dbVerse"),
      dbStat = document.getElementById("dbStat");
let dbBroken = false, dbSlideSnap = null, dbSeq = 0, dbMiss = false;
const dbChapSeen = new Map(); // "책|장" → 내용이 있는 절 수(열어 본 장만 앎)
let dbVerseHas = new Set();   // 지금 장에서 초안 또는 장 파일에 내용이 있는 절 번호
dbVerse.title = "✎ 표시: 고쳤고 아직 안 보낸 절 · ✓ 표시: 고친 뒤 보냈다고 표시한 절 — 🧩 DB 코드 복사 ② 아직 안 보낸 것에서 모아 관리자에게 보내 주세요";
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
function dbPagesFromScreen() {
  const cols = readColumns();
  if (!Object.values(cols).some(c => c.items.some(x => x.filled))) return [];
  const need = slideCountNeeded(cols), pages = [], rows = rowsOf(cols), sourcePages = dbCur ? dbSource(dbCur).pages : [];
  for (let i = 0; i < need; i++) {
    const p = {};
    LANGS.forEach(({ code }) => { const it = rows[i] && rows[i][code]; p[DB_FIELD[code]] = it && it.filled ? it.value.trim() : ""; });
    if (sourcePages[i] && sourcePages[i].ChnVerseEnd) p.ChnVerseEnd = sourcePages[i].ChnVerseEnd;
    pages.push(p);
  }
  return pages;
}
function saveDbNow() { // 지금 올라와 있는 "이 절"만 저장(다른 절은 그대로)
  if (appMode !== "db" || !dbCur || dbBroken || localWiped) return;
  try {
    const o = dbRead();
    if (dbBroken) return;
    const pages = dbPagesFromScreen(), k = dbKey(dbCur);
    const fr = BibleDB.rows(dbCur.en, dbCur.ch).filter(r => r.Verse === dbCur.v);
    const before = o.d[k] === undefined ? null : dbNormPages(o.d[k]);
    if (dbNormPages(pages) === dbNormPages(fr)) { delete o.d[k]; delete o.t[k]; delete o.s[k]; } // 장 파일과 같으면 초안이 필요 없음
    else if (pages.length || fr.length) { o.d[k] = pages; if (before !== dbNormPages(pages)) o.t[k] = Date.now(); } // 파일에 있는 절을 일부러 비운 경우는 빈 초안([])으로 기억 · 내용이 실제로 바뀐 때만 수정 시각 갱신
    else { delete o.d[k]; delete o.t[k]; delete o.s[k]; }
    localStorage.setItem(DB_KEY, JSON.stringify(o));
    stateDirty = false; saveWarnEl.hidden = true;
    dbMarkVerses();
  } catch (e) { saveWarnEl.hidden = false; }
}
// 초안이 장 파일(하드 코딩된 내용)과 다른 절에 ✎ 표시 + 이 장에서 아직 코드에 반영 안 된 절 수를 상태줄에 표시
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
  dbStat.textContent = dbMiss ? "⚠ 이 장의 성경 데이터를 찾지 못했어요" : ""; // 문제가 있을 때만 표시
}
function dbSource(s) {
  const o = dbRead(), k = dbKey(s);
  if (o.d[k]) return { pages: o.d[k], src: "draft" };
  const rows = window.BibleDB ? BibleDB.rows(s.en, s.ch).filter(r => r.Verse === s.v) : [];
  if (rows.length) return { pages: rows.map(r => ({ Kor: r.Kor || "", Chn: r.Chn || "", Eng: r.Eng || "", Ind: r.Ind || "", ChnVerseEnd: r.ChnVerseEnd || 0 })), src: "file" };
  return { pages: [], src: "empty" };
}
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
      list.forEach(t => { prev = addBox(col, code, t, prev, labelOf(code)).closest(".box"); });
      renumberColumn(col); resetColSelPreview(col);
    });
    syncSlides();
  } finally { isRestoring = false; }
  refreshInfo();
}
async function dbGo(sel) {
  saveDbNow(); dbCur = null; // 지금 절을 먼저 저장하고, 불러오는 동안은 저장하지 않음
  const my = ++dbSeq;
  try { localStorage.setItem(DB_SEL_KEY, JSON.stringify(sel)); } catch (e) { /* 무시 */ }
  if (!window.BibleDB) { dbStat.textContent = "⚠ bibleDB/bibledb.js를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요."; return; }
  dbBook.value = sel.en;
  fillNum(dbChap, BibleDB.book(sel.en).chapters, sel.ch);
  let miss = false;
  dbStat.textContent = "불러오는 중...";
  try { await BibleDB.load(sel.en, sel.ch); } catch (e) { miss = true; }
  if (my !== dbSeq) return; // 그 사이 다른 절을 골랐으면 이 결과는 버림
  fillNum(dbVerse, Math.max(dbVerseMax(sel), sel.v), sel.v);
  const rangeRow = BibleDB.rows(sel.en, sel.ch).find(r => r.Page === 1 && r.ChnVerseEnd >= sel.v && r.Verse <= sel.v && r.Chn);
  dbRefSrc = rangeRow ? { en: sel.en, ch: sel.ch, v: rangeRow.Verse, vEnd: rangeRow.ChnVerseEnd } : { en: sel.en, ch: sel.ch, v: sel.v };
  setRefTags(dbRefText(dbRefSrc));
  const { pages, src } = dbSource(sel);
  const map = {};
  LANGS.forEach(({ code }) => { map[code] = pages.map(p => p[DB_FIELD[code]] || ""); });
  fillColumns(map);
  dbCur = sel;
  dbMiss = miss;
  dbMarkVerses();
}
function dbSelNow() { return { en: dbBook.value, ch: +dbChap.value || 1, v: +dbVerse.value || 1 }; }
function dbLoadSel() {
  try { const s = JSON.parse(localStorage.getItem(DB_SEL_KEY)); if (s && BibleDB.book(s.en)) return { en: s.en, ch: Math.max(1, s.ch | 0), v: Math.max(1, s.v | 0) }; } catch (e) { /* 기본값 */ }
  return { en: "Genesis", ch: 1, v: 1 };
}
if (window.BibleDB) BibleDB.books.forEach(b => {
  const o = document.createElement("option"); o.value = b.en; o.textContent = b.no + ". " + b.ko + " (" + b.en + ")"; dbBook.appendChild(o);
});
dbBook.addEventListener("change", () => dbGo({ en: dbBook.value, ch: 1, v: 1 }));
dbChap.addEventListener("change", () => dbGo({ en: dbBook.value, ch: +dbChap.value, v: 1 }));
dbVerse.addEventListener("change", () => dbGo(dbSelNow()));
function dbStep(d) {
  const s = dbSelNow(), v = s.v + d;
  if (v < 1 || v > dbVerse.options.length) { showToast(d < 0 ? "이 장의 첫 절이에요." : "이 장의 마지막 절이에요. 다음 장은 장 옆 › 버튼을 눌러 주세요."); return; }
  dbGo({ en: s.en, ch: s.ch, v });
}
document.getElementById("dbPrev").addEventListener("click", () => dbStep(-1));
document.getElementById("dbNext").addEventListener("click", () => dbStep(1));
function dbStepChap(d) {
  if (!window.BibleDB) return;
  const s = dbSelNow(), ch = s.ch + d;
  if (ch >= 1 && ch <= BibleDB.book(s.en).chapters) { dbGo({ en: s.en, ch, v: 1 }); return; }
  const bs = Array.from(BibleDB.books), nb = bs[bs.findIndex(b => b.en === s.en) + d]; // 책 경계: 이전 책의 마지막 장 / 다음 책의 1장
  if (!nb) { showToast(d < 0 ? "성경의 첫 장이에요." : "성경의 마지막 장이에요."); return; }
  dbGo({ en: nb.en, ch: d < 0 ? BibleDB.book(nb.en).chapters : 1, v: 1 });
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
  const locked = i => cs[i].item < 0, { g, cells } = pkGrid(n, i => cs[i].label, locked, i => cs[i].title, 6);
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
pkMake([dbVerse], () => { const o = dbVerse.options[dbVerse.selectedIndex]; return { text: o ? o.textContent : "-" }; }, 60,
  close => pkOneMenu(close, { sel: dbVerse, cols: 6, dim: v => !dbVerseHas.has(v), legend: "✎ 고친 절 · ✓ 보낸 절 · 흐림 = 내용 없음" })).title = dbVerse.title;
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
    dbGo(dbLoadSel()).then(() => restoreView(viewSnap.db));
    dbGuideFirstTime();
  } else {
    dbSeq++; dbCur = null; appMode = "slide"; dbRoot.dataset.mode = "slide"; dbRefSrc = null; setRefTags("");
    const sn = dbSlideSnap || { opts: [], map: {} };
    slideOpts = sn.opts; setDefaultAlign(slideAlignSnap); fillColumns(sn.map); applyOwnRefs(sn.refs || {}); refreshInfo();
    restoreView(viewSnap.slide);
  }
  } finally { // 위 작업 중 어디서 오류가 나도 버튼 색(선택 표시)과 안내 버튼 글자는 항상 지금 모드를 따라가게
    document.querySelectorAll("#modeSeg button").forEach(b => b.classList.toggle("active", b.dataset.mode === appMode));
    syncGuideBtn();
  }
}
document.querySelectorAll("#modeSeg button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
