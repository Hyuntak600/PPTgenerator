"use strict";

// ---- LibreTranslate 서버 설정 ----
// 자체 호스팅한 서버 주소(끝에 "/"는 붙이지 않음).
// 로컬에서 `docker run -d -p 5000:5000 -e LT_LOAD_ONLY=en,ko,zh,id libretranslate/libretranslate` 로 띄웠다면 포트는 5000.
const LT_URL_KEY = "subtitleTool_ltUrl";
const LT_URL_DEFAULT = "http://localhost:5000";
let LIBRETRANSLATE_URL = LT_URL_DEFAULT; // 번역 서버 안내 창의 "서버 주소"에서 바꿀 수 있음(브라우저에 저장됨)
try {
  const savedUrl = localStorage.getItem(LT_URL_KEY);
  if (savedUrl && /^https?:\/\//i.test(savedUrl)) LIBRETRANSLATE_URL = savedUrl.replace(/\/+$/, "");
} catch (e) { /* 저장값을 못 읽으면 기본 주소 사용 */ }
// 서버를 --api-keys 옵션으로 띄워 키를 요구하는 경우에만 채우고, 그 외엔 빈 문자열로 둘 것.
const LIBRETRANSLATE_API_KEY = "";

// 개발자 도구를 열지 않아도 한눈에 알 수 있도록, 페이지를 열 때 서버 연결과
// 필요한 언어 모델(ko/zh/en/id) 설치 여부를 미리 확인해서 화면 상단에 띄워줌.
const ltBanner = document.getElementById("ltStatusBanner");
const ltBannerText = document.getElementById("ltStatusText");
let ltBannerTimer = null, ltFadeTimer = null;
// 안내 배너는 읽을 시간만 보여 주고, 그 뒤 1.6초에 걸쳐 서서히 사라진다(정상 3초 · 문제 안내 8초). 마우스를 올려 두면 사라지지 않음.
// 연결 상태는 위쪽 칩에 계속 남아 있어서, 배너가 사라져도 놓치지 않는다.
const LT_FADE_MS = 1600;
function armLtBannerTimer(ms) { clearTimeout(ltBannerTimer); ltBannerTimer = setTimeout(fadeLtBanner, ms); }
function showLtBanner(text, ok, detail) {
  clearTimeout(ltFadeTimer);
  ltBannerText.textContent = text;
  ltBanner.title = detail || "";
  ltBanner.classList.toggle("ok", !!ok);
  ltBanner.classList.remove("fade");
  ltBanner.classList.add("show");
  armLtBannerTimer(ok ? 3000 : 8000);
}
function fadeLtBanner() { // 서서히 투명해진 뒤 자리까지 접는다
  clearTimeout(ltBannerTimer); clearTimeout(ltFadeTimer);
  ltBanner.classList.add("fade");
  ltFadeTimer = setTimeout(hideLtBanner, LT_FADE_MS);
}
function hideLtBanner() { // 닫기 버튼은 바로 접음
  clearTimeout(ltBannerTimer); clearTimeout(ltFadeTimer);
  ltBanner.classList.remove("show", "fade");
}
function keepLtBanner() { // 사라지는 중이라도 마우스를 올리면 다시 또렷하게
  clearTimeout(ltBannerTimer); clearTimeout(ltFadeTimer);
  ltBanner.classList.remove("fade");
}
ltBanner.addEventListener("mouseenter", keepLtBanner);
ltBanner.addEventListener("mouseleave", () => { if (ltBanner.classList.contains("show")) armLtBannerTimer(3000); });
const ltChip = document.getElementById("ltChip");
function setLtChip(state, text, title) {
  ltChip.dataset.state = state;
  ltChip.lastElementChild.textContent = text;
  ltChip.title = (title ? title + " · " : "") + "눌러서 번역 서버 연결을 다시 확인";
}
// 맥이고 서버 주소가 5000번 포트인 경우(AirPlay 수신 모드와 충돌할 수 있음)
const macPort5000 = () => !!(window.APP_ENV && window.APP_ENV.mac) && /:5000(\/|$)/.test(LIBRETRANSLATE_URL);
let ltBusy = false;
// silent === true 이면 배너 없이 상단 칩만 갱신(주기 확인용). 클릭 이벤트가 넘어와도 silent로 취급하지 않음.
async function checkLibreTranslateConnection(silent) {
  silent = silent === true;
  if (ltBusy) return;
  ltBusy = true;
  const banner = (...a) => { if (!silent) showLtBanner(...a); };
  try {
    if (!silent) setLtChip("check", "번역 서버 확인 중");
    banner("LibreTranslate 서버 연결 확인 중...", false);
    let res;
    try {
      res = await fetchWithTimeout(`${LIBRETRANSLATE_URL}/languages`, 5000);
    } catch (e) {
      setLtChip("down", "번역 서버 연결 안 됨", LIBRETRANSLATE_URL);
      const failDetail =
        `LibreTranslate 서버(${LIBRETRANSLATE_URL})에 연결할 수 없습니다. 서버가 켜져 있는지, ` +
        `주소가 맞는지, 서버 쪽 CORS 설정을 확인하세요. (${e && e.message ? e.message : e})`;
      // 사파리는 https로 연 페이지에서 http 주소(번역 서버)로의 요청을 막을 수 있어서, 이 경우만 따로 안내
      if (window.APP_ENV && window.APP_ENV.safari && location.protocol === "https:" && /^http:\/\//i.test(LIBRETRANSLATE_URL)) {
        banner(
          `사파리에서는 https 페이지가 http 번역 서버(${LIBRETRANSLATE_URL})에 연결하지 못할 수 있어요. 크롬으로 열어 보세요.`,
          false, failDetail
        );
      } else if (macPort5000()) {
        banner(`맥에서 번역 서버(${LIBRETRANSLATE_URL})에 연결되지 않았어요. 서버가 켜져 있는데도 안 되면 AirPlay 수신 모드를 꺼 보세요.`, false, failDetail);
      } else {
        banner(`번역 서버(${LIBRETRANSLATE_URL})에 연결되지 않았어요. 번역만 빼고 모두 쓸 수 있어요.`, false, failDetail);
      }
      return;
    }
    if (!res.ok) {
      setLtChip("down", "번역 서버 오류 " + res.status, LIBRETRANSLATE_URL);
      if (res.status === 403 && macPort5000()) { // 맥에서 5000번을 AirPlay 수신 모드가 쓰면 번역 서버 대신 403으로 답함
        banner("맥의 5000번 포트를 AirPlay 수신 모드가 쓰고 있는 것 같아요(HTTP 403). 시스템 설정 → 일반 → AirDrop 및 Handoff에서 AirPlay 수신 모드를 끄고 다시 확인해 주세요.");
      } else {
        banner(`LibreTranslate 서버(${LIBRETRANSLATE_URL})가 오류를 반환했습니다: HTTP ${res.status}`);
      }
      return;
    }
    let langs;
    try {
      langs = await res.json();
    } catch (e) {
      setLtChip("down", "번역 서버 응답 이상", LIBRETRANSLATE_URL);
      banner(`LibreTranslate 서버(${LIBRETRANSLATE_URL}) 응답을 해석할 수 없습니다(JSON 형식이 아님).`);
      return;
    }
    const codes = new Set((Array.isArray(langs) ? langs : []).map(l => l && l.code));
    const missingLabels = LANGS.filter(l => !codes.has(l.ltcode)).map(l => `${l.label}(${l.ltcode})`);
    if (missingLabels.length) {
      setLtChip("warn", "번역 서버 연결됨 · 언어 모델 부족", "없는 언어: " + missingLabels.join(", "));
      banner(
        `LibreTranslate 서버에는 연결됐지만 다음 언어 모델이 설치돼 있지 않습니다: ${missingLabels.join(", ")}. ` +
        `해당 언어의 참고번역/미리보기 번역은 계속 실패로 뜹니다(서버에 그 언어 모델을 설치해야 함).`
      );
      return;
    }
    setLtChip("ok", "번역 서버 연결됨", LIBRETRANSLATE_URL);
    if (!silent) {
      showLtBanner(`LibreTranslate 서버(${LIBRETRANSLATE_URL}) 연결 정상, 필요한 언어 모델도 모두 설치돼 있습니다.`, true);
    }
  } finally {
    ltBusy = false;
  }
}
// 연결 상태가 항상 맞게 보이도록 30초마다 조용히 다시 확인(탭이 숨겨져 있을 땐 건너뜀)
setInterval(() => { if (!document.hidden) checkLibreTranslateConnection(true); }, 30000);
ltChip.addEventListener("click", () => { checkLibreTranslateConnection(); retryAllGloss(); });
document.getElementById("ltStatusRecheck").addEventListener("click", checkLibreTranslateConnection);
const ltUrlInput = document.getElementById("ltUrlInput");
ltUrlInput.value = LIBRETRANSLATE_URL;
document.getElementById("ltUrlSave").addEventListener("click", () => {
  const v = ltUrlInput.value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/i.test(v)) {
    showToast("주소는 http:// 로 시작해야 해요. 예: http://localhost:5000", true);
    return;
  }
  LIBRETRANSLATE_URL = v;
  ltUrlInput.value = v;
  try { localStorage.setItem(LT_URL_KEY, v); } catch (e) { /* 저장 못 해도 이번 접속에는 적용됨 */ }
  showToast("서버 주소를 저장했어요. 다시 확인합니다.");
  checkLibreTranslateConnection();
});
document.getElementById("ltStatusClose").addEventListener("click", hideLtBanner);

