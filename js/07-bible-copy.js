"use strict";

// ---- DB 코드 복사: {Bible:"John",Chapter:3,Verse:16,Page:1,Kor:"",Chn:"",Eng:"",Ind:""}, 형식 ----
const dbCodeOverlay = document.getElementById("dbCodeOverlay"), dbCodeText = document.getElementById("dbCodeText"),
      dbCodeSub = document.getElementById("dbCodeSub"), dbScopeSeg = document.getElementById("dbScopeSeg");
const jq = JSON.stringify; // 따옴표·줄바꿈을 코드에 안전하게 넣기
function dbLine(en, ch, v, i, p) {
  const rangeEnd = p.ChnVerseEnd > v ? ",ChnVerseEnd:" + p.ChnVerseEnd : "";
  return "  {Bible:" + jq(en) + ", Chapter:" + ch + ", Verse:" + v + ", Page:" + (i + 1) + ",\n"
    + "    Kor:" + jq(p.Kor || "") + ",\n"
    + "    Chn:" + jq(p.Chn || "") + ",\n"
    + "    Eng:" + jq(p.Eng || "") + ",\n"
    + "    Ind:" + jq(p.Ind || "") + rangeEnd + "\n"
    + "  },";
}
function dbChapterEntries(en, ch) { // [[절, 페이지들]...] — 절마다 초안이 있으면 초안, 없으면 장 파일 내용
  const by = new Map();
  BibleDB.rows(en, ch).forEach(r => { if (!by.has(r.Verse)) by.set(r.Verse, []); by.get(r.Verse).push({ Kor: r.Kor, Chn: r.Chn, Eng: r.Eng, Ind: r.Ind, ChnVerseEnd: r.ChnVerseEnd || 0 }); });
  const pre = en + "|" + ch + "|", d = dbRead().d;
  Object.keys(d).forEach(k => { if (k.startsWith(pre)) by.set(parseInt(k.slice(pre.length), 10), d[k]); });
  return [...by.entries()].filter(e => e[1].length).sort((a, b) => a[0] - b[0]);
}
// 아직 안 보낸 수정 모으기: 절마다 "마지막 수정 시각"(o.t)과 "보냈다고 표시한 시각"(o.s)을 견줘, 수정이 더 나중인(또는 보낸 기록이 없는) 절만
// 날짜와 상관없이 책·장·절 순서로 모아 장별로 묶어 보여 줌. [✅ 보냈어요]를 누르면 그 절들의 o.s가 지금 시각으로 찍힘 → 다시 고친 절만 다시 모임
const dbInclSent = document.getElementById("dbInclSent"), dbInclWrap = document.getElementById("dbInclWrap"), dbSentBtn = document.getElementById("dbSentBtn");
function dbToday() { const t = new Date(), p = x => String(x).padStart(2, "0"); return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate()); }
function dbUnsentList() { // {list:[{en,ch,v,pages,unsent}], unsent: 안 보낸 절 수, sent: 보냈다고 표시한 절 수}
  const o = dbRead(), incl = dbInclSent.checked;
  const order = new Map(); BibleDB.books.forEach((b, i) => order.set(b.en, +b.no > 0 ? +b.no : i + 1));
  const list = []; let unsent = 0, sent = 0;
  Object.keys(o.d).forEach(k => {
    const q = k.split("|"), un = dbIsUnsent(o, k);
    if (un) unsent++; else sent++;
    if (un || incl) list.push({ en: q[0], ch: +q[1], v: +q[2], pages: o.d[k], unsent: un });
  });
  list.sort((a, b) => (order.get(a.en) || 999) - (order.get(b.en) || 999) || a.ch - b.ch || a.v - b.v);
  return { list, unsent, sent };
}
function buildDbUnsentCode() {
  const { list } = dbUnsentList();
  if (!list.length) return "";
  const chapters = new Set(list.map(x => x.en + "|" + x.ch)).size;
  const out = ["// " + dbToday() + " 수정한 성경 구절 " + list.length + "절 (" + chapters + "개 장)", ""];
  let cur = "";
  list.forEach(x => {
    const key = x.en + "|" + x.ch;
    if (key !== cur) {
      cur = key;
      if (out[out.length - 1] !== "") out.push("");
      out.push("// " + BibleDB.book(x.en).ko + " " + x.ch + "장");
    }
    if (!x.pages.length) out.push("// " + BibleDB.book(x.en).ko + " " + x.ch + ":" + x.v + " — 이 절은 내용을 비웠어요");
    else x.pages.forEach((p, i) => out.push(dbLine(x.en, x.ch, x.v, i, p)));
  });
  return out.join("\n");
}
// (DB 코드 복사 창에서 쓰는 도우미)
let dbScope = "cur", dcSel = new Set(); // dbScope: "cur"(지금 보고 있는 절) | "unsent"(아직 안 보낸 것)
const pgName = i => String.fromCharCode(97 + (i % 26)); // a, b, c ...
const dcFilled = p => p && (p.Kor || p.Chn || p.Eng || p.Ind);
function dcEntries(en, ch) { return dbChapterEntries(en, ch).map(([v, pages]) => [v, pages.map((p, i) => ({ p, i })).filter(x => dcFilled(x.p))]).filter(e => e[1].length); }
function dcKey(en, ch, v, i) { return en + "|" + ch + "|" + v + "|" + i; }
// 지금 보고 있는 절(내용이 있는 모든 페이지)의 선택 키 집합
function dbCurSel() {
  const s = dbCur, sel = new Set(); if (!s) return sel;
  dcEntries(s.en, s.ch).forEach(([v, pgs]) => { if (v === s.v) pgs.forEach(({ i }) => sel.add(dcKey(s.en, s.ch, v, i))); });
  return sel;
}
function dcBuildPickCode(sel) {
  const order = new Map(); BibleDB.books.forEach((b, i) => order.set(b.en, +b.no > 0 ? +b.no : i + 1));
  const items = [...sel].map(k => { const q = k.split("|"); return { en: q[0], ch: +q[1], v: +q[2], i: +q[3] }; })
    .sort((a, b) => (order.get(a.en) || 999) - (order.get(b.en) || 999) || a.ch - b.ch || a.v - b.v || a.i - b.i);
  if (!items.length) return "";
  const cache = new Map(), pageOf = x => {
    const ck = x.en + "|" + x.ch; if (!cache.has(ck)) cache.set(ck, new Map(dbChapterEntries(x.en, x.ch)));
    const pages = cache.get(ck).get(x.v); return pages && pages[x.i];
  };
  const out = [];
  let cur = "";
  items.forEach(x => {
    const p = pageOf(x); if (!p) return;
    const key = x.en + "|" + x.ch;
    if (key !== cur) { cur = key; if (out.length) out.push(""); out.push("// " + BibleDB.book(x.en).ko + " " + x.ch + "장"); }
    out.push(dbLine(x.en, x.ch, x.v, x.i, p));
  });
  return out.join("\n");
}
function buildDbCode() {
  saveDbNow(); // 지금 화면의 내용까지 초안에 반영한 뒤 뽑음
  return dbScope === "unsent" ? buildDbUnsentCode() : dcBuildPickCode(dbCurSel());
}
function refreshDbCode() {
  const code = buildDbCode();
  dbCodeText.value = code;
  if (dbScope === "unsent") {
    const r = dbUnsentList();
    dbCodeSub.textContent = r.unsent
      ? "아직 안 보낸 수정 " + r.unsent + "절을 날짜와 상관없이 모두 모았어요. 복사해 관리자(sht0230@naver.com)에게 보낸 뒤 [✅ 보냈어요]를 눌러 주세요. 보낸 뒤 다시 고친 절은 다시 모여요."
        + (dbInclSent.checked && r.sent ? " (이미 보낸 " + r.sent + "절 포함)" : "")
      : "아직 안 보낸 수정이 없어요 ✓" + (!r.sent ? "" : dbInclSent.checked ? " (아래는 이미 보낸 " + r.sent + "절이에요)" : " (이미 보낸 " + r.sent + "절은 [보낸 것도 포함]을 체크하면 다시 볼 수 있어요)");
    dbSentBtn.disabled = !r.unsent;
  } else {
    const cs = dbCur && window.BibleDB ? BibleDB.book(dbCur.en).ko + " " + dbCur.ch + ":" + dbCur.v : "";
    dbCodeSub.textContent = "지금 보고 있는 절 " + cs + "의 코드예요. 복사해서 관리자(sht0230@naver.com)에게 보내 주세요."
      + (code ? "" : " (이 절에는 내용이 없어요)");
  }
}
function dbSetScope(sc) {
  dbScope = sc; dbInclWrap.hidden = sc !== "unsent"; dbSentBtn.hidden = sc !== "unsent";
  dbScopeSeg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x.dataset.scope === sc));
  refreshDbCode();
}
document.getElementById("dbCodeBtn").addEventListener("click", () => {
  if (dbBroken) { showToast("DB 초안을 읽지 못하는 상태라 코드를 만들지 않아요. 원본은 브라우저에 보관돼 있어요.", true); return; }
  if (!dbCur) { showToast("절을 불러오는 중이에요. 잠시 뒤 다시 눌러 주세요.", true); return; }
  saveDbNow();
  dbInclSent.checked = false;
  dbSetScope("cur"); // 열 때마다 지금 보고 있는 절부터
  dbCodeOverlay.classList.add("open");
});
dbScopeSeg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => dbSetScope(b.dataset.scope)));
dbInclSent.addEventListener("change", refreshDbCode);
dbSentBtn.addEventListener("click", () => {
  if (dbBroken) { showToast("DB 초안을 읽지 못하는 상태라 표시하지 않아요. 원본은 브라우저에 보관돼 있어요.", true); return; }
  saveDbNow(); // 지금 화면의 내용까지 먼저 반영
  const targets = dbUnsentList().list.filter(x => x.unsent);
  if (!targets.length) { showToast("보냈다고 표시할 절이 없어요.", true); return; }
  try {
    const o = dbRead(), now = Date.now();
    targets.forEach(x => { const k = x.en + "|" + x.ch + "|" + x.v; if (o.d[k]) o.s[k] = now; });
    localStorage.setItem(DB_KEY, JSON.stringify(o));
  } catch (e) { showToast("표시를 저장하지 못했어요. 브라우저 저장소를 쓸 수 없는 상태예요.", true); return; }
  showToast(targets.length + "절을 보낸 것으로 표시했어요. 다시 고친 절만 다시 모여요.");
  refreshDbCode(); dbMarkVerses();
});
document.getElementById("dbCodeCopy").addEventListener("click", () => {
  if (!dbCodeText.value.trim()) { showToast("복사할 내용이 없어요.", true); return; }
  copyToClipboard(dbCodeText.value, "DB 코드를 복사했어요.");
});
document.getElementById("dbCodeClose").addEventListener("click", () => dbCodeOverlay.classList.remove("open"));
dbCodeOverlay.addEventListener("click", e => { if (e.target === dbCodeOverlay) dbCodeOverlay.classList.remove("open"); });

