"use strict";

// ── 줄(슬라이드) 모델 ──
// 성경에서 불러온 조각(data-ref)은 "기준점"이다. 기준점 사이의 일반 조각은 언어마다 개수가 달라도 되고(원래대로),
// 기준점(성경 조각)은 모든 언어 칸에서 항상 같은 줄에 온다. 한 언어 칸이 조각을 늘려도 다른 칸에 조각이 생기지 않고,
// 다른 칸은 그 만큼 화면에서만 비워 두고(보이지 않는 여백) 성경 줄을 같은 높이에 맞춘다.
function buildRowMap() {
  const per = [...left.querySelectorAll(":scope > .col")].map(col => {
    const segs = [[]], refs = [];
    col.querySelectorAll(":scope > .box").forEach(b => { if (b.dataset.ref) { refs.push(b); segs.push([]); } else segs[segs.length - 1].push(b); });
    return { code: col.dataset.lang, segs, refs };
  });
  const K = Math.max(0, ...per.map(p => p.refs.length)), rows = [];
  for (let s = 0; s <= K; s++) {
    const n = Math.max(0, ...per.map(p => (p.segs[s] || []).length));
    for (let j = 0; j < n; j++) { const by = {}; per.forEach(p => { by[p.code] = (p.segs[s] || [])[j] || null; }); rows.push({ by, anchor: false }); }
    if (s < K) { const by = {}; per.forEach(p => { by[p.code] = p.refs[s] || null; }); rows.push({ by, anchor: true }); }
  }
  return rows;
}
const rowHas = (r, box) => Object.values(r.by).includes(box);
function rowIndexOf(box, rows) { return (rows || buildRowMap()).findIndex(r => rowHas(r, box)); }
// 칸(column) 안 조각들의 왼쪽 위 번호를 "줄 번호(=슬라이드 번호)"로 다시 매김. 조각은 항상 1개 이상 있다.
function renumberColumn(col) {
  buildRowMap().forEach((r, i) => Object.values(r.by).forEach(b => {
    if (!b) return;
    const t = String(i + 1);
    if (b._num.textContent !== t) b._num.textContent = t;
  }));
  alignRowsSoon();
  refreshInfoSoon();
}
function shiftOpts(idx, d) { // 성경 줄이 밀리거나 당겨질 때 슬라이드별 글자 크기·정렬도 같이 따라가게
  while (slideOpts.length < idx) slideOpts.push({ size: 0, align: "" });
  if (d > 0) slideOpts.splice(idx, 0, { size: 0, align: "" });
  else if (idx < slideOpts.length) slideOpts.splice(idx, 1);
}
// 이 칸에서 조각 개수가 바뀐 뒤: 줄 수가 바뀌었고 뒤에 성경 줄이 있으면 그 줄의 설정이 같이 밀리도록 옮김
function followRefOpts(rowsBefore, rowsAfter, refBox, sign) {
  if (rowsBefore.length === rowsAfter.length) return;
  const rs = sign > 0 ? rowsAfter : rowsBefore, at = rowIndexOf(refBox, rs);
  const nextAnchor = rs.findIndex((r, i) => i > at && r.anchor);
  if (nextAnchor < 0) return;
  shiftOpts(nextAnchor - 1, sign);
}

// 여러 조각의 높이를 한꺼번에 맞춘다: 전부 auto로 푼 뒤 → 높이를 한 번에 읽고 → 한 번에 적용
const growQueue = new Set();
let growRaf = 0;
function autoGrowSoon(ta) {
  growQueue.add(ta);
  if (growRaf) return;
  growRaf = requestAnimationFrame(() => {
    growRaf = 0;
    const list = [...growQueue];
    growQueue.clear();
    list.forEach(t => { t.style.height = "auto"; });
    const heights = list.map(t => t.scrollHeight);
    list.forEach((t, i) => { t.style.height = heights[i] + "px"; });
    alignRows(); // 높이가 바뀐 직후 같은 프레임에서 한 번만 정렬
  });
}

// 같은 번호(1번, 2번, ...)의 조각은 모든 언어 칸에서 같은 높이에 오도록 맞춘다.
// 한 칸의 조각이 길어지면 나머지 칸의 같은 번호 조각도 그만큼 늘어나서, 번호가 한 줄로 쭉 정렬된다.
// 조각 자신의 글자 높이(textarea)로 원래 높이를 계산하므로, 늘려 놓은 min-height가 다시 계산에 섞이지 않는다.
let alignRaf = 0;
function alignRowsSoon() {
  if (alignRaf || growRaf) return; // 높이 계산이 예약돼 있으면 그 끝에서 정렬하므로 따로 예약하지 않음
  alignRaf = requestAnimationFrame(() => { alignRaf = 0; alignRows(); });
}
function alignRows() {
  const rows = buildRowMap(), cols = [...left.querySelectorAll(":scope > .col")];
  const want = rows.map(r => {
    let h = 0;
    Object.values(r.by).forEach(b => { if (b && b._ta) h = Math.max(h, b._ta.offsetHeight + (b.offsetHeight - b.clientHeight)); });
    return h;
  });
  cols.forEach(col => {
    const gap = parseFloat(getComputedStyle(col).rowGap) || 6;
    let skip = 0; // 이 칸에 조각이 없는 줄(다른 언어만 있는 줄)의 높이만큼 다음 조각 위를 비움
    rows.forEach((r, i) => {
      const b = r.by[col.dataset.lang];
      if (!b) { skip += want[i] + gap; return; }
      const v = want[i] ? want[i] + "px" : "", m = skip ? skip + "px" : "";
      if (b.style.minHeight !== v) b.style.minHeight = v;
      if (b.style.marginTop !== m) b.style.marginTop = m;
      skip = 0;
    });
  });
}
// 늘어나서 생긴 빈 부분을 눌러도 글상자에 커서가 들어가게 함
left.addEventListener("click", e => {
  const bx = e.target.closest ? e.target.closest(".box") : null;
  if (bx && bx.dataset.ref && appMode === "slide" && left.contains(bx)) { if (!isMulti(e)) selectRefRow(bx, true); return; } // 성경 조각은 글상자에 커서를 넣지 않고 줄 전체를 선택
  if (e.target.classList && e.target.classList.contains("box") && e.target._ta) e.target._ta.focus();
});
// 창 너비가 바뀌면 칸 너비가 바뀌어 줄바꿈이 달라지므로 높이를 다시 계산
let alignResizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(alignResizeTimer);
  alignResizeTimer = setTimeout(() => left.querySelectorAll("textarea").forEach(autoGrowSoon), 150);
});

// 칸 너비가 바뀌면 줄바꿈이 달라져 글 높이도 달라진다. 창 크기 이벤트만 보면 놓치는 경우(스크롤바 등장·사라짐,
// 화면 확대, 오른쪽 영역 변화, 글꼴 늦게 로드)가 있어서, 칸(.col) 너비 자체를 감시해 그 칸의 상자 높이를 다시 맞춘다.
// 높이만 바꾸고 너비는 건드리지 않으므로 서로를 계속 다시 부르지 않는다.
const colWidths = new WeakMap();
const colResizeObserver = new ResizeObserver(entries => {
  for (const en of entries) {
    const w = Math.round(en.contentRect.width);
    if (colWidths.get(en.target) === w) continue;
    colWidths.set(en.target, w);
    en.target.querySelectorAll(":scope > .box > textarea").forEach(autoGrowSoon);
  }
});
left.querySelectorAll(":scope > .col").forEach(c => colResizeObserver.observe(c));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => left.querySelectorAll("textarea").forEach(autoGrowSoon));

