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
