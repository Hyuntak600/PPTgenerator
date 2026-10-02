/* 성경 DB 점검 + 대체 파일 (PPTgenerator.html 머리에서 <script src="bibleDB/bibledb.js"> 바로 다음에 실행)
   정식 위치(bibleDB/bibledb.js)에서 못 불러왔을 때만 FALLBACKS를 차례로 시도하고,
   어느 파일을 썼는지 개발자 도구 콘솔에 "[성경 DB] 불러온 파일: …"로 알려 줘요.

   정리하는 법: 콘솔에 정식 위치(bibleDB/bibledb.js)가 찍히면 FALLBACKS는 비워도 돼요.
   (파일 이름의 대소문자가 다르면 GitHub Pages 같은 서버에서는 못 찾으니, 실제 파일 이름과 맞춰 두세요.) */
(function () {
  "use strict";
  var PRIMARY = "bibleDB/bibledb.js";                       // PPTgenerator.html의 <script src>와 같은 값
  var FALLBACKS = ["bibleDB/bibleDB.js", "bible/bibledb.js"];

  window.__bibleDbSource = window.BibleDB ? PRIMARY : "";

  window.__bibleDbReport = function () {
    delete window.__bibleDbReport;
    var B = window.BibleDB;
    if (!B) { console.error("[성경 DB] " + [PRIMARY].concat(FALLBACKS).join(", ") + " 중 어느 것도 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요."); return; }
    if (window.__bibleLegacyRewrite && typeof B.path === "function" && !B.__p) { // 옛 "bible/" 경로를 내놓는 bibledb.js 대비(js/13-bible-compat.js와 짝)
      var o = B.path;
      B.path = function () { var r = o.apply(this, arguments); return typeof r === "string" ? r.replace(/(^|\/)bible\//, "$1bibleDB/") : r; };
      B.__p = 1;
    }
    console.info("[성경 DB] 불러온 파일: " + window.__bibleDbSource);
  };

  if (window.BibleDB) { window.__bibleDbReport(); return; }
  // 정식 위치에서 못 찾음 → 후보를 차례로(앞 후보가 성공하면 뒤 후보는 건너뜀). document.write로 쓴 <script>는 이어서 동기로 실행돼요.
  var html = "";
  FALLBACKS.forEach(function (p) {
    html += "<script>if(!window.BibleDB)document.write('<script src=\"" + p + "\"><\\/script>');<\/script>";
    html += '<script>if(window.BibleDB&&!window.__bibleDbSource)window.__bibleDbSource="' + p + '";<\/script>';
  });
  html += "<script>window.__bibleDbReport&&window.__bibleDbReport();<\/script>";
  document.write(html);
})();
