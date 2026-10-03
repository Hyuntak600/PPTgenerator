"use strict";

// ---------------------------------------------------------------------
// 아이콘(PPTgenerator.html 맨 위의 SVG 스프라이트) · 확인 시트
// icon("info") → 글자 색을 따라가는 단색 선 아이콘 마크업. 버튼 글자를 JS로 바꿀 때 innerHTML에 넣어 씀
// macConfirm(메시지, {title, ok, cancel, danger}) → Promise<boolean>: 브라우저 기본 confirm() 대신 맥 시트 창
//   danger:true 면 확인 버튼이 빨갛고, 처음 포커스는 취소에 놓임(Enter로 실수로 지우는 일을 막음). Esc·바깥 클릭 = 취소
// ---------------------------------------------------------------------
// 한글 등 조합(IME) 입력 중인 키인지: 크롬은 isComposing, 사파리는 조합을 확정하는 Enter가 isComposing=false 로 오고 keyCode 229 로만 알 수 있음
const imeBusy = e => !!e.isComposing || e.keyCode === 229;
const icon = name => '<svg class="ic ic-' + name + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
function macConfirm(message, o) {
  o = o || {};
  return new Promise(resolve => {
    const prev = document.activeElement;
    const ov = document.createElement("div"); ov.className = "patch-overlay mc-overlay";
    const md = document.createElement("div"); md.className = "patch-modal mc-sheet";
    md.setAttribute("role", "alertdialog"); md.setAttribute("aria-modal", "true"); md.tabIndex = -1;
    const id = "mc" + (++macConfirm._n);
    if (o.title) { const h = document.createElement("h2"); h.className = "mc-title"; h.id = id + "t"; h.textContent = o.title; md.appendChild(h); md.setAttribute("aria-labelledby", id + "t"); }
    const msg = document.createElement("div"); msg.className = "mc-msg"; msg.id = id + "m"; msg.textContent = message; md.appendChild(msg);
    md.setAttribute("aria-describedby", id + "m");
    const act = document.createElement("div"); act.className = "copy-actions";
    const no = document.createElement("button"); no.type = "button"; no.className = "btn"; no.textContent = o.cancel || "취소";
    const yes = document.createElement("button"); yes.type = "button"; yes.className = "btn " + (o.danger ? "mc-danger" : "primary"); yes.textContent = o.ok || "확인";
    act.append(no, yes); md.appendChild(act); ov.appendChild(md); document.body.appendChild(ov);
    let done = false;
    function finish(v) {
      if (done) return; done = true;
      ov.removeEventListener("keydown", onKey, true);
      ov.remove();
      try { if (prev && prev.focus) prev.focus(); } catch (e) { /* 포커스를 돌려줄 수 없어도 무시 */ }
      resolve(v);
    }
    function onKey(e) {
      e.stopPropagation(); // 창이 떠 있는 동안 Ctrl+Z·Delete 같은 단축키가 뒤쪽 화면에 닿지 않게
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === no ? yes : no).focus(); } // 두 버튼 사이에서만 포커스가 돎
    }
    ov.addEventListener("keydown", onKey, true);
    no.addEventListener("click", () => finish(false));
    yes.addEventListener("click", () => finish(true));
    ov.addEventListener("click", e => { if (e.target === ov) finish(false); }); // 11-modal-guard가 "바깥에서 눌러 안에서 뗀" 경우를 걸러 줌
    requestAnimationFrame(() => { ov.classList.add("open"); (o.danger ? no : yes).focus(); });
  });
}
macConfirm._n = 0;

// ---------------------------------------------------------------------
// 패치 노트 모달: 처음 열 때(또는 "다시 보지 않기"를 체크하지 않은 경우) 자동으로 표시
// ---------------------------------------------------------------------
(function initPatchNotes() {
  const overlay = document.getElementById("patchOverlay");
  const closeBtn = document.getElementById("patchCloseBtn");
  const reopenBtn = document.getElementById("patchReopenBtn");

  function openModal() {
    overlay.classList.add("open");
  }
  function closeModal() {
    overlay.classList.remove("open");
  }

  closeBtn.addEventListener("click", closeModal);
  // 성경 DB 모드에서는 이 버튼이 "사용 안내"(성경 DB용)로 바뀌어 DB 안내 창을 연다. 슬라이드 만들기 모드는 그대로 시작 안내
  reopenBtn.addEventListener("click", () => { if (appMode === "db") dbGuideOverlay.classList.add("open"); else openModal(); });
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
})();

