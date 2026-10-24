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

// ---- 브라우저 내장 번역(Chrome Translator API) ----
// 크롬 138 이상·엣지 148 이상에는 번역기가 브라우저 안에 들어 있어서, Docker·서버 없이 이 화면에서 바로 번역할 수 있어요.
// 처음 한 번만 언어 모델을 받고(위쪽 번역 칩을 누르면 시작), 이후엔 인터넷 없이도 돼요.
// 이 방법이 안 되는 브라우저(사파리·파이어폭스 등)나 언어 쌍은 아래의 LibreTranslate 서버로 자동으로 넘어가요.
// 번역 결과 캐시(glossCache)는 예전과 똑같이 이 브라우저의 localStorage에 저장돼요(어느 엔진으로 번역하든 같은 곳).
const CH_OK = typeof window.Translator !== "undefined" && typeof Translator.availability === "function";
const chLang = c => (c === "zh-Hans" ? "zh" : c);
const chTr = new Map(), chMake = new Map();
const CH_NEED = [["zh-Hans", "en"], ["id", "en"], ["en", "ko"], ["ko", "en"]]; // 영어를 거치면 모든 쌍이 되므로 이 네 쌍이면 충분
const chUnav = new Map(); // "from>to" → 못 한다고 답을 받은 시각(잠깐만 기억: 번역 요청마다 availability()를 다시 부르지 않게)
async function chAvail(from, to) {
  const k = from + ">" + to, at = chUnav.get(k);
  if (at && Date.now() - at < 20000) return "unavailable";
  try {
    const s = await Translator.availability({ sourceLanguage: chLang(from), targetLanguage: chLang(to) });
    if (s === "unavailable") chUnav.set(k, Date.now()); else chUnav.delete(k);
    return s;
  } catch (e) { return "unavailable"; } // 오류는 기억하지 않음(잠깐의 오류가 계속 남지 않게)
}
const chProg = new Map(); // 모델 받는 중인 언어 쌍 "from>to" → 0~1 (다 받으면 1)
const chName = c => { const l = LANGS.find(x => x.ltcode === c); return l ? l.label : c; };
function chProgressActive() { return [...chProg.values()].some(v => v < 1); }
function chProgressUpdate() { // 위쪽 칩 · 안내 창에 "얼마나 받았는지" 표시
  const vals = [...chProg.values()]; if (!vals.length) return;
  const done = vals.every(v => v >= 1), pct = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  const detail = [...chProg.entries()].map(([k, v]) => { const [f, t] = k.split(">"); return chName(f) + "→" + chName(t) + " " + Math.round(v * 100) + "%"; }).join(" · ");
  ltInfo.chrome = done ? "check" : "warn";
  ltInfo.chromeText = done ? "받기 끝 · 확인 중..." : "모델 받는 중 " + pct + "% (" + detail + ")";
  ltInfo.chromePct = done ? -1 : pct;
  if (!done) setLtChip("check", "번역 모델 받는 중 " + pct + "%", detail);
  renderEngineInfo();
  if (done) setTimeout(() => { for (const [k, v] of [...chProg]) if (v >= 1) chProg.delete(k); ltInfo.chromePct = -1; renderEngineInfo(); checkLibreTranslateConnection(true); }, 1500);
}
const chWhy = new Map(); // 쌍별로 마지막에 본 availability 상태(번역이 안 될 때 원인 표시용)
const chErr = new Map(); // 모델 받기에 실패한 쌍 → 이유(안내 창에 그대로 보여 줌)
async function chGet(from, to, allowDownload) { // 쓸 수 있는 번역기를 돌려줌(없으면 null). 모델 받기는 allowDownload=true(번역 칩 → chPrepare)일 때만 시작하거나 기다림
  const k = from + ">" + to;
  if (chTr.has(k)) return chTr.get(k);
  const st = await chAvail(from, to);
  chWhy.set(k, "availability=" + st);
  if (st === "unavailable") return null;
  if (st !== "available") { // 아직 모델을 받아야 하는 쌍
    // 번역 요청(chTranslate)은 모델 받기를 새로 시작하지도, 끝나길 기다리지도 않고 바로 서버로 넘김:
    // 기다리면 받는 몇 분 동안 번역 대기열(동시 3건)이 모두 막히고, 칩과 상관없이 모델이 따로 받아지기도 했음
    if (!allowDownload) return null;
    if (!chMake.has(k) && !(navigator.userActivation && navigator.userActivation.isActive)) return null; // 새로 받기 시작은 사용자가 누른 직후에만 가능(이미 받는 중이면 그 작업을 그대로 기다림)
  }
  if (!chMake.has(k)) {
    if (st !== "available") { chProg.set(k, 0); chProgressUpdate(); }
    chMake.set(k, Translator.create({
      sourceLanguage: chLang(from), targetLanguage: chLang(to),
      monitor(m) { m.addEventListener("downloadprogress", e => { const f = e.total ? e.loaded / e.total : e.loaded; chProg.set(k, Math.min(1, Math.max(0, f || 0))); chProgressUpdate(); }); },
    }).then(t => { chTr.set(k, t); if (chProg.has(k)) { chProg.set(k, 1); chProgressUpdate(); } return t; })
      .catch(e => { chProg.delete(k); chErr.set(k, (e && e.name ? e.name + ": " : "") + (e && e.message ? e.message : "")); try { console.warn("[브라우저 번역] 모델 받기 실패 " + k, e); } catch (x) { /* 무시 */ } throw e; }).finally(() => chMake.delete(k)));
  }
  try { return await chMake.get(k); } catch (e) { return null; }
}
async function chRun(t, k, text) { // 번역기 하나로 번역. 실패하면 이유를 남기고, 망가졌을 수 있는 번역기는 버림(다음에 새로 만듦)
  try { return await t.translate(text); }
  catch (e) {
    chErr.set(k, "번역 오류: " + (e && e.name ? e.name + ": " : "") + (e && e.message ? e.message : ""));
    chTr.delete(k);
    try { console.warn("[브라우저 번역] 번역 오류 " + k, e); } catch (x) { /* 무시 */ }
    throw e;
  }
}
async function chTranslateOnce(text, from, to) {
  const t = await chGet(from, to);
  if (t) return chRun(t, from + ">" + to, text);
  if (from !== "en" && to !== "en") { // 바로 가는 쌍이 없으면 영어를 거쳐서(예: 중국어 → 영어 → 한국어)
    const a = await chGet(from, "en"), b = a && await chGet("en", to);
    if (a && b) return chRun(b, "en>" + to, await chRun(a, from + ">en", text));
  }
  return null;
}
async function chTranslate(text, from, to) { // 못 하면 null → 호출한 쪽이 서버로 넘어감. 번역기가 던진 오류는 한 번 더(새 번역기로) 시도
  if (!CH_OK) return null;
  try { return await chTranslateOnce(text, from, to); }
  catch (e) { return await chTranslateOnce(text, from, to); }
}
function chDiag(from, to) { // 안 될 때 어느 쌍이 왜 안 됐는지 한 줄로
  const ks = [from + ">" + to]; if (from !== "en" && to !== "en") ks.push(from + ">en", "en>" + to);
  return ks.map(k => k + " " + (chTr.has(k) ? "준비됨" : chWhy.get(k) || "확인 안 됨") + (chErr.get(k) ? " · " + chErr.get(k) : "")).join(" / ");
}
let chPairsLast = []; // 마지막으로 확인한 네 쌍의 상태 [{f,t,s}]
async function chStatus() { // "ready" 모두 준비됨 · "download" 받을 모델이 남음 · "partial" 일부 쌍은 이 브라우저가 못 함 · "none" 아예 안 됨
  if (!CH_OK) { chPairsLast = []; return "none"; }
  chPairsLast = await Promise.all(CH_NEED.map(async ([f, t]) => ({ f, t, s: chTr.has(f + ">" + t) ? "available" : await chAvail(f, t) })));
  const todo = chPairsLast.filter(p => p.s === "downloadable" || p.s === "downloading"), bad = chPairsLast.filter(p => p.s === "unavailable");
  if (todo.length) return "download";
  if (!bad.length) return "ready";
  return bad.length === chPairsLast.length ? "none" : "partial";
}
const chPairText = ps => ps.map(p => chName(p.f) + "→" + chName(p.t)).join(", ");
function chStatusText(st) { // 안내 창의 ① 줄 글자
  if (st === "ready") return "사용 가능(모델 받음)";
  if (st === "download") {
    const todo = chPairsLast.filter(p => p.s === "downloadable" || p.s === "downloading"), err = [...chErr.values()][0];
    return "받을 모델 " + todo.length + "개 남음: " + chPairText(todo) + " · 위쪽 번역 칩을 눌러 주세요(한 번에 하나만 받아질 수 있어서 여러 번 눌러야 할 수 있어요)" + (err ? " · 마지막 오류: " + err : "");
  }
  const bad = chPairsLast.filter(p => p.s === "unavailable");
  if (st === "partial") return "일부 언어 쌍은 이 브라우저가 지원하지 않아요: " + chPairText(bad) + " (그 쌍은 서버가 맡아요)";
  return CH_OK ? "이 브라우저에서 지원하지 않아요: " + chPairText(bad) : "쓸 수 없음(데스크톱 Chrome 138 이상 · Edge 148 이상만 지원)";
}
let chPrepRun = null; // 모델 받기를 돌리는 중이면 그 Promise
function chPrepare() { // 돌려주는 값: false = 이미 받는 중이라 새로 시작하지 않음(부른 쪽은 후속 작업을 건너뜀), 그 밖에는 true
  if (chPrepRun) { showToast("번역 모델을 이미 받고 있어요. 끝난 뒤 남은 모델이 있으면 번역 칩을 한 번 더 눌러 주세요.", true); return Promise.resolve(false); }
  chPrepRun = chPrepareRun().then(() => true, () => true).finally(() => { chPrepRun = null; });
  return chPrepRun;
}
async function chPrepareRun() { // 번역 칩을 눌렀을 때: 모델을 하나씩 차례로 받음(여러 개를 한꺼번에 시작하면 브라우저가 클릭 한 번으로는 하나만 허락해서 나머지가 조용히 실패함)
  if (!CH_OK) return;
  chErr.clear(); chUnav.clear(); // 눌렀을 때는 "못 한다"는 기억을 버리고 새로 확인
  if (await chStatus() !== "download") return;
  showToast("번역 모델을 받기 시작해요. 처음 한 번만 걸려요.");
  for (const p of chPairsLast) {
    if (p.s !== "downloadable" && p.s !== "downloading") continue;
    const t = await chGet(p.f, p.t, true);
    if (!t) break; // 실패했거나 클릭 효력이 끝남: 남은 건 칩을 다시 누르면 이어서 받음
  }
  if (await chStatus() === "download") {
    const n = chPairsLast.filter(p => p.s === "downloadable" || p.s === "downloading").length;
    showToast("받을 번역 모델이 " + n + "개 남았어요. 위쪽 번역 칩을 한 번 더 눌러 주세요.", true);
  }
}

