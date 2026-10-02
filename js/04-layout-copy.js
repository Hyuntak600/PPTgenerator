"use strict";

// ---------------------------------------------------------------------
// 슬라이드 구성: 언어마다 어디에 넣을지 + 위에서 아래로 어떤 순서로 넣을지(끌어서 바꿈)
//  - 슬라이드(기본, 둘 다 아닐 때): 슬라이드·복사에 그대로 들어감
//  - ( ) 복사(parenSet): 슬라이드에는 안 들어가고, 전체 텍스트 복사에만 ( ) 안에 함께 들어감
//  - 제외(hiddenSet): 슬라이드·복사에서 모두 뺌
//  - 어느 쪽이든 왼쪽 원문 조각과 오른쪽 투사 관계는 그대로라서 다시 "슬라이드"로 바꾸면 바로 돌아옴
// ---------------------------------------------------------------------
let parenSet = new Set();                // ( ) 복사 언어
let hiddenSet = new Set();               // 제외한 언어
let langOrder = LANGS.map(l => l.code);  // 슬라이드·복사 안 순서(위 → 아래)

function orderedLangs() { return langOrder.map(code => ({ code, ...LANG_META[code] })); }
function langMode(code) { return hiddenSet.has(code) ? "hid" : parenSet.has(code) ? "paren" : "on"; }
function inSlide(code) { return langMode(code) === "on"; }
function setLangMode(code, mode) {
  parenSet.delete(code);
  hiddenSet.delete(code);
  if (mode === "paren") parenSet.add(code);
  if (mode === "hid") hiddenSet.add(code);
  refreshInfoSoon(); // 성경 표시(영어 (한국어) 중국어 인도네시아어)도 언어 설정에 맞춰 다시 만듦
}

const composeBar = document.getElementById("composeBar");
const composePanel = document.getElementById("composePanel");
const composeToggle = document.getElementById("composeToggle");
const composeList = document.getElementById("composeList");
const composeChips = document.getElementById("composeChips");
const MODE_LABELS = { on: "슬라이드", paren: "( ) 복사", hid: "제외" };

function setComposeOpen(open) {
  composePanel.hidden = !open;
  composeToggle.setAttribute("aria-expanded", open ? "true" : "false");
  composeToggle.textContent = open ? "닫기" : "설정";
}
composeToggle.addEventListener("click", () => setComposeOpen(composePanel.hidden));
document.addEventListener("click", e => { // 세부 설정 / 슬라이드 구성 패널은 바깥을 누르면 닫힘
  if (settingsMore.open && !settingsMore.contains(e.target)) settingsMore.open = false;
  if (!composePanel.hidden && !e.composedPath().includes(composeBar)) setComposeOpen(false);
});

function onComposeMode(code, mode) {
  if (mode !== "on" && inSlide(code) && LANGS.filter(l => inSlide(l.code)).length <= 1) {
    showToast("슬라이드에는 언어가 하나 이상 있어야 해요.", true);
    return;
  }
  setLangMode(code, mode);
  applyLangLayout();
}

