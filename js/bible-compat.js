/* 성경 DB 옛 경로 호환 장치 (PPTgenerator.html 머리에서 bibleDB/bibledb.js보다 먼저 실행)
   폴더 이름이 bible → bibleDB로 바뀌기 전의 "bible/…" 경로 요청을 "bibleDB/…"로 고쳐 줘요.

   정리하는 법(확인 후)
   - bibleDB/bibledb.js 안에 "bible/" 경로가 남아 있는지 검색해 보세요(예: grep -n "bible/" bibleDB/bibledb.js).
     없다면 LEGACY_REWRITE를 false로 바꾸거나 이 파일과 PPTgenerator.html의 <script> 한 줄, 그리고
     js/bible-fallback.js의 B.path 감싸기(LEGACY_REWRITE 블록)를 함께 지워도 돼요. */
(function () {
  "use strict";
  var LEGACY_REWRITE = true;
  window.__bibleLegacyRewrite = LEGACY_REWRITE;
  if (!LEGACY_REWRITE) return;

  function fix(u) {
    if (typeof u !== "string") return u;
    if (/^(https?:)?\/\//i.test(u) && u.indexOf(location.origin) !== 0) return u; // 다른 사이트 주소는 건드리지 않음
    return u.replace(/(^|\/)bible\//g, "$1bibleDB/");
  }
  try {
    var d = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
    if (d && d.set) Object.defineProperty(HTMLScriptElement.prototype, "src", { get: d.get, set: function (v) { d.set.call(this, fix(v)); }, configurable: true, enumerable: d.enumerable });
    var sa = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) { if (this.tagName === "SCRIPT" && String(n).toLowerCase() === "src") v = fix(v); return sa.call(this, n, v); };
    if (window.fetch) { var f = window.fetch; window.fetch = function (u, o) { return f.call(this, typeof u === "string" ? fix(u) : u, o); }; }
    var xo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) { var a = [].slice.call(arguments); a[1] = fix(u); return xo.apply(this, a); };
  } catch (e) { /* 무시 */ }
})();