// ---- 지금 어떤 번역 방식이 켜져 있는지: 번역 안내 창과 위쪽 칩에 같이 보여 줌 ----
const ltInfo = { chrome: "check", chromeText: "확인 중...", chromePct: -1, server: "check", serverText: "확인 중..." };
function renderEngineInfo() {
  const set = (id, st, text) => { const e = document.getElementById(id); if (e) { e.dataset.s = st; e.textContent = text; } };
  const chOk = ltInfo.chrome === "ok", svOk = ltInfo.server === "ok";
  set("ltEngChrome", ltInfo.chrome, ltInfo.chromeText);
  chromePackFill();
  const pb = document.getElementById("ltEngProg");
  if (pb) { const on = chProgressActive(); pb.hidden = !on; if (on) pb.value = ltInfo.chromePct >= 0 ? ltInfo.chromePct : 0; }
  set("ltEngServer", ltInfo.server, ltInfo.serverText);
  if (chOk) set("ltEngNow", "ok", "브라우저 내장 번역" + (svOk ? " (서버도 켜져 있어 못 하는 언어 쌍은 서버가 맡아요)" : ""));
  else if (svOk) set("ltEngNow", "ok", "번역 서버(LibreTranslate) · " + LIBRETRANSLATE_URL);
  else if (ltInfo.chrome === "check" || ltInfo.server === "check") set("ltEngNow", "check", "확인 중...");
  else set("ltEngNow", "down", "없음 — 번역만 빼고 모두 쓸 수 있어요");
  const tip = "내장 번역: " + ltInfo.chromeText + " · 서버: " + ltInfo.serverText;
  if (typeof ltChip !== "undefined" && ltChip) ltChip.title = tip + " · 눌러서 다시 확인";
}
// 안내 창 ① 브라우저 내장 번역 줄: "사용 가능" 같은 말 대신, 언어 팩(쌍)마다 받았는지/안 받았는지를 보여 줌
function chromePackFill() {
  const el = document.getElementById("ltEngChrome");
  if (!el || !CH_OK || !chPairsLast.length) return; // 아직 확인 전이거나 이 브라우저에 내장 번역기가 없으면 기본 글자 그대로
  const frag = document.createDocumentFragment();
  const sp = (t, cls) => { const n = document.createElement("span"); if (cls) n.className = cls; n.textContent = t; return n; };
  let todo = false;
  CH_NEED.forEach(([f, t], n) => {
    const k = f + ">" + t, p = chPairsLast.find(x => x.f === f && x.t === t), prog = chProg.get(k), err = chErr.get(k);
    let cls = "warn", text = "", tip = "";
    if (chTr.has(k) || (p && p.s === "available")) { cls = err ? "warn" : "ok"; text = err ? "받음 · 최근 번역 오류" : "받음"; tip = err || ""; }
    else if (prog !== undefined && prog < 1) { text = "받는 중 " + Math.round(prog * 100) + "%"; }
    else if (!p) { text = "확인 중..."; }
    else if (p.s === "downloading") { text = "받는 중"; }
    else if (p.s === "downloadable") { todo = true; text = err ? "받기 실패" : "안 받음"; tip = err || ""; }
    else { cls = "down"; text = "지원 안 함 (서버가 맡아요)"; }
    if (n) frag.appendChild(document.createTextNode(" · "));
    const pk = sp("", "pk");
    pk.append(sp(chName(f)), document.createTextNode(" → "), sp(chName(t)), document.createTextNode(" "));
    const st = sp(text, "pk-" + cls); if (tip) st.title = tip;
    pk.appendChild(st); frag.appendChild(pk);
  });
  if (todo) frag.appendChild(sp("안 받은 팩은 위쪽 번역 칩을 눌러 받아요 (한 번에 하나씩 받아져서 여러 번 눌러야 할 수 있어요)", "pk-hint"));
  el.textContent = ""; el.appendChild(frag);
}
// 안내 창을 열 때마다 최신 상태로 한 번 더 확인
["howtoReopenBtn", "ltStatusHowto"].forEach(id => {
  const b = document.getElementById(id);
  if (b) b.addEventListener("click", () => { chStatus().then(renderEngineInfo); if (!chProgressActive()) probeServer().then(renderEngineInfo); });
});
async function probeServer() { // 서버 상태만 조용히 알아봄(배너·칩은 건드리지 않음)
  try {
    const res = await fetchWithTimeout(`${LIBRETRANSLATE_URL}/languages`, 3000);
    if (!res.ok) { ltInfo.server = "down"; ltInfo.serverText = "오류 HTTP " + res.status + " · " + LIBRETRANSLATE_URL; return; }
    const langs = await res.json(), codes = new Set((Array.isArray(langs) ? langs : []).map(l => l && l.code));
    const miss = LANGS.filter(l => !codes.has(l.ltcode)).map(l => l.label);
    if (miss.length) { ltInfo.server = "warn"; ltInfo.serverText = "연결됨 · 없는 언어 모델: " + miss.join(", ") + " · " + LIBRETRANSLATE_URL; }
    else { ltInfo.server = "ok"; ltInfo.serverText = "연결됨 · " + LIBRETRANSLATE_URL; }
  } catch (e) { ltInfo.server = "down"; ltInfo.serverText = "꺼져 있음 · " + LIBRETRANSLATE_URL; }
}

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
    if (chProgressActive()) { renderEngineInfo(); return; } // 모델을 받는 동안에는 진행률 표시를 덮어쓰지 않음
    const chs = await chStatus();
    ltInfo.chrome = chs === "ready" ? "ok" : chs === "none" ? "down" : "warn";
    ltInfo.chromeText = chStatusText(chs);
    if (chs === "ready" || chs === "download") {
      await probeServer(); renderEngineInfo();
      if (chs === "ready") {
        setLtChip("ok", "브라우저 번역 사용 중", "브라우저 내장 번역(서버 필요 없음)");
        if (!silent) showLtBanner("브라우저 내장 번역을 쓰고 있어요. 서버를 따로 켜지 않아도 돼요.", true);
      } else {
        const n = chPairsLast.filter(p => p.s === "downloadable" || p.s === "downloading").length;
        setLtChip("warn", "번역 모델 받기 · " + n + "개 남음 (눌러 주세요)", chStatusText(chs));
        banner("브라우저 내장 번역을 쓰려면 위쪽 번역 칩을 눌러 모델을 받아 주세요. 한 번에 하나씩 받아질 수 있어서, 남은 모델이 있으면 칩을 다시 눌러 주세요.");
      }
      renderEngineInfo();
      return;
    }
    ltInfo.server = "check"; renderEngineInfo();
    if (!silent) setLtChip("check", "번역 서버 확인 중");
    banner("LibreTranslate 서버 연결 확인 중...", false);
    let res;
    try {
      res = await fetchWithTimeout(`${LIBRETRANSLATE_URL}/languages`, 5000);
    } catch (e) {
      ltInfo.server = "down"; ltInfo.serverText = "꺼져 있음 · " + LIBRETRANSLATE_URL; renderEngineInfo();
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
      ltInfo.server = "down"; ltInfo.serverText = "오류 HTTP " + res.status + " · " + LIBRETRANSLATE_URL; renderEngineInfo();
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
      ltInfo.server = "warn"; ltInfo.serverText = "연결됨 · 없는 언어 모델: " + missingLabels.join(", ") + " · " + LIBRETRANSLATE_URL; renderEngineInfo();
      setLtChip("warn", "번역 서버 연결됨 · 언어 모델 부족", "없는 언어: " + missingLabels.join(", "));
      banner(
        `LibreTranslate 서버에는 연결됐지만 다음 언어 모델이 설치돼 있지 않습니다: ${missingLabels.join(", ")}. ` +
        `해당 언어의 참고번역/미리보기 번역은 계속 실패로 뜹니다(서버에 그 언어 모델을 설치해야 함).`
      );
      return;
    }
    ltInfo.server = "ok"; ltInfo.serverText = "연결됨 · " + LIBRETRANSLATE_URL; renderEngineInfo();
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
ltChip.addEventListener("click", async () => { if (await chPrepare() === false) return; checkLibreTranslateConnection(); retryAllGloss(); });
document.getElementById("ltStatusRecheck").addEventListener("click", async () => { if (await chPrepare() === false) return; checkLibreTranslateConnection(); });
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
  if (attempt === 1 && CH_OK) { // 브라우저 내장 번역을 먼저 시도하고, 안 되면 아래 서버로
    try { const r = await chTranslate(clean, fromCode, toCode); if (typeof r === "string" && r) return r; } catch (e) { /* 서버로 넘어감 */ }
  }
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
    if (CH_OK && (e instanceof TypeError || /fetch/i.test((e && e.message) || ""))) { // 서버가 꺼져 있어서 난 "fetch 실패"를 알아보기 쉬운 말로
      const err = new Error("번역하지 못했어요(" + chName(fromCode) + "→" + chName(toCode) + "): 브라우저 번역 모델이 아직 없고 번역 서버도 꺼져 있어요. 위쪽 번역 칩을 눌러 모델을 받아 주세요. [" + chDiag(fromCode, toCode) + "]");
      err.cause = e; throw err;
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

// 미리보기 칸은 높이가 고정이라 글이 길어지면 맨 위에 머무른다 → 내용을 바꿀 때마다 맨 아래(가장 마지막 줄)가 보이게 내림
function scrollSelToEnd(el) {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); // 글자가 배치된 뒤 높이가 확정되면 한 번 더
}

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
    scrollSelToEnd(selEl);
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
      scrollSelToEnd(selEl);
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
  el.scrollTop = 0;
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
