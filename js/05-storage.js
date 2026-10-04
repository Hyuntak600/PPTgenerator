"use strict";

// ---------------------------------------------------------------------
// 로컬 저장(자동 저장/복원): 브라우저의 localStorage에 항상 저장해두고,
// 새로고침하거나 다시 열어도 왼쪽 조각·오른쪽 슬라이드·연결 관계·툴바 설정을 그대로 복원합니다.
// ---------------------------------------------------------------------
const STATE_KEY = "subtitleTool_state_v1";
let isRestoring = false;

function serializeState() {
  const cols = {};
  document.querySelectorAll(".col").forEach(col => {
    cols[col.dataset.lang] = [...col.querySelectorAll(".box")].map(box => {
      const o = { id: box.id, text: (box._ta || box.querySelector("textarea")).value };
      if (box.dataset.ref) o.ref = box.dataset.ref; // 성경에서 불러온 조각 표시
      return o;
    });
  });
  return {
    v: 1,
    previewLang: dragPreviewLang,
    parenLangs: [...parenSet],
    hiddenLangs: [...hiddenSet],
    langOrder: [...langOrder],
    baseFontPt: getFontSizeInputValue(),
    slideOpts,
    defaultAlign,
    canvasHeightMode: canvasHeightSelect.value,
    canvasHeightCustomValue: canvasHeightCustom.value,
    canvasWidthCustomValue: canvasWidthCustom.value,
    uid,
    cols,
  };
}

// ---------------------------------------------------------------------
// 원고 보호: ① 준비가 끝나기 전엔 저장 안 함 ② 글이 있던 저장값을 빈 화면으로 덮어쓰기 직전 백업
// ③ 1분마다 최근 12개 + 24시간 보관 1개 자동 백업 ④ 손상된 저장값은 지우지 않고 보관 + 최근 백업으로 자동 복구
// ⑤ 창을 닫기 직전에 마지막 내용 저장 ⑥ 저장 실패 표시 ⑦ 파일로 내보내기/불러오기
// ---------------------------------------------------------------------
const BACKUP_KEY = "subtitleTool_backups_v1";
const BACKUP_MAX = 12;         // 실시간(최근) 백업 개수
const BACKUP_GAP_MS = 60000;   // 자동 백업은 최대 1분에 한 번
const DAY_BACKUP_KEY = "subtitleTool_backup_day_v1"; // 24시간 보관 백업 1개(최근 백업 12개와 별도로 보관)
const DAY_BACKUP_MS = 24 * 60 * 60 * 1000;
let stateReady = false;      // initState가 끝나야 true (오류로 화면이 비었을 때 저장값을 덮어쓰지 않게)
let stateDirty = false;      // 아직 저장 안 된 변경이 있을 때만 창 닫기 직전 저장(안 고친 오래된 탭이 다른 탭의 새 내용을 덮어쓰지 않게)
let lastAutoBackup = 0;
const saveWarnEl = document.getElementById("saveWarn");
const storageWarnEl = document.getElementById("storageWarn");