function addBox(col, lang, text, afterWrap, placeholder) {
  const wrap = document.createElement("div");
  wrap.className = "box";
  wrap.id = "b" + uid++;

  const numBadge = document.createElement("div");
  numBadge.className = "box-num";

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.rows = 1;
  if (placeholder) ta.placeholder = placeholder + " 텍스트 붙여넣기";

  const linkBtn = document.createElement("button");
  linkBtn.type = "button";
  linkBtn.className = "box-link";
  linkBtn.hidden = true;
  linkBtn.title = "이 조각이 들어간 슬라이드로 이동";

  wrap.appendChild(numBadge);
  wrap.appendChild(linkBtn);
  wrap.appendChild(ta);
  wrap._num = numBadge; wrap._link = linkBtn; wrap._ta = ta; // 자주 쓰는 요소는 기억해 두고 다시 찾지 않음

  if (afterWrap && afterWrap.nextSibling) col.insertBefore(wrap, afterWrap.nextSibling);
  else col.appendChild(wrap);
  autoGrowSoon(ta);
  if (!isRestoring) renumberColumn(col); // 원고를 한꺼번에 불러올 때는 끝난 뒤 한 번만 번호를 매김

  return ta;
}

// 조각(textarea)에서 일어나는 이벤트는 조각마다 리스너를 달지 않고 왼쪽 영역 전체에서 한 번만 받는다.
function boxOfEvent(e) {
  const ta = e.target;
  const wrap = ta && ta.tagName === "TEXTAREA" ? ta.parentElement : null;
  return wrap && wrap._ta === ta ? wrap : null;
}
// 마우스로 박스 안 글자를 드래그해 "원하는 만큼만" 선택하면, 바로 위 칸에 그 부분만 번역되어 뜬다
// 마우스를 누르고 끄는 "그 순간"에도 선택 범위가 바뀔 때마다 바로 번역(놓을 때까지 기다리지 않음)
left.addEventListener("mousedown", e => {
  const wrap = boxOfEvent(e);
  if (!wrap) return;
  const ta = wrap._ta;
  let last = "";
  const onMove = () => {
    const key = ta.selectionStart + "," + ta.selectionEnd;
    if (key === last) return;
    last = key;
    livePreview(wrap);
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    onMove(); // 놓은 자리의 최종 선택까지 반영
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
});
left.addEventListener("select", e => { const w = boxOfEvent(e); if (w) livePreview(w); });
left.addEventListener("keyup", e => { const w = boxOfEvent(e); if (w) debouncedSelectionPreview(w); }); // Shift+방향키 선택
left.addEventListener("focusout", e => { const w = boxOfEvent(e); if (w) resetColSelPreview(w.parentElement); });
left.addEventListener("input", e => {
  const w = boxOfEvent(e);
  if (!w) return;
  autoGrow(w._ta);
  alignRowsSoon();
  refreshInfoSoon();
  saveStateDebounced();
  syncSlidesSoon(); // 오른쪽 슬라이드는 왼쪽 조각을 그대로 비춰 주기만 한다
});
// 이 조각이 놓인 "성경 구절 사이 칸"(기준점과 기준점 사이)에서, 다른 언어 칸이 이 칸보다 조각을 더 많이 가져서
// 이 칸에 비어 있는 자리(화면의 빈 여백)가 있는지 확인. 있으면 거기에 새 조각을 넣어도 줄 수가 늘지 않는다.
function hasBlankSlotBelow(wrap) {
  const info = [...left.querySelectorAll(":scope > .col")].map(c => {
    const segs = [0]; let mine = -1;
    c.querySelectorAll(":scope > .box").forEach(b => {
      if (b.dataset.ref) segs.push(0); else segs[segs.length - 1]++;
      if (b === wrap) mine = segs.length - 1;
    });
    return { segs, mine, col: c };
  });
  const me = info.find(x => x.col === wrap.parentElement);
  if (!me || me.mine < 0) return false;
  return info.some(x => x !== me && (x.segs[me.mine] || 0) > me.segs[me.mine]);
}
// Enter로 조각을 나눌 때 새(아래쪽) 조각을 어느 조각 뒤에 붙일지 정한다.
// 기본은 "나눈 조각 바로 아래". 예전에는 뒤따르는 성경 구절을 무조건 전부 건너뛰어 맨 아래로 보냈는데,
// 구절 사이에 자리가 있어도 그렇게 되는 문제가 있었다. 이제는 아래 세 조건이 모두 맞을 때만 구절 밑으로 보낸다:
//  ① 글이 아니라 빈 새 조각을 만드는 경우(커서가 맨 끝) — 글 중간을 나눈 뒷부분은 이어지는 글이라 바로 아래에 있어야 함
//  ② 뒤따르는 구절이 칸 끝까지 이어져 그 밑에 글 쓸 조각이 하나도 없음(구절 조각은 슬라이드 모드에서 잠겨 있어 밑에 글을 쓸 수 없기 때문)
//  ③ 이 조각이 구절과 구절 사이에 낀 조각이 아니고, 다른 언어 때문에 생긴 빈 자리도 없음
function splitTargetAfter(wrap, tail) {
  let last = wrap;
  for (let n = nextBoxSibling(last); n && n.dataset.ref; n = nextBoxSibling(last)) last = n;
  if (last === wrap) return wrap;                       // 바로 뒤가 성경 구절이 아니면 그냥 바로 아래
  if (tail.trim()) return wrap;                         // ① 글 중간에서 나눔
  if (nextBoxSibling(last)) return wrap;                // ② 구절 밑에 이미 쓸 수 있는 조각이 있음
  const prev = prevBoxSibling(wrap);
  if (prev && prev.dataset.ref) return wrap;            // ③ 구절 사이에 낀 조각
  if (hasBlankSlotBelow(wrap)) return wrap;             // ③ 다른 언어 때문에 비어 있는 자리가 있음
  return last;                                          // 구절 밑에 글 쓸 곳이 없을 때만: 구절 밑에 새 조각
}
left.addEventListener("keydown", e => {
  const wrap = boxOfEvent(e);
  if (!wrap) return;
  const ta = wrap._ta, col = wrap.parentElement;
  // 맨 앞에서 Backspace: 앞 조각과 합치기
  if (e.key === "Backspace" && !imeBusy(e) && ta.selectionStart === 0 && ta.selectionEnd === 0) {
    let prev = prevBoxSibling(wrap);
    if (prev && wrap.dataset.ref) { // 성경 조각 자체는 다른 조각과 합치지 않음
      e.preventDefault(); showToast("성경 구절은 한 슬라이드로 고정돼 있어서 합칠 수 없어요.", true);
      return;
    }
    // 성경 구절 바로 밑 조각: 성경 구절을 건너뛰어, 그 바로 위의 일반 조각으로 합침(성경 구절은 제자리)
    while (prev && prev.dataset.ref) prev = prevBoxSibling(prev);
    e.preventDefault();
    if (prev) mergeIntoPrevious(wrap, prev);
    else if (prevBoxSibling(wrap)) showToast("성경 구절 위에 합칠 조각이 없어요.", true);
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { // 한글 확정 Enter도 그 자리에서 바로 조각을 나눔(의도한 동작이라 keyCode 229는 일부러 보지 않음)
    e.preventDefault();
    if (wrap.dataset.ref) { showToast("성경 구절은 한 슬라이드로 고정돼 있어서 나눌 수 없어요.", true); return; } // 성경 조각은 나누지 않음
    pushUndo();
    const pos = ta.selectionStart;
    const head = ta.value.slice(0, pos), tail = ta.value.slice(pos);
    ta.value = head;
    autoGrow(ta);
    const rowsBefore = buildRowMap();
    // 새 조각은 기본적으로 나눈 조각 바로 아래에 붙음(성경 구절 사이의 자리에 그대로 남음).
    // 구절 밑으로 건너뛰는 건 splitTargetAfter()가 "그 밖에는 갈 곳이 없을 때"만 허용함
    const after = splitTargetAfter(wrap, tail);
    const nb = addBox(col, col.dataset.lang, tail, after);
    followRefOpts(rowsBefore, buildRowMap(), nb.closest(".box"), 1);
    nb.focus();
    nb.setSelectionRange(0, 0);
    saveStateDebounced();
    syncSlidesSoon();
  }
});
left.addEventListener("click", e => {
  const btn = e.target.closest ? e.target.closest(".box-link") : null;
  if (btn) goToSlideOf(btn.parentElement);
});
// 슬라이드 속 문장을 누르면 같은 번호의 원문 조각으로 이동(슬라이드마다 리스너를 달지 않음)
right.addEventListener("click", e => {
  const slot = e.target.closest ? e.target.closest(".slot") : null;
  if (slot && !slot.classList.contains("empty")) goToBoxOf(slot);
});

// ---------------------------------------------------------------------
// 오른쪽: 슬라이드 자리(row/slot)
// ---------------------------------------------------------------------
let slideSeq = 0;

// ---- 슬라이드별 개별 설정(글자 크기 · 좌우 정렬): 슬라이드 번호(위에서 N번째) 기준으로 저장 ----
let slideOpts = [];        // [{ size: 0(=기본 사용) | pt, align: ""(=기본 정렬 사용) | "left"|"center"|"right" }]
let defaultAlign = "left"; // 툴바의 기본 정렬
const ALIGN_LABEL = { left: "왼쪽", center: "가운데", right: "오른쪽" };
function blockIndex(block) { return [...right.children].indexOf(block); } // #right 안에는 슬라이드 블록만 있음
function buildSlideControls(block) {
  const wrap = document.createElement("span");
  wrap.className = "sg-ctl";

  const size = document.createElement("span");
  size.className = "sg-size";
  size.title = "이 슬라이드만 글자 크기를 따로 정해요. 비워 두면 위쪽 기준 글자 크기를 따라가요";
  const input = document.createElement("input");
  input.type = "number"; input.min = "10"; input.max = "300"; input.className = "sg-size-input"; input.placeholder = String(getFontSizeInputValue());
  input.setAttribute("aria-label", "이 슬라이드 글자 크기(pt)");
  input.addEventListener("input", () => {
    const v = parseInt(input.value, 10);
    setSlideOpt(block, { size: Number.isFinite(v) && v >= 10 ? Math.min(300, v) : 0 });
  });
  input.addEventListener("change", () => { block._sig = null; applySlideOpts(block, blockIndex(block)); }); // 입력을 마치면 칸 표시를 정리
  const pt = document.createElement("span"); pt.textContent = "pt";
  size.appendChild(input); size.appendChild(pt);

  const seg = document.createElement("span");
  seg.className = "seg sg-align";
  block._alignBtns = ["left", "center", "right"].map(a => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.align = a; b.textContent = ALIGN_LABEL[a];
    b.title = "이 슬라이드만 " + ALIGN_LABEL[a] + " 정렬 (한 번 더 누르면 기본 정렬로)";
    b.addEventListener("click", () => {
      const o = slideOpts[blockIndex(block)] || {};
      setSlideOpt(block, { align: o.align === a ? "" : a });
    });
    seg.appendChild(b);
    return b;
  });

  const reset = document.createElement("button");
  reset.type = "button"; reset.className = "sg-reset"; reset.textContent = "↺";
  reset.title = "이 슬라이드의 개별 설정을 지우고 기본값으로";
  reset.addEventListener("click", () => setSlideOpt(block, { size: 0, align: "" }));

  block._sizeInput = input;
  block._reset = reset;
  wrap.appendChild(size); wrap.appendChild(seg); wrap.appendChild(reset);
  return wrap;
}
// 바뀐 게 있을 때만 화면을 고치고, 바뀌었는지를 돌려준다
function applySlideOpts(block, i) {
  const o = slideOpts[i] || { size: 0, align: "" };
  const align = o.align || defaultAlign;
  const sig = (o.size || 0) + "|" + align + "|" + (o.align || "");
  if (block._sig === sig) return false;
  block._sig = sig;
  block._row.dataset.tpt = o.size ? String(o.size) : "";
  block._row.dataset.align = align;
  if (document.activeElement !== block._sizeInput) block._sizeInput.value = o.size ? String(o.size) : "";
  block._alignBtns.forEach(b => b.classList.toggle("active", b.dataset.align === o.align));
  block._reset.style.visibility = (o.size || o.align) ? "visible" : "hidden";
  return true;
}
function setSlideOpt(block, patch) {
  const i = blockIndex(block);
  if (i < 0) return;
  slideOpts[i] = Object.assign({ size: 0, align: "" }, slideOpts[i] || {}, patch);
  applySlideOpts(block, i);
  computeFitScale(block._row);
  saveStateDebounced();
}

function newRow() {
  const block = document.createElement("div");
  block.className = "slide-block";
  block.id = "slide" + slideSeq++;

  const grip = document.createElement("div");
  grip.className = "slide-grip";
  const gripTitle = document.createElement("span");
  gripTitle.className = "sg-title";
  gripTitle.textContent = "슬라이드";
  const gripWarn = document.createElement("span");
  gripWarn.className = "sg-warn";
  grip.appendChild(gripTitle);
  const gripRef = document.createElement("span");
  gripRef.className = "sg-ref"; gripRef.hidden = true;
  grip.appendChild(gripRef);
  const mv = document.createElement("span");
  mv.className = "sg-mv"; mv.hidden = true;
  const upBtn = document.createElement("button"), downBtn = document.createElement("button");
  upBtn.type = downBtn.type = "button";
  upBtn.textContent = "▲"; downBtn.textContent = "▼";
  upBtn.title = "이 슬라이드를 한 칸 위로"; downBtn.title = "이 슬라이드를 한 칸 아래로";
  upBtn.setAttribute("aria-label", "이 슬라이드를 한 칸 위로"); downBtn.setAttribute("aria-label", "이 슬라이드를 한 칸 아래로");
  upBtn.addEventListener("click", () => moveSlide(blockIndex(block), -1));
  downBtn.addEventListener("click", () => moveSlide(blockIndex(block), 1));
  mv.append(upBtn, downBtn);
  grip.appendChild(mv);
  block._ref = gripRef; block._mv = mv; block._up = upBtn; block._down = downBtn;
  grip.appendChild(buildSlideControls(block));
  grip.appendChild(gripWarn);
  const delBtn = document.createElement("button");
  delBtn.type = "button"; delBtn.className = "sg-del"; delBtn.hidden = true; delBtn.textContent = "✕";
  delBtn.title = "이 성경 슬라이드 지우기"; delBtn.setAttribute("aria-label", "이 성경 슬라이드 지우기");
  delBtn.addEventListener("click", () => deleteSlide(blockIndex(block)));
  grip.appendChild(delBtn);
  block._del = delBtn;
  block.appendChild(grip);
  block._title = gripTitle; block._warn = gripWarn;

  const row = document.createElement("div");
  row.className = "row";
  const badge = document.createElement("div");
  badge.className = "fit-badge";
  badge.style.display = "none";
  row.appendChild(badge);
  row._badge = badge;
  const refTag = document.createElement("div");
  refTag.className = "ref-tag";
  refTag.textContent = dbRefStr;
  row.appendChild(refTag);
  block._row = row;
  block._slots = {};
  LANGS.forEach(({ code, label }) => {
    const slot = document.createElement("div");
    slot.className = "slot empty";
    slot.dataset.lang = code;
    if (!inSlide(code)) slot.classList.add("hid"); // 슬라이드에 안 넣는 언어(( ) 복사·제외)면 새 자리도 처음부터 숨김

    const main = document.createElement("div");
    main.className = "slot-main";
    main.textContent = label;

    slot.appendChild(main);
    slot._main = main;
    block._slots[code] = slot;
    row.appendChild(slot);
  });
  block.appendChild(row);

  // 슬라이드 밑: 4개 언어를 각각 작은 글씨로 나열해, 같은 슬라이드에 같은 내용이 들어갔는지 대조 확인용
  const check = document.createElement("div");
  check.className = "slide-check";
  block._check = check;
  block._lines = {};
  LANGS.forEach(({ code, label }) => {
    const line = document.createElement("div");
    line.className = "chk-line";
    line.dataset.lang = code;
    if (hiddenSet.has(code)) line.classList.add("hid");
    if (parenSet.has(code)) line.classList.add("par");

    const langEl = document.createElement("span");
    langEl.className = "chk-lang";
    langEl.textContent = label;

    const textEl = document.createElement("span");
    textEl.className = "chk-text empty";
    textEl.textContent = "(비어있음)";

    line.appendChild(langEl);
    line.appendChild(textEl);
    line._text = textEl;
    block._lines[code] = line;
    check.appendChild(line);
  });
  block.appendChild(check);

  right.appendChild(block);
  return block;
}

// ---------------------------------------------------------------------
// 오른쪽 슬라이드 = 왼쪽 조각을 그대로 비춰 주는 화면(투사).
// 오른쪽은 자기만의 상태를 갖지 않는다: 각 언어 칸의 N번 조각이 N번 슬라이드의 그 언어 자리에 들어가고,
// 왼쪽이 바뀔 때마다 이 함수가 오른쪽을 왼쪽 기준으로 다시 맞춘다(연결·고정·배치 기록 없음).
// 조각이 비어 있으면 그 자리는 빈 칸으로 보인다.
// ---------------------------------------------------------------------
// 왼쪽 원고를 한 번만 읽어 모아 둔다: 여러 갱신 함수가 같은 조각을 저마다 다시 읽지 않도록 함
function readColumns() {
  const cols = {};
  left.querySelectorAll(".col").forEach(col => {
    cols[col.dataset.lang] = {
      col,
      items: [...col.querySelectorAll(".box")].map(box => {
        const value = box._ta.value;
        return { box, value, filled: NON_BLANK.test(value) };
      }),
    };
  });
  return cols;
}
// 줄(슬라이드)마다 { 언어: 조각 정보 | null } — 성경 조각은 모든 언어에서 같은 줄, 그 사이 일반 조각은 언어별로 위에서부터 채움
function rowsOf(cols) {
  const map = new Map();
  Object.values(cols).forEach(c => c.items.forEach(it => map.set(it.box, it)));
  return buildRowMap().map(r => {
    const o = {};
    Object.keys(r.by).forEach(code => { o[code] = r.by[code] ? map.get(r.by[code]) || null : null; });
    return o;
  });
}
function slideCountNeeded(cols) {
  const rows = rowsOf(cols);
  let n = 1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (Object.values(rows[i]).some(it => it && it.filled)) { n = Math.max(n, i + 1); break; }
  }
  return n;
}
function syncSlides() {
  const cols = readColumns();
  const need = slideCountNeeded(cols), rows = rowsOf(cols);
  const blocks = [...right.children];
  while (blocks.length < need) blocks.push(newRow());
  blocks.splice(need).forEach(b => b.remove());

  const changed = [];
  blocks.forEach((block, i) => {
    block.id = "slide" + i;
    let dirty = applySlideOpts(block, i);
    LANGS.forEach(({ code }) => {
      const slot = block._slots[code];
      const item = rows[i] && rows[i][code];
      const text = item && item.filled ? item.value : "";
      if (slot._synced && slot._text === text) return; // 바뀐 자리만 갱신
      slot._synced = true;
      slot._text = text;
      dirty = true;
      if (text) {
        slot._main.textContent = text.trim(); // 상자 안 Shift+Enter 줄바꿈은 white-space:pre-wrap으로 슬라이드에도 그대로 나옴(앞뒤 공백·빈 줄만 뺌)
        slot.classList.remove("empty");
      } else {
        slot._main.textContent = labelOf(code);
        slot.classList.add("empty");
      }
    });
    if (dirty) changed.push(block);
  });
  changed.forEach(block => { updateSlideCheck(block); computeFitScale(block._row); });
  refreshInfoSoon();
}
const syncSlidesSoon = debounce(syncSlides, 60);

