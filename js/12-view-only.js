"use strict";

// 슬라이드만 보기: 왼쪽 원고 칸을 숨기고 오른쪽 결과(슬라이드)를 화면 전체에 넓게 보여 준다.
// 눌러서 켜고 끄며(슬라이드 구성 줄 맨 왼쪽 버튼 · Esc), 원고·슬라이드 데이터는 건드리지 않고 화면 배치만 바꾼다.
// 켜 있는 동안: 슬라이드를 눌러도 원문 조각으로 이동하지 않고(왼쪽이 숨겨져 있어서), 성경 불러오기 버튼은 숨긴다.
(function initViewOnly() {
  const btn = document.getElementById("viewOnlyBtn");
  if (!btn) return;
  const root = document.documentElement;
  const ic = n => (typeof icon === "function" ? icon(n) : "");
  const LABEL = { off: () => ic("slides") + "슬라이드만", on: () => ic("split") + "편집 화면으로" };
  const TITLE = {
    off: "왼쪽 원고 칸을 숨기고 슬라이드만 크게 봐요 (끄기: Esc)",
    on: "왼쪽 원고 칸을 다시 보여 줘요 (Esc)",
  };
  const isOn = () => root.getAttribute("data-view") === "slides";

  function refit() { // 슬라이드 너비가 바뀌었으니 글자 맞춤을 다시 계산(배치가 끝난 다음 프레임에)
    requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof recomputeAllFits === "function") recomputeAllFits(); }));
  }
  function apply(on) {
    const st = typeof right !== "undefined" && right ? right.scrollTop : 0;
    if (on) root.setAttribute("data-view", "slides"); else root.removeAttribute("data-view");
    const k = on ? "on" : "off";
    btn.innerHTML = LABEL[k]();
    btn.title = TITLE[k];
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (typeof clearPicked === "function") clearPicked(); // 안 보이는 조각에 선택이 남지 않게
    if (typeof clearRefSel === "function") clearRefSel();
    refit();
    requestAnimationFrame(() => { if (typeof right !== "undefined" && right) right.scrollTop = st; });
  }

  btn.addEventListener("click", () => apply(!isOn()));
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || !isOn() || imeBusy(e)) return;
    if (document.querySelector(".patch-overlay.open")) return;            // 열린 창이 있으면 그 창이 먼저 닫힘
    const cp = document.getElementById("composePanel");
    if (cp && !cp.hidden) return;                                           // 슬라이드 구성 패널도 먼저 닫힘
    apply(false);
  });
  apply(false);
})();
