"use strict";

// 안내 줄 맨 오른쪽 [툴팁] 버튼: 누르면 모든 사용 팁을 한 번에 보여 주는 작은 창이 열린다.
// (줄이 좁아서 숨겨진 안내도 여기서는 전부 보임. 현재 화면 언어(한국어/English)로 열 때마다 새로 만든다)
// 닫기: 바깥 클릭 · Esc · 버튼을 다시 누름 · 창 크기 변경
(function initTipsPop() {
  const btn = document.getElementById("tipsMoreBtn"), list = document.querySelector("#tipsBar .tips-list");
  if (!btn || !list) return;
  let pop = null;

  function close() {
    if (!pop) return;
    pop.remove(); pop = null;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", close);
  }
  function onOutside(e) { if (pop && !pop.contains(e.target) && !btn.contains(e.target)) close(); }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(); btn.focus(); } }
  function place() {
    const r = btn.getBoundingClientRect();
    pop.style.top = Math.round(r.bottom + 8) + "px";
    pop.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + "px";
  }
  function open() {
    pop = document.createElement("div");
    pop.className = "tips-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "사용 팁");
    const h = document.createElement("div"); h.className = "tp-title"; h.textContent = "사용 팁";
    const ul = document.createElement("ul");
    list.querySelectorAll(":scope > span").forEach(s => { const li = document.createElement("li"); li.innerHTML = s.innerHTML; ul.appendChild(li); });
    pop.append(h, ul); document.body.appendChild(pop);
    place();
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", close);
  }
  btn.addEventListener("click", () => (pop ? close() : open()));
})();