// ---------------------------------------------------------------------
// 사용 편의: 알림(toast) · 원문↔슬라이드 이동 · 조각 수/경고 표시 · 조각 합치기 · 작업 내용 지우기
// ---------------------------------------------------------------------
const toastEl = document.getElementById("toast");
let toastTimer = null;
function showToast(msg, isError, ms) { // ms: 보여 줄 시간(생략하면 기본: 일반 2.6초, 오류 4.5초)
  toastEl.textContent = msg;
  toastEl.classList.toggle("error", !!isError);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms || (isError ? 4500 : 2600));
}

function smoothBehavior() {
  return (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth";
}
function flash(el) {
  el.classList.remove("flash");
  void el.offsetWidth; // 애니메이션을 처음부터 다시 재생
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1200);
}
// 조각 → 같은 번호의 슬라이드로 이동
function goToSlideOf(box) {
  const i = rowIndexOf(box);
  const block = right.children[i];
  if (!block) return;
  block.scrollIntoView({ behavior: smoothBehavior(), block: "center" });
  flash(block._row);
}
// 슬라이드 속 문장 → 같은 번호의 원문 조각으로 이동해서 바로 수정할 수 있게 커서를 둠
function goToBoxOf(slot) {
  const block = slot.closest(".slide-block");
  const i = blockIndex(block);
  const row = buildRowMap()[i];
  const box = row && row.by[slot.dataset.lang];
  if (!box) return;
  if (box.dataset.ref && appMode === "slide") { selectRefRow(box, false); return; } // 성경 조각은 수정하지 않고 줄만 선택
  box.scrollIntoView({ behavior: smoothBehavior(), block: "center", inline: "nearest" });
  flash(box);
  box.querySelector("textarea").focus({ preventScroll: true });
}