// 끌어서 순서 바꾸기: 끄는 동안 그 자리에서 바로 옮겨 보여 주고, 놓으면 순서를 확정한다.
function makeSortable(container, itemSel, horizontal, onCommit) {
  let dragEl = null;
  container.addEventListener("dragstart", e => {
    const el = e.target && e.target.closest ? e.target.closest(itemSel) : null;
    if (!el || !container.contains(el)) return;
    dragEl = el;
    el.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", el.dataset.lang || "");
  });
  container.addEventListener("dragover", e => {
    if (!dragEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const others = [...container.querySelectorAll(itemSel)].filter(x => x !== dragEl);
    const pos = horizontal ? e.clientX : e.clientY;
    const next = others.find(x => {
      const r = x.getBoundingClientRect();
      return pos < (horizontal ? r.left + r.width / 2 : r.top + r.height / 2);
    });
    if (next) {
      if (dragEl.nextElementSibling !== next) container.insertBefore(dragEl, next);
    } else if (others.length) {
      const last = others[others.length - 1];
      if (last.nextElementSibling !== dragEl) last.after(dragEl);
    }
  });
  container.addEventListener("drop", e => { if (dragEl) e.preventDefault(); });
  container.addEventListener("dragend", () => {
    if (!dragEl) return;
    dragEl.classList.remove("dragging");
    dragEl = null;
    onCommit();
  });
}
function commitOrder(newCodes) {
  // newCodes에 없는 언어(칩에 안 보이는 제외 언어)는 원래 자리를 그대로 지킨다
  const set = new Set(newCodes);
  const queue = [...newCodes];
  const next = langOrder.map(code => set.has(code) ? queue.shift() : code);
  if (next.join() === langOrder.join()) { syncComposePanel(); syncComposeChips(); return; }
  langOrder = next;
  applyLangLayout();
}

// 패널 줄은 한 번만 만들고, 이후에는 제자리에서 갱신
LANGS.forEach(({ code, label }) => {
  const li = document.createElement("li");
  li.className = "cr";
  li.dataset.lang = code;
  li.draggable = true;
  li.title = "끌어서 순서를 바꿀 수 있어요";

  const grip = document.createElement("span");
  grip.className = "cr-grip";
  grip.textContent = "⠿";
  grip.setAttribute("aria-hidden", "true");

  const name = document.createElement("span");
  name.className = "cr-name";
  name.appendChild(document.createElement("i"));
  name.appendChild(document.createTextNode(label));

  const seg = document.createElement("span");
  seg.className = "seg cr-mode";
  Object.keys(MODE_LABELS).forEach(mode => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.mode = mode;
    b.textContent = MODE_LABELS[mode];
    b.addEventListener("click", () => onComposeMode(code, mode));
    seg.appendChild(b);
  });

  li.appendChild(grip);
  li.appendChild(name);
  li.appendChild(seg);
  composeList.appendChild(li);
});
makeSortable(composeList, ".cr", false, () =>
  commitOrder([...composeList.querySelectorAll(".cr")].map(li => li.dataset.lang)));
makeSortable(composeChips, ".rh-chip", true, () =>
  commitOrder([...composeChips.querySelectorAll(".rh-chip")].map(c => c.dataset.lang)));