async function requestTranslateOnce(clean, fromCode, toCode, attempt = 1, timeoutMs = 7000) {
  try {
    const body = { q: clean, source: fromCode, target: toCode, format: "text" };
    if (LIBRETRANSLATE_API_KEY) body.api_key = LIBRETRANSLATE_API_KEY;

    const res = await fetchWithTimeout(`${LIBRETRANSLATE_URL}/translate`, timeoutMs, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = "번역 서비스 오류: " + res.status;
      try {
        const errData = await res.json();
        if (errData && errData.error) msg = errData.error;
      } catch (e) { /* 오류 응답이 JSON이 아니면 위 기본 메시지를 그대로 씀 */ }
      throw new Error(msg);
    }
    const data = await res.json();
    if (!data || typeof data.translatedText !== "string") {
      throw new Error("번역 실패: 응답 형식이 올바르지 않습니다");
    }
    return data.translatedText;
  } catch (e) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 400));
      return requestTranslateOnce(clean, fromCode, toCode, attempt + 1, timeoutMs);
    }
    throw e;
  }
}

const glossInflight = new Map(); // 지금 요청 중인 문장: 같은 문장이 동시에 여러 곳에서 요청돼도 서버에는 한 번만 보냄
async function glossTranslate(text, fromCode, toCode, timeoutMs) {
  const clean = text.trim();
  if (!clean) return "";
  if (fromCode === toCode) return clean;

  const cacheKey = `${fromCode}>${toCode}:${clean}`;
  if (glossCache.has(cacheKey)) { // 이미 번역해 둔 문장은 네트워크 없이 즉시 반환
    const hit = glossCache.get(cacheKey);
    glossCache.delete(cacheKey); glossCache.set(cacheKey, hit); // 최근에 쓴 항목은 상한에 걸려도 늦게 버려지도록 맨 뒤로
    return hit;
  }
  let pending = glossInflight.get(cacheKey);
  if (!pending) {
    pending = runLimitedTranslate(() => requestTranslateOnce(clean, fromCode, toCode, 1, timeoutMs))
      .then(result => { glossCache.set(cacheKey, result); saveGlossCacheDebounced(); return result; })
      .finally(() => glossInflight.delete(cacheKey));
    glossInflight.set(cacheKey, pending);
  }
  return pending;
}