function activeLangCodes(cols) {
  return LANGS.filter(({ code }) => cols[code] && cols[code].items.some(x => x.filled)).map(l => l.code);
}

// 칸 제목의 조각 수 + 다른 언어보다 적을 때 노란 경고
function updateColumnCounts(cols) {
  const counts = {};
  LANGS.forEach(({ code }) => { counts[code] = cols[code] ? cols[code].items.filter(x => x.filled).length : 0; });
  const max = Math.max(0, ...Object.values(counts));
  LANGS.forEach(({ code }) => {
    const el = cols[code] && cols[code].col._count;
    if (!el) return;
    const n = counts[code];
    const warn = n > 0 && n < max;
    el.textContent = n ? n + "조각" : "";
    el.classList.toggle("warn", warn);
    el.title = warn ? "다른 언어는 최대 " + max + "조각이에요. 문장을 나눈 개수가 맞는지 확인해 보세요." : "";
  });
}

// 슬라이드 번호 + 비어 있는 언어 경고
function updateSlideHeaders(cols) {
  const active = activeLangCodes(cols).filter(code => !hiddenSet.has(code));
  const shown = LANGS.filter(({ code }) => !hiddenSet.has(code));
  const refs = readRefs(), lastIdx = right.children.length - 1;
  [...right.children].forEach((block, i) => {
    const title = "슬라이드 " + (i + 1);
    if (block._title.textContent !== title) block._title.textContent = title;
    const raw = refs[i] || "", ref = refDisplay(raw);
    if (block._ref.textContent !== ref) block._ref.textContent = ref;
    block._ref.hidden = !raw; block._mv.hidden = !raw; block._del.hidden = !raw; // 성경에서 불러온 슬라이드에만 표시
    block.classList.toggle("bible", !!raw);
    if (appMode === "slide") { // 성경 DB 모드는 setRefTags가 따로 관리
      const tag = block._row.querySelector(".ref-tag");
      if (tag && tag.textContent !== ref) tag.textContent = ref;
      const want = raw ? "1" : "";
      if ((block._row.dataset.hasref || "") !== want) {
        if (want) block._row.dataset.hasref = want; else delete block._row.dataset.hasref;
        computeFitScale(block._row); // 위쪽 구절 자리만큼 글자 맞춤을 다시 계산
      }
    }
    block._up.disabled = i === 0; block._down.disabled = i === lastIdx;
    const isEmpty = code => block._slots[code].classList.contains("empty");
    const anyFilled = shown.some(({ code }) => !isEmpty(code));
    const missing = active.filter(isEmpty);
    block._warn.textContent = anyFilled && missing.length ? "⚠ " + missing.map(labelOf).join(", ") + " 비어 있음" : "";
  });
}