function textCount(st) {
  let n = 0;
  Object.values((st && st.cols) || {}).forEach(list => (list || []).forEach(b => { n += ((b && b.text) || "").trim().length; }));
  return n;
}
function readRecentBackups() {
  try { const a = JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function readDayBackup() {
  try { const d = JSON.parse(localStorage.getItem(DAY_BACKUP_KEY) || "null"); return d && typeof d === "object" && d.state ? d : null; }
  catch (e) { return null; }
}
// 목록(화면·손상 복구용): 최근 백업(새것 → 옛것) 뒤에 24시간 보관 백업 1개
function readBackups() {
  const list = readRecentBackups(), day = readDayBackup();
  return day ? [...list, day] : list;
}
// ---- 저장 공간 점검: 한도에 가까워지면 알리고, 백업이 지금 글의 저장을 밀어내지 않게 함 ----
const LS_LIMIT_CHARS = 5000000;   // 브라우저 localStorage 한도(대략 글자 5백만 자). 정확한 값은 브라우저마다 달라서 "약"으로만 보여 줌
const LS_WARN_RATIO = 0.85;       // 이만큼 차면 위쪽에 "⚠ 저장 공간 부족"을 띄움
let backupSqueezed = false;       // 자동 백업을 저장하지 못했거나 개수를 줄여야 했음
let lastStorageCheck = 0, warnedSqueeze = false;
function storageUsedChars() {
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || "").length; } }
  catch (e) { /* 읽을 수 없으면 0 */ }
  return n;
}
function updateStorageWarn(force) { // 전체 용량을 훑는 일이라 30초에 한 번만(force면 바로)
  if (!force && Date.now() - lastStorageCheck < 30000) return;
  lastStorageCheck = Date.now();
  storageWarnEl.hidden = !(backupSqueezed || storageUsedChars() / LS_LIMIT_CHARS >= LS_WARN_RATIO);
}
storageWarnEl.addEventListener("click", () => document.getElementById("bkOpenBtn").click());
// 공간이 모자라면 가장 오래된 백업부터 하나씩 줄여 가며 다시 시도. 저장된 개수를 돌려줌(0이면 하나도 못 둠)
function writeBackupList(list) {
  for (let n = list.length; n >= 1; n--) {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, n))); return n; } catch (e) { /* 더 줄여서 다시 */ }
  }
  return 0;
}
// 현재 글을 저장. 공간이 모자라면 ① 번역 캐시(다시 만들 수 있음) ② 오래된 자동 백업 순으로 비우며 다시 시도(현재 원고·DB 초안은 건드리지 않음)
function writeStateWithRoom(json) {
  try { localStorage.setItem(STATE_KEY, json); return; } catch (e) { /* 공간 부족 → 아래에서 단계별로 비우며 재시도 */ }
  const steps = [
    () => { localStorage.removeItem(GLOSS_CACHE_KEY); glossCache = new Map(); },
    () => { const l = readRecentBackups(); if (l.length > 3) localStorage.setItem(BACKUP_KEY, JSON.stringify(l.slice(0, 3))); },
    () => { const l = readRecentBackups(); if (l.length > 1) localStorage.setItem(BACKUP_KEY, JSON.stringify(l.slice(0, 1))); },
  ];
  for (const step of steps) {
    try { step(); } catch (e) { /* 다음 단계로 */ }
    try {
      localStorage.setItem(STATE_KEY, json);
      backupSqueezed = true; updateStorageWarn(true);
      showToast("저장 공간이 거의 차서 번역 캐시·오래된 백업을 정리했어요. 🛡️ 백업·복구에서 파일로 저장해 두세요.", true);
      return;
    } catch (e) { /* 계속 */ }
  }
  localStorage.setItem(STATE_KEY, json); // 마지막 시도 — 실패하면 부른 쪽이 "⚠ 자동 저장 안 됨"을 띄움
}
function pushBackup(st, why, force) {
  try {
    if (textCount(st) === 0) return;
    if (!force && Date.now() - lastAutoBackup < BACKUP_GAP_MS) return;
    // 24시간 보관 백업: 없거나 만든 지 24시간이 지났으면 지금 내용으로 새로 잡고, 그 전까지는 그대로 둔다
    try {
      const day = readDayBackup();
      if (!day || Date.now() - day.t >= DAY_BACKUP_MS) {
        localStorage.setItem(DAY_BACKUP_KEY, JSON.stringify({ t: Date.now(), why: "24시간 보관", n: textCount(st), state: st }));
      }
    } catch (e) { /* 실패해도 최근 백업은 계속 진행 */ }
    const list = readRecentBackups();
    if (list[0] && JSON.stringify(list[0].state) === JSON.stringify(st)) return; // 같은 내용이면 또 쌓지 않음
    list.unshift({ t: Date.now(), why, n: textCount(st), state: st });
    const want = list.slice(0, BACKUP_MAX), kept = writeBackupList(want);
    lastAutoBackup = Date.now(); // 실패해도 1분에 한 번만 다시 시도
    backupSqueezed = kept < want.length;
    if (backupSqueezed && !warnedSqueeze) {
      warnedSqueeze = true;
      showToast(kept ? "저장 공간이 모자라 오래된 자동 백업을 줄였어요. 🛡️ 백업·복구에서 파일로 저장해 두세요." : "저장 공간이 가득 차서 자동 백업을 못 하고 있어요. 🛡️ 백업·복구에서 파일로 저장해 두세요.", true);
    }
    updateStorageWarn(true);
  } catch (e) { backupSqueezed = true; updateStorageWarn(true); /* 백업 저장 실패는 본 저장을 막지 않음 */ }
}
function saveStateNow() {
  if (isRestoring || !stateReady) return;
  if (appMode === "db") { saveDbNow(); return; } // DB 모드의 글은 슬라이드 저장값(STATE_KEY)에 절대 섞이지 않음
  try {
    const st = serializeState();
    const oldRaw = localStorage.getItem(STATE_KEY);
    // 지금 글을 먼저 저장(백업이 공간을 다 써서 정작 현재 글이 저장 안 되는 일이 없게). 이전 내용은 위에서 읽어 둔 값으로 백업한다
    writeStateWithRoom(JSON.stringify(st));
    if (textCount(st) === 0 && oldRaw) { // 글을 전부 비우는 저장 → 이전 내용을 백업
      try { pushBackup(JSON.parse(oldRaw), "비우기 직전", true); } catch (e) { /* 손상값은 initState가 따로 보관함 */ }
    } else {
      pushBackup(st, "자동");
    }
    stateDirty = false;
    saveWarnEl.hidden = true;
    updateStorageWarn(false);
  } catch (e) {
    saveWarnEl.hidden = false; // 시크릿 모드·저장 공간 부족 등
  }
}
// 창을 닫거나 탭을 숨길 때 아직 저장 안 된 마지막 입력까지 바로 저장
window.addEventListener("pagehide", () => { if (stateDirty) saveStateNow(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && stateDirty) saveStateNow(); });
// 다른 탭에서 같은 도구를 열어 두면 서로 덮어쓸 수 있어 한 번 알려줌
let warnedOtherTab = false;
window.addEventListener("storage", e => {
  if (e.key === STATE_KEY && stateReady && !warnedOtherTab) {
    warnedOtherTab = true;
    showToast("다른 탭에서 이 도구가 편집되고 있어요. 두 곳에서 동시에 고치면 나중에 저장된 쪽이 덮어써요.", true);
  }
});
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 지원 안 하면 무시 */ }

