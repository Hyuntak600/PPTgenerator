"use strict";

(function initWelcomeTry() {
  const VERSES = {
    ko: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 저를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이니라",
    zh: "神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。",
    en: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    id: "Karena demikianlah Allah mengasihi isi dunia ini, sehingga dikaruniakan-Nya Anak-Nya yang tunggal itu, supaya barangsiapa yang percaya akan Dia jangan binasa, melainkan beroleh hidup yang kekal.",
  };

  // ─ 시작 화면 체험은 번역 서버를 쓰지 않는다. 처음 쓰는 사용자는 아직 번역 서버가 없으니, 미리 만들어 둔 번역표(js/welcome-rec-table.js, WEL_REC)만 쓴다 ─
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
    try { await loadScriptOnce("js/welcome-rec-table.js"); } catch (e) { return false; }
    return !!window.WEL_REC;
  }

  const ta = document.getElementById("welVerse");
  const out = document.getElementById("welOut");
  const sampleTag = document.getElementById("welSampleTag");
  const verseSeg = document.getElementById("welVerseSeg");
  const PLACEHOLDER = "위 구절을 마우스로 드래그해 보세요. 고른 부분의 번역이 여기에 나와요.";
  const NOT_FOUND = "이 구간은 체험용 번역표에 없어요. 다른 구간을 드래그해 보세요.";
  const LOAD_FAIL = "체험용 번역표를 불러오지 못했어요. 페이지를 새로고침해 주세요.";
  let verseLang = "ko", seq = 0;

  function showPlaceholder() {
    seq++;
    sampleTag.hidden = true;
    out.textContent = PLACEHOLDER;
    out.classList.remove("has-text", "pending");
  }
  async function update() {
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
    if (!sel) { showPlaceholder(); return; }
    const my = ++seq, lang = verseLang;
    if (!window.WEL_REC) { // 번역표를 아직 못 받았으면 받는 동안만 잠깐 표시
      sampleTag.hidden = true;
      out.textContent = "불러오는 중...";
      out.classList.add("has-text", "pending");
    }
    const loaded = await loadRecTable();
    if (my !== seq) return; // 그 사이 다른 글자를 골랐으면 이 결과는 버림
    out.classList.remove("pending");
    if (!loaded) { out.textContent = LOAD_FAIL; out.classList.remove("has-text"); sampleTag.hidden = true; return; }
    const text = recLookup(lang) || window.WEL_REC[lang][sel] || "";
    if (text) { out.textContent = text; out.classList.add("has-text"); sampleTag.hidden = false; }
    else { out.textContent = NOT_FOUND; out.classList.remove("has-text"); sampleTag.hidden = true; }
  }
  // 고른 구간을 번역표에서 찾는다. 띄어쓰기 언어(한국어·인도네시아어)는 걸친 단어를 통째로 포함하도록 넓혀 찾고,
  // 중국어는 글자 그대로 찾는다. 앞뒤 공백은 뗀다.
  function recLookup(lang) {
    const v = VERSES[lang]; let s = ta.selectionStart, e = ta.selectionEnd;
    while (s < e && /\s/.test(v[s])) s++;
    while (e > s && /\s/.test(v[e - 1])) e--;
    if (s >= e) return "";
    const rec = (window.WEL_REC && window.WEL_REC[lang]) || {};
    if (rec[v.slice(s, e)]) return rec[v.slice(s, e)];
    if (lang !== "zh") {
      while (s > 0 && !/\s/.test(v[s - 1])) s--;
      while (e < v.length && !/\s/.test(v[e])) e++;
    }
    return rec[v.slice(s, e)] || "";
  }
  const live = throttleTrailing(update, 60); // 번역표 조회라 서버 호출이 없어 빠르게 따라간다

  function setVerse(lang) {
    verseLang = lang;
    ta.value = VERSES[lang];
    verseSeg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
    showPlaceholder();
  }
  verseSeg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => setVerse(b.dataset.lang)));

  ta.addEventListener("mousedown", () => {
    let last = "";
    const onMove = () => {
      const key = ta.selectionStart + "," + ta.selectionEnd;
      if (key === last) return;
      last = key;
      live();
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setTimeout(update, 0); // 놓은 자리의 최종 선택(또는 클릭으로 선택이 풀린 것)까지 반영
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
  ta.addEventListener("select", live);
  ta.addEventListener("keyup", () => update()); // Shift+방향키 선택


  // ─ 개발용 "📼 번역기 출력 기록": 평소엔 받지 않고, 개발용 줄이 보이는 상태에서 버튼을 처음 누를 때만 불러온다 ─
  // 주소 끝에 ?welrec 를 붙여 열면 숨겨 둔 개발용 줄이 나타난다(예: PPTgenerator.html?welrec).
  const recBtn = document.getElementById("welRecBtn");
  const recRow = document.querySelector("[data-devonly]");
  const recOutBox = document.getElementById("welRecOut");
  if (recRow && /[?&]welrec(=|&|$)/.test(location.search)) { recRow.style.display = ""; if (recOutBox) recOutBox.style.display = ""; }
  if (recBtn) recBtn.addEventListener("click", async () => {
    try {
      if (!(await loadRecTable())) throw new Error("welcome-rec-table.js");
      window.__welCtx = { VERSES, WEL_REC: window.WEL_REC };
      await loadScriptOnce("js/welcome-rec-dev.js");
    } catch (e) { showToast("개발용 기록 파일을 불러오지 못했어요: " + (e && e.message || e), true); return; }
    window.__welRecRun();
  });

  setVerse("ko");
  // 시작 안내 창이 처음부터 열려 있으면 곧 체험을 쓸 가능성이 높으니 한가할 때 미리 받아 둔다(드래그 즉시 번역)
  const welOverlay = document.getElementById("patchOverlay");
  if (welOverlay && welOverlay.classList.contains("open")) (window.requestIdleCallback || (f => setTimeout(f, 800)))(() => { loadRecTable(); });
})();
