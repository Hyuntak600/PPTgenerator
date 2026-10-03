"use strict";

// 슬라이드 번호로 바로 가기: 슬라이드가 많을 때 번호를 입력하면 그 슬라이드로 이동한다.
//  - 슬라이드 구성 줄의 [이동] 버튼 또는 Ctrl/⌘+G → 작은 입력 창이 열리고, 번호를 쓰고 Enter
//  - 오른쪽에서는 그 슬라이드로 스크롤해 깜빡이고, 왼쪽 원고 칸도 같은 번호의 조각 자리로 함께 옮겨 줘요
//    (슬라이드만 보기 중에는 왼쪽이 숨겨져 있으니 오른쪽만, 방향키 이동의 "지금 슬라이드"도 여기로 맞춤)
//  - 원고·슬라이드 데이터는 건드리지 않고 화면 위치만 바꿈. 성경 DB 모드에서는 슬라이드가 한 장이라 쓰지 않음
(function initGotoSlide() {
  const btn = document.getElementById("gotoBtn");
  if (!btn) return;
  let pop = null;
  const blocks = () => [...right.querySelectorAll(":scope > .slide-block")];

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

  function go(n) {
    const bs = blocks(), i = n - 1;
    if (!bs.length) { showToast("슬라이드가 없어요.", true); return false; }
    if (!(i >= 0 && i < bs.length)) { showToast("1~" + bs.length + " 사이의 번호를 입력해 주세요.", true); return false; }
    const beh = typeof smoothBehavior === "function" ? smoothBehavior() : "auto";
    bs[i].scrollIntoView({ behavior: beh, block: "center" });
    if (typeof flash === "function" && bs[i]._row) flash(bs[i]._row);
    if (document.documentElement.getAttribute("data-view") === "slides") {
      if (typeof window.viewOnlySetCur === "function") window.viewOnlySetCur(i);
    } else {
      const row = buildRowMap()[i], box = row && Object.values(row.by).find(Boolean);
      if (box) { box.scrollIntoView({ behavior: beh, block: "center" }); if (typeof flash === "function") flash(box); }
    }
    return true;
  }

  function place() {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth || 230;
    pop.style.top = Math.round(r.bottom + 8) + "px";
    pop.style.left = Math.max(12, Math.min(Math.round(r.right - w), window.innerWidth - w - 12)) + "px";
  }
  function open() {
    if (appMode !== "slide") return;
    const total = blocks().length;
    if (!total) { showToast("슬라이드가 없어요.", true); return; }
    pop = document.createElement("div");
    pop.className = "goto-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "슬라이드 번호로 이동");
    const lab = document.createElement("label"); lab.className = "gp-label"; lab.textContent = "슬라이드 번호 (1–" + total + ")";
    const row = document.createElement("div"); row.className = "gp-row";
    const inp = document.createElement("input"); inp.type = "number"; inp.min = "1"; inp.max = String(total); inp.step = "1"; inp.inputMode = "numeric"; inp.className = "gp-input";
    inp.setAttribute("aria-label", "슬라이드 번호");
    const ok = document.createElement("button"); ok.type = "button"; ok.className = "btn primary gp-go"; ok.textContent = "이동";
    row.append(inp, ok); pop.append(lab, row); document.body.appendChild(pop);
    place();
    btn.setAttribute("aria-expanded", "true");
    const submit = () => { const v = parseInt(inp.value, 10); if (isNaN(v)) { showToast("1~" + total + " 사이의 번호를 입력해 주세요.", true); inp.focus(); return; } if (go(v)) close(); };
    ok.addEventListener("click", submit);
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !imeBusy(e)) { e.preventDefault(); submit(); } });
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    inp.focus();
  }

  btn.addEventListener("click", () => (pop ? close() : open()));
  document.addEventListener("keydown", e => { // Ctrl/⌘+G (브라우저의 "다음 찾기"보다 먼저 가로챔)
    if (e.key.toLowerCase() !== "g" || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || imeBusy(e)) return;
    if (appMode !== "slide") return;
    if (document.querySelector(".patch-overlay.open")) return;
    e.preventDefault();
    if (pop) { const i = pop.querySelector("input"); if (i) i.select(); } else open();
  });
})();