function validState(st) {
  return !!st && typeof st === "object" && st.v === 1 && !!st.cols && typeof st.cols === "object"
    && Object.values(st.cols).every(l => Array.isArray(l) && l.every(b => b && typeof b.text === "string"));
}
// 저장값을 바꾼 뒤 새로 열어 initState가 그대로 복원하게 함(닫힐 때 화면 상태가 덮어쓰지 않도록 저장 잠금)
function applyStateAndReload(st) {
  const cur = serializeState();
  if (textCount(cur) > 0) pushBackup(cur, "복구 직전", true);
  try { writeStateWithRoom(JSON.stringify(st)); }
  catch (e) { showToast("복구할 내용을 저장하지 못했어요.", true); return; }
  stateReady = false;
  location.reload();
}
(function initBackupUi() {
  const ov = document.getElementById("bkOverlay"), listEl = document.getElementById("bkList"), file = document.getElementById("bkFile");
  const close = () => ov.classList.remove("open");
  document.getElementById("bkClose").addEventListener("click", close);
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  function render() {
    const used = storageUsedChars();
    document.getElementById("bkUsageNum").textContent = "≈ " + Math.round(used / LS_LIMIT_CHARS * 100) + "% (" + (used / 1e6).toFixed(1) + " / " + (LS_LIMIT_CHARS / 1e6).toFixed(0) + " MB)";
    listEl.textContent = "";
    const recent = readRecentBackups(), day = readDayBackup();
    const list = day ? [...recent.map(b => ({ b, day: false })), { b: day, day: true }] : recent.map(b => ({ b, day: false }));
    if (!list.length) {
      const p = document.createElement("p"); p.className = "patch-sub";
      p.textContent = "아직 자동 백업이 없어요. 글을 쓰면 1분에 한 번씩 자동으로 쌓여요.";
      listEl.appendChild(p); return;
    }
    list.forEach(({ b, day: isDay }) => {
      const row = document.createElement("div"); row.className = "bk-row";
      const info = document.createElement("span");
      info.textContent = new Date(b.t).toLocaleString(document.documentElement.lang === "en" ? "en-US" : "ko-KR") + " · " + b.n + "자 · " + b.why;
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.textContent = "이 시점으로 복구";
      btn.addEventListener("click", async () => { if (await macConfirm("이 백업으로 되돌릴까요? 지금 내용도 백업에 남겨 둬요.", { title: "백업으로 복구", ok: "복구" })) applyStateAndReload(b.state); });
      // 백업 하나만 직접 지우기: 최근 백업은 목록에서 그 시점 것만 빼고, 24시간 보관 백업은 그 항목만 지움(현재 작업 내용은 건드리지 않음)
      const del = document.createElement("button"); del.type = "button"; del.className = "btn danger"; del.textContent = "삭제";
      del.title = "이 백업 하나만 지워요 (현재 작업 내용은 그대로예요)";
      del.addEventListener("click", async () => {
        if (!(await macConfirm("이 백업을 지울까요? 지운 백업은 되돌릴 수 없어요. 지금 작업 중인 내용은 그대로예요.", { title: "백업 삭제", ok: "삭제", danger: true }))) return;
        try {
          if (isDay) { const d = readDayBackup(); if (d && d.t === b.t) localStorage.removeItem(DAY_BACKUP_KEY); }
          else localStorage.setItem(BACKUP_KEY, JSON.stringify(readRecentBackups().filter(x => x.t !== b.t)));
        } catch (e) { showToast("백업을 지우지 못했어요. 브라우저 저장소를 쓸 수 없는 상태예요.", true); return; }
        showToast("백업을 지웠어요.");
        render();
        updateStorageWarn(true);
      });
      row.append(info, btn, del); listEl.appendChild(row);
    });
  }
  document.getElementById("bkOpenBtn").addEventListener("click", () => { render(); ov.classList.add("open"); });
  document.getElementById("bkExport").addEventListener("click", () => {
    const d = new Date(), pad = n => String(n).padStart(2, "0");
    const blob = new Blob([JSON.stringify({ app: "subtitleTool", v: 1, savedAt: d.toISOString(), state: serializeState() }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `자막백업_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast("백업 파일을 저장했어요.");
  });
  document.getElementById("bkImport").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files[0]; file.value = ""; if (!f) return;
    let st;
    try { const obj = JSON.parse(await f.text()); st = obj && obj.state ? obj.state : obj; if (!validState(st)) throw new Error("bad"); }
    catch (e) { showToast("백업 파일을 읽지 못했어요. 이 도구에서 저장한 .json 파일인지 확인해 주세요.", true); return; }
    if (await macConfirm("파일 내용으로 바꿀까요? 지금 내용도 자동 백업에 남겨 둬요.", { title: "파일로 바꾸기", ok: "바꾸기" })) applyStateAndReload(st);
  });
})();
const saveStateDebounced = (() => { const d = debounce(saveStateNow, 400); return () => { stateDirty = true; d(); }; })();

function restoreState(data) {
  isRestoring = true;
  try {
    dragPreviewLang = data.previewLang === "ko" ? "ko" : "en"; // 저장값이 없으면(처음) English
    // 예전 저장본의 "작게"(offScreen)는 없어진 기능이라 무시 → 그 언어들은 기본(슬라이드)으로 돌아옴
    parenSet = new Set((Array.isArray(data.parenLangs) ? data.parenLangs : []).filter(c => LANG_META[c]));
    hiddenSet = new Set((Array.isArray(data.hiddenLangs) ? data.hiddenLangs : []).filter(c => LANG_META[c]));
    hiddenSet.forEach(c => parenSet.delete(c));
    if (!LANGS.some(l => !hiddenSet.has(l.code) && !parenSet.has(l.code))) { hiddenSet = new Set(); parenSet = new Set(); } // 슬라이드에 들어가는 언어가 하나도 없는 저장값은 무시
    const savedOrder = (Array.isArray(data.langOrder) ? data.langOrder : []).filter(c => LANG_META[c]);
    langOrder = [...new Set([...savedOrder, ...LANGS.map(l => l.code)])];
    uid = Number.isFinite(data.uid) ? data.uid : 0;

    // 왼쪽 조각만 복원(오른쪽 슬라이드는 왼쪽에서 다시 그린다)
    document.querySelectorAll(".col").forEach(col => {
      const lang = col.dataset.lang;
      const saved = (data.cols && data.cols[lang]) || [];
      let prev = null;
      saved.forEach(b => {
        const ta = addBox(col, lang, b.text, prev, labelOf(lang));
        const wrap = ta.closest(".box");
        if (b.id) wrap.id = b.id;
        if (typeof b.ref === "string" && b.ref) wrap.dataset.ref = b.ref;
        prev = wrap;
      });
      if (!saved.length) addBox(col, lang, "", null, labelOf(lang));
      renumberColumn(col);
    });

    // 툴바 UI 동기화
    fontSizeInput.value = Number.isFinite(data.baseFontPt) && data.baseFontPt >= 10 ? data.baseFontPt : BASE_FONT_PT;
    defaultAlign = ["left", "center", "right"].includes(data.defaultAlign) ? data.defaultAlign : "left";
    slideOpts = (Array.isArray(data.slideOpts) ? data.slideOpts : []).map(o => o && typeof o === "object"
      ? { size: Number.isFinite(o.size) && o.size >= 10 ? Math.min(300, o.size) : 0, align: ["left", "center", "right"].includes(o.align) ? o.align : "" }
      : { size: 0, align: "" });
    alignSeg.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.align === defaultAlign));
    canvasHeightSelect.value = data.canvasHeightMode || "1080";
    if (canvasHeightSelect.selectedIndex === -1) canvasHeightSelect.value = "1080"; // 알 수 없는 값 방지
    canvasHeightCustom.value = data.canvasHeightCustomValue || 1080;
    canvasWidthCustom.value = data.canvasWidthCustomValue || 1920; // 옛 저장본에는 가로가 없어 기본 1920
    canvasCustomWrap.style.display = canvasHeightSelect.value === "custom" ? "" : "none";
    try { macSyncs.forEach(f => f()); } catch (e) { /* 06-bible-db.js보다 먼저 복원될 땐 macSelect가 만들어질 때 맞춰짐 */ }
    syncFontCqhVars();
    previewLangSeg.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.dataset.lang === dragPreviewLang);
    });
    applyLangLayout();

    recomputeAllFits();
  } finally {
    isRestoring = false;
  }
}

syncFontCqhVars(); // 저장된 상태가 없을 때(기본값 80pt)도 미리보기 크기가 처음부터 맞도록 미리 설정
checkLibreTranslateConnection(); // 페이지를 열자마자 서버 연결/언어 모델 상태를 배너로 보여줌

// 복원이 중간에 실패했을 때: 반쯤 만들어진 조각·슬라이드를 치우고 빈 상태로 되돌림
function resetBoxesBlank() {
  isRestoring = true;
  try {
    document.querySelectorAll(".col .box").forEach(b => b.remove());
    right.innerHTML = ""; uid = 0; slideSeq = 0; slideOpts = [];
    parenSet = new Set(); hiddenSet = new Set(); langOrder = LANGS.map(l => l.code);
    document.querySelectorAll(".col").forEach(col => addBox(col, col.dataset.lang, "", null, labelOf(col.dataset.lang)));
    document.querySelectorAll(".col").forEach(renumberColumn);
  } finally { isRestoring = false; }
}
// 형식 검사(validState)를 거친 저장값만 복원하고, 복원 중 오류가 나면 빈 상태로 되돌린 뒤 false
function tryRestore(st) {
  if (!validState(st)) return false;
  try { restoreState(st); return true; }
  catch (e) { console.error("[복원 실패]", e); resetBoxesBlank(); return false; }
}

(function initState() {
  let saved = null, raw = null, bad = false;
  try {
    raw = localStorage.getItem(STATE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    bad = !!raw;
  }
  let restored = false;
  if (!bad && saved) restored = tryRestore(saved);
  if (!restored && raw) { // 읽지 못했거나(손상·모르는 형식·깨진 항목) 복원 중 오류: 원본은 지우지 않고 따로 보관하고, 최근 백업이 있으면 그걸로 시작
    try { localStorage.setItem(STATE_KEY + "_corrupt_" + Date.now(), raw); } catch (e) { /* 공간이 없으면 무시 */ }
    const fromBackup = readBackups().find(b => b && validState(b.state));
    restored = !!(fromBackup && tryRestore(fromBackup.state));
    showToast(restored ? "저장된 데이터를 읽지 못해 가장 최근 자동 백업으로 열었어요." : "저장된 데이터를 읽지 못했어요. 원본은 브라우저에 따로 보관해 뒀어요.", true);
  }
  if (!document.querySelector(".col .box")) { // 저장값이 없거나(처음) 쓸 수 있는 저장값이 없을 때: 빈 조각으로 시작
    document.querySelectorAll(".col").forEach(col => {
      addBox(col, col.dataset.lang, "", null, labelOf(col.dataset.lang));
    });
  }
  syncSlides(); // 오른쪽 슬라이드는 항상 왼쪽 조각에서 새로 그린다
  applyLangLayout();
  stateReady = true; // 여기까지 무사히 끝나야 저장을 시작함
  saveStateNow();
  refreshInfo();
})();