// ---------------------------------------------------------------------
// 선택 영역 번역 미리보기: 박스 안 글자를 마우스로 드래그해 "원하는 만큼만" 선택하면,
// 그 박스 바로 위의 칸에 선택한 부분만 번역되어 실시간으로 뜬다(박스 전체 번역 아님).
// ---------------------------------------------------------------------
let dragPreviewLang = "en"; // 미리보기 번역 대상 언어: "ko" 또는 "en" (처음 기본값은 English)

const previewLangSeg = document.getElementById("previewLangSeg");
previewLangSeg.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    dragPreviewLang = btn.dataset.lang;
    previewLangSeg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
    // 이미 선택되어 있는 영역이 있다면 새 언어로 즉시 다시 번역
    document.querySelectorAll(".box").forEach(w => {
      const ta = w.querySelector("textarea");
      if (ta.selectionStart !== ta.selectionEnd) updateSelectionPreview(w);
    });
    right.querySelectorAll(".slide-check").forEach(queueCheckGloss);
    saveStateDebounced();
  });
});

function updateSelectionPreview(wrap) {
  const ta = wrap.querySelector("textarea");
  const col = wrap.closest(".col");
  const selEl = colSelPreviewEl(col);
  if (!ta || !selEl) return;
  const lang = col.dataset.lang;
  const start = ta.selectionStart, end = ta.selectionEnd;

  if (start === end) { resetColSelPreview(col); return; } // 선택된 부분이 없으면 안내 문구로 되돌림
  const selected = ta.value.slice(start, end).trim();
  if (!selected) { resetColSelPreview(col); return; }

  if (lang === dragPreviewLang) {
    selEl._seq = (selEl._seq || 0) + 1; // 진행 중이던 번역 결과는 버림
    selEl._want = null;
    selEl.textContent = selected; // 이미 목표 언어이므로 번역 불필요
    selEl.classList.remove("pending");
    selEl.classList.add("has-text");
    return;
  }
  // 끌고 있는 동안 선택이 계속 바뀌므로, 요청을 쌓지 않고 "가장 최근 선택"만 기억해 두었다가
  // 지금 진행 중인 번역이 끝나면 바로 이어서 번역한다(서버에 불필요한 요청이 몰리지 않음).
  selEl._want = { selected, from: ltcodeOf(lang), to: ltcodeOf(dragPreviewLang), toLabel: dragPreviewLang === "ko" ? "한국어" : "English" };
  if (!selEl.classList.contains("has-text")) {
    selEl.textContent = selEl._want.toLabel + ": 번역 중...";
    selEl.classList.add("has-text");
  } else {
    selEl.classList.add("pending"); // 이전 번역을 살짝 흐리게 보여 주며 새 번역을 기다림(깜빡임 방지)
  }
  if (!selEl._busy) runSelectionTranslate(selEl);
}
async function runSelectionTranslate(selEl) {
  selEl._busy = true;
  try {
    while (selEl._want) {
      const w = selEl._want;
      selEl._want = null;
      const seq = selEl._seq = (selEl._seq || 0) + 1;
      let text;
      try {
        text = await glossTranslate(w.selected, w.from, w.to);
      } catch (e) {
        text = `[번역 실패: ${e && e.message ? e.message : "알 수 없는 오류"}]`;
      }
      if (selEl._seq !== seq || selEl._want) continue; // 그 사이 선택이 바뀌었거나 지워졌으면 이 결과는 버림
      selEl.textContent = text;
      selEl.classList.remove("pending");
      selEl.classList.add("has-text");
    }
  } finally {
    selEl._busy = false;
  }
}
const debouncedSelectionPreview = debounce(wrap => updateSelectionPreview(wrap), 350);
// 마우스로 끌고 있는 동안에는 기다리지 않고 거의 바로(0.12초 간격, 마지막 값 포함) 번역한다
function throttleTrailing(fn, ms) {
  let timer = null, last = 0, lastArg;
  return arg => {
    lastArg = arg;
    const wait = ms - (Date.now() - last);
    if (wait <= 0) { last = Date.now(); fn(arg); return; }
    if (!timer) timer = setTimeout(() => { timer = null; last = Date.now(); fn(lastArg); }, wait);
  };
}
const livePreview = throttleTrailing(wrap => updateSelectionPreview(wrap), 120);