function syncComposePanel() {
  const rows = [...composeList.querySelectorAll(".cr")];
  const wanted = langOrder.map(code => composeList.querySelector('.cr[data-lang="' + code + '"]'));
  if (wanted.some((li, i) => li !== rows[i])) wanted.forEach(li => composeList.appendChild(li));
  wanted.forEach(li => {
    const mode = langMode(li.dataset.lang);
    li.classList.toggle("excluded", mode === "hid");
    li.querySelectorAll(".cr-mode button").forEach(b => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
}

function syncComposeChips() {
  composeChips.textContent = "";
  const excluded = [];
  orderedLangs().forEach(({ code, label }) => {
    if (hiddenSet.has(code)) { excluded.push(label); return; }
    const chip = document.createElement("span");
    chip.className = "rh-chip";
    chip.dataset.lang = code;
    chip.draggable = true;
    const grip = document.createElement("span");
    grip.className = "grip";
    grip.textContent = "⠿";
    chip.appendChild(grip);
    chip.appendChild(document.createElement("i"));
    chip.appendChild(document.createTextNode(label));
    if (parenSet.has(code)) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "( ) 복사만";
      chip.appendChild(tag);
    }
    composeChips.appendChild(chip);
  });
  if (excluded.length) {
    const ex = document.createElement("span");
    ex.className = "rh-excl";
    ex.textContent = "제외: " + excluded.join(", ");
    composeChips.appendChild(ex);
  }
}

// 구성(순서·( ) 복사·제외)을 슬라이드 미리보기 전체에 반영
function applyLangLayout() {
  langOrder.forEach((code, i) => right.style.setProperty("--o-" + code, String(i)));
  right.querySelectorAll(".slot").forEach(slot => {
    slot.classList.toggle("hid", !inSlide(slot.dataset.lang)); // 슬라이드에 안 넣는 언어는 슬라이드에서 숨김
  });
  right.querySelectorAll(".chk-line").forEach(line => {
    line.classList.toggle("hid", hiddenSet.has(line.dataset.lang));
    line.classList.toggle("par", parenSet.has(line.dataset.lang));
  });
  syncComposePanel();
  syncComposeChips();
  recomputeAllFits();
  refreshInfoSoon();
  saveStateDebounced();
}

// ---------------------------------------------------------------------
// 슬라이드별 자동 축소(autofit): 실제 들어간 글자량에 맞춰 표시 크기를 줄이고,
// 그 결과(실제 적용된 pt)를 슬라이드 오른쪽 위 배지로 보여준다
// ---------------------------------------------------------------------
// 기준 글자 크기(기본 80pt): 슬라이드마다 따로 바꾸지 않으면 이 값이 목표, 글자가 많으면 자동 축소
const BASE_FONT_PT = 80; // 기본값(툴바 "기준 글자 크기" 칸이 비었을 때도 이 값)
const fontSizeInput = document.getElementById("fontSizeInput");
function getFontSizeInputValue() {
  const v = parseInt(fontSizeInput.value, 10);
  return Number.isFinite(v) && v >= 10 ? v : BASE_FONT_PT;
}

// ---------------------------------------------------------------------
// ProPresenter 캔버스 규격: 파워포인트(inch×72=pt)와 달리 ProPresenter는 슬라이드 캔버스를
// 출력 해상도와 같은 "픽셀" 단위로 두고, 글자 크기(pt)가 그 픽셀에 1:1로 대응한다
// (예: 1920×1080 출력이면 캔버스 높이는 1080이고, 80pt는 그 캔버스에서 세로 80픽셀 크기로 찍힘).
// 예전 코드는 파워포인트식 "7.5in = 540pt"를 기준으로 미리보기를 그려서, 실제 맥 프로프레젠터에
// 옮겼을 때(캔버스 높이 1080 기준)보다 훨씬 적은 줄만 들어가는 것처럼 보이는 불일치가 있었다
// (예: 언어 3개를 꽉 채우면 실제로는 약 10줄·80~85pt로 들어가는데, 미리보기는 그 절반도 안 되는
//  줄 수에서 이미 자동 축소가 걸림). 캔버스 높이를 1080(기본값)로 맞추면 이 실측치와 들어맞는다.
// 툴바에서 해상도를 바꾸면(HD/FHD/UHD/직접입력) 아래 canvasHeightPt만 바뀌고, 그 값이
// 미리보기(cqh)·자동축소에 동일하게 반영된다.
let canvasHeightPt = 1080;
let mainCqhValue = 0; // syncFontCqhVars가 값을 넣는 변수(선언이 빠져 "use strict"에서 오류가 나던 것을 추가)

const canvasHeightSelect = document.getElementById("canvasHeightSelect");
const canvasHeightCustom = document.getElementById("canvasHeightCustom");
function getCanvasHeightPt() {
  if (canvasHeightSelect.value === "custom") {
    return parseInt(canvasHeightCustom.value, 10) || 1080;
  }
  return parseInt(canvasHeightSelect.value, 10) || 1080;
}
function onCanvasHeightChanged() {
  canvasHeightCustom.style.display = canvasHeightSelect.value === "custom" ? "" : "none";
  canvasHeightPt = getCanvasHeightPt();
  syncFontCqhVars();
  recomputeAllFitsSoon();
  saveStateDebounced();
}
canvasHeightSelect.addEventListener("change", onCanvasHeightChanged);
canvasHeightCustom.addEventListener("input", onCanvasHeightChanged);

function syncFontCqhVars() {
  const targetPt = getFontSizeInputValue();
  canvasHeightPt = getCanvasHeightPt();
  mainCqhValue = (targetPt / canvasHeightPt) * 100;
  document.documentElement.style.setProperty("--font-cqh", mainCqhValue.toFixed(4));
}

// 슬라이드 밑 확인 패널: 줄마다 왼쪽엔 언어 이름, 오른쪽엔 "미리보기 번역 언어"(한국어/English, 툴바 설정)로
// 번역한 문장만 보여준다(원문은 반복하지 않음). 그 언어 자체인 줄은 원문이 곧 그 언어 글이라 그대로 보여준다.
// (글이 바뀐 줄만, 타이핑이 잠깐 멈춘 뒤에 요청 / 같은 문장은 캐시에서 즉시 표시)
function queueCheckGloss(check) {
  check.querySelectorAll(".chk-line").forEach(line => {
    const code = line.dataset.lang;
    const textEl = line._text;
    const text = line._orig || "";
    const mode = !text ? "empty" : code === dragPreviewLang ? "same" : "tr";
    const sig = mode + "|" + dragPreviewLang + "|" + text;
    if (line._glossSig === sig) return; // 바뀐 게 없으면 다시 요청하지 않음
    line._glossSig = sig;
    clearTimeout(line._glossTimer);
    const seq = line._glossSeq = (line._glossSeq || 0) + 1;
    textEl.title = "";
    textEl.classList.remove("busy", "err");
    if (mode === "empty") { textEl.textContent = "(비어있음)"; textEl.classList.add("empty"); line._shown = false; return; }
    textEl.classList.remove("empty");
    if (mode === "same") { textEl.textContent = text; line._shown = true; return; }
    if (!line._shown) textEl.textContent = "번역 중...";
    textEl.classList.add("busy");
    line._glossTimer = setTimeout(async () => {
      try {
        const t = await glossTranslate(text, ltcodeOf(code), ltcodeOf(dragPreviewLang));
        if (line._glossSeq !== seq) return;
        textEl.textContent = t;
        line._shown = true;
      } catch (e) {
        if (line._glossSeq !== seq) return;
        textEl.textContent = "(번역 실패 · 번역 서버 확인)";
        textEl.title = e && e.message ? e.message : "";
        textEl.classList.add("err");
        line._shown = false;
      }
      textEl.classList.remove("busy");
    }, 700);
  });
}
function retryAllGloss() { // 서버를 다시 켜거나 설정을 바꾼 뒤 전부 다시 번역
  right.querySelectorAll(".chk-line").forEach(l => { l._glossSig = null; });
  right.querySelectorAll(".slide-check").forEach(queueCheckGloss);
}
["ltStatusRecheck", "ltUrlSave"].forEach(id => document.getElementById(id).addEventListener("click", retryAllGloss));

// 슬라이드 밑 언어별 확인 패널 갱신: 화면표시 on/off(괄호 축소)와 무관하게 각 언어의 원문을
// 줄에 저장해 두고(_orig), 표시는 queueCheckGloss가 번역문으로 채운다.
function updateSlideCheck(block) {
  LANGS.forEach(({ code }) => {
    const slot = block._slots[code];
    const line = block._lines[code];
    const empty = slot.classList.contains("empty");
    line._orig = empty ? "" : slot._main.textContent.trim();
    slot.title = empty ? "" : "클릭하면 왼쪽 원문 조각으로 이동해요";
  });
  queueCheckGloss(block._check);
  refreshInfoSoon();
}

function computeFitScale(row) {
  const badge = row._badge;
  const mains = [...row.querySelectorAll(".slot:not(.empty):not(.hid) .slot-main")];
  const customPt = parseInt(row.dataset.tpt, 10); // 이 슬라이드만 따로 정한 크기가 있으면 그것을 우선
  const isCustom = customPt > 0;
  const targetPt = isCustom ? customPt : getFontSizeInputValue();
  const rowCqh = (targetPt / canvasHeightPt) * 100;
  row.style.setProperty("--font-cqh", rowCqh.toFixed(4));

  if (!mains.length) {
    row.style.setProperty("--fit-scale", 1);
    badge.style.display = "none";
    row.dataset.effPt = "";
    return;
  }

  const contentH = row.clientHeight; // 고정 padding 없음
  const cs = getComputedStyle(row); // 한 번만 가져와 재사용(값은 실시간으로 반영됨)
  const cssNum = (name, dflt) => { const v = parseFloat(cs.getPropertyValue(name)); return isNaN(v) ? dflt : v; };
  const padY = cssNum("--pad-y", 0), langGap = cssNum("--lang-gap", 0.05);
  const refPx = (appMode === "db" && dbRefStr) || row.dataset.hasref === "1" ? cssNum("--ref-h", 7.4) / 100 * contentH : 0; // 성경 DB 모드: 왼쪽 위 라벨 자리
  const fits = sc => {
    row.style.setProperty("--fit-scale", sc);
    let total = 0;
    for (const el of mains) total += el.scrollHeight;
    const fontPx = rowCqh / 100 * contentH * sc;
    // 글자 높이 합 + 언어 사이 띄움(칸마다 위·아래 절반씩) + 위·아래 여백이 슬라이드 높이 안에 들어가야 함
    return total + refPx + mains.length * fontPx * langGap + 2 * fontPx * padY <= contentH;
  };
  // 대부분은 100%로 그냥 들어가므로 먼저 한 번만 확인하고, 안 들어갈 때만 이진 탐색으로 가장 큰 크기를 찾는다
  let scale = 1;
  if (!fits(1)) {
    let lo = 0.25, hi = 1; // lo: 들어가는(또는 최소) 배율, hi: 안 들어가는 배율
    if (fits(lo)) {
      while (hi - lo > 0.01) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid; else hi = mid;
      }
    }
    scale = Math.round(lo * 1000) / 1000;
    row.style.setProperty("--fit-scale", scale);
  }

  const effPt = Math.max(14, Math.round(targetPt * scale));
  row.dataset.effPt = effPt;

  // 총 줄 수(참고용): 각 언어 자리를 그 자리에 실제로 적용된 글자 크기 기준 줄 높이(1.2배)로 나눠 더함.
  const effFontPx = rowCqh / 100 * row.clientHeight * scale;
  let totalLines = 0;
  if (effFontPx > 0) mains.forEach(el => { totalLines += Math.max(1, Math.round(el.scrollHeight / (effFontPx * 1.2))); });

  badge.style.display = "block";
  const tag = isCustom ? "개별 · " : "";
  badge.textContent = scale < 0.995
    ? `${tag}${totalLines}줄 · ${targetPt}pt → ${effPt}pt로 축소`
    : `${tag}${totalLines}줄 · ${effPt}pt (여유)`;
  // 권장 범위(80~85pt)를 벗어난 실제 적용 크기는 눈에 띄게 경고 표시(직접 정한 크기는 경고하지 않음)
  badge.classList.toggle("out-of-range", !isCustom && (effPt < 80 || effPt > 85));
}

function recomputeAllFits() {
  [...right.children].forEach(block => computeFitScale(block._row));
}
const recomputeAllFitsSoon = debounce(recomputeAllFits, 60);

// ---------------------------------------------------------------------
// 오른쪽 전체 내용을 텍스트로 뽑아 클립보드에 한 번에 복사
// (슬라이드 한 장 = 한 문단. 화면 밖으로 꺼둔 언어는 괄호로 표시된 그대로 포함)
// ---------------------------------------------------------------------
// 슬라이드 한 장 = 한 문단. 문단마다 언어별 글자(제외한 언어는 뺌, "( ) 복사" 언어는 괄호로 함께)와
// 언어별 원문(byLang)을 함께 돌려준다. 번호(no)는 실제 슬라이드 번호.
function collectSlidesForCopy() {
  const slides = [];
  [...right.children].forEach((block, i) => {
    const byLang = {};
    LANGS.forEach(({ code }) => {
      const slot = block._slots[code];
      byLang[code] = slot.classList.contains("empty") ? "" : slot._main.textContent.trim();
    });
    const parts = [];
    orderedLangs().forEach(({ code }) => {
      if (hiddenSet.has(code)) return; // "제외"한 언어는 복사에서도 뺌
      if (!byLang[code]) return;
      parts.push({ code, text: byLang[code], paren: parenSet.has(code) });
    });
    const effPt = parseInt(block._row.dataset.effPt, 10);
    if (parts.length) slides.push({ no: i + 1, pt: Number.isFinite(effPt) && effPt > 0 ? effPt : getFontSizeInputValue(), byLang, parts });
  });
  return slides;
}
// 한 슬라이드 = 한 문단: 언어마다 한 줄씩(줄바꿈), 슬라이드 사이는 빈 줄 한 줄로 나눈다
function slideLineText(s) {
  const r0 = appMode === "db" ? dbRefStr : refDisplay(readRefs()[s.no - 1] || "");
  const ref = r0 ? r0 + "\n" : ""; // 성경 슬라이드: 문단 제일 위에 "책 이름 장:절"
  return ref + s.parts.map(p => p.paren ? "(" + p.text + ")" : p.text).join("\n");
}

async function copyToClipboard(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(okMsg);
    } catch (e2) {
      showToast("복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.", true);
    }
    document.body.removeChild(ta);
  }
}

