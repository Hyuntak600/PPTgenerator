"use strict";

// 슬라이드만 보기: 왼쪽 원고 칸을 숨기고 오른쪽 결과(슬라이드)를 화면 전체에 넓게 보여 준다.
// 눌러서 켜고 끄며(슬라이드 구성 줄 맨 오른쪽 버튼 · Esc), 원고·슬라이드 데이터는 건드리지 않고 화면 배치만 바꾼다.
// 켜 있는 동안: 슬라이드를 눌러도 원문 조각으로 이동하지 않고(왼쪽이 숨겨져 있어서), 성경 불러오기 버튼은 숨긴다.
//  - 켜 둔 상태는 이 브라우저에 기억해서 새로고침해도 이어진다(localStorage "subtitleViewOnly").
//  - ← → ↑ ↓ 로 슬라이드를 하나씩 넘기고(Home·End = 처음·끝), 지금 슬라이드에는 테두리가 생긴다.
//  - [전체화면] 버튼: 슬라이드 영역만 화면 가득 보여 줘서 확인용 화면으로 쓴다(끝내기: Esc).
(function initViewOnly() {
  const btn = document.getElementById("viewOnlyBtn");
  if (!btn) return;
  const root = document.documentElement, KEY = "subtitleViewOnly";
  const fsBtn = document.getElementById("viewFsBtn"), fsEl = document.querySelector(".right-wrap");
  const ic = n => (typeof icon === "function" ? icon(n) : "");
  const LABEL = { off: () => ic("slides") + "슬라이드만", on: () => ic("split") + "편집 화면으로" };
  const TITLE = {
    off: "왼쪽 원고 칸을 숨기고 슬라이드만 크게 봐요 (끄기: Esc)",
    on: "왼쪽 원고 칸을 다시 보여 줘요 (Esc)",
  };
  const isOn = () => root.getAttribute("data-view") === "slides";

  // ── 전체화면 (사파리 구버전은 webkit 접두어) ──
  const fsCur = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsCan = !!(fsEl && (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen));
  function fsExit() {
    if (!fsCur()) return;
    try { const p = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 이미 빠져나온 경우 */ }
  }
  function fsEnter() {
    try {
      const p = (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl);
      if (p && p.catch) p.catch(() => showToast("전체화면을 열지 못했어요.", true));
    } catch (e) { showToast("전체화면을 열지 못했어요.", true); }
  }
  function fsSync() {
    if (!fsBtn) return;
    fsBtn.hidden = !(fsCan && isOn());
    const on = !!fsCur();
    fsBtn.innerHTML = ic("expand") + (on ? "전체화면 끝내기" : "전체화면");
    fsBtn.title = on ? "전체화면을 끝내요 (Esc)" : "슬라이드를 화면 가득 보여 줘요 (끝내기: Esc)";
    fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  // 마우스로 누른 버튼은 포커스를 풀어 줌: 남겨 두면 이어서 방향키를 누르는 순간 파란 포커스 테두리가 버튼에 켜져 거슬림(키보드로 누른 경우는 그대로 둠)
  const dropFocus = (b, e) => { if (e && e.detail > 0) b.blur(); };
  if (fsBtn) fsBtn.addEventListener("click", e => { (fsCur() ? fsExit() : fsEnter()); dropFocus(fsBtn, e); });

  function refit() { // 슬라이드 너비가 바뀌었으니 글자 맞춤을 다시 계산(배치가 끝난 다음 프레임에)
    requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof recomputeAllFits === "function") recomputeAllFits(); }));
  }
  ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => { fsSync(); refit(); }));

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
  right.addEventListener("click", e => { // 슬라이드를 직접 누르면 거기서부터 이어서 넘김
    if (!isOn()) return;
    const b = e.target.closest(".slide-block"), i = b ? blocks().indexOf(b) : -1;
    if (i >= 0) { cur = i; mark(); }
  });
  window.viewOnlySetCur = i => { cur = i; mark(); }; // 번호로 이동(18-goto-slide.js)에서 "지금 슬라이드"를 맞출 때
  new MutationObserver(() => { if (isOn()) requestAnimationFrame(mark); }).observe(right, { childList: true });

  function apply(on, save) {
    const st = typeof right !== "undefined" && right ? right.scrollTop : 0;
    if (on) root.setAttribute("data-view", "slides"); else { root.removeAttribute("data-view"); fsExit(); }
    const k = on ? "on" : "off";
    btn.innerHTML = LABEL[k]();
    btn.title = TITLE[k];
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (save) { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* 못 남겨도 이번 화면에서는 적용됨 */ } }
    if (typeof clearPicked === "function") clearPicked(); // 안 보이는 조각에 선택이 남지 않게
    if (typeof clearRefSel === "function") clearRefSel();
    mark(); fsSync();
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
      apply(false, true);                                                   // (전체화면 중 Esc는 브라우저가 전체화면부터 끝냄)
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
    else go(K[e.key]);
  });

  let saved = false;
  try { saved = localStorage.getItem(KEY) === "1"; } catch (e) { /* 저장소를 못 쓰면 편집 화면으로 시작 */ }
  apply(saved, false);
})();
