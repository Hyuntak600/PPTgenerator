// 안내 창(모달) 바깥을 "눌렀다 뗐을 때만" 닫는다. 창 안에서 글자를 드래그하다가 바깥에서 마우스를 놓거나,
// 바깥에서 눌러 안으로 끌어온 경우에는 click 이 바깥 배경에 잡혀 창이 저절로 닫히던 문제를 막는다.
(function(){
  let downTarget = null;
  const remember = e => { downTarget = e.target; };
  document.addEventListener("mousedown", remember, true);
  document.addEventListener("touchstart", remember, true);
  document.addEventListener("click", e => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("patch-overlay") && downTarget !== t) { e.stopPropagation(); e.stopImmediatePropagation(); }
  }, true);
})();

// 안내 창(모달) 키보드 사용성: 열리면 창 안으로 포커스를 옮기고, Tab이 창 뒤쪽 화면으로 새지 않게 하고, 닫히면 열기 전 자리로 돌려 놓는다.
// (확인 시트 macConfirm은 자체로 처리하므로 건드리지 않음)
(function(){
  const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  const before = new Map();
  const topOverlay = () => { const l = document.querySelectorAll(".patch-overlay.open"); return l.length ? l[l.length - 1] : null; };
  const mo = new MutationObserver(ms => ms.forEach(m => {
    const ov = m.target;
    if (!ov.classList || ov.classList.contains("mc-overlay")) return;
    const on = ov.classList.contains("open");
    if (on && !before.has(ov)) {
      before.set(ov, document.activeElement);
      const md = ov.querySelector(".patch-modal");
      if (md) { md.tabIndex = -1; requestAnimationFrame(() => { if (!ov.contains(document.activeElement)) md.focus({ preventScroll: true }); }); }
    } else if (!on && before.has(ov)) {
      const p = before.get(ov); before.delete(ov);
      try { if (p && p.isConnected && p !== document.body && p.focus) p.focus({ preventScroll: true }); } catch (e) { /* 돌려줄 수 없어도 무시 */ }
    }
  }));
  document.querySelectorAll(".patch-overlay").forEach(o => mo.observe(o, { attributes: true, attributeFilter: ["class"] }));
  document.addEventListener("keydown", e => {
    if (e.key !== "Tab" || e.defaultPrevented) return;
    const ov = topOverlay();
    if (!ov || ov.classList.contains("mc-overlay")) return;
    const items = [...ov.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], a = document.activeElement;
    if (!ov.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (a === first || a.classList.contains("patch-modal"))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }, true);
})();
