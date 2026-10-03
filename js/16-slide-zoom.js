"use strict";

// 슬라이드 줌: 오른쪽 슬라이드 크기를 50%~200%로 키우고 줄인다(맥 Keynote·미리보기처럼).
//  - 오른쪽 칸 아래 가운데에 떠 있는 유리 질감 알약 [−  100%  +]: 퍼센트를 누르면(또는 더블클릭) 100%로
//  - 트랙패드 핀치(크롬·파이어폭스는 Ctrl+휠, 사파리는 gesture) · Ctrl/⌘+휠 — 슬라이드 위에서만 브라우저 줌 대신 슬라이드가 커짐
//  - 값은 이 브라우저에 기억. 슬라이드 데이터에는 아무 영향 없고 화면 크기만 바뀜(글자는 슬라이드와 함께 비율대로 커짐)
(function initSlideZoom() {
  const wrapEl = document.querySelector(".right-wrap"), rightEl = document.getElementById("right");
  if (!wrapEl || !rightEl) return;
  const root = document.documentElement, KEY = "subtitleSlideZoom", MIN = 0.5, MAX = 2, STEP = 0.1;
  const clamp = v => Math.min(MAX, Math.max(MIN, v));
  let sz = 1;
  try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= MIN && v <= MAX) sz = v; } catch (e) { /* 저장값이 없으면 100% */ }

  const pill = document.createElement("div");
  pill.className = "sz-pill"; pill.setAttribute("role", "group"); pill.setAttribute("aria-label", "슬라이드 크기");
  const mk = (cls, text, title) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; b.title = title; b.setAttribute("aria-label", title); return b; };
  const out = mk("sz-btn", "−", "슬라이드 축소"), val = mk("sz-val", "100%", "눌러서 100%로"), inn = mk("sz-btn", "+", "슬라이드 확대");
  pill.append(out, val, inn); wrapEl.appendChild(pill);

  const refit = debounce(() => { if (typeof recomputeAllFits === "function") recomputeAllFits(); }, 80);
  function apply(v, save) {
    sz = Math.round(clamp(v) * 1000) / 1000;
    root.style.setProperty("--sz", String(sz));
    if (sz > 1.001) root.setAttribute("data-szup", "1"); else root.removeAttribute("data-szup");
    val.textContent = Math.round(sz * 100) + "%";
    out.disabled = sz <= MIN + 0.001; inn.disabled = sz >= MAX - 0.001;
    if (save) { try { localStorage.setItem(KEY, String(sz)); } catch (e) { /* 못 남겨도 이번 화면에서는 적용됨 */ } }
    refit();
  }
  const step = d => apply(Math.round((sz + d) * 10) / 10, true); // 10% 단위로 딱 떨어지게
  out.addEventListener("click", () => step(-STEP));
  inn.addEventListener("click", () => step(STEP));
  val.addEventListener("click", () => apply(1, true));

  // 트랙패드 핀치 / Ctrl·⌘+휠
  let saveT = 0;
  rightEl.addEventListener("wheel", e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    apply(sz * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), false); // ctrlKey=true 는 핀치(값이 작게 옴)
    clearTimeout(saveT); saveT = setTimeout(() => apply(sz, true), 300);
  }, { passive: false });
  // 사파리 핀치
  let base = 1;
  rightEl.addEventListener("gesturestart", e => { e.preventDefault(); base = sz; });
  rightEl.addEventListener("gesturechange", e => { e.preventDefault(); apply(base * e.scale, false); });
  rightEl.addEventListener("gestureend", e => { e.preventDefault(); apply(sz, true); });

  apply(sz, false);
})();
