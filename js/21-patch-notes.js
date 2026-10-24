"use strict";

// 패치노트 창: 시작 안내(#patchOverlay)가 닫힌 다음에 이어서 뜨는 별도 창.
//  - 시작 안내가 열려 있는 동안은 기다렸다가, 닫히면 이어서 뜬다. 시작 안내를 "다시 보지 않기" 해 둔 사람에게는 페이지를 열자마자 뜬다.
//  - 그냥 닫기(닫기·Esc·바깥 클릭)는 아무것도 기억하지 않아서 다음에 열 때 또 뜬다.
//  - 맨 아래 [다음 패치노트까지 안 보기]를 누르면 이 버전(NOTES.version)을 읽은 것으로 기억해서, 새 버전이 나올 때까지 뜨지 않는다(새 버전은 값이 달라서 다시 뜸).
//  - 언제든 다시 보려면 시작 안내 옆 [패치노트] 버튼.
//  - 새 버전을 낼 때는 아래 NOTES의 version과 items만 고치면 된다.
//  - PPTgenerator.html에서 01-core.js 뒤, 11-modal-guard.js "앞"에 <script> 한 줄을 넣어 주세요
//    (11이 창 안 포커스 가두기를 걸 때 이 창도 함께 잡아 주기 때문).
(function initPatchNotes2() {
  const NOTES = {
    version: "2026-10-24",
    title: "패치노트",
    sub: "이번에 새로 생기거나 바뀐 기능이에요.",
    // tag: 새 기능 / 개선 / 수정 중 아무 글자나. desc 안에서 줄바꿈은 \n
    items: [
      { tag: "새 기능", title: "브라우저 내장 번역기", desc: "데스크톱 크롬 138 이상·엣지 148 이상에서는 Docker나 번역 서버 없이 번역해요. 위쪽 번역 칩을 눌러 모델을 한 번만 받으면 돼요." },
      { tag: "새 기능", title: "모델 받은 정도를 보여 줘요", desc: "번역 칩과 번역 안내 창에 받는 진행률과 아직 못 받은 모델이 표시돼요." },
      { tag: "안내", title: "모델이 남았다고 뜨면 칩을 다시 눌러요", desc: "브라우저가 한 번에 하나씩만 받게 해서, 남은 모델이 있으면 번역 칩을 한 번 더 눌러야 해요." },
      { tag: "안내", title: "받은 뒤에는 인터넷 없이도 돼요", desc: "모델은 처음 한 번만 받아요. 내장 번역이 안 되는 언어 쌍이나 사파리 같은 다른 브라우저는 예전처럼 번역 서버로 넘어가요." },
    ],
  };

  const SEEN_KEY = "subtitlePatchNotesSeen";
  const tut = document.getElementById("patchOverlay");
  const reopenBtn = document.getElementById("patchReopenBtn");
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === NOTES.version; } catch (e) { /* 저장소를 못 쓰면 열 때마다 뜸 */ }
  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, NOTES.version); } catch (e) { /* 못 남기면 다음에도 뜰 뿐 */ } };

  // 보조 스타일(다크/라이트 모두에서 어색하지 않게 색은 상속·반투명만 사용)
  const st = el("style");
  st.textContent =
    ".pn-list{list-style:none;margin:14px 0 4px;padding:0;display:flex;flex-direction:column;gap:10px;max-height:min(56vh,460px);overflow:auto}" +
    ".pn-item{border:1px solid rgba(128,128,128,.28);border-radius:10px;padding:10px 12px}" +
    ".pn-head{display:flex;align-items:center;gap:8px;font-weight:600}" +
    ".pn-tag{font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid currentColor;opacity:.75;white-space:nowrap}" +
    ".pn-desc{margin:6px 0 0;opacity:.85;line-height:1.55;white-space:pre-line}" +
    ".pn-ver{opacity:.6;font-size:12px;margin-left:auto;align-self:center}";
  document.head.appendChild(st);

  const ov = el("div", "patch-overlay pn-overlay");
  const md = el("div", "patch-modal pn-modal");
  md.setAttribute("role", "dialog"); md.setAttribute("aria-modal", "true"); md.setAttribute("aria-labelledby", "pnTitle"); md.tabIndex = -1;
  const h = el("h2", "", NOTES.title); h.id = "pnTitle";
  const sub = el("p", "patch-sub", NOTES.sub);
  const ul = el("ul", "pn-list");
  NOTES.items.forEach(it => {
    const li = el("li", "pn-item");
    const head = el("div", "pn-head");
    if (it.tag) head.appendChild(el("span", "pn-tag", it.tag));
    head.appendChild(el("span", "", it.title));
    li.append(head, el("p", "pn-desc", it.desc));
    ul.appendChild(li);
  });
  const act = el("div", "copy-actions");
  act.appendChild(el("span", "pn-ver", "버전 " + NOTES.version));
  const hideBtn = el("button", "btn", "다음 패치노트까지 안 보기"); hideBtn.type = "button";
  hideBtn.title = "새 패치노트가 나올 때까지 이 창을 자동으로 띄우지 않아요";
  const ok = el("button", "btn primary", "닫기"); ok.type = "button";
  act.append(hideBtn, ok);
  md.append(h, sub, ul, act); ov.appendChild(md); document.body.appendChild(ov);

  function open() { ov.classList.add("open"); requestAnimationFrame(() => ok.focus({ preventScroll: true })); }
  function close() { ov.classList.remove("open"); }
  hideBtn.addEventListener("click", () => {
    markSeen(); close();
    if (typeof showToast === "function") showToast("다음 패치노트가 나올 때까지 이 창이 뜨지 않아요. 위쪽 [패치노트]로 언제든 다시 볼 수 있어요.");
  });
  ok.addEventListener("click", close);
  ov.addEventListener("click", e => { if (e.target === ov) close(); }); // 11-modal-guard가 "바깥에서 눌러 안에서 뗀" 경우를 걸러 줌
  ov.addEventListener("keydown", e => {
    e.stopPropagation(); // 창이 떠 있는 동안 단축키가 뒤쪽 화면에 닿지 않게
    if (e.key === "Escape" && !(typeof imeBusy === "function" && imeBusy(e))) { e.preventDefault(); close(); }
  }, true);

  // 시작 안내가 열려 있는 동안은 기다렸다가, 닫히면 이어서 띄움
  let pending = !seen;
  function maybeShow() {
    if (!pending) return;
    if (document.querySelector(".patch-overlay.open:not(.pn-overlay)")) return; // 다른 안내 창이 열려 있으면 그 창이 닫힐 때까지
    pending = false;
    open();
  }
  if (tut) new MutationObserver(() => { if (!tut.classList.contains("open")) setTimeout(maybeShow, 150); }).observe(tut, { attributes: true, attributeFilter: ["class"] });
  maybeShow();

  // 언제든 다시 볼 수 있는 [패치노트] 버튼: 시작 안내 버튼 바로 옆에 붙임
  if (reopenBtn) {
    const b = el("button", reopenBtn.className, "패치노트"); b.type = "button"; b.id = "patchNotesBtn";
    b.title = "이번 버전에서 새로 생긴 기능 보기";
    b.addEventListener("click", e => { if (e.detail > 0) b.blur(); open(); });
    reopenBtn.insertAdjacentElement("afterend", b);
  }
})();