// ---------------------------------------------------------------------
// 번역 서버(LibreTranslate) 설치 안내 모달: 헤더 버튼이나 연결 실패 배너의
// "설치 안내 보기" 버튼을 눌렀을 때만 열림(패치 노트처럼 자동으로 뜨지는 않음)
// ---------------------------------------------------------------------
(function initHowtoModal() {
  const overlay = document.getElementById("howtoOverlay");
  const closeBtn = document.getElementById("howtoCloseBtn");
  const reopenBtn = document.getElementById("howtoReopenBtn");
  const bannerLinkBtn = document.getElementById("ltStatusHowto");

  function openModal() { overlay.classList.add("open"); }
  function closeModal() { overlay.classList.remove("open"); }

  // 내 컴퓨터(OS)에 맞는 안내만 보이게: 맥이면 Mac, 그 밖에는 Windows가 처음 선택됨(위쪽 선택기로 바꿀 수 있음)
  const osSeg = document.getElementById("howtoOsSeg");
  function setOs(os) { overlay.dataset.hos = os; osSeg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.os === os)); }
  setOs(window.APP_ENV && window.APP_ENV.mac ? "mac" : "win");
  osSeg.addEventListener("click", e => { const b = e.target.closest("button"); if (b) setOs(b.dataset.os); });
  overlay.querySelectorAll(".howto-cmdcopy").forEach(btn => btn.addEventListener("click", () => {
    copyToClipboard(btn.previousElementSibling.textContent.trim(), "복사했어요.");
  }));

  closeBtn.addEventListener("click", closeModal);
  reopenBtn.addEventListener("click", openModal);
  bannerLinkBtn.addEventListener("click", openModal);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
})();

// ---------------------------------------------------------------------
// 언어 설정: code(내부/CSS용) · label(표시명) · ltcode(LibreTranslate API 언어 코드)
// · color(PPT 강조색) · font(PPT용 폰트) — 원본 PPT_생성기.html의 배색 유지
// (최신 LibreTranslate는 중국어(간체)를 "zh-CN"이나 "zh"가 아니라 "zh-Hans"로 받음.
//  서버의 /languages 응답에 나오는 code 값과 반드시 일치해야 함)
// ---------------------------------------------------------------------
const LANG_META = {
  ko: { label: "한국어",    ltcode: "ko", color: "B23A5B", font: "맑은 고딕" },
  zh: { label: "中文",      ltcode: "zh-Hans", color: "1F8A70", font: "Microsoft YaHei" },
  en: { label: "English",   ltcode: "en", color: "2F5F8F", font: "Arial" },
  id: { label: "Indonesia", ltcode: "id", color: "A3781F", font: "Arial" },
};
const LANGS = Object.keys(LANG_META).map(code => ({ code, ...LANG_META[code] }));


const left = document.getElementById("left");
const right = document.getElementById("right");
const settingsMore = document.getElementById("settingsMore");
const guideBar = document.getElementById("guideBar");
const tipsBar = document.getElementById("tipsBar");
let uid = 0;
const NON_BLANK = /\S/; // 공백뿐인 칸 판별: trim()처럼 새 문자열을 만들지 않고 첫 글자에서 멈춤
let refSelBox = null;   // 슬라이드 만들기 모드: 선택된 성경 줄(그 줄의 조각 하나)
let appMode = "slide";   // "slide"(슬라이드 만들기) | "db"(성경 DB)
let localWiped = false;   // 로컬 데이터 삭제를 시작하면 true: 이후 어떤 자동 저장도 다시 쓰지 않음
let dbCur = null;         // DB 모드에서 지금 화면에 올라와 있는 절 {en,ch,v} (불러오는 동안은 null → 저장 안 함)
let dbRefStr = "";        // DB 모드 슬라이드 왼쪽 위에 넣는 글자: "John (요한복음) 约翰福音 Yohanes 3:16" 