// ---------------------------------------------------------------------
// 전체 텍스트 창: 메모장처럼 글자만 보여준다. 한 슬라이드 = 한 문단(언어마다 한 줄, 슬라이드 사이는 빈 줄).
// 창을 열어도 자동으로 복사되지 않고, 자유롭게 고친 뒤 [복사]를 눌러야 복사된다. 문단마다 언어별 글만 나옴(번호·글자 크기 없음).
// ---------------------------------------------------------------------
const copyOverlay = document.getElementById("copyOverlay");
const copyText = document.getElementById("copyText");
document.getElementById("copyTextBtn").addEventListener("click", () =>
  copyToClipboard(copyText.value, "복사했어요."));
(function () {
  const close = () => copyOverlay.classList.remove("open");
  document.getElementById("copyCloseBtn").addEventListener("click", close);
  copyOverlay.addEventListener("click", e => { if (e.target === copyOverlay) close(); });
})();

// 전체 복사 창. 슬라이드 만들기 = 슬라이드 범위 드롭다운(기본 전부) / 성경 DB = 성경·장·절 드롭다운(성경 불러오기와 같은 맥 스타일)
// 고른 범위의 글이 아래 칸에 나오고, 필요하면 고친 뒤 [복사]를 누르면 복사된다.
let ctSlides = [];
const ssFrom = document.getElementById("ssFrom"), ssTo = document.getElementById("ssTo");
let ssInited = false;
function ssRange() { return ssFrom.value === "" ? null : [Math.min(+ssFrom.value, +ssTo.value), Math.max(+ssFrom.value, +ssTo.value)]; }
function ssFirstWords(s) { const x = String((s.parts[0] && s.parts[0].text) || "").replace(/\s+/g, " ").trim(); return x.length > 36 ? x.slice(0, 36) + "…" : x; }
function ssRefresh() {
  macSyncs.forEach(f => f());
  const r = ssRange(), n = ctSlides.length;
  const pick = r ? ctSlides.slice(r[0], r[1] + 1) : [];
  copyText.value = pick.map(slideLineText).join("\n\n");
  document.getElementById("ctSub").textContent = !n ? "복사할 슬라이드가 없어요."
    : (pick.length === n ? "슬라이드 전부 " + n + "장" : "슬라이드 " + n + "장 중 " + pick.length + "장") + " · 문단마다 언어별 글만 나와요. 필요하면 고친 뒤 [복사]를 눌러 주세요.";
}
function ssInit() {
  if (ssInited) return; ssInited = true;
  const ctx = { book: null, chap: null, from: ssFrom, to: ssTo, cells: () => ctSlides.map((s, i) => ({ label: String(s.no), item: i, title: ssFirstWords(s) })),
    loaded: () => true, range: ssRange, update: ssRefresh, all: () => { ssFill(); ssRefresh(); }, unit: "슬라이드", allText: "전부", emptyMsg: "슬라이드가 없어요." };
  pkMake([ssFrom, ssTo], () => {
    const n = ctSlides.length, r = ssRange();
    if (!n || !r) return { text: "슬라이드 선택", ph: true };
    if (r[0] === 0 && r[1] === n - 1) return { text: "전부 (" + n + "장)" };
    const a = ctSlides[r[0]].no, b = ctSlides[r[1]].no;
    return { text: a === b ? a + "번" : a + " ~ " + b + "번" };
  }, 120, close => pkVerseMenu(close, ctx)).title = "슬라이드 고르기 (시작 → 끝, 기본은 전부)";
}
function ssFill() { // 슬라이드 목록을 채우고 기본값 = 전부
  [ssFrom, ssTo].forEach(sel => { sel.textContent = ""; ctSlides.forEach((s, i) => { const o = document.createElement("option"); o.value = String(i); o.textContent = String(s.no); sel.appendChild(o); }); });
  ssFrom.value = ctSlides.length ? "0" : ""; ssTo.value = ctSlides.length ? String(ctSlides.length - 1) : "";
}
function copyAllText() {
  if (appMode !== "db") { // 슬라이드 만들기 모드
    syncSlides(); recomputeAllFits();
    ctSlides = collectSlidesForCopy();
    if (!ctSlides.length) { showToast("복사할 내용이 없어요. 왼쪽 칸에 원고를 먼저 붙여넣어 주세요.", true); return; }
    ssInit(); ssFill(); ssRefresh();
    copyOverlay.classList.add("open"); // 열기만 하고 자동 복사는 하지 않음 — [복사] 버튼을 눌러야 복사돼요
    return;
  }
  saveDbNow();
  ccOpen();
}
document.getElementById("copyAllBtn").addEventListener("click", copyAllText);