// ---- 📋 전체 복사 창 (성경 DB 모드): 성경 → 장 → 절 범위를 성경 불러오기와 같은 맥 스타일 선택기로 고름 ----
// 문단 하나 = 한 페이지: 맨 위에 "책 이름 장:절", 그 아래 언어마다 한 줄, 문단 사이는 빈 줄. 한 절이 여러 페이지면 16 (a) · 16 (b)처럼 나뉨.
const ccBook = document.getElementById("ccBook"), ccChap = document.getElementById("ccChap"), ccFrom = document.getElementById("ccFrom"), ccTo = document.getElementById("ccTo");
let ccSeq = 0, ccInited = false, ccLoaded = false, ccItems = [];
function ccFill(sel) { // 내용 있는 절만 항목으로 (한 절이 여러 페이지면 16 (a) · 16 (b))
  sel.textContent = "";
  ccItems.forEach((x, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = x.label; sel.appendChild(o); });
}
function ccRefresh() {
  macSyncs.forEach(f => f());
  const sub = document.getElementById("ctSub");
  if (!ccLoaded) { sub.textContent = "불러오는 중..."; return; }
  if (!ccItems.length) { copyText.value = ""; sub.textContent = "이 장에는 아직 복사할 내용이 없어요. 다른 장을 골라 주세요."; return; }
  const a = Math.min(+ccFrom.value, +ccTo.value), b = Math.max(+ccFrom.value, +ccTo.value), picks = ccItems.slice(a, b + 1);
  const res = ctPickText(new Set(picks.map(x => dcKey(x.en, x.ch, x.v, x.i))));
  copyText.value = res.text;
  const bk = BibleDB.book(ccBook.value), nm = bkName(bk) || ccBook.value;
  sub.textContent = nm + " " + ccChap.value + "장 · " + res.n + "페이지의 글을 모았어요. 문단마다 구절 이름과 언어별 글이 나와요. 필요하면 고친 뒤 [복사]를 눌러 주세요.";
}
async function ccLoad(wantV) { // wantV: 처음 골라 둘 절(없으면 그 장의 첫 절). 한 절만 골라져 있다가 끝 절을 바꾸면 범위가 늘어남
  const my = ++ccSeq, en = ccBook.value, ch = +ccChap.value || 1;
  ccLoaded = false; ccItems = []; ccFill(ccFrom); ccFill(ccTo); ccRefresh();
  try { await BibleDB.load(en, ch); } catch (e) { /* 장 파일이 없으면 초안만 보임 */ }
  if (my !== ccSeq) return;
  const entries = dbChapterEntries(en, ch); let filled = 0;
  entries.forEach(([v, pages]) => {
    const pgs = pages.map((p, i) => ({ p, i })).filter(x => dcFilled(x.p)); if (!pgs.length) return;
    filled++;
    pgs.forEach(({ p, i }, k) => { const end = p.ChnVerseEnd > v ? p.ChnVerseEnd : 0; ccItems.push({ en, ch, v, i, label: end ? v + "-" + end : impShow(v, k, pgs.length) }); });
  });
  dbChapSeen.set(en + "|" + ch, filled);
  ccFill(ccFrom); ccFill(ccTo); ccLoaded = true;
  if (ccItems.length) {
    let v0 = wantV && ccItems.some(x => x.v === wantV) ? wantV : ccItems[0].v;
    const idx = ccItems.map((x, i) => x.v === v0 ? i : -1).filter(i => i >= 0);
    ccFrom.value = String(idx[0]); ccTo.value = String(idx[idx.length - 1]); // 그 절의 모든 페이지(a·b)
  }
  ccRefresh();
}
function ccInit() {
  if (ccInited) return; ccInited = true;
  BibleDB.books.forEach(b => { const o = document.createElement("option"); o.value = b.en; o.textContent = b.no + ". " + b.ko + " (" + b.en + ")"; ccBook.appendChild(o); });
  const ctx = { book: ccBook, chap: ccChap };
  let chapBtn = null;
  pkMake([ccBook], () => { const b = ccBook.value ? BibleDB.book(ccBook.value) : null; return { text: b ? bkName(b) : "성경 선택", ph: !b }; }, 118, close => pkBookMenu(close, () => chapBtn.pkOpen(), ctx)).title = "성경 고르기 (이름·영어·번호로 검색)";
  chapBtn = pkMake([ccChap], () => ({ text: ccChap.value ? ccChap.value + "장" : "장", ph: !ccChap.value }), 64, close => pkChapMenu(close, () => {}, ctx)); chapBtn.title = "장 고르기";
  macSelect(ccFrom); macSelect(ccTo); // 절도 같은 맥 스타일 드롭다운 (시작 ~ 끝)
  ccBook.addEventListener("change", () => { fillNum(ccChap, BibleDB.book(ccBook.value).chapters, 1); ccLoad(); });
  ccChap.addEventListener("change", () => { ccLoad(); });
  ccFrom.addEventListener("change", () => { if (+ccTo.value < +ccFrom.value) ccTo.value = ccFrom.value; ccRefresh(); }); // 끝이 시작보다 앞이면 끝도 맞춤
  ccTo.addEventListener("change", () => { if (+ccTo.value < +ccFrom.value) ccFrom.value = ccTo.value; ccRefresh(); });
}
function ccOpen() {
  if (!window.BibleDB) { showToast("bibleDB 폴더를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요.", true); return; }
  ccInit();
  const sel = dbCur || dbLoadSel();
  ccBook.value = sel.en; fillNum(ccChap, BibleDB.book(sel.en).chapters, sel.ch); macSyncs.forEach(f => f());
  copyText.value = ""; copyOverlay.classList.add("open");
  ccLoad(sel.v); // 처음엔 지금 보던 절만
}
function ctPickText(sel) {
  saveDbNow(); // 지금 화면의 내용까지 반영한 뒤 뽑음
  const order = new Map(); BibleDB.books.forEach((b, i) => order.set(b.en, +b.no > 0 ? +b.no : i + 1));
  const items = [...sel].map(k => { const q = k.split("|"); return { en: q[0], ch: +q[1], v: +q[2], i: +q[3] }; })
    .sort((a, b) => (order.get(a.en) || 999) - (order.get(b.en) || 999) || a.ch - b.ch || a.v - b.v || a.i - b.i);
  const cache = new Map(), paras = [], verses = new Set();
  items.forEach(x => {
    const ck = x.en + "|" + x.ch; if (!cache.has(ck)) cache.set(ck, new Map(dbChapterEntries(x.en, x.ch)));
    const pages = cache.get(ck).get(x.v), p = pages && pages[x.i]; if (!p) return;
    const vEnd = pages[0] && pages[0].ChnVerseEnd > x.v ? pages[0].ChnVerseEnd : 0; // 여러 절을 묶은 중국어 구간이면 "16-18"처럼
    const lines = [];
    orderedLangs().forEach(({ code }) => {
      if (hiddenSet.has(code)) return; // "제외"한 언어는 복사에서도 뺌
      const t = String(p[DB_FIELD[code]] || "").trim(); if (!t) return;
      lines.push(parenSet.has(code) ? "(" + t + ")" : t);
    });
    if (!lines.length) return;
    paras.push(dbRefText({ en: x.en, ch: x.ch, v: x.v, vEnd }) + "\n" + lines.join("\n"));
    verses.add(x.en + "|" + x.ch + "|" + x.v);
  });
  return { text: paras.join("\n\n"), n: paras.length, verses: verses.size };
}
