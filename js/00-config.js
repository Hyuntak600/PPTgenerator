"use strict";

// 앱 공통 설정. 다른 js보다 먼저 불러와요(PPTgenerator.html에서 맨 앞).
// 관리자 이메일은 여기 한 곳만 고치면 안내 창(<admin-email>)과 영어 안내 문구에 함께 반영돼요.
window.APP_CONFIG = Object.freeze({
  adminEmail: "sht0230@naver.com",
});

// 안내 글 안의 <admin-email></admin-email> 자리에 관리자 이메일을 글자로 채워 넣는다.
if (window.customElements && !customElements.get("admin-email")) {
  customElements.define("admin-email", class extends HTMLElement {
    connectedCallback() { this.textContent = window.APP_CONFIG.adminEmail; }
  });
}

// 어떤 컴퓨터·브라우저로 열었는지 한 번 알아 둔다(이 화면 안에서만 쓰고 어디로도 보내지 않아요).
// APP_ENV.mac / .safari 는 안내 문구를 가려 보여 줄 때 쓰고, <html data-os data-browser> 로도 남겨 CSS에서 쓸 수 있어요.
window.APP_ENV = (function () {
  const ua = navigator.userAgent || "", plat = navigator.platform || "";
  const touch = (navigator.maxTouchPoints || 0) > 1; // 아이패드는 "Macintosh"라고 알려 오므로 터치로 걸러 냄
  const mac = /Mac/i.test(plat) && !touch && !/iPhone|iPad|iPod/.test(ua);
  const win = /Win/i.test(plat);
  const safari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Android/.test(ua);
  const firefox = /Firefox\//.test(ua);
  const env = Object.freeze({ mac, win, safari, firefox, chromium: !safari && !firefox && /Chrome\/|Chromium\/|Edg\//.test(ua) });
  try {
    document.documentElement.setAttribute("data-os", mac ? "mac" : win ? "win" : "other");
    document.documentElement.setAttribute("data-browser", safari ? "safari" : firefox ? "firefox" : env.chromium ? "chromium" : "other");
  } catch (e) { /* 표시만 못 남길 뿐 동작에는 영향 없음 */ }
  return env;
})();

// 사파리는 한동안 안 열면 이 사이트의 저장 데이터(원고·수정한 성경 구절)를 지울 수 있어서, 처음 한 번만 알려 준다.
(function safariStorageNote() {
  if (!window.APP_ENV.safari) return;
  const KEY = "subtitleTool_safariNoteSeen";
  try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }
  setTimeout(() => {
    if (typeof showToast !== "function") return;
    showToast("사파리는 일주일 넘게 열지 않으면 저장된 원고와 수정한 성경 구절이 지워질 수 있어요. 수정한 구절은 DB 코드로 그때그때 관리자에게 보내 주세요.", false, 9000);
    try { localStorage.setItem(KEY, "1"); } catch (e) { /* 못 남겨도 다음에 한 번 더 보일 뿐 */ }
  }, 3500);
})();