// 성경에서 불러온 번호의 조각(모든 언어 칸)에 보라색 표시와 "책 장:절"을 붙임
function updateBibleBoxes() {
  const inSlide = appMode === "slide";
  let selBoxes = null;
  if (refSelBox) { // 선택된 줄이 아직 있는지 확인
    if (!inSlide || !refSelBox.isConnected || !refSelBox.dataset.ref) refSelBox = null;
    else { const r = buildRowMap().find(r => rowHas(r, refSelBox)); selBoxes = r ? Object.values(r.by).filter(Boolean) : null; if (!selBoxes) refSelBox = null; }
  }
  left.querySelectorAll(":scope > .col").forEach(col => col.querySelectorAll(":scope > .box").forEach(b => {
    const r = b.dataset.ref || ""; // 표시는 조각에 붙어 다니므로 그 조각 자신의 표시만 본다
    b.classList.toggle("bible", !!r);
    b.classList.toggle("ref-sel", !!(selBoxes && selBoxes.includes(b)));
    const lock = !!r && inSlide; // 성경 조각은 슬라이드 만들기 모드에서 클릭·수정하지 않고, 줄 전체를 선택해서만 다룬다
    if (b._ta.readOnly !== lock) b._ta.readOnly = lock;
    if (lock) { if (b._ta.tabIndex !== -1) b._ta.tabIndex = -1; if (b.getAttribute("tabindex") !== "0") b.setAttribute("tabindex", "0"); }
    else { if (b._ta.tabIndex === -1) b._ta.removeAttribute("tabindex"); if (b.hasAttribute("tabindex")) b.removeAttribute("tabindex"); }
    const shownRef = refDisplay(r, true); // 왼쪽 조각 표시에는 어느 페이지인지 (a)(b)를 남김
    if ((b._num.dataset.ref || "") !== shownRef) { if (r) b._num.dataset.ref = shownRef; else delete b._num.dataset.ref; }
  }));
}
// ---- 성경 줄 선택(슬라이드 만들기 모드): 한 번 누르면 4개 언어 조각이 한꺼번에 선택되고, ↑ ↓ 로 줄 위치를 옮김 ----
function selectRefRow(box, scrollRight) {
  if (!box || !box.dataset.ref) return;
  clearPicked();
  refSelBox = box;
  updateBibleBoxes();
  box.focus({ preventScroll: true });
  if (scrollRight) goToSlideOf(box);
}
function clearRefSel() { if (!refSelBox) return; refSelBox = null; updateBibleBoxes(); }
left.addEventListener("keydown", e => {
  const bx = e.target && e.target.classList && e.target.classList.contains("box") ? e.target : null;
  if (!bx || !bx.dataset.ref || appMode !== "slide" || imeBusy(e) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (e.key === "Escape") { e.preventDefault(); clearRefSel(); return; }
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault(); e.stopPropagation();
  if (refSelBox !== bx) selectRefRow(bx, false);
  const i = rowIndexOf(refSelBox), d = e.key === "ArrowUp" ? -1 : 1;
  if (i < 0) return;
  const n = right.children.length;
  if (i + d < 0 || i + d >= n) { showToast(d < 0 ? "맨 위예요." : "맨 아래예요."); return; }
  moveSlide(i, d);
  const nb = refSelBox; // 조각을 옮기면 포커스가 풀리므로 다시 잡아 줌(연속으로 방향키를 누를 수 있게)
  if (nb && nb.isConnected) { nb.focus({ preventScroll: true }); nb.scrollIntoView({ block: "nearest", behavior: "auto" }); }
}, true);
// 선택된 성경 줄(4개 언어 조각)에서 Backspace / Delete: 그 슬라이드를 ✕ 버튼과 똑같이 지움(Ctrl+Z로 되돌릴 수 있음)
left.addEventListener("keydown", e => {
  if ((e.key !== "Backspace" && e.key !== "Delete") || imeBusy(e) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (appMode !== "slide" || !refSelBox || picked.size) return; // Ctrl/⌘+클릭으로 여러 조각을 고른 경우는 deletePicked()가 처리
  const bx = e.target && e.target.closest ? e.target.closest(".box") : null;
  if (!bx || !bx.dataset.ref || !left.contains(bx)) return;     // 성경 줄에 포커스가 있을 때만
  const rows = buildRowMap(), i = rowIndexOf(refSelBox, rows);
  if (i < 0 || !rowHas(rows[i], bx)) return;                    // 선택된 줄의 조각일 때만
  e.preventDefault(); e.stopPropagation();
  if (!readRefs()[i]) { showToast("이 줄은 언어마다 성경 표시가 달라서 지울 수 없어요. 오른쪽 위 ✕를 써 주세요.", true); return; }
  deleteSlide(i);
}, true);
// 성경 줄이 아닌 곳을 누르면 선택 해제
document.addEventListener("mousedown", e => {
  if (!refSelBox) return;
  const bx = e.target.closest ? e.target.closest(".box") : null;
  if ((bx && bx.dataset.ref && left.contains(bx)) || (e.target.closest && e.target.closest(".slot"))) return; // 성경 줄 누름은 각자 처리
  clearRefSel();
}, true);
// 조각 오른쪽 위 "슬라이드 N" 버튼 (N번 조각 = N번 슬라이드)
function updateBoxLinks(cols) {
  const total = right.children.length, rows = buildRowMap(), rowNo = new Map();
  rows.forEach((r, i) => Object.values(r.by).forEach(b => { if (b) rowNo.set(b, i); }));
  LANGS.forEach(({ code }) => {
    if (!cols[code]) return;
    cols[code].items.forEach(it => {
      const i = rowNo.get(it.box), btn = it.box._link;
      const show = i < total && it.filled;
      if (btn.hidden === show) btn.hidden = !show;
      if (show) {
        const t = "슬라이드 " + (i + 1);
        if (btn.textContent !== t) btn.textContent = t;
      }
    });
  });
}

// 비어 있으면 사용 순서, 내용이 생기면 단축 키 안내
function updateHelpBars(cols) {
  const hasText = activeLangCodes(cols).length > 0;
  const hasSlot = !!right.querySelector(".slot:not(.empty)");
  const has = hasText || hasSlot;
  guideBar.hidden = has;
  tipsBar.hidden = !has;
}

function refreshInfo() {
  const cols = readColumns();
  updateColumnCounts(cols);
  updateSlideHeaders(cols);
  updateBoxLinks(cols);
  updateBibleBoxes();
  updateHelpBars(cols);
}
const refreshInfoSoon = debounce(refreshInfo, 80);

// ---- 조각 합치기(맨 앞에서 Backspace) ----
function nextBoxSibling(boxEl) {
  let sib = boxEl.nextElementSibling;
  while (sib && !sib.classList.contains("box")) sib = sib.nextElementSibling;
  return sib;
}
function prevBoxSibling(boxEl) {
  let sib = boxEl.previousElementSibling;
  while (sib && !sib.classList.contains("box")) sib = sib.previousElementSibling;
  return sib;
}
function mergeIntoPrevious(curr, prev) {
  pushUndo();
  const col = curr.closest(".col");
  const currTa = curr.querySelector("textarea");
  const prevTa = prev.querySelector("textarea");
  const caret = prevTa.value.length;
  const rowsBefore = buildRowMap();
  prevTa.value += currTa.value;
  autoGrow(prevTa);
  curr.remove();
  followRefOpts(rowsBefore, buildRowMap(), curr, -1);
  renumberColumn(col);
  prevTa.focus();
  prevTa.setSelectionRange(caret, caret);
  syncSlides(); // 오른쪽은 왼쪽을 다시 비추기만 하면 된다
  saveStateDebounced();
}


// ---- 여러 조각 선택(Ctrl/⌘+클릭) · 한 번에 삭제 · 되돌리기/다시 ----
const picked = new Set();
function setPicked(box, on) { if (on) picked.add(box); else picked.delete(box); box.classList.toggle("picked", on); }
function clearPicked() { picked.forEach(b => b.classList.remove("picked")); picked.clear(); }
const isMulti = e => e.ctrlKey || e.metaKey;
left.addEventListener("mousedown", e => {
  const box = e.target.closest ? e.target.closest(".box") : null;
  if (!box || !left.contains(box)) { clearPicked(); return; }
  if (!isMulti(e)) { clearPicked(); return; }
  e.preventDefault(); e.stopPropagation(); // 커서를 옮기거나 글자 선택 번역이 시작되지 않게
  const ae = document.activeElement, cur = ae && ae.tagName === "TEXTAREA" ? ae.closest(".box") : null;
  if (cur && left.contains(cur) && !picked.size) setPicked(cur, true); // 커서가 있던 조각도 함께 선택
  if (ae && ae.blur) ae.blur();
  setPicked(box, !picked.has(box));
}, true);
left.addEventListener("click", e => { if (isMulti(e) && e.target.closest && e.target.closest(".box")) e.stopPropagation(); }, true); // Ctrl/⌘+클릭은 커서를 넣지 않고 선택만
left.addEventListener("contextmenu", e => { if (e.ctrlKey && e.target.closest && e.target.closest(".box")) e.preventDefault(); }); // 맥의 Ctrl+클릭
document.addEventListener("mousedown", e => { if (picked.size && !left.contains(e.target)) clearPicked(); }, true);

const undoStack = [], redoStack = [], UNDO_MAX = 100;
let lastTypeAt = 0, lastTypeBox = null;
const undoBtn = document.getElementById("undoBtn"), redoBtn = document.getElementById("redoBtn");
function updateUndoBtn() { undoBtn.disabled = !undoStack.length; redoBtn.disabled = !redoStack.length; }
function takeSnap() {
  const cols = {};
  left.querySelectorAll(":scope > .col").forEach(c => {
    cols[c.dataset.lang] = [...c.querySelectorAll(":scope > .box")].map(b => ({ id: b.id, text: b._ta.value, ref: b.dataset.ref || "" }));
  });
  return { cols, opts: JSON.parse(JSON.stringify(slideOpts)) };
}
function pushUndo() { // 바꾸기 "직전" 상태를 저장
  undoStack.push(takeSnap()); if (undoStack.length > UNDO_MAX) undoStack.shift();
  redoStack.length = 0; lastTypeAt = 0; updateUndoBtn();
}
// 글 입력은 잠깐 멈출 때마다(1초) 한 단계로 묶어서 저장
left.addEventListener("beforeinput", e => {
  const w = boxOfEvent(e); if (!w) return;
  const typing = /^(insertText|insertCompositionText|deleteContentBackward|deleteContentForward)$/.test(e.inputType || "");
  const now = Date.now();
  if (!typing || now - lastTypeAt > 1000 || lastTypeBox !== w) pushUndo();
  lastTypeAt = now; lastTypeBox = w;
});
function applySnap(s) {
  clearPicked();
  const cols = [...left.querySelectorAll(":scope > .col")];
  const same = cols.every(c => {
    const cur = [...c.querySelectorAll(":scope > .box")], sv = s.cols[c.dataset.lang] || [];
    return cur.length === sv.length && cur.every((b, i) => b.id === sv[i].id);
  });
  let focusTa = null;
  if (same) { // 조각 개수·순서가 같으면 글만 되돌림(스크롤·화면 그대로)
    cols.forEach(c => [...c.querySelectorAll(":scope > .box")].forEach((b, i) => {
      const o = s.cols[c.dataset.lang][i];
      if (b._ta.value !== o.text) { b._ta.value = o.text; autoGrowSoon(b._ta); if (!focusTa) focusTa = b._ta; }
      if (o.ref) b.dataset.ref = o.ref; else delete b.dataset.ref;
    }));
  } else {
    const st = left.scrollTop, sl = left.scrollLeft;
    isRestoring = true;
    try {
      cols.forEach(c => {
        const lang = c.dataset.lang, sv = s.cols[lang] || [];
        c.querySelectorAll(":scope > .box").forEach(b => b.remove());
        let prev = null;
        sv.forEach(o => {
          const w = addBox(c, lang, o.text, prev, labelOf(lang)).closest(".box");
          w.id = o.id; if (o.ref) w.dataset.ref = o.ref; prev = w;
        });
        if (!sv.length) addBox(c, lang, "", null, labelOf(lang));
        renumberColumn(c); resetColSelPreview(c);
      });
    } finally { isRestoring = false; }
    let mx = -1; Object.values(s.cols).forEach(l => l.forEach(o => { const m = /^b(\d+)$/.exec(o.id || ""); if (m) mx = Math.max(mx, +m[1]); }));
    uid = Math.max(uid, mx + 1); // 되돌린 조각 id와 새로 만들 id가 겹치지 않게
    requestAnimationFrame(() => { left.scrollTop = st; left.scrollLeft = sl; }); // 상자 높이가 다시 잡힌 뒤 스크롤 위치 복원
  }
  slideOpts = JSON.parse(JSON.stringify(s.opts));
  syncSlides(); refreshInfo(); saveStateDebounced();
  if (focusTa) { focusTa.focus(); const n = focusTa.value.length; focusTa.setSelectionRange(n, n); }
}
function undo() {
  if (!undoStack.length) { showToast("되돌릴 내용이 없어요."); return; }
  redoStack.push(takeSnap()); applySnap(undoStack.pop()); lastTypeAt = 0; updateUndoBtn(); showToast("이전으로 되돌렸어요.");
}
function redo() {
  if (!redoStack.length) { showToast("다시 할 내용이 없어요."); return; }
  undoStack.push(takeSnap()); applySnap(redoStack.pop()); lastTypeAt = 0; updateUndoBtn(); showToast("다시 적용했어요.");
}
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

function deletePicked() {
  const n = picked.size; if (!n) return;
  pushUndo();
  isRestoring = true;
  try {
    left.querySelectorAll(":scope > .col").forEach(col => {
      const boxes = [...col.querySelectorAll(":scope > .box")], del = boxes.filter(b => picked.has(b));
      if (!del.length) return;
      if (del.length === boxes.length) { // 칸에는 조각이 항상 1개 이상: 하나만 남기고 비움
        del.slice(1).forEach(b => b.remove());
        del[0]._ta.value = ""; delete del[0].dataset.ref; autoGrowSoon(del[0]._ta);
      } else del.forEach(b => b.remove());
    });
  } finally { isRestoring = false; }
  clearPicked();
  left.querySelectorAll(":scope > .col").forEach(c => { renumberColumn(c); resetColSelPreview(c); });
  syncSlides(); refreshInfo(); saveStateDebounced();
  showToast(n + "개 조각을 지웠어요. Ctrl+Z로 되돌릴 수 있어요.");
}
document.addEventListener("keydown", e => {
  if (imeBusy(e) || document.querySelector(".patch-overlay.open")) return;
  const t = e.target, tag = t && t.tagName;
  if (e.key === "Escape") { clearPicked(); return; }
  if ((e.key === "Backspace" || e.key === "Delete") && picked.size && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    e.preventDefault(); e.stopPropagation(); deletePicked(); return;
  }
  if (!isMulti(e) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k !== "z" && k !== "y") return;
  if (/^(INPUT|SELECT)$/.test(tag) || (tag === "TEXTAREA" && !left.contains(t))) return; // 다른 입력칸은 기본 동작 유지
  e.preventDefault();
  if (k === "y" || e.shiftKey) redo(); else undo();
}, true);

// ---- 로컬 데이터 지우기 ----
// 두 모드 어디서든 사용. 지우는 대상은 이 PC 브라우저의 localStorage(원고 · 자동 백업 · 번역 캐시 · 설정 · 내가 수정한 성경 구절 초안)뿐이다.
// 홈페이지에 배포된 원본 DB(bibleDB 폴더의 장 파일)는 읽기만 하고 쓰거나 지우는 코드가 없으며, 새로고침하면 그대로 다시 불러온다.
// 이 도구 것이 아닌 저장값(같은 주소의 다른 사이트)도 건드리지 않는다.
async function wipeSlideLocalData() {
  let drafts = 0;
  try { const o = JSON.parse(localStorage.getItem(DB_KEY) || "null"); if (o && o.d) drafts = Object.keys(o.d).length; } catch (e) { /* 무시 */ }
  const wipeMsg = "이 PC의 브라우저에 저장된 로컬 데이터를 전부 지워요.\n\n· 슬라이드 원고와 설정\n· 자동 백업(최근 12개 + 24시간 보관)\n· 번역 캐시\n· 내가 수정한 성경 구절(DB 초안)" + (drafts ? " — 현재 " + drafts + "절" : "") + "\n\n홈페이지에 기록된 원본 DB는 지워지지 않아요. 새로 열면 그대로 다시 불러와요.\n내가 수정한 내용은 되돌릴 수 없으니, 먼저 'DB 코드 복사'로 관리자에게 보내 두고 필요한 원고는 백업·복구에서 파일로 저장해 두세요.\n\n계속할까요?";
  if (!(await macConfirm(wipeMsg, { title: "모든 데이터 삭제", ok: "모두 삭제", danger: true }))) return;
  if (drafts && !(await macConfirm("마지막 확인이에요.\n\n내가 수정한 성경 구절 " + drafts + "절이 이 PC에서 완전히 사라져요. 관리자에게 DB 코드를 보내셨나요?\n\n정말 지울까요?", { title: "수정한 성경 구절 삭제", ok: "삭제", danger: true }))) return;
  const wasReady = stateReady;
  localWiped = true; stateReady = false; dbCur = null; // 이 순간부터 자동 저장·캐시 저장·DB 초안 저장이 아무것도 다시 쓰지 않음
  let n = 0;
  try {
    Object.keys(localStorage).forEach(k => {
      const mine = k.startsWith("subtitleTool_") || k === "subtitleTheme" || k === "subtitleSlideBold";
      if (mine) { localStorage.removeItem(k); n++; }
    });
  } catch (e) { localWiped = false; stateReady = wasReady; showToast("삭제하지 못했어요. 브라우저 저장소를 쓸 수 없는 상태예요.", true); return; }
  glossCache = new Map();
  showToast("로컬 데이터·캐시 " + n + "개를 지웠어요. 홈페이지의 원본 DB를 다시 불러옵니다.");
  setTimeout(() => location.reload(), 700);
}
document.getElementById("wipeBtn").addEventListener("click", wipeSlideLocalData);

async function resetAll() {
  if (appMode === "db") { showToast("성경 DB 모드에서는 작업 내용 지우기를 쓸 수 없어요.", true); return; }
  if (!(await macConfirm("왼쪽 원고와 오른쪽 슬라이드가 모두 지워져요. 계속할까요?", { title: "작업 내용 지우기", ok: "지우기", danger: true }))) return;
  pushUndo();
  isRestoring = true;
  try {
    left.querySelectorAll(".box").forEach(b => b.remove());
    right.innerHTML = "";
    uid = 0; slideSeq = 0; slideOpts = [];
    left.querySelectorAll(".col").forEach(col => {
      addBox(col, col.dataset.lang, "", null, labelOf(col.dataset.lang));
      renumberColumn(col);
      resetColSelPreview(col);
    });
    syncSlides();
  } finally {
    isRestoring = false;
  }
  saveStateNow();
  refreshInfo();
  showToast("처음 상태로 되돌렸어요. 지우기 직전 내용은 🛡️ 백업·복구에서 되돌릴 수 있어요.");
}
document.getElementById("resetBtn").addEventListener("click", resetAll);

// ---- Esc로 창 닫기 / 세부 설정은 바깥을 누르면 닫힘 ----
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".patch-overlay.open").forEach(o => {
    const btn = o.querySelector(".patch-close-btn");
    if (btn) btn.click();
  });
  settingsMore.open = false;
  setComposeOpen(false);
});

