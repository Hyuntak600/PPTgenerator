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
//  버튼을 누르면 곧바로 지우지 않고 아래 미리 보기 창이 먼저 뜬다(초창기라 잘못 지워지는 일이 없도록).
(function initFilterLang() {
  const btn = document.getElementById("filterLangBtn");
  if (!btn) return;
  btn.addEventListener("click", e => {
    if (e.detail > 0) btn.blur();
    if (appMode !== "slide") return;
    if (document.documentElement.getAttribute("data-view") === "slides") { showToast("편집 화면에서 쓸 수 있어요.", true); return; }
    filterOtherLanguages();
  });
  const logBtn = document.getElementById("filterLogBtn"); // 데이터 ▾ → [섞인 언어 삭제 기록]: 지난번에 지운 글자를 다시 봄
  if (logBtn) logBtn.addEventListener("click", e => { if (e.detail > 0) logBtn.blur(); if (typeof window.openFilterLog === "function") window.openFilterLog(); });
})();

// 미리 보기 창 / 삭제 기록 창: 각 언어 칸과 그 칸의 조각들을 그대로 보여 주고, 지워질(지워진) 글자는 회색으로 표시한다(슬라이드는 보여 주지 않음).
//  - 미리 보기(openFilterPreview): 맨 위에 지우는 기준을 적어 두고, [삭제하기]를 눌러야 실제로 지운다. 취소·Esc·바깥 클릭 = 아무것도 지우지 않음
//  - 삭제 기록(openFilterLog): [삭제하기]를 눌렀을 때 남겨 둔 기록을 같은 모양으로 다시 보여 줌(읽기만). 지운 뒤에도 크로스체크용
(function initFilterPreview() {
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const RULES = [
    "<b>줄 단위</b>로 판단해요. 조각 안에서 다른 언어로 보이는 줄만 지우고, 나머지 줄은 그대로 둬요.",
    "<b>글자 종류</b>로 가려요. 한국어 칸은 한글이, 중국어 칸은 한자가, 영어·인니 칸은 알파벳이 줄의 절반 이상이어야 남아요(한글·한자는 글자 하나를 알파벳 2.5자로 쳐요).",
    "영어·인니 칸의 알파벳 줄은 <b>대표 낱말</b>(영어: the·and·of…, 인니: yang·dan·di…)로 한 번 더 가려요. 반대 언어 낱말이 더 많거나, 낱말이 7개 이상인데 이 칸 언어 낱말이 하나도 없으면 지워요.",
    "<b>괄호·따옴표 안</b>은 줄의 언어를 가릴 때 세지 않아요(예: 영어 줄 끝의 “(요한복음 3:16)”).",
    "한국어·중국어 칸의 알파벳뿐인 줄, 영어·인니 칸의 한글·한자뿐인 짧은 줄(아멘 등), 어느 칸에서든 그리스어·히브리어 같은 <b>그 밖의 문자</b> 줄은 지워요.",
    "숫자·기호뿐인 줄이나 아주 짧은 줄은 판단하지 않고 <b>남겨요</b>.",
    "지우고 나서 글이 하나도 안 남는 <b>조각은 조각째</b> 지워요(칸의 마지막 조각이면 빈 조각으로 남아요). <b>성경에서 불러온 조각</b>은 건드리지 않아요.",
    "한 칸에서 남는 줄이 10% 미만이면 칸을 잘못 고른 것으로 보고 <b>그 칸은 건너뛰어요</b>.",
    "지운 뒤에는 Ctrl/⌘+Z로 되돌릴 수 있고, 지운 글자는 <b>데이터 ▾ → 섞인 언어 삭제 기록</b>에 그대로 남아요(최근 5번까지). 지우기 직전 원고는 자동 백업에도 남아요.",
  ];

  // 창 틀: 겹창 + 닫기 처리(Esc·바깥 클릭 = 닫기, 닫으면 열기 전 자리로 포커스). 반환값 close(ok)를 부르면 닫히고 api.after(ok)가 불림
  function mount(md, focusEl) {
    const prev = document.activeElement;
    const ov = el("div", "patch-overlay fp-overlay"); ov.appendChild(md); document.body.appendChild(ov);
    let done = false;
    const api = { after: null, close(ok) {
      if (done) return; done = true;
      ov.removeEventListener("keydown", onKey, true);
      ov.remove();
      try { if (prev && prev.isConnected && prev !== document.body && prev.focus) prev.focus({ preventScroll: true }); } catch (e) { /* 포커스를 돌려줄 수 없어도 무시 */ }
      if (api.after) api.after(ok);
    } };
    function onKey(e) {
      e.stopPropagation(); // 창이 떠 있는 동안 Ctrl+Z·Delete 같은 단축키가 뒤쪽 화면에 닿지 않게
      if (e.key === "Escape" && !imeBusy(e)) { e.preventDefault(); api.close(false); }
    }
    ov.addEventListener("keydown", onKey, true);
    ov.addEventListener("click", e => { if (e.target === ov) api.close(false); }); // 11-modal-guard가 "바깥에서 눌러 안에서 뗀" 경우를 걸러 줌
    requestAnimationFrame(() => { ov.classList.add("open"); if (focusEl) focusEl.focus(); });
    return api;
  }

  // 언어 칸 4개 + 조각들. past=true면 "이미 지운" 기록 말투
  function board(plan, past) {
    const frag = document.createDocumentFragment();
    const sum = el("div", "fp-sum");
    sum.append(el("span", "fp-line drop fp-sw", "회색 글자"), el("span", "", past ? " = 이때 지운 글자 · 총 " + plan.dropTotal + "줄 삭제됨" : " = 지워질 글자 · 총 " + plan.dropTotal + "줄 삭제 예정"));
    if (plan.skipped.length) sum.appendChild(el("span", "fp-skipnote", " · " + plan.skipped.join("·") + (past ? " 칸은 거의 다른 언어라 건너뛰었어요" : " 칸은 거의 다른 언어라 건너뛰어요")));
    const wrap = el("div", "fp-grid-wrap"), grid = el("div", "fp-grid");
    grid.style.setProperty("--n", String(plan.cols.length || 1));
    plan.cols.forEach(c => {
      const col = el("div", "fp-col");
      const head = el("div", "fp-col-head"); head.style.borderTopColor = "var(--" + c.code + ")";
      head.appendChild(document.createTextNode(c.label));
      head.appendChild(el("small", "", c.skip ? (past ? "건너뜀 (거의 다른 언어)" : "건너뜀 (거의 다른 언어)") : c.dropped ? c.dropped + (past ? "줄 삭제됨 / 전체 " : "줄 삭제 / 전체 ") + c.total + "줄" : "지울 줄 없음"));
      col.appendChild(head);
      c.pieces.forEach(p => {
        const card = el("div", "fp-piece" + (p.fate === "remove" ? " gone" : ""));
        const tag = "조각 " + p.num + (p.ref ? " · 성경 조각(건드리지 않음)" : "") + (p.fate === "remove" ? (past ? " · 조각째 삭제됨" : " · 조각째 삭제") : p.fate === "clear" ? (past ? " · 글이 모두 지워져 빈 조각으로 남음" : " · 글이 모두 지워져 빈 조각으로 남음") : "");
        card.appendChild(el("div", "fp-piece-tag", tag));
        if (p.blank) card.appendChild(el("div", "fp-line fp-empty", "(비어 있음)"));
        else p.lines.forEach(l => card.appendChild(el("div", "fp-line" + (l.drop ? " drop" : ""), l.text || "\u00a0")));
        col.appendChild(card);
      });
      grid.appendChild(col);
    });
    wrap.appendChild(grid);
    frag.append(sum, wrap);
    return frag;
  }
  const frame = (titleText, subText) => {
    const md = el("div", "patch-modal fp-modal"); md.setAttribute("role", "dialog"); md.setAttribute("aria-modal", "true"); md.setAttribute("aria-labelledby", "fpTitle"); md.tabIndex = -1;
    const h = el("h2", "", titleText); h.id = "fpTitle";
    md.append(h, el("p", "patch-sub", subText));
    return md;
  };

  window.openFilterPreview = function (plan, onConfirm) {
    const none = !plan.dropTotal;
    const md = frame("섞인 언어 자동 삭제 · 미리 보기", none ? "지울 글자가 없어요. 다른 언어로 보이는 줄이 없어서 아무것도 지워지지 않아요." : "아직 아무것도 지워지지 않았어요. 회색으로 표시된 글자가 [삭제하기]를 누르면 지워질 글자예요. 조각과 글자를 확인한 뒤 눌러 주세요.");
    const rules = el("details", "fp-rules"); rules.open = true;
    rules.appendChild(el("summary", "", "지우는 기준"));
    const ul = el("ul"); RULES.forEach(t => { const li = el("li"); li.innerHTML = t; ul.appendChild(li); }); rules.appendChild(ul);
    const act = el("div", "copy-actions");
    const no = el("button", "btn" + (none ? " primary" : ""), none ? "닫기" : "취소"); no.type = "button";
    const yes = el("button", "btn mc-danger", "삭제하기"); yes.type = "button";
    if (none) act.append(no); else act.append(no, yes);
    md.append(rules, board(plan, false), act);
    const sheet = mount(md, no); // 처음 포커스는 취소(Enter로 실수로 지우는 일을 막음)
    sheet.after = ok => { if (ok && typeof onConfirm === "function") onConfirm(); };
    no.addEventListener("click", () => sheet.close(false));
    yes.addEventListener("click", () => sheet.close(true));
  };

  const fmt = t => { const d = new Date(t), p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); };
  window.openFilterLog = function () {
    const recs = typeof window.readFilterLog === "function" ? window.readFilterLog() : [];
    if (!recs.length) { showToast("아직 섞인 언어 삭제 기록이 없어요."); return; }
    const md = frame("섞인 언어 삭제 기록", "[삭제하기]를 누른 때 남겨 둔 기록이에요. 그때 지운 글자를 회색으로 그대로 보여 줘요(지금 원고에는 없어요). 이 브라우저에만 저장되고, 최근 5번까지 보관해요.");
    const bar = el("div", "fp-bar"); bar.appendChild(el("span", "", "기록 선택"));
    const sel = el("select", "fp-pick"); sel.setAttribute("aria-label", "삭제 기록 선택");
    recs.forEach((r, i) => { const o = el("option", "", fmt(r.t) + " · " + r.dropTotal + "줄 삭제"); o.value = String(i); sel.appendChild(o); });
    bar.appendChild(sel);
    const holder = el("div"); holder.appendChild(board(recs[0], true));
    sel.addEventListener("change", () => { holder.textContent = ""; holder.appendChild(board(recs[+sel.value] || recs[0], true)); });
    const act = el("div", "copy-actions");
    const clr = el("button", "btn quiet danger fp-clear", "기록 모두 지우기"); clr.type = "button";
    const ok = el("button", "btn primary", "닫기"); ok.type = "button";
    act.append(clr, ok);
    md.append(bar, holder, act);
    const sheet = mount(md, ok);
    ok.addEventListener("click", () => sheet.close(false));
    clr.addEventListener("click", () => {
      macConfirm("저장해 둔 삭제 기록 " + recs.length + "개를 모두 지울까요? 원고에는 영향이 없지만, 지운 글자를 다시 확인할 수 없게 돼요.", { title: "삭제 기록 지우기", ok: "기록 지우기", danger: true }).then(yes => {
        if (!yes) return;
        if (typeof window.clearFilterLog === "function") window.clearFilterLog();
        sheet.close(false);
        showToast("삭제 기록을 지웠어요.");
      });
    });
  };
})();
