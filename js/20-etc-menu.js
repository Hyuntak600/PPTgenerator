"use strict";

// 위쪽 [기타 ▾] 버튼: 자주 쓰지는 않는 도구를 모아 둔 작은 메뉴.
//  - 다른 언어 줄 거르기: 각 언어 칸에서 그 칸 언어(한·중·영·인니)가 아닌 줄(원문 등)을 뺀다(03-slides.js의 filterOtherLanguages).
//    번역문을 통째로 붙여넣은 뒤 원문이 섞여 있을 때 쓴다. 붙여넣을 때 자동으로 하지는 않는다. 되돌리기: Ctrl/⌘+Z
// 닫기: 바깥 클릭 · Esc · 버튼을 다시 누름 · 창 크기 변경
(function initEtcMenu() {
  const btn = document.getElementById("etcBtn");
  if (!btn) return;
  let pop = null;

  const ITEMS = [
    { title: "다른 언어 줄 거르기", desc: "각 언어 칸에서 그 칸 언어가 아닌 줄(원문 등)을 빼요. 되돌리기: Ctrl/⌘+Z", run: () => filterOtherLanguages() },
  ];

  function close(refocus) {
    if (!pop) return;
    pop.remove(); pop = null;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", onResize);
    if (refocus) btn.focus();
  }
  const onResize = () => close();
  function onOutside(e) { if (pop && !pop.contains(e.target) && !btn.contains(e.target)) close(); }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(true); } }
  function place() {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth || 280;
    pop.style.top = Math.round(r.bottom + 8) + "px";
    pop.style.left = Math.max(12, Math.min(Math.round(r.right - w), window.innerWidth - w - 12)) + "px";
  }
  function open() {
    if (appMode !== "slide") return;
    pop = document.createElement("div");
    pop.className = "etc-pop"; pop.setAttribute("role", "menu"); pop.setAttribute("aria-label", "기타");
    ITEMS.forEach(it => {
      const b = document.createElement("button"); b.type = "button"; b.className = "etc-item"; b.setAttribute("role", "menuitem");
      const t = document.createElement("b"); t.textContent = it.title;
      const d = document.createElement("span"); d.textContent = it.desc;
      b.append(t, d);
      b.addEventListener("click", () => {
        close(false);
        if (document.documentElement.getAttribute("data-view") === "slides") { showToast("편집 화면에서 쓸 수 있어요.", true); return; }
        it.run();
      });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    place();
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    const first = pop.querySelector(".etc-item"); if (first) first.focus({ preventScroll: true });
  }

  btn.addEventListener("click", () => (pop ? close() : open()));
})();