// ---------------------------------------------------------------------
// 왼쪽: 언어별 칸 + 조각(box)
// ---------------------------------------------------------------------
// 선택 영역 번역 미리보기 칸이 아무것도 선택 안 됐을 때 보여줄 안내 문구
const SEL_PREVIEW_PLACEHOLDER = "드래그하면 번역이 여기 보여요";
function colSelPreviewEl(col) { return col ? col.querySelector(".col-selpreview") : null; }
function resetColSelPreview(col) {
  const el = colSelPreviewEl(col);
  if (!el) return;
  el._seq = (el._seq || 0) + 1; // 진행 중이던 번역 결과는 버림
  el._want = null;
  el.textContent = SEL_PREVIEW_PLACEHOLDER;
  el.classList.remove("has-text", "pending");
}

LANGS.forEach(({ code, label }) => {
  const col = document.createElement("div");
  col.className = "col";
  col.dataset.lang = code;

  const head = document.createElement("div");
  head.className = "col-head";

  const title = document.createElement("div");
  title.className = "col-title";
  const titleName = document.createElement("span");
  titleName.className = "ct-name";
  titleName.textContent = label;
  const titleCount = document.createElement("span");
  titleCount.className = "ct-count";
  title.appendChild(titleName);
  title.appendChild(titleCount);
  col._count = titleCount; // 조각 수 표시 칸(매번 찾지 않도록 기억)
  head.appendChild(title);

  const selPrev = document.createElement("div");
  selPrev.className = "col-selpreview";
  selPrev.textContent = SEL_PREVIEW_PLACEHOLDER;
  head.appendChild(selPrev);

  col.appendChild(head);
  left.appendChild(col);
  // 조각(box) 채우기는 스크립트 맨 끝에서 저장된 데이터 복원 여부를 본 뒤에 처리합니다.
});

function autoGrow(ta) {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}