function labelOf(code) { return LANG_META[code].label; }
function ltcodeOf(code) { return LANG_META[code].ltcode; }

// ---------------------------------------------------------------------
// 참고 번역(gloss) — LibreTranslate(오픈소스, 자체 호스팅 번역기) API를 브라우저에서 직접 호출
// (아래 LIBRETRANSLATE_URL에 떠 있는 자체 서버의 POST /translate 엔드포인트를 호출함.
//  키 없이 열어둔 인스턴스라면 LIBRETRANSLATE_API_KEY는 빈 문자열로 두면 됨.
//  브라우저에서 다른 오리진으로 바로 fetch하는 구조이므로, 요청이 막히면 먼저
//  그 서버 쪽에서 CORS를 허용하고 있는지부터 확인할 것)
//
// 예전엔 매번 새로 번역을 호출했고, 특히 새로고침/복원 시 이미 번역해 둔
// 문장까지 전부 한꺼번에 다시 요청해서 느려졌다. 아래 세 가지로 체감 속도를 개선:
//  1) 캐시(localStorage에 저장) — 같은 문장은 다시 요청하지 않고 즉시 표시
//  2) 동시 요청 수 제한 — 한꺼번에 수십 건씩 쏘지 않고 몇 건씩만 순차 처리
//  3) 요청당 타임아웃 + 1회 재시도 — 응답이 없으면 무한정 기다리지 않고
//     일정 시간 후 포기, 실패 시 한 번만 더 시도
// ---------------------------------------------------------------------
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// 1) 번역 결과 캐시(세션을 넘어 localStorage에 유지)
// 번역 엔진을 MyMemory → LibreTranslate로 바꾸면서 캐시 버전을 v2로 올림
// (v1에는 MyMemory가 만든 번역이 들어 있어, 그대로 재사용하면 서로 다른 엔진의
//  결과가 뒤섞이므로 새 키를 써서 자연스럽게 다시 번역하도록 함)
const GLOSS_CACHE_KEY = "subtitleTool_glossCache_v2";
const GLOSS_CACHE_MAX_ENTRIES = 3000; // 너무 커지지 않도록 상한
let glossCache = new Map();
try {
  const rawCache = localStorage.getItem(GLOSS_CACHE_KEY);
  if (rawCache) glossCache = new Map(Object.entries(JSON.parse(rawCache)));
} catch (e) {
  /* 캐시가 없거나 손상된 경우는 빈 캐시로 시작 */
}
function saveGlossCacheNow() {
  if (localWiped) return;
  try {
    // 오래된 항목부터 버려서 상한을 넘지 않게 함
    while (glossCache.size > GLOSS_CACHE_MAX_ENTRIES) {
      glossCache.delete(glossCache.keys().next().value);
    }
    localStorage.setItem(GLOSS_CACHE_KEY, JSON.stringify(Object.fromEntries(glossCache)));
  } catch (e) {
    /* 저장 공간이 없는 환경은 조용히 무시(캐시는 메모리에서만 동작) */
  }
}
const saveGlossCacheDebounced = debounce(saveGlossCacheNow, 800);

// 2) 동시 요청 수 제한 큐 (최대 N건 동시 진행)
function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];
  function runNext() {
    if (active >= maxConcurrent || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      runNext();
    });
  }
  return fn => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    runNext();
  });
}
const runLimitedTranslate = createLimiter(3);

// 3) 타임아웃 있는 fetch (지정 시간 내 응답 없으면 중단). options는 그대로 fetch에 전달됨
//    (LibreTranslate 호출에 필요한 method/headers/body를 얹을 수 있도록 GET 전용이던
//    이전 버전에서 확장함)
function fetchWithTimeout(url, ms, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
