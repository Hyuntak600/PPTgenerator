"use strict";

// 원고 찾기: 한·중·영·인니 4개 언어 칸의 글자를 한꺼번에 검색하고, 찾은 조각으로 이동한다.
//  - 위쪽 [찾기] 버튼 또는 Ctrl/⌘+Shift+F → 왼쪽 원고 칸 위에 검색 줄이 뜸 (Ctrl/⌘+F는 브라우저 기본 검색 그대로 둠)
//  - 글자를 쓰면 바로 첫 결과로, Enter = 다음 · Shift+Enter = 이전 (끝에 닿으면 처음으로 돌아감). 대소문자는 구분하지 않음
//  - 찾은 조각마다 테두리가 생기고(지금 결과는 진하게), 오른쪽에서는 같은 번호의 슬라이드로 함께 이동
//  - Esc 또는 ✕: 검색 줄을 닫고, 지금 결과 자리에 커서를 둬서 바로 고칠 수 있게 함
//  - 원고·슬라이드 데이터는 건드리지 않음(보기만). 글자 선택 번역이 켜지지 않도록 글자를 "선택"하지 않고 커서만 둠
(function initFind() {
  const btn = document.getElementById("findBtn");
  if (!btn) return;
  let bar = null, inp = null, cnt = null, prevB = null, nextB = null;
  let pos = null, list = [], cur = -1;   // pos = 마지막으로 보여 준 자리 {row, ci, off}

  const norm = s => String(s).normalize("NFC").toLowerCase();
  const cmp = (a, b) => a.row - b.row || a.ci - b.ci || a.off - b.off;
  const viewOnly = () => document.documentElement.getAttribute("data-view") === "slides";

  function collect(q) { // 줄(슬라이드) 순서 → 언어 칸 순서 → 글 안의 위치 순서로 모두 모음
    const out = [];
    if (!q) return out;
    const order = [...left.querySelectorAll(":scope > .col")].map(c => c.dataset.lang);
    buildRowMap().forEach((r, ri) => order.forEach((code, ci) => {
      const b = r.by[code]; if (!b || !b._ta) return;
      const t = norm(b._ta.value);
      for (let i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + Math.max(1, q.length))) out.push({ row: ri, ci, code, off: i, len: q.length, box: b });
    }));
    return out;
  }
  function clearMarks() {
    left.querySelectorAll(".find-hit,.find-cur").forEach(b => b.classList.remove("find-hit", "find-cur"));
    left.querySelectorAll(".find-mirror").forEach(m => { if (m.parentNode && m.parentNode._fm === m) m.parentNode._fm = null; m.remove(); });
    right.querySelectorAll(":scope > .find-hit,:scope > .find-cur").forEach(b => b.classList.remove("find-hit", "find-cur"));
    if (HL) { CSS.highlights.delete("find-all"); CSS.highlights.delete("find-cur"); }
  }
  // 오른쪽 슬라이드 글자 위에도 찾은 단어만 칠함(브라우저의 글자 강조 기능 사용 — 글자를 선택하지 않고 데이터도 건드리지 않음)
  let curRange = null; // 오른쪽 슬라이드에서 지금 결과 단어의 자리
  const HL = !!(window.CSS && CSS.highlights && window.Highlight);
  function paintSlides(curHit) {
    if (!HL) return;
    const q = norm(inp.value), bs = right.querySelectorAll(":scope > .slide-block");
    if (!q) return;
    const all = new Highlight(), cu = new Highlight(), seen = new Map();
    curRange = null;
    list.forEach(m => { // 같은 조각 안에서 몇 번째 단어인지(순서)로 슬라이드 글자의 같은 단어를 찾음
      const slot = bs[m.row] && bs[m.row].querySelector('.slot[data-lang="' + m.code + '"] .slot-main');
      const node = slot && slot.firstChild;
      if (!node || node.nodeType !== 3) return;
      const k = seen.get(m.box) || 0; seen.set(m.box, k + 1);
      const t = norm(node.data); if (t.length !== node.data.length) return;
      let at = -1; for (let n = 0; n <= k; n++) { at = t.indexOf(q, at < 0 ? 0 : at + Math.max(1, q.length)); if (at < 0) return; }
      const r = new Range(); r.setStart(node, at); r.setEnd(node, at + q.length);
      if (m === curHit) curRange = r;
      (m === curHit ? cu : all).add(r);
    });
    CSS.highlights.set("find-all", all); CSS.highlights.set("find-cur", cu);
  }
  // 찾은 글자 자리에 노란 형광펜(지금 결과는 주황). 글자를 "선택"하지 않도록 글 상자 뒤에 같은 모양의 투명 글을 깔고 그 위에 표시함
  function paintMirror(box, hits, curHit) {
    const ta = box._ta; if (!ta) return;
    const val = ta.value;
    if (norm(val).length !== val.length) return; // 정규화로 글자 수가 달라지는 드문 경우는 상자 테두리만 표시
    let m = box._fm;
    if (!m || !m.isConnected) { m = document.createElement("div"); m.className = "find-mirror"; m.setAttribute("aria-hidden", "true"); box.insertBefore(m, box.firstChild); box._fm = m; }
    const cs = getComputedStyle(ta), st = m.style;
    st.fontFamily = cs.fontFamily; st.fontSize = cs.fontSize; st.fontWeight = cs.fontWeight; st.lineHeight = cs.lineHeight;
    st.letterSpacing = cs.letterSpacing; st.textAlign = cs.textAlign; st.tabSize = cs.tabSize;
    st.padding = cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft;
    m.textContent = "";
    let p = 0;
    hits.slice().sort((a, b) => a.off - b.off).forEach(h => {
      if (h.off < p) return;
      if (h.off > p) m.appendChild(document.createTextNode(val.slice(p, h.off)));
      const k = document.createElement("mark"); if (h === curHit) k.className = "cur";
      k.textContent = val.slice(h.off, h.off + h.len); m.appendChild(k); p = h.off + h.len;
    });
    if (p < val.length) m.appendChild(document.createTextNode(val.slice(p)));
  }
  function mark() {
    clearMarks();
    const by = new Map();
    list.forEach(m => { m.box.classList.add("find-hit"); if (!by.has(m.box)) by.set(m.box, []); by.get(m.box).push(m); });
    const curHit = cur >= 0 ? list[cur] : null;
    if (curHit) curHit.box.classList.add("find-cur");
    by.forEach((hits, box) => paintMirror(box, hits, curHit));
    const bs = right.querySelectorAll(":scope > .slide-block");
    list.forEach(m => { if (bs[m.row]) bs[m.row].classList.add("find-hit"); });
    if (curHit && bs[curHit.row]) bs[curHit.row].classList.add("find-cur");
    paintSlides(curHit);
  }
  function showCount() {
    if (!inp.value) { cnt.textContent = ""; }
    else if (!list.length) cnt.textContent = "0/0";
    else cnt.textContent = (cur >= 0 ? cur + 1 : "–") + "/" + list.length;
    cnt.classList.toggle("none", !!inp.value && !list.length);
    prevB.disabled = nextB.disabled = !list.length;
  }
  // 이동은 항상 "맨 위 첫째 줄"에 맞춤: 왼쪽은 조각의 맨 위를 칸 제목·번역 미리보기(고정 영역) 바로 아래에, 그 언어 칸을 맨 왼쪽에.
  function reveal(t, smooth) {
    const beh = smooth && typeof smoothBehavior === "function" ? smoothBehavior() : "auto";
    const hit = t.box._fm && t.box._fm.querySelector("mark.cur") || t.box; // 찾은 단어 자리(없으면 조각)
    const col = t.box.closest(".col"), head = col && col.querySelector(".col-head");
    const lr = left.getBoundingClientRect(), topInset = head ? head.getBoundingClientRect().bottom - lr.top + 6 : 6;
    const br = t.box.getBoundingClientRect();
    const target = br; // 조각이 길어도 항상 조각의 맨 위를 번역 칸 바로 아래에 맞춤
    const cr = (col || t.box).getBoundingClientRect();
    const padL = parseFloat(getComputedStyle(left).paddingLeft) || 14;
    const dyL = target.top - (lr.top + topInset); // 먼 이동(화면 한 장 반 넘게)은 곧바로, 가까우면 부드럽게
    left.scrollTo({ top: Math.max(0, Math.round(left.scrollTop + dyL)), left: Math.round(left.scrollLeft + cr.left - lr.left - padL), behavior: Math.abs(dyL) < left.clientHeight * 1.5 ? beh : "auto" });
    const blk = right.querySelectorAll(":scope > .slide-block")[t.row];
    if (blk) {
      const rr = right.getBoundingClientRect(), pad = Math.min(12, parseFloat(getComputedStyle(right).paddingTop) || 8);
      const bt = blk.getBoundingClientRect();
      const top = bt.top; // 오른쪽: 슬라이드 맨 위를 첫째 줄에
      const dyR = top - rr.top - pad;
      right.scrollTo({ top: Math.max(0, Math.round(right.scrollTop + dyR)), behavior: Math.abs(dyR) < right.clientHeight * 1.5 ? beh : "auto" });
    }
    if (smooth && typeof flash === "function") { flash(t.box); if (blk && blk._row) flash(blk._row); }
  }
  // dir: 0 = 글자를 쓰는 중(지금 자리에서 시작), 1 = 다음, -1 = 이전
  function search(dir) {
    const q = norm(inp.value);
    list = collect(q); cur = -1;
    if (!list.length) { mark(); showCount(); return; }
    let i;
    if (!pos) i = dir < 0 ? list.length - 1 : 0;
    else if (dir === 0) { i = list.findIndex(m => cmp(m, pos) >= 0); if (i < 0) i = 0; }
    else if (dir > 0) { i = list.findIndex(m => cmp(m, pos) > 0); if (i < 0) i = 0; }
    else { for (i = list.length - 1; i >= 0 && cmp(list[i], pos) >= 0; i--); if (i < 0) i = list.length - 1; }
    cur = i; pos = { row: list[i].row, ci: list[i].ci, off: list[i].off };
    mark(); showCount(); reveal(list[i], dir !== 0);
  }
  const refreshSoon = (() => { // 찾는 중에 원고를 고치면 결과 표시만 새로 맞춤(화면은 움직이지 않음)
    let t = 0;
    return () => { if (!bar) return; clearTimeout(t); t = setTimeout(() => {
      if (!bar) return;
      list = collect(norm(inp.value));
      cur = pos ? list.findIndex(m => cmp(m, pos) === 0) : -1;
      mark(); showCount();
    }, 300); };
  })();
  left.addEventListener("input", refreshSoon);

  function place() {
    const r = left.getBoundingClientRect(), w = Math.max(240, Math.min(400, r.width - 28));
    bar.style.width = w + "px";
    bar.style.top = Math.round(r.top + 8) + "px";
    bar.style.left = Math.max(8, Math.round(r.right - w - 20)) + "px";
  }
  const onResize = () => { if (bar) place(); };
  function onKey(e) { if (e.key === "Escape" && bar) { e.stopPropagation(); e.preventDefault(); close(true); } }

  function close(toText) {
    if (!bar) return;
    const t = toText && cur >= 0 ? list[cur] : null;
    bar.remove(); bar = null; clearMarks(); list = []; cur = -1;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (t && t.box.isConnected && !t.box.dataset.ref) { // 찾은 자리에 커서(선택 없이)
      t.box._ta.focus({ preventScroll: true });
      try { const p = Math.min(t.off, t.box._ta.value.length); t.box._ta.setSelectionRange(p, p); } catch (e) { /* 무시 */ }
    } else btn.focus();
  }
  function open() {
    if (appMode !== "slide") return;
    if (viewOnly()) { showToast("편집 화면에서 원고를 찾을 수 있어요.", true); return; }
    if (bar) { inp.focus(); inp.select(); return; }
    let seed = "";
    const ae = document.activeElement;
    if (ae && ae.tagName === "TEXTAREA" && left.contains(ae) && ae.selectionEnd > ae.selectionStart) seed = ae.value.slice(ae.selectionStart, ae.selectionEnd);
    seed = seed.replace(/\s+/g, " ").trim().slice(0, 80);
    bar = document.createElement("div"); bar.className = "find-bar"; bar.setAttribute("role", "search");
    inp = document.createElement("input"); inp.type = "text"; inp.className = "fb-input"; inp.placeholder = "원고에서 찾기"; inp.setAttribute("aria-label", "원고에서 찾기");
    inp.autocomplete = "off"; inp.spellcheck = false;
    cnt = document.createElement("span"); cnt.className = "fb-count"; cnt.setAttribute("aria-live", "polite");
    const mk = (cls, text, title) => { const b = document.createElement("button"); b.type = "button"; b.className = "fb-btn " + cls; b.textContent = text; b.title = title; b.setAttribute("aria-label", title); return b; };
    prevB = mk("fb-prev", "▲", "이전 결과 (Shift+Enter)"); nextB = mk("fb-next", "▼", "다음 결과 (Enter)");
    const x = mk("fb-x", "✕", "닫기 (Esc)");
    bar.append(inp, cnt, prevB, nextB, x); document.body.appendChild(bar);
    place();
    btn.setAttribute("aria-expanded", "true");
    pos = null; list = []; cur = -1;
    inp.addEventListener("input", e => { if (e.isComposing) return; search(0); }); // 한글 조합 중에는 조합이 끝난 뒤(compositionend)에 찾음
    inp.addEventListener("compositionend", () => search(0));
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !imeBusy(e)) { e.preventDefault(); search(e.shiftKey ? -1 : 1); } });
    prevB.addEventListener("click", () => { search(-1); inp.focus(); });
    nextB.addEventListener("click", () => { search(1); inp.focus(); });
    x.addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    inp.value = seed; showCount();
    inp.focus(); inp.select();
    if (seed) search(0);
  }

  btn.addEventListener("click", () => (bar ? close(true) : open()));
  document.addEventListener("keydown", e => { // Ctrl/⌘+Shift+F
    if (e.key.toLowerCase() !== "f" || !(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey || imeBusy(e)) return;
    if (appMode !== "slide" || document.querySelector(".patch-overlay.open")) return;
    e.preventDefault();
    open();
  });
})();