// ---- 성경 표시 도우미 (예전에는 06-bible-db 안에 있었음: 시작할 때 이미 쓰여서 이쪽으로 옮김) ----
// 성경 책 이름(중국어 간체 和合本 · 인도네시아어 LAI) — 책 번호 1~66 순서. bibledb.js에 zh/id 이름이 있으면 그쪽을 먼저 씀
const BOOK_ZH = "创世记,出埃及记,利未记,民数记,申命记,约书亚记,士师记,路得记,撒母耳记上,撒母耳记下,列王纪上,列王纪下,历代志上,历代志下,以斯拉记,尼希米记,以斯帖记,约伯记,诗篇,箴言,传道书,雅歌,以赛亚书,耶利米书,耶利米哀歌,以西结书,但以理书,何西阿书,约珥书,阿摩司书,俄巴底亚书,约拿书,弥迦书,那鸿书,哈巴谷书,西番雅书,哈该书,撒迦利亚书,玛拉基书,马太福音,马可福音,路加福音,约翰福音,使徒行传,罗马书,哥林多前书,哥林多后书,加拉太书,以弗所书,腓立比书,歌罗西书,帖撒罗尼迦前书,帖撒罗尼迦后书,提摩太前书,提摩太后书,提多书,腓利门书,希伯来书,雅各书,彼得前书,彼得后书,约翰一书,约翰二书,约翰三书,犹大书,启示录".split(",");
const BOOK_ID = "Kejadian,Keluaran,Imamat,Bilangan,Ulangan,Yosua,Hakim-hakim,Rut,1 Samuel,2 Samuel,1 Raja-raja,2 Raja-raja,1 Tawarikh,2 Tawarikh,Ezra,Nehemia,Ester,Ayub,Mazmur,Amsal,Pengkhotbah,Kidung Agung,Yesaya,Yeremia,Ratapan,Yehezkiel,Daniel,Hosea,Yoel,Amos,Obaja,Yunus,Mikha,Nahum,Habakuk,Zefanya,Hagai,Zakharia,Maleakhi,Matius,Markus,Lukas,Yohanes,Kisah Para Rasul,Roma,1 Korintus,2 Korintus,Galatia,Efesus,Filipi,Kolose,1 Tesalonika,2 Tesalonika,1 Timotius,2 Timotius,Titus,Filemon,Ibrani,Yakobus,1 Petrus,2 Petrus,1 Yohanes,2 Yohanes,3 Yohanes,Yudas,Wahyu".split(",");
// 슬라이드 만들기 모드의 성경 표시: 조각에는 "BIB|영어책이름|장|절" 로 저장해 두고, 보여줄 때 슬라이드 만들기의 언어 설정에 맞춰 만든다.
// 영어 (한국어) 중국어 인도네시아어 장:절 순서 — "제외"한 언어는 뺀다(영어를 빼면 한국어는 괄호 없이). 예전 방식으로 저장된 글(요한복음 3:16)은 그대로 보여준다.
function bibleRefKey(en, ch, label) { return "BIB|" + en + "|" + ch + "|" + label; }
function refDisplay(raw, withPage) { // withPage === true 일 때만 "3:16 (a)"처럼 페이지 표시를 붙임. 슬라이드·복사·알림에는 숫자만("3:16")
  if (!raw || raw.slice(0, 4) !== "BIB|") return raw || "";
  const [, en, ch, lab0] = raw.split("|");
  const vr = /^(\d+)~(\d+)$/.exec(lab0 || ""), pm = /^(\d+)(?:([a-z])|-(\d+))$/.exec(lab0 || ""), lab = vr ? vr[1] + "-" + vr[2] : pm ? pm[1] : lab0; // "16a" → 16 / 페이지 a
  const b = window.BibleDB ? BibleDB.book(en) : null;
  if (!b) return en + " " + ch + ":" + lab + (withPage && pm ? " (" + (pm[2] || pm[3]) + ")" : "");
  const idx = (+b.no > 0 ? +b.no : BibleDB.books.indexOf(b) + 1) - 1;
  const nm = { en: b.en || en, ko: b.ko || "", zh: b.zh || BOOK_ZH[idx] || "", id: b.id || b.ind || BOOK_ID[idx] || "" };
  const on = c => !hiddenSet.has(c), out = [];
  if (on("en") && nm.en) out.push(nm.en);
  if (on("ko") && nm.ko) out.push(on("en") && nm.en ? "(" + nm.ko + ")" : nm.ko);
  if (on("zh") && nm.zh && !out.includes(nm.zh)) out.push(nm.zh);
  if (on("id") && nm.id && !out.includes(nm.id)) out.push(nm.id);
  out.push(ch + ":" + lab + (withPage && pm ? " (" + (pm[2] || pm[3]) + ")" : ""));
  return out.join(" ");
}
// 영어 (한국어) 중국어 인도네시아어 장:절 — 숫자(장:절)는 맨 끝에 한 번만
function dbRefText(s) {
  const b = window.BibleDB ? BibleDB.book(s.en) : null;
  if (!b) return s.en + " " + s.ch + ":" + s.v;
  const idx = (+b.no > 0 ? +b.no : BibleDB.books.indexOf(b) + 1) - 1;
  const zh = b.zh || BOOK_ZH[idx] || "", idn = b.id || b.ind || BOOK_ID[idx] || "";
  return [b.en + (b.ko ? " (" + b.ko + ")" : ""), zh, idn, s.ch + ":" + s.v + (s.vEnd > s.v ? "-" + s.vEnd : "")].filter(Boolean).join(" ");
}
function setRefTags(str) {
  dbRefStr = str || "";
  right.querySelectorAll(".ref-tag").forEach(t => { t.textContent = dbRefStr; });
}
// ---- 성경에서 불러온 슬라이드 표시 · 순서 바꾸기 ----
// 표시(예: "요한복음 3:16a")는 조각(상자)에 붙어 다니므로 조각을 옮기면 같이 움직인다. 슬라이드 N = 각 언어 칸의 N번 조각.
function readRefs() { // 슬라이드 번호(0부터) → 표시 문구
  // 그 줄에 조각이 있는 모든 언어 칸이 같은 표시를 가졌을 때만 성경 슬라이드로 본다.
  return buildRowMap().map(r => {
    const set = new Set();
    Object.values(r.by).forEach(b => { if (b) set.add(b.dataset.ref || ""); });
    return set.size === 1 ? [...set][0] : "";
  });
}
// 조각마다 따로 기억하는 표시(언어 칸별): 조각을 다시 만들 때(불러오기·모드 전환) 표시가 밀리거나 사라지지 않게 쓴다
function readOwnRefs() {
  const o = {};
  left.querySelectorAll(":scope > .col").forEach(col => { o[col.dataset.lang] = [...col.querySelectorAll(":scope > .box")].map(b => b.dataset.ref || ""); });
  return o;
}
function applyOwnRefs(o) {
  left.querySelectorAll(":scope > .col").forEach(col => col.querySelectorAll(":scope > .box").forEach((b, i) => {
    const r = ((o || {})[col.dataset.lang] || [])[i] || "";
    if (r) b.dataset.ref = r; else delete b.dataset.ref;
  }));
}
function applyRefs(refs) {
  left.querySelectorAll(":scope > .col").forEach(col => col.querySelectorAll(":scope > .box").forEach((b, i) => {
    if (refs[i]) b.dataset.ref = refs[i]; else delete b.dataset.ref;
  }));
}
// 성경 슬라이드 하나 지우기: 그 번호의 조각을 4개 언어 칸에서 모두 빼고, 뒤 슬라이드는 한 칸씩 당겨짐. 지우기 직전 상태는 자동 백업.
function deleteSlide(i) {
  const n = right.children.length;
  if (i < 0 || i >= n) return;
  const ref = readRefs()[i] || "";
  if (!ref) return; // 성경에서 불러온 슬라이드만 이 버튼으로 지움
  const before = serializeState(); if (textCount(before) > 0) pushBackup(before, "슬라이드 삭제 직전", true);
  pushUndo(); // Ctrl+Z로도 되돌릴 수 있게(성경 표시·슬라이드별 설정까지 함께 복원됨)
  const row = buildRowMap()[i];
  isRestoring = true;
  try {
    left.querySelectorAll(":scope > .col").forEach(col => {
      const box = row && row.by[col.dataset.lang];
      if (!box) return; // 이 언어 칸에 그 줄 조각이 없으면 할 일 없음
      if (col.querySelectorAll(":scope > .box").length === 1) { box._ta.value = ""; delete box.dataset.ref; autoGrowSoon(box._ta); } // 칸에는 조각이 항상 1개 이상
      else box.remove();
    });
  } finally { isRestoring = false; }
  if (i < slideOpts.length) slideOpts.splice(i, 1); // 슬라이드별 글자 크기·정렬도 같이 당김
  left.querySelectorAll(":scope > .col").forEach(col => { renumberColumn(col); resetColSelPreview(col); });
  syncSlides(); refreshInfo(); saveStateDebounced();
  showToast(refDisplay(ref) + " 슬라이드를 지웠어요. Ctrl+Z 또는 🛡️ 백업·복구에서 되돌릴 수 있어요.");
}
function moveSlide(i, d) {
  const j = i + d, n = right.children.length;
  if (i < 0 || j < 0 || j >= n) return;
  const cols = [...left.querySelectorAll(":scope > .col")], rows = buildRowMap();
  const ri = rows[i], rj = rows[j];
  if (!ri || !rj) return;
  isRestoring = true; // 조각을 옮기는 동안 번호·저장을 한 번에 처리
  try {
    cols.forEach(col => { // 이 칸에 두 줄의 조각이 다 있으면 자리를 맞바꿈. 한쪽만 있으면 그대로 두어도 줄 순서가 바뀐다(빈 조각을 만들지 않음)
      const a = ri.by[col.dataset.lang], b = rj.by[col.dataset.lang];
      if (!a || !b) return;
      const first = a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? a : b, second = first === a ? b : a;
      col.insertBefore(second, first);
    });
  } finally { isRestoring = false; }
  cols.forEach(renumberColumn);
  for (let k = 0; k < n; k++) if (!slideOpts[k]) slideOpts[k] = { size: 0, align: "" };
  [slideOpts[i], slideOpts[j]] = [slideOpts[j], slideOpts[i]]; // 슬라이드별 글자 크기·정렬도 슬라이드와 같이 이동
  syncSlides(); refreshInfo(); saveStateDebounced();
  const blk = right.children[j];
  if (blk) { blk.scrollIntoView({ behavior: smoothBehavior(), block: "nearest" }); flash(blk); }
  showToast("슬라이드 순서를 바꿨어요.");
}
