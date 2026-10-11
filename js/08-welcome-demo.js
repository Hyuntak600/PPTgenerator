"use strict";

(function initWelcomeTry() {
  const VERSES = {
    ko: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 저를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이니라",
    zh: "神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。",
    en: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    id: "Karena demikianlah Allah mengasihi isi dunia ini, sehingga dikaruniakan-Nya Anak-Nya yang tunggal itu, supaya barangsiapa yang percaya akan Dia jangan binasa, melainkan beroleh hidup yang kekal.",
  };

  // ─ 시작 화면 체험은 번역 서버를 쓰지 않는다. 처음 쓰는 사용자는 아직 번역 서버가 없으니, 미리 만들어 둔 번역표(js/15-welcome-rec-table.js, WEL_REC)만 쓴다 ─
  // 번역표에는 드래그로 고를 수 있는 모든 구간의 영어 번역이 번역기 출력 그대로 들어 있다. 표에 없는 구간은 지어내지 않고 안내만 한다.
  // 표는 약 120KB라서 체험을 처음 쓸 때(또는 창이 처음부터 열려 있으면 브라우저가 한가할 때) 받는다.
  const SCRIPT_Q = (() => { try { const s = document.currentScript && document.currentScript.src; return s && s.indexOf("?") > -1 ? s.slice(s.indexOf("?")) : ""; } catch (e) { return ""; } })();
  const scriptOnce = {};
  function loadScriptOnce(path) { // 같은 파일은 한 번만 받고, 실패하면 다음에 다시 시도할 수 있게 기억을 지운다
    if (!scriptOnce[path]) scriptOnce[path] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = path + SCRIPT_Q; s.onload = resolve; s.onerror = () => { delete scriptOnce[path]; reject(new Error(path)); };
      document.head.appendChild(s);
    });
    return scriptOnce[path];
  }
  async function loadRecTable() { // 성공하면 true, 파일을 못 받으면 false
    if (window.WEL_REC) return true;
    try { await loadScriptOnce("js/15-welcome-rec-table.js"); } catch (e) { return false; }
    return !!window.WEL_REC;
  }

  const NOT_FOUND = "이 구간은 체험용 번역표에 없어요. 다른 구간을 드래그해 보세요.";
  const LOAD_FAIL = "체험용 번역표를 불러오지 못했어요. 페이지를 새로고침해 주세요.";

  // ─ 개발용 "📼 번역기 출력 기록": 평소엔 받지 않고, 개발용 줄이 보이는 상태에서 버튼을 처음 누를 때만 불러온다 ─
  // 주소 끝에 ?welrec 를 붙여 열면 숨겨 둔 개발용 줄이 나타난다(예: PPTgenerator.html?welrec).
  const recBtn = document.getElementById("welRecBtn");
  const recRow = document.querySelector("[data-devonly]");
  const recOutBox = document.getElementById("welRecOut");
  if (recRow && /[?&]welrec(=|&|$)/.test(location.search)) { recRow.style.display = ""; if (recOutBox) recOutBox.style.display = ""; }
  if (recBtn) recBtn.addEventListener("click", async () => {
    try {
      if (!(await loadRecTable())) throw new Error("15-welcome-rec-table.js");
      window.__welCtx = { VERSES, WEL_REC: window.WEL_REC };
      await loadScriptOnce("js/welcome-rec-dev.js");
    } catch (e) { showToast("개발용 기록 파일을 불러오지 못했어요: " + (e && e.message || e), true); return; }
    window.__welRecRun();
  });

  // ─ 튜토리얼(시작 안내 안에서 바로 연습): 요한복음 3:16을 한국어·영어는 이미 2조각으로 나눠 보여 주고, 중국어·인도네시아어는 1조각으로 보여 준다.
  //   번역표를 보면서 Enter로 같은 뜻이 시작되는 곳에서 직접 나눠 보고, 맞게 나눴는지 알려 준다. 왼쪽 원고 칸·저장 데이터는 건드리지 않는다. ─
  (function initWelTutorial() {
    const grid = document.getElementById("tutGrid"), prev = document.getElementById("tutPrev");
    const done = document.getElementById("tutDone"), resetBtn = document.getElementById("tutReset"), ov = document.getElementById("patchOverlay");
    if (!grid || !prev) return;
    const M_SUB_FIXED = "미리 나뉘어 있어요";
    const M_SUB_EDIT = "직접 나눠 보세요";
    const M_ST_OK = "잘 나눴어요! 한국어·영어와 같은 자리에서 나뉘었어요.";
    const M_ST_MANY = "조각이 너무 많아요. 한국어·영어처럼 2조각이 되게 해 보세요. (조각 맨 앞에서 Backspace를 누르면 앞 조각과 합쳐져요)";
    const M_ST_OFF = "나뉜 자리가 한국어·영어와 조금 달라요. 2번 조각이 “믿는 자마다 … 영생을 얻게 하려…(that whosoever…)”로 시작하게 나눠 보세요. (조각 맨 앞에서 Backspace로 합친 뒤 다시 나눠도 돼요)";
    const M_ST_MID = "글 중간에 커서를 두고 Enter를 눌러 주세요.";
    const M_SEL_PLACE = "드래그하면 번역이 여기 보여요"; // 실제 화면(02-translate.js)의 칸 미리보기 안내와 같은 문구
    const M_SEL_EN = "영어 구절은 번역하지 않아요.";
    const ORDER = ["ko", "zh", "en", "id"], FIXED = new Set(["ko", "en"]);
    const cutAt = (v, m) => { const i = v.indexOf(m); return i < 0 ? [v] : [v.slice(0, i).trim(), v.slice(i).trim()]; };
    const START = { ko: cutAt(VERSES.ko, " 이는 "), en: cutAt(VERSES.en, " that whosoever") }; // 이미 나뉘어 있는 칸
    const GOAL = { zh: cutAt(VERSES.zh, "叫一切信他的"), id: cutAt(VERSES.id, " supaya") };      // 같은 뜻으로 나뉘는 자리(정답)
    const norm = s => s.replace(/[\s，,。.、;；]/g, "");
    let pieces = {}, recAsked = false, selSeq = 0;
    const previews = {};
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const isOpen = () => ov && ov.classList.contains("open");

    function offsets(code) { // 각 조각이 구절 안에서 시작하는 자리
      let p = 0;
      return pieces[code].map(t => { const i = VERSES[code].indexOf(t, p), o = i < 0 ? p : i; p = o + t.length; return o; });
    }
    function recAt(code, s, e) { // 번역표에서 [s, e) 구간 찾기(띄어쓰기 언어는 걸친 단어까지 넓혀 찾음)
      const v = VERSES[code], rec = (window.WEL_REC && window.WEL_REC[code]) || {};
      while (s < e && /\s/.test(v[s])) s++;
      while (e > s && /\s/.test(v[e - 1])) e--;
      if (s >= e) return "";
      if (rec[v.slice(s, e)]) return rec[v.slice(s, e)];
      if (code !== "zh") { while (s > 0 && !/\s/.test(v[s - 1])) s--; while (e < v.length && !/\s/.test(v[e])) e++; }
      return rec[v.slice(s, e)] || "";
    }
    function ensureRec() {
      if (window.WEL_REC) return;
      if (recAsked) return;
      recAsked = true;
      loadRecTable().then(ok => { if (!ok) recAsked = false; });
    }
    function autosize() {
      grid.querySelectorAll("textarea").forEach(t => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; });
    }
    function check(code) {
      const p = pieces[code], g = GOAL[code];
      if (p.length === 1) return { k: "none", msg: "" }; // 아직 안 나눴을 때는 칸 안에 안내를 띄우지 않음(맨 위 큰 안내만)
      if (p.length > 2) return { k: "hint", msg: M_ST_MANY };
      if (norm(p[0]) === norm(g[0]) && norm(p[1]) === norm(g[1])) return { k: "ok", msg: M_ST_OK };
      return { k: "hint", msg: M_ST_OFF };
    }
    function updateStats() {
      grid.querySelectorAll(".tut-stat").forEach(st => { const c = check(st.dataset.lang); st.className = "tut-stat " + c.k; st.textContent = c.msg; st.hidden = c.k === "none"; });
      if (done) done.hidden = !(check("zh").k === "ok" && check("id").k === "ok");
    }
    // 오른쪽에서 실제로 쓰는 슬라이드와 같은 모양(제목줄 + 검은 화면 + 언어별 글자 + 글자 크기 맞춤): N번 조각이 N번 슬라이드에 들어감
    function refitPrev() { // 실제 슬라이드와 같은 글자 크기 맞춤(04-layout-copy.js의 computeFitScale). 창이 보일 때만 계산됨
      if (typeof computeFitScale !== "function") return;
      requestAnimationFrame(() => { if (!isOpen()) return; prev.querySelectorAll(".row").forEach(r => { try { computeFitScale(r); } catch (e) { /* 표시만 못 맞출 뿐 */ } }); });
    }
    function renderPrev() {
      prev.textContent = "";
      const n = Math.max(...ORDER.map(c => pieces[c].length));
      for (let i = 0; i < n; i++) {
        const block = el("div", "slide-block"), grip = el("div", "slide-grip");
        grip.appendChild(el("span", "sg-title", "슬라이드 " + (i + 1)));
        const row = el("div", "row"), badge = el("div", "fit-badge");
        badge.style.display = "none"; row.appendChild(badge); row._badge = badge;
        ORDER.forEach(c => {
          const t = pieces[c][i], slot = el("div", "slot" + (t ? "" : " empty"));
          slot.dataset.lang = c; slot.appendChild(el("div", "slot-main", t || labelOf(c))); // 비어 있으면 실제처럼 언어 이름만 흐리게
          row.appendChild(slot);
        });
        block.append(grip, row); prev.appendChild(block);
      }
      refitPrev();
    }
    function resetOne(c) { const p = previews[c]; if (p) { p.textContent = M_SEL_PLACE; p.classList.remove("has-text", "pending"); } }
    function cell(code, extra) { const c = el("div", "tut-cell" + (FIXED.has(code) ? " fixed" : "") + (extra ? " " + extra : "")); c.dataset.lang = code; return c; }

    // 실제 화면과 같은 모양: 맨 윗줄에 언어 칸 제목 4개가 나란히(제목 + 선택 번역 상자), 그 아래로 같은 번호의 조각이 줄 맞춰 놓임
    function render(focus) {
      grid.textContent = "";
      ORDER.forEach(code => {
        const c = cell(code), head = el("div", "col-head"), title = el("div", "col-title");
        title.append(el("span", "ct-name", labelOf(code)), el("span", "ct-count", pieces[code].length + "조각"));
        const pv = el("div", "col-selpreview", M_SEL_PLACE); previews[code] = pv;
        head.append(title, pv, el("div", "tut-sub", FIXED.has(code) ? M_SUB_FIXED : M_SUB_EDIT));
        c.appendChild(head); grid.appendChild(c);
      });
      const n = Math.max(...ORDER.map(c => pieces[c].length));
      for (let i = 0; i < n; i++) ORDER.forEach(code => {
        const t = pieces[code][i];
        if (t == null) { grid.appendChild(cell(code, "gap")); return; }
        const c = cell(code), box = el("div", "box"), ta = document.createElement("textarea");
        ta.className = "tut-ta"; ta.readOnly = true; ta.rows = 1; ta.spellcheck = false; ta.value = t;
        ta.dataset.lang = code; ta.dataset.idx = String(i);
        box.append(el("div", "box-num", String(i + 1)), ta);
        c.appendChild(box); grid.appendChild(c);
      });
      ORDER.forEach(code => {
        if (FIXED.has(code)) { grid.appendChild(cell(code, "gap")); return; }
        const c = cell(code), st = el("div", "tut-stat"); st.dataset.lang = code; c.appendChild(st); grid.appendChild(c);
      });
      updateStats(); renderPrev(); autosize();
      if (focus) {
        const ta = grid.querySelector('textarea[data-lang="' + focus.code + '"][data-idx="' + focus.idx + '"]');
        if (ta) { ta.focus({ preventScroll: true }); try { ta.setSelectionRange(focus.caret, focus.caret); } catch (e) { /* 무시 */ } }
      }
    }
    function reset() { pieces = { ko: START.ko.slice(), en: START.en.slice(), zh: [VERSES.zh], id: [VERSES.id] }; render(); }

    function split(code, idx, at) {
      const t = pieces[code][idx], l = t.slice(0, at).trim(), r = t.slice(at).trim();
      if (!l || !r) { const st = grid.querySelector('.tut-stat[data-lang="' + code + '"]'); if (st) { st.className = "tut-stat hint"; st.textContent = M_ST_MID; } return; }
      pieces[code].splice(idx, 1, l, r);
      render({ code, idx: idx + 1, caret: 0 });
    }
    function merge(code, idx) { // 조각 맨 앞에서 Backspace: 앞 조각과 합침
      const a = pieces[code][idx - 1], b = pieces[code][idx];
      pieces[code].splice(idx - 1, 2, a + (code === "zh" ? "" : " ") + b);
      render({ code, idx: idx - 1, caret: a.length });
    }
    grid.addEventListener("keydown", e => {
      const ta = e.target;
      if (!ta.classList || !ta.classList.contains("tut-ta") || imeBusy(e)) return;
      const code = ta.dataset.lang, idx = +ta.dataset.idx;
      if (FIXED.has(code) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); split(code, idx, ta.selectionStart); }
      else if (e.key === "Backspace" && idx > 0 && ta.selectionStart === 0 && ta.selectionEnd === 0) { e.preventDefault(); e.stopPropagation(); merge(code, idx); }
    });
    async function showSel(ta) { // 드래그로 고른 부분의 번역을, 그 언어 칸 제목 아래 상자에 보여 줌(실제 화면과 같음)
      if (!ta || !ta.classList || !ta.classList.contains("tut-ta")) return;
      const s = ta.selectionStart, e = ta.selectionEnd, code = ta.dataset.lang, my = ++selSeq, pv = previews[code];
      ORDER.forEach(c => { if (c !== code) resetOne(c); }); // 다른 칸 상자는 비움. 이 칸 상자는 새 번역이 나올 때까지 이전 글을 둬서 깜빡이지 않음
      if (!pv) return;
      if (s === e) { resetOne(code); return; }
      if (code === "en") { pv.textContent = M_SEL_EN; pv.classList.remove("has-text"); return; }
      if (!window.WEL_REC) { pv.textContent = "불러오는 중..."; pv.classList.add("has-text", "pending"); }
      const ok = await loadRecTable();
      if (my !== selSeq) return;
      pv.classList.remove("pending");
      if (!ok) { pv.textContent = LOAD_FAIL; pv.classList.remove("has-text"); return; }
      const o = offsets(code)[+ta.dataset.idx], text = recAt(code, o + s, o + e);
      if (text) { pv.textContent = text; pv.classList.add("has-text"); } else { pv.textContent = NOT_FOUND; pv.classList.remove("has-text"); }
    }
    // 실제 화면(03-slides.js)과 같이: 마우스를 누르고 끄는 동안에도 선택이 바뀔 때마다 바로(0.06초 간격) 번역하고, 놓은 자리의 최종 선택까지 반영
    const liveSel = throttleTrailing(showSel, 60);
    grid.addEventListener("mousedown", e => {
      ensureRec();
      const ta = e.target;
      if (!ta.classList || !ta.classList.contains("tut-ta")) return;
      let last = "";
      const onMove = () => {
        const key = ta.selectionStart + "," + ta.selectionEnd;
        if (key === last) return;
        last = key;
        liveSel(ta);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setTimeout(() => showSel(ta), 0); // 클릭으로 선택이 풀리는 것까지 반영
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    grid.addEventListener("keyup", e => showSel(e.target)); // Shift+방향키 선택
    grid.addEventListener("select", e => liveSel(e.target));
    grid.addEventListener("focusout", e => { const t = e.target; if (t.classList && t.classList.contains("tut-ta")) { selSeq++; resetOne(t.dataset.lang); } }); // 실제 화면처럼 칸을 벗어나면 안내 문구로 돌아감
    grid.addEventListener("focusin", ensureRec);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    if (ov) new MutationObserver(() => { if (isOpen()) { ensureRec(); requestAnimationFrame(autosize); refitPrev(); } }).observe(ov, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", () => { if (isOpen()) { autosize(); refitPrev(); } });
    reset();
    if (isOpen()) { ensureRec(); requestAnimationFrame(autosize); }
  })();

  // 시작 안내 창이 처음부터 열려 있으면 곧 체험을 쓸 가능성이 높으니 한가할 때 미리 받아 둔다(드래그 즉시 번역)
  const welOverlay = document.getElementById("patchOverlay");
  if (welOverlay && welOverlay.classList.contains("open")) (window.requestIdleCallback || (f => setTimeout(f, 800)))(() => { loadRecTable(); });
})();
