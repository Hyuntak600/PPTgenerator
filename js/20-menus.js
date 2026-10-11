"use strict";

// 헤더 묶음 메뉴(도움말 ▾ · 데이터 ▾) 동작 + [섞인 언어 자동 삭제] 버튼.
// (예전 20-etc-menu.js 대신. 메뉴 안 버튼은 원래 id 그대로라서 다른 js가 그대로 동작해요.)
//  - 한 번에 하나만 열림 · 바깥 클릭/Esc/항목 선택 시 닫힘
(function initHeaderMenus() {
  const menus = [...document.querySelectorAll("details.hmenu")];
  const closeAll = except => menus.forEach(m => { if (m !== except) m.open = false; });
  menus.forEach(m => {
    m.addEventListener("toggle", () => { if (m.open) closeAll(m); });
    m.addEventListener("click", e => { if (e.target.closest(".hmenu-panel .btn")) m.open = false; });
  });
  document.addEventListener("click", e => { if (!e.target.closest || !e.target.closest("details.hmenu")) closeAll(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || imeBusy(e)) return;
    if (menus.some(m => m.open)) { e.stopPropagation(); closeAll(); }
  }, true);
})();

// [섞인 언어 자동 삭제]: 각 언어 칸에서 그 칸 언어(한·중·영·인니)가 아닌 줄(원문 등)을 뺀다(03-slides.js의 filterOtherLanguages).
//  번역문을 통째로 붙여넣은 뒤 원문이 섞여 있을 때 쓴다. 붙여넣을 때 자동으로 하지는 않는다. 되돌리기: Ctrl/⌘+Z
(function initFilterLang() {
  const btn = document.getElementById("filterLangBtn");
  if (!btn) return;
  btn.addEventListener("click", e => {
    if (e.detail > 0) btn.blur();
    if (appMode !== "slide") return;
    if (document.documentElement.getAttribute("data-view") === "slides") { showToast("편집 화면에서 쓸 수 있어요.", true); return; }
    filterOtherLanguages();
  });
})();
