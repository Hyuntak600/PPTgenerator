/* ── 화면 언어(한국어 / English) 전환 ──
   사전(EN)에 있는 한글 문구를 영어로 바꿔 보여주고, 한국어로 돌아가면 원래 문구로 복원한다.
   글자·툴팁·placeholder뿐 아니라 나중에 스크립트가 만드는 알림/라벨(MutationObserver), confirm 창도 같이 바꾼다.
   사전에 없는 문구는 그대로 한글로 남는다(새 문구는 EN 또는 RX에 한 줄 추가).
   굵은 글씨가 섞인 긴 문장은 요소에 data-en="영어 HTML"을 달면 통째로 바뀐다(어순이 달라도 자연스럽게). */
(function(){
  const EN = {
    "취소":"Cancel","모두 삭제":"Delete all","삭제":"Delete","지우기":"Clear","복구":"Restore","바꾸기":"Replace",
    "수정한 성경 구절 삭제":"Delete your Bible verse edits","백업으로 복구":"Restore backup","파일로 바꾸기":"Replace with file",
    "⚠ 저장 공간 부족":"⚠ Storage almost full","브라우저 저장 공간 사용량":"Browser storage used",
    "브라우저 저장 공간이 거의 찼거나 자동 백업을 줄였어요. 눌러서 백업·복구를 열고 파일로 저장해 두세요":"Browser storage is nearly full or automatic backups were reduced. Click to open Backup & Restore and save a file.",
    "저장 공간이 모자라 오래된 자동 백업을 줄였어요. 🛡️ 백업·복구에서 파일로 저장해 두세요.":"Storage is low, so older automatic backups were reduced. Save a file in 🛡️ Backup & Restore.",
    "저장 공간이 가득 차서 자동 백업을 못 하고 있어요. 🛡️ 백업·복구에서 파일로 저장해 두세요.":"Storage is full, so automatic backups can't be made. Save a file in 🛡️ Backup & Restore.",
    "저장 공간이 거의 차서 번역 캐시·오래된 백업을 정리했어요. 🛡️ 백업·복구에서 파일로 저장해 두세요.":"Storage was nearly full, so the translation cache and older backups were cleared. Save a file in 🛡️ Backup & Restore.",
    "이 성경 슬라이드 지우기":"Delete this Bible slide",
    "이 슬라이드를 한 칸 위로":"Move this slide up one","이 슬라이드를 한 칸 아래로":"Move this slide down one","슬라이드 순서를 바꿨어요.":"Slide order changed.",
    "다국어 자막 정렬 도구":"Multilingual Subtitle Alignment Tool",
    "🎞 슬라이드 만들기":"🎞 Make slides","📖 성경 DB":"📖 Bible DB","슬라이드 만들기 ↔ 성경 구절 데이터베이스 만들기":"Make slides ↔ Build the Bible verse database",
    "🧩 DB 코드 복사":"🧩 Copy DB code","슬라이드 선택":"Select slides","슬라이드 고르기 (시작 → 끝, 기본은 전부)":"Pick slides (start → end, default: all)","불러오는 중...":"Loading...","🗑 모든 데이터 삭제":"🗑 Delete all data","📖 성경 DB 사용 안내":"📖 Bible DB guide","ℹ️ 사용 안내":"ℹ️ Guide","성경 DB 작업 안내(수정한 내용 보내는 법, 로컬 데이터 등)를 다시 봐요":"View the Bible DB instructions again (how to send your edits, local data, etc.)","성경 DB 모드를 쓰기 전에 꼭 읽어 주세요.":"Please read this before using Bible DB mode.","📚 이 구절들은 어디에 있나요?":"📚 Where do these verses live?","📨 수정한 내용을 프로그램에 반영하려면":"📨 To get your edits into the program","🎞 슬라이드를 만들 때는":"🎞 When making slides","🗑 모든 데이터 삭제":"🗑 Delete all data","확인했어요":"Got it","① 선택한 절":"① Selected verses","① 지금 보고 있는 절":"① Current verse","② 선택한 절":"② Selected verses","지금 화면에 열려 있는 절(모든 페이지 a·b·c)의 코드를 만들어요":"Makes the code for the verse open on screen (all its pages a·b·c)","지금 화면에 열려 있는 절을 그대로 보여 줘요 (필요하면 고쳐서 복사)":"Shows the verse open on screen as is (edit it if you like, then copy)","성경·장을 바꿔 가며 절 또는 페이지(a·b·c)를 체크하면, 체크한 글만 한꺼번에 복사해요":"Change the book/chapter and check verses or pages (a·b·c) — only the checked text is copied together","성경·장을 골라 절을 체크하면 글이 아래에 모여요. (체크한 절이 없어요)":"Pick a book and chapter and check verses — their text gathers below. (No verses checked)","지금 보고 있는 절에는 복사할 내용이 없어요.":"The verse you are viewing has nothing to copy.","② 아직 안 보낸 것":"② Not sent yet","보낸 것도 포함":"Include already sent","✅ 보냈어요":"✅ Mark as sent","날짜와 상관없이, 고친 뒤 아직 '보냈어요'를 누르지 않은 모든 절을 (여러 장이어도) 한 번에 모아요":"Collects every verse you edited and haven't marked as sent, whatever the date (even across chapters)","이미 보냈다고 표시한 절도 목록에 함께 보여 줘요":"Also lists verses already marked as sent","복사한 코드를 관리자에게 보낸 뒤 눌러 두세요. 지금 목록의 절을 '보냈다'고 표시해서, 다음부터는 새로 고친 절만 모여요":"Press this after sending the copied code to the administrator. It marks the listed verses as sent, so from now on only verses you edit again are collected","✎ 표시: 고쳤고 아직 안 보낸 절 · ✓ 표시: 고친 뒤 보냈다고 표시한 절 — 🧩 DB 코드 복사 ② 아직 안 보낸 것에서 모아 관리자에게 보내 주세요":"✎ = edited, not sent yet · ✓ = edited and marked as sent — collect them in 🧩 Copy DB code ② Not sent yet and send them to the administrator","보냈다고 표시할 절이 없어요.":"There are no verses to mark as sent.","지금 보고 있는 절이 기본으로 체크돼 있어요. 다른 절이나 페이지(a·b·c)를 더 체크하거나 뺄 수 있어요":"The verse you are viewing is checked by default. Check more verses or pages (a·b·c), or uncheck some","고른 날짜에 수정한 모든 절을 (여러 장이어도) 한 번에 모아서 — 관리자에게 보낼 때 쓰세요":"All verses edited on the chosen date (even across chapters) in one go — use this to send to the administrator","이 장 전체 선택":"Select whole chapter","전체 해제":"Select none","선택 없음":"Nothing selected","이 장에는 내용이 있는 절이 없어요.":"This chapter has no verses with content.","날짜":"Date","이 날짜에 수정한 절을 모아요 (기본: 오늘)":"Gathers the verses edited on this date (default: today)","성경":"Bible","장":"Chapter","절":"Verse",
    "이전 장":"Previous chapter","다음 장":"Next chapter","이전 절 (키보드 ←)":"Previous verse (keyboard ←)","다음 절 (키보드 →)":"Next verse (keyboard →)","이전 절":"Previous verse","다음 절":"Next verse",
    "성경의 첫 장이에요.":"This is the first chapter of the Bible.","성경의 마지막 장이에요.":"This is the last chapter of the Bible.","이 장의 첫 절이에요.":"This is the first verse of the chapter.",
    "이 장의 마지막 절이에요. 다음 장은 장 옆 › 버튼을 눌러 주세요.":"This is the last verse of the chapter. Press the › next to Chapter to go to the next chapter.",
    "📖 성경 불러오기":"📖 Import Bible","성경 DB의 구절을 지금 원고 맨 뒤에 조각으로 넣어요":"Add verses from the Bible DB to the end of your script as pieces",
    "📖 성경 DB에서 불러오기":"📖 Import from Bible DB",
    "시작 절과 끝 절을 고르면 그 사이 구절이 지금 원고 맨 뒤에 조각으로 추가돼요(한 절만 넣으려면 시작 절만 고르세요). 흐리게 보이는 절은 아직 내용이 없어서 고를 수 없어요. 절이 여러 페이지면 16 (a) · 16 (b)처럼 나뉘어 보이지만, 슬라이드에는 숫자만 표시돼요. 넣은 뒤에는 슬라이드 위쪽의 ▲ ▼로 순서를 바꾸고, ✕로 지울 수 있어요.":"Pick a start and an end verse and everything in between is added to the end of your script as pieces (to add just one verse, pick only the start). Dimmed verses have no content yet and can’t be chosen. A verse with several pages appears as 16 (a) · 16 (b), but slides show only the number. Afterwards you can reorder with ▲ ▼ above a slide and delete with ✕.",
    "장 전체":"Whole chapter","이 장에서 내용이 있는 절을 처음부터 끝까지 고릅니다":"Selects every verse with content in this chapter","시작 절":"Start verse","끝 절":"End verse","시작 절 선택":"Select start verse","끝 절 선택":"Select end verse",
    "시작 절을 골라 주세요.":"Pick a start verse.","고른 범위에 내용이 있는 절이 없어요.":"No verse with content in the chosen range.",
    "전체 선택":"Select all","전체 해제":"Select none","원고 뒤에 넣기":"Add to script","불러오는 중...":"Loading...","선택된 조각이 없어요.":"Nothing selected.",
    "이 장에는 아직 불러올 내용이 없어요.":"This chapter has no content to import yet.","아직 데이터가 없어요":"No data yet","성경 불러오기 직전":"Before Bible import",
    "bibleDB 폴더를 찾지 못했어요. PPTgenerator.html과 같은 위치에 bibleDB 폴더가 있어야 해요.":"Couldn't find the bibleDB folder. It must be in the same place as PPTgenerator.html.",
    "언어별 원고를 문장 단위로 나눠 한 슬라이드에 짝지어 보고, 확인한 뒤 텍스트로 복사해 가는 도구예요.":"Split each language's script into sentences, pair them on one slide, check them, then copy the text out.",
    "🚀 이렇게 써요":"🚀 How to use", "🧪 직접 해보기 — 요한복음 3:16":"🧪 Try it — John 3:16",
    "성경 구절 언어":"Verse language","번역 결과":"Translate to","한국어":"Korean",
    "📥 왼쪽 칸 4개에 이 구절 넣어 보기":"📥 Put this verse in the 4 left columns",
    "이 체험은 영어로 번역해서 보여줘요. 영어 구절은 쓰지 않아요":"This tryout translates into English, so the English verse isn't used",
    "📼 번역기 출력 기록":"📼 Record translator output",
    "🆕 최신 패치노트":"🆕 Latest patch notes","🛠 개발자 노트":"🛠 Developer notes",
    "다음부터 처음에 자동으로 열지 않기":"Don't open this automatically next time","시작하기":"Get started",
    "🐳 번역 서버(LibreTranslate) 설치 안내":"🐳 Translation server (LibreTranslate) setup guide",
    "확인":"OK","전체 텍스트":"Full text","복사":"Copy","닫기":"Close","백업 · 복구":"Backup · Restore",
    "글은 이 브라우저에 자동 저장돼요. 브라우저 데이터를 지우거나 다른 브라우저·다른 파일 위치로 열면 보이지 않으니, 중요한 원고는 파일로도 받아 두세요.":"Your text is auto-saved in this browser. It won't appear if you clear browser data or open the file from another browser or location, so save important scripts to a file too.",
    "💾 파일로 저장":"💾 Save to file","📂 파일에서 불러오기":"📂 Load from file","자동 백업":"Auto backups",
    "(최근 12개 · 1분마다 · 24시간 보관 1개 · 지우기·복구 직전 내용도 여기에 남아요)":"(latest 12 · every 1 min · 1 kept for 24 hours · content from just before clearing/restoring is kept here too)",
    "ℹ️ 시작 안내":"ℹ️ Getting started","🐳 서버 안내":"🐳 Server guide",
    "번역 서버 확인 중":"Checking translation server","번역 서버 연결 안 됨":"Translation server not connected",
    "번역 서버 오류":"Translation server error","번역 서버 응답 이상":"Translation server bad response",
    "번역 서버 연결됨 · 언어 모델 부족":"Translation server connected · language models missing","번역 서버 연결됨":"Translation server connected",
    "⚠ 자동 저장 안 됨":"⚠ Auto-save off","🌗 자동":"🌗 Auto","🌙 다크":"🌙 Dark","☀️ 라이트":"☀️ Light",
    "🛡️ 백업·복구":"🛡️ Backup·Restore","작업 내용 지우기":"Clear current work","📋 전체 복사":"📋 Copy all",
    "기준 글자 크기":"Base font size","기본 정렬":"Default alignment","왼쪽":"Left","가운데":"Center","오른쪽":"Right",
    "⚙ 세부 설정":"⚙ Advanced settings","선택한 글자 번역 언어":"Language for selected-text translation",
    "드래그한 글자를 이 언어로 번역해 보여줘요.":"Drag text to see it translated into this language.",
    "ProPresenter 캔버스 높이":"ProPresenter canvas height","직접 입력…":"Custom…",
    "출력 해상도예요 (1pt = 1px).":"Output resolution (1pt = 1px).",
    "슬라이드 글자 굵기":"Slide font weight","보통":"Regular","굵게":"Bold",
    "🐳 설치 안내 보기":"🐳 View setup guide","다시 확인":"Re-check","저장하고 다시 확인":"Save and re-check","서버 주소":"Server address",
    "언어별 칸에 원고를 붙여넣어요":"Paste each language's script into its column",
    "문장이 끝나는 곳에서 Enter로 나눠요":"Split at the end of each sentence with Enter",
    "오른쪽 슬라이드에서 언어끼리 짝이 맞는지 확인해요":"Check on the right that the languages line up",
    "전체 텍스트를 복사해 가져가요":"Copy the full text and take it away",
    "문장 나누기":"Split sentence","줄바꿈":"New line","조각 맨 앞에서":"At the start of a piece","앞 조각과 합치기":"Merge with previous piece",
    "슬라이드 속 문장을 클릭하면 원문 조각으로 이동":"Click a sentence in a slide to jump to its source piece",
    "슬라이드 구성":"Slide layout","설정":"Settings","슬라이드에 넣을 언어와 순서":"Languages and order on the slide",
    "위에 있는 언어가 슬라이드에서도 위쪽에 표시돼요. ⠿를 잡고 끌어서 순서를 바꿔 보세요.":"Languages higher in the list appear higher on the slide. Drag ⠿ to reorder.",
    "슬라이드":"Slide","슬라이드에 표시해요(기본)":"Show on the slide (default)","( ) 복사":"( ) copy",
    "슬라이드에는 안 넣고, 전체 텍스트 복사에만 ( ) 안에 함께 넣어요":"Not on the slide; only included in parentheses in the full-text copy",
    "제외":"Exclude","슬라이드·복사에서 모두 빼요(왼쪽 원문은 그대로 남아요)":"Removed from slides and copy (the left source text stays)",
    "( ) 복사만":"( ) copy only","끌어서 순서를 바꿀 수 있어요":"Drag to reorder","기준 글자 크기 ":"Base font size",
    /* 툴팁 · placeholder */
    "요한복음 3장 16절":"John 3:16","언어별 칸 4개에 요한복음 3:16을 한 조각씩 넣어요 (칸이 모두 비어 있을 때만)":"Puts John 3:16 as one piece into each of the 4 language columns (only when all columns are empty)",
    "사용법 · 번역 체험 · 최신 패치노트 · 개발자 노트":"Usage · Translation demo · Patch notes · Developer notes",
    "번역 미리보기에 쓰는 번역 서버 설치 방법":"How to install the translation server used for previews",
    "눌러서 번역 서버 연결을 다시 확인":"Click to re-check the translation server connection",
    "브라우저 저장소를 쓸 수 없어요. 백업·복구에서 파일로 저장해 두세요":"Browser storage is unavailable. Save to a file from Backup·Restore.",
    "화면 색: 다크 ↔ 라이트 전환":"Theme: switch between Dark and Light",
    "자동 백업 목록에서 되돌리거나, 원고를 파일로 저장·불러와요":"Restore from the auto-backup list, or save/load the script as a file",
    "왼쪽 원고와 오른쪽 슬라이드를 모두 지우고 처음부터 시작해요":"Clear the left script and right slides and start over",
    "슬라이드 전체 글자를 메모장처럼 보여 주는 창을 열어요 (복사는 창 안의 복사 버튼)":"Open a notepad-style window with all slide text (use the Copy button inside)",
    "슬라이드의 기준(목표) 글자 크기예요. 글자가 많으면 슬라이드마다 자동으로 줄어들어요. 슬라이드 위쪽 칸으로 그 슬라이드만 따로 정할 수도 있어요":"Target font size for slides. Slides with lots of text shrink automatically. You can also set one slide separately with the box above it.",
    "모든 슬라이드의 기본 정렬이에요. 슬라이드 위쪽 버튼으로 그 슬라이드만 따로 바꿀 수 있어요":"Default alignment for all slides. Use the buttons above a slide to change just that one.",
    "이 순서로 슬라이드와 전체 텍스트 복사에 들어가요. 끌어서 순서를 바꿀 수 있어요":"Slides and the full-text copy use this order. Drag to reorder.",
    "기본은 프로프레젠터와 같은":"The default matches ProPresenter:",
    "예요.":".",
    "화면 언어 · Interface language":"Interface language · 화면 언어",
    /* 스크립트가 만드는 문구 */
    "LibreTranslate 서버 연결 확인 중...":"Checking LibreTranslate server connection...",
    "주소는 http:// 로 시작해야 해요. 예: http://localhost:5000":"The address must start with http://, e.g. http://localhost:5000",
    "서버 주소를 저장했어요. 다시 확인합니다.":"Server address saved. Re-checking.",
    "드래그하면 번역이 여기 보여요":"Drag to see the translation here",
    "이 조각이 들어간 슬라이드로 이동":"Go to the slide containing this piece","(비어있음)":"(empty)","번역 중...":"Translating...",
    "(번역 실패 · 번역 서버 확인)":"(Translation failed · check the translation server)",
    "클릭하면 왼쪽 원문 조각으로 이동해요":"Click to jump to the source piece on the left",
    "이 슬라이드만 글자 크기를 따로 정해요. 비워 두면 위쪽 기준 글자 크기를 따라가요":"Set the font size for this slide only. Leave empty to follow the base font size.",
    "이 슬라이드 글자 크기(pt)":"Font size for this slide (pt)","이 슬라이드의 개별 설정을 지우고 기본값으로":"Clear this slide's own settings and use the defaults",
    "왼쪽 원고와 오른쪽 슬라이드가 모두 지워져요. 계속할까요?":"The left script and right slides will all be cleared. Continue?",
    "처음 상태로 되돌렸어요. 지우기 직전 내용은 🛡️ 백업·복구에서 되돌릴 수 있어요.":"Reset to the initial state. Content from just before clearing can be restored in 🛡️ Backup·Restore.",
    "슬라이드에는 언어가 하나 이상 있어야 해요.":"At least one language must be on the slide.",
    "복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.":"Couldn't copy. Please check your browser's clipboard permission.","복사했어요.":"Copied.",
    "복사할 내용이 없어요. 왼쪽 칸에 원고를 먼저 붙여넣어 주세요.":"Nothing to copy. Paste a script into the left columns first.",
    "비우기 직전":"Before clearing","24시간 보관":"24-hour keep","자동":"Auto","복구 직전":"Before restoring",
    "다른 탭에서 이 도구가 편집되고 있어요. 두 곳에서 동시에 고치면 나중에 저장된 쪽이 덮어써요.":"This tool is being edited in another tab. If you edit in both, the one saved last overwrites the other.",
    "복구할 내용을 저장하지 못했어요.":"Couldn't save the content to restore.",
    "아직 자동 백업이 없어요. 글을 쓰면 1분에 한 번씩 자동으로 쌓여요.":"No auto backups yet. They accumulate every minute as you type.",
    "이 시점으로 복구":"Restore to this point","이 백업으로 되돌릴까요? 지금 내용도 백업에 남겨 둬요.":"Restore this backup? The current content is also kept as a backup.",
    "백업 파일을 저장했어요.":"Backup file saved.","백업 파일을 읽지 못했어요. 이 도구에서 저장한 .json 파일인지 확인해 주세요.":"Couldn't read the backup file. Make sure it's a .json saved by this tool.",
    "파일 내용으로 바꿀까요? 지금 내용도 자동 백업에 남겨 둬요.":"Replace with the file's content? The current content is also kept in the auto backups.",
    "저장된 데이터를 읽지 못해 가장 최근 자동 백업으로 열었어요.":"Couldn't read the saved data, so the latest auto backup was opened.",
    "저장된 데이터를 읽지 못했어요. 원본은 브라우저에 따로 보관해 뒀어요.":"Couldn't read the saved data. The original is kept separately in the browser.",
    "위 구절을 마우스로 드래그해 보세요. 고른 부분의 번역이 여기에 나와요.":"Drag over the verse above with your mouse. The translation of what you select appears here.",
    "이 체험에서는 English 번역만 보여줘요":"This tryout only shows English",
    "이 구간은 체험용 번역표에 없어요. 다른 구간을 드래그해 보세요.":"This span isn't in the tryout's translation table. Try dragging a different span.",
    "체험용 번역표를 불러오지 못했어요. 페이지를 새로고침해 주세요.":"Couldn't load the tryout translation table. Please refresh the page.",
    "4개 칸에 요한복음 3:16을 넣었어요.":"Put John 3:16 into the 4 columns.",
    "이미 원고가 있어서 예시를 넣지 않았어요. \"작업 내용 지우기\" 후 다시 눌러 주세요.":"There is already text, so the example wasn't inserted. Press \"Clear current work\" and try again.",
    "요한복음 3:16을 넣었어요. 왼쪽 글자를 드래그하면 번역을 확인할 수 있어요.":"John 3:16 inserted. Drag over the text on the left to see the translation."
  };
  const L = x => EN[x] || x;
  const RX = [
    [/^선택 (\d+)개(?: \((.*)\))?$/, (n, r) => n + " selected" + (r ? " (" + r + ")" : "")],
    [/^(\d+)개 조각을 원고 뒤에 넣었어요\.$/, n => n + " pieces added to the end of your script."],
    [/^(.+) 텍스트 붙여넣기$/, a => "Paste " + L(a) + " text here"],
    [/^슬라이드 (\d+)$/, n => "Slide " + n],
    [/^(\d+)조각$/, n => n + (n === "1" ? " piece" : " pieces")],
    [/^다른 언어는 최대 (\d+)조각이에요\. .*$/, n => "Other languages have up to " + n + " pieces. Check that the sentence splits match."],
    [/^⚠ (.+) 비어 있음$/, a => "⚠ " + a.split(", ").map(L).join(", ") + " empty"],
    [/^제외: ?(.*)$/, a => "Excluded: " + a.split(", ").map(L).join(", ")],
    [/^(개별 · )?(\d+)줄 · (\d+)pt → (\d+(?:\.\d+)?)pt로 축소$/, (c, l, t, e) => (c ? "Custom · " : "") + l + " lines · " + t + "pt → " + e + "pt (shrunk)"],
    [/^(개별 · )?(\d+)줄 · (\d+(?:\.\d+)?)pt \(여유\)$/, (c, l, e) => (c ? "Custom · " : "") + l + " lines · " + e + "pt (fits)"],
    [/^(.*) · (\d+)자 · (.+)$/, (d, n, w) => d + " · " + n + " chars · " + L(w)],
    [/^이 슬라이드만 (.+) 정렬 \(한 번 더 누르면 기본 정렬로\)$/, a => "Align only this slide " + L(a).toLowerCase() + " (click again for default)"],
    [/^(.+) 슬라이드를 지웠어요\..*$/s, r => "Deleted the " + r + " slide. Undo with Ctrl+Z or restore it from 🛡️ Backup·Restore."],
    [/^(.+): 번역 중\.\.\.$/, a => L(a) + ": translating..."],
    [/^\[번역 실패: (.*)\]$/, m => "[Translation failed: " + m + "]"],
    [/^없는 언어: ?(.*)$/, a => "Missing languages: " + a],
    [/^번역 서버\((.+)\)에 연결되지 않았어요\..*$/s, u => "Can't reach the translation server (" + u + "). Everything except translation still works."],
    [/^LibreTranslate 서버\((.+)\) 연결 정상,.*$/s, u => "LibreTranslate server (" + u + ") is connected and all required language models are installed."],
    [/^LibreTranslate 서버\((.+)\)에 연결할 수 없습니다\..*?\((.*)\)$/s, (u, m) => "Cannot reach the LibreTranslate server (" + u + "). Check that it is running, that the address is correct, and the server's CORS settings. (" + m + ")"],
    [/^LibreTranslate 서버\((.+)\)가 오류를 반환했습니다: (.*)$/s, (u, m) => "The LibreTranslate server (" + u + ") returned an error: " + m],
    [/^LibreTranslate 서버\((.+)\) 응답을 해석할 수 없습니다.*$/s, u => "Couldn't parse the response from the LibreTranslate server (" + u + ") (not JSON)."],
    [/^LibreTranslate 서버에는 연결됐지만 다음 언어 모델이 설치돼 있지 않습니다: (.+?)\. .*$/s, m => "Connected to LibreTranslate, but these language models are not installed: " + m + ". Translations involving them will keep failing until you install them on the server."]
,
    [/^이 PC의 브라우저에 저장된 로컬 데이터를 전부 지워요\..*?(?:현재 (\d+)절)?\n\n홈페이지.*$/s, n => "This deletes all local data saved in this PC's browser.\n\n· Slide script and settings\n· Automatic backups\n· Translation cache\n· Your own Bible verse edits (DB drafts)" + (n ? " — currently " + n + " verses" : "") + "\n\nThe original DB published on the website is NOT deleted. It loads again as usual.\nYour own edits can't be restored, so first send them to the administrator with 'Copy DB code', and save any script you need as a file in Backup·Restore.\n\nContinue?"],
    [/^마지막 확인이에요\.\n\n내가 수정한 성경 구절 (\d+)절이.*$/s, n => "Final check.\n\n" + n + " Bible verses you edited will be permanently removed from this PC. Did you send the DB code to the administrator?\n\nReally delete?"]
,
    [/^아직 안 보낸 수정 (\d+)절을 날짜와 상관없이 모두 모았어요\..*?(?: \(이미 보낸 (\d+)절 포함\))?$/s, (n, m) => "Gathered all " + n + (n === "1" ? " edited verse" : " edited verses") + " not yet sent, whatever the date. Copy them, send them to the administrator (" + APP_CONFIG.adminEmail + "), then press [✅ Mark as sent]. Verses you edit again after that are collected again." + (m ? " (including " + m + " already sent)" : "")],
    [/^아직 안 보낸 수정이 없어요 ✓(?: \(아래는 이미 보낸 (\d+)절이에요\)| \(이미 보낸 (\d+)절은 .*\))?$/s, (a, b) => "Nothing is waiting to be sent ✓" + (a ? " (below are the " + a + " already sent)" : b ? " (the " + b + " already sent can be shown by checking [Include already sent])" : "")],
    [/^(\d+)절을 보낸 것으로 표시했어요\..*$/s, n => "Marked " + n + (n === "1" ? " verse" : " verses") + " as sent. Only verses you edit again will be collected again."]
,
    [/^지금 보고 있는 절 (.*)의 코드예요\..*?(\(이 절에는 내용이 없어요\))?$/s, (c, x) => "Code for the verse you are viewing" + (c ? " (" + c + ")" : "") + ". Copy it and send it to the administrator (" + APP_CONFIG.adminEmail + ")." + (x ? " (This verse has no content)" : "")],
    [/^(.+?) (\d+)장 · (\d+)페이지의 글을 모았어요\..*$/s, (nm, ch, p) => "Gathered " + p + (p === "1" ? " page" : " pages") + " of text from " + nm + " chapter " + ch + ". Each paragraph shows the verse name and the text per language. Edit it if you like, then press [Copy]."],
    [/^슬라이드 (?:전부 (\d+)장|(\d+)장 중 (\d+)장) · 문단마다.*$/s, (all, n, k) => (all ? "All " + all + " slides" : k + " of " + n + " slides") + " · One paragraph per slide, text only. Edit it if you like, then press [Copy]."],
    [/^선택 (\d+)절 · (\d+)페이지$/, (v, p) => v + " verses · " + p + " pages selected"]  ];
  // 아이콘(SVG)으로 바꾼 버튼 글자는 이모지가 빠진 채로 들어오므로, 이모지·여분 공백을 뺀 형태로도 사전을 찾는다
  const EMO = /[\u2139\u2600-\u27BF\u2B50\u25C0\u25B6\uFE0F\u{1F000}-\u{1FFFF}]/gu;
  const nz = s => s.replace(EMO, "").replace(/\s+/g, " ").trim();
  const NZ = {}; for (const key in EN) { const n = nz(key); if (n && n !== key && NZ[n] === undefined) NZ[n] = nz(EN[key]); }
  function T(s) {
    const k = s.trim(); if (!k) return s;
    let v = EN[k];
    if (v === undefined) { const n = nz(k); if (NZ[n] !== undefined) v = NZ[n]; }
    if (v === undefined) for (const [re, f] of RX) { const m = k.match(re); if (m) { v = f.apply(null, m.slice(1)); break; } }
    return v === undefined ? s : s.replace(k, () => v);
  }
  const KEY = "subtitleUiLang", ATTRS = ["title", "placeholder", "aria-label"], SKIP = /^(SCRIPT|STYLE|TEXTAREA)$/;
  let lang = "ko"; try { if (localStorage.getItem(KEY) === "en") lang = "en"; } catch (e) {}

  // 사용자가 쓴 원고(슬라이드 글)와 번역 결과(슬라이드 밑 대조 줄)는 화면 문구가 아니므로 번역 대상에서 뺀다
  // (원고가 "슬라이드 3" 같은 문구와 같아도 바뀌지 않고, 복사되는 글도 달라지지 않음). 빈 자리의 언어 이름·"(비어있음)" 같은 안내는 그대로 번역됨
  const USER_TEXT = ".slot:not(.empty) .slot-main, .chk-text[data-raw]";
  function isUserText(n) { const p = n.parentNode; return !!(p && p.nodeType === 1 && p.closest(USER_TEXT)); }
  function txt(n) {
    if (n._en !== undefined && n.data === n._en) { if (lang === "ko") { n.data = n._ko; n._en = undefined; } return; }
    if (lang !== "en") return;
    if (isUserText(n)) return;
    const s = n.data, v = T(s);
    if (v !== s) { n._ko = s; n._en = v; n.data = v; }
  }
  function attr(el, a) {
    const v = el.getAttribute(a); if (v == null) return;
    const r = el._a && el._a[a];
    if (r && v === r.en) { if (lang === "ko") { el.setAttribute(a, r.ko); delete el._a[a]; } return; }
    if (lang !== "en") return;
    const t = T(v);
    if (t !== v) { (el._a || (el._a = {}))[a] = { ko: v, en: t }; el.setAttribute(a, t); }
  }
  function swapHtml() {
    document.querySelectorAll("[data-en]").forEach(el => {
      if (lang === "en") { if (el._ko === undefined) { el._ko = el.innerHTML; el.innerHTML = el.dataset.en; } }
      else if (el._ko !== undefined) { el.innerHTML = el._ko; el._ko = undefined; }
    });
  }
  function pass(root) {
    if (root.nodeType === 3) { if (!SKIP.test(root.parentNode.tagName)) txt(root); return; }
    if (root.nodeType !== 1 || SKIP.test(root.tagName) && root.tagName !== "TEXTAREA") return;
    const els = [root, ...root.querySelectorAll("*")];
    els.forEach(el => ATTRS.forEach(a => attr(el, a)));
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => SKIP.test(n.parentNode.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(txt);
  }
  new MutationObserver(ms => {
    if (lang !== "en") return;
    for (const m of ms) {
      if (m.type === "childList") m.addedNodes.forEach(pass);
      else if (m.type === "characterData") txt(m.target);
      else if (m.type === "attributes") attr(m.target, m.attributeName);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  const _confirm = window.confirm; window.confirm = m => _confirm.call(window, lang === "en" ? T(String(m)) : m);
  const _alert = window.alert; window.alert = m => _alert.call(window, lang === "en" ? T(String(m)) : m);
  const koTitle = document.title;

  const btns = document.querySelectorAll(".lang-toggle");
  function setLang(l, save) {
    lang = l;
    if (save) try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.lang = l;
    document.title = l === "en" ? T(koTitle) : koTitle;
    swapHtml(); // 조각 번역보다 먼저: 원래 한글 HTML을 그대로 보관하기 위해
    pass(document.body);
    btns.forEach(b => { b.innerHTML = icon("globe") + (l === "en" ? "English" : "한국어"); });
  }
  btns.forEach(b => b.addEventListener("click", () => setLang(lang === "en" ? "ko" : "en", true)));
  setLang(lang, false);
})();
