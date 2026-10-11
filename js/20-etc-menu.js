"use strict";

// (파일 이름은 예전 [기타] 메뉴 때 그대로) 위쪽 [다른 언어 줄 거르기] 버튼: 각 언어 칸에서 그 칸 언어(한·중·영·인니)가 아닌 줄(원문 등)을 뺀다(03-slides.js의 filterOtherLanguages).
//  번역문을 통째로 붙여넣은 뒤 원문이 섞여 있을 때 쓴다. 붙여넣을 때 자동으로 하지는 않는다. 되돌리기: Ctrl/⌘+Z
//  (예전에는 [기타 ▾] 메뉴 안에 있었지만 항목이 하나뿐이라 메뉴 없이 바로 누르게 바꿈)
(function initFilterLang() {
  const btn = document.getElementById("filterLangBtn");
  if (!btn) return;
  btn.addEventListener("click", e => {
    if (e.detail > 0) btn.blur(); // 마우스로 누른 뒤에는 포커스를 풀어 줌
    if (appMode !== "slide") return;
    if (document.documentElement.getAttribute("data-view") === "slides") { showToast("편집 화면에서 쓸 수 있어요.", true); return; }
    filterOtherLanguages();
  });
})();
