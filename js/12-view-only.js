"use strict";

// 슬라이드만 보기: 왼쪽 원고 칸을 숨기고 오른쪽 결과(슬라이드)를 화면 전체에 넓게 보여 준다.
// 눌러서 켜고 끄며(슬라이드 구성 줄 맨 오른쪽 버튼 · Esc), 원고·슬라이드 데이터는 건드리지 않고 화면 배치만 바꾼다.
// 켜 있는 동안: 슬라이드를 눌러도 원문 조각으로 이동하지 않고(왼쪽이 숨겨져 있어서), 성경 불러오기 버튼은 숨긴다.
//  - 켜 둔 상태는 이 브라우저에 기억해서 새로고침해도 이어진다(localStorage "subtitleViewOnly").
//  - ← → ↑ ↓ 로 슬라이드를 하나씩 넘기고(Home·End = 처음·끝), 지금 슬라이드에는 테두리가 생긴다.
//  - 슬라이드를 더블클릭하면 슬라이드만 보기를 끄고, 그 슬라이드의 원문 조각 자리로 바로 이동한다(커서도 그 칸에 둠).
(function initViewOnly() {
  const btn = document.getElementById("viewOnlyBtn");
  if (!btn) return;
  const root = document.documentElement, KEY = "subtitleViewOnly";
  const ic = n => (typeof icon === "function" ? icon(n) : "");
  const LABEL = { off: () => ic("slides") + "슬라이드만", on: () => ic("split") + "편집 화면으로" };
  const TITLE = {
    off: "왼쪽 원고 칸을 숨기고 슬라이드만 크게 봐요 (끄기: Esc)",
    on: "왼쪽 원고 칸을 다시 보여 줘요 (Esc)",
  };
  const isOn = () => root.getAttribute("data-view") === "slides";

  // 마우스로 누른 버튼은 포커스를 풀어 줌: 남겨 두면 이어서 방향키를 누르는 순간 파란 포커스 테두리가 버튼에 켜져 거슬림(키보드로 누른 경우는 그대로 둠)
  const dropFocus = (b, e) => { if (e && e.detail > 0) b.blur(); };

  function refit() { // 슬라이드 너비가 바뀌었으니 글자 맞춤을 다시 계산(배치가 끝난 다음 프레임에)
    requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof recomputeAllFits === "function") recomputeAllFits(); }));
  }

  // ── 방향키로 슬라이드 넘기기 ──
  let cur = 0;
  const blocks = () => [...right.querySelectorAll(":scope > .slide-block")];
  function mark() { // 지금 슬라이드에 테두리(.vo-cur). 화면을 다시 그리면 사라지므로 필요할 때마다 다시 붙임
    const bs = blocks();
    if (cur >= bs.length) cur = Math.max(0, bs.length - 1);
    bs.forEach((b, i) => b.classList.toggle("vo-cur", isOn() && i === cur));
    return bs;
  }
  function go(to, abs) {
    const bs = blocks();
    if (!bs.length) { showToast("슬라이드가 없어요."); return; }
    const n = abs ? to : cur + to;
    if (n < 0 || n >= bs.length) { showToast(n < 0 ? "첫 슬라이드예요." : "마지막 슬라이드예요."); return; }
    cur = n; mark();
    bs[cur].scrollIntoView({ behavior: typeof smoothBehavior === "function" ? smoothBehavior() : "auto", block: "center" });
  }
  // ↑ ↓: 화면에서 정말 바로 위·아래에 있는 슬라이드로(여러 칸으로 늘어놓았을 때는 같은 세로줄의 윗줄·아랫줄, 가로 위치가 가장 가까운 것)
  function goVert(d) {
    const bs = blocks();
    if (!bs.length) { showToast("슬라이드가 없어요."); return; }
    const c = bs[Math.min(cur, bs.length - 1)].getBoundingClientRect(), cx = (c.left + c.right) / 2;
    let rowTop = null, best = -1, bestDx = Infinity;
    bs.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      const ok = d > 0 ? r.top >= c.bottom - 2 : r.bottom <= c.top + 2;       // 현재 슬라이드보다 완전히 아래/위에 있는 것만
      if (!ok) return;
      if (rowTop === null || (d > 0 ? r.top < rowTop - 2 : r.top > rowTop + 2)) { rowTop = r.top; best = -1; bestDx = Infinity; } // 가장 가까운 줄
      if (Math.abs(r.top - rowTop) > 2) return;
      const dx = Math.abs((r.left + r.right) / 2 - cx);
      if (dx < bestDx) { bestDx = dx; best = i; }
    });
    if (best < 0) { showToast(d < 0 ? "맨 위예요." : "맨 아래예요."); return; }
    go(best, true);
  }
  right.addEventListener("click", e => { // 슬라이드를 직접 누르면 거기서부터 이어서 넘김
    if (!isOn()) return;
    const b = e.target.closest(".slide-block"), i = b ? blocks().indexOf(b) : -1;
    if (i >= 0) { cur = i; mark(); }
  });

  // 슬라이드 더블클릭 → 슬라이드만 보기를 끄고 그 슬라이드의 원문 조각으로 순간이동(커서를 그 칸에 둠)
  right.addEventListener("dblclick", e => {
    if (!isOn() || appMode !== "slide") return;
    if (e.target.closest && e.target.closest("button,input,select,textarea,a,.sg-ctl")) return;
    const block = e.target.closest && e.target.closest(".slide-block");
    if (!block) return;
    const i = blocks().indexOf(block);
    if (i < 0) return;
    try { const sel = window.getSelection(); if (sel) sel.removeAllRanges(); } catch (err) { /* 더블클릭으로 잡힌 글자 선택만 풀어 줌 */ }
    // 더블클릭한 자리에 있는 언어 칸을 우선(슬라이드 글자는 pointer-events:none이라 좌표로 찾음), 없으면 그 줄의 첫 조각
    let lang = "";
    block.querySelectorAll(".slot").forEach(sl => {
      const r = sl.getBoundingClientRect();
      if (!lang && !sl.classList.contains("empty") && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) lang = sl.dataset.lang;
    });
    const row = buildRowMap()[i];
    const box = row && ((lang && row.by[lang]) || Object.values(row.by).find(Boolean));
    cur = i;
    apply(false, true); // 왼쪽 칸이 다시 보이게(저장된 "슬라이드만" 상태도 꺼짐)
    if (!box) return;
    const jump = () => {
      if (!box.isConnected) return;
      box.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" }); // 순간이동: 부드러운 스크롤 없이
      if (typeof flash === "function") flash(box);
      if (box.dataset.ref) { if (typeof selectRefRow === "function") selectRefRow(box, false); return; } // 성경 조각은 수정하지 않고 줄만 선택
      const ta = box.querySelector("textarea");
      if (ta) ta.focus({ preventScroll: true });
    };
    jump();
    requestAnimationFrame(jump); // 배치·글자 맞춤이 끝난 뒤 한 번 더 자리를 맞춤
  });
  window.viewOnlySetCur = i => { cur = i; mark(); }; // 번호로 이동(18-goto-slide.js)에서 "지금 슬라이드"를 맞출 때
  new MutationObserver(() => { if (isOn()) requestAnimationFrame(mark); }).observe(right, { childList: true });

  function apply(on, save) {
    const st = typeof right !== "undefined" && right ? right.scrollTop : 0;
    if (on) root.setAttribute("data-view", "slides"); else { root.removeAttribute("data-view"); }
    const k = on ? "on" : "off";
    btn.innerHTML = LABEL[k]();
    btn.title = TITLE[k];
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (save) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* 못 남겨도 이번 화면에서는 적용됨 */ } }
    if (typeof clearPicked === "function") clearPicked(); // 안 보이는 조각에 선택이 남지 않게
    if (typeof clearRefSel === "function") clearRefSel();
    mark();
    refit();
    requestAnimationFrame(() => { if (typeof right !== "undefined" && right) right.scrollTop = st; });
  }

  btn.addEventListener("click", e => { apply(!isOn(), true); dropFocus(btn, e); });
  document.addEventListener("keydown", e => {
    if (imeBusy(e)) return;
    if (e.key === "Escape") {
      if (!isOn()) return;
      if (document.querySelector(".patch-overlay.open")) return;          // 열린 창이 있으면 그 창이 먼저 닫힘
      const cp = document.getElementById("composePanel");
      if (cp && !cp.hidden) return;                                         // 슬라이드 구성 패널도 먼저 닫힘
      apply(false, true);
      return;
    }
    const K = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    const isNav = e.key in K || e.key === "Home" || e.key === "End";
    if (!isNav || !isOn() || appMode !== "slide" || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector(".patch-overlay.open")) return;
    const cp = document.getElementById("composePanel");
    if (cp && !cp.hidden) return;
    e.preventDefault();
    if (e.key === "Home") go(0, true);
    else if (e.key === "End") go(blocks().length - 1, true);
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") goVert(K[e.key]);
    else go(K[e.key]);
  });

  let saved = false;
  try { saved = localStorage.getItem(KEY) === "1"; } catch (e) { /* 저장소를 못 쓰면 편집 화면으로 시작 */ }
  apply(saved, false);
})();
