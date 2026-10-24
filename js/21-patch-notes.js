"use strict";

// 패치노트 창: 시작 안내(#patchOverlay)가 닫힌 다음에 이어서 뜨는 별도 창.
//  - 새 버전(NOTES.version)이 나오면 모든 사람에게 한 번 뜬다. 시작 안내의 "안 뜨게 하기"와는 따로 기억한다.
//  - 시작 안내가 안 뜨는 사람(이미 "안 뜨게 하기"를 한 경우)에게는 페이지를 열자마자 뜬다.
//  - 어떻게 닫아도(확인·Esc·바깥 클릭) 이 버전은 읽은 것으로 기억한다. 다시 보려면 시작 안내 옆 [패치노트] 버튼.
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
      { tag: "새 기능", title: "슬라이드 크기 조절", desc: "오른쪽 아래 [− 100% +]로 50~200%까지 키우고 줄여요. 트랙패드 핀치나 Ctrl/⌘+휠도 돼요." },
      { tag: "새 기능", title: "원고 찾기", desc: "Ctrl/⌘+Shift+F로 4개 언어 칸을 한꺼번에 검색해요. Enter는 다음, Shift+Enter는 이전 결과예요." },
      { tag: "새 기능", title: "슬라이드 번호로 이동", desc: "Ctrl/⌘+G로 번호를 입력하면 그 슬라이드와 원문 조각으로 한 번에 이동해요." },
      { tag: "개선", title: "슬라이드만 보기", desc: "방향키로 슬라이드를 넘기고, 더블클릭이나 Enter로 그 슬라이드의 원문 조각으로 돌아가요." },
      { tag: "개선", title: "섞인 언어 자동 삭제", desc: "지우기 전에 미리 보기 창이 먼저 뜨고, 지운 글자는 데이터 ▾ → 섞인 언어 삭제 기록에서 다시 볼 수 있어요." },
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
  const ok = el("button", "btn primary", "확인했어요"); ok.type = "button";
  act.appendChild(ok);
  md.append(h, sub, ul, act); ov.appendChild(md); document.body.appendChild(ov);

  function open() { ov.classList.add("open"); requestAnimationFrame(() => ok.focus({ preventScroll: true })); }
  function close() { ov.classList.remove("open"); markSeen(); }
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