// ---------------------------------------------------------------------
// 상단 툴바: 기본 정렬
// ---------------------------------------------------------------------

function updateSizePlaceholders() {
  const v = String(getFontSizeInputValue());
  right.querySelectorAll(".sg-size-input").forEach(i => { i.placeholder = v; });
}
fontSizeInput.addEventListener("input", () => {
  syncFontCqhVars();
  recomputeAllFitsSoon(); // 숫자를 칠 때마다 전체 슬라이드를 바로 다시 계산하지 않고 잠깐 모아서 한 번에
  updateSizePlaceholders();
  saveStateDebounced();
});

const alignSeg = document.getElementById("alignSeg");
alignSeg.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    setDefaultAlign(btn.dataset.align);
    if (appMode === "db") dbAlign = defaultAlign; // 성경 DB 모드에서 바꾼 정렬은 그 모드에서만 기억
    saveStateDebounced();
  });
});
// 기본 정렬을 바꾸고 툴바 표시·슬라이드에 바로 반영
function setDefaultAlign(a) {
  defaultAlign = a;
  alignSeg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.align === a));
  right.querySelectorAll(".slide-block").forEach((blk, i) => applySlideOpts(blk, i));
}
let dbAlign = "right";       // 성경 DB 모드의 기본 정렬: 오른쪽
let slideAlignSnap = "left"; // DB 모드에 들어가기 전 슬라이드 만들기 모드의 기본 정렬(돌아올 때 복원)
