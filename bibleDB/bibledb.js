/* 성경 데이터베이스 로더 — 책 목록 + 장 파일 읽기
   장 파일: bible/01_Genesis/Genesis_001.js  (안에서 BibleDB.add([...]) 호출)
   한 줄 형식: {Bible:"Genesis",Chapter:1,Verse:1,Page:1,Kor:"",Chn:"",Eng:"",Ind:""},
   <script> 태그로 읽기 때문에 GitHub Pages는 물론 index.html을 더블클릭해 열어도(file://) 동작합니다. */
(function () {
  "use strict";
  const BOOKS = [
  ["Genesis","창세기",50],
  ["Exodus","출애굽기",40],
  ["Leviticus","레위기",27],
  ["Numbers","민수기",36],
  ["Deuteronomy","신명기",34],
  ["Joshua","여호수아",24],
  ["Judges","사사기",21],
  ["Ruth","룻기",4],
  ["1 Samuel","사무엘상",31],
  ["2 Samuel","사무엘하",24],
  ["1 Kings","열왕기상",22],
  ["2 Kings","열왕기하",25],
  ["1 Chronicles","역대상",29],
  ["2 Chronicles","역대하",36],
  ["Ezra","에스라",10],
  ["Nehemiah","느헤미야",13],
  ["Esther","에스더",10],
  ["Job","욥기",42],
  ["Psalms","시편",150],
  ["Proverbs","잠언",31],
  ["Ecclesiastes","전도서",12],
  ["Song of Solomon","아가",8],
  ["Isaiah","이사야",66],
  ["Jeremiah","예레미야",52],
  ["Lamentations","예레미야애가",5],
  ["Ezekiel","에스겔",48],
  ["Daniel","다니엘",12],
  ["Hosea","호세아",14],
  ["Joel","요엘",3],
  ["Amos","아모스",9],
  ["Obadiah","오바댜",1],
  ["Jonah","요나",4],
  ["Micah","미가",7],
  ["Nahum","나훔",3],
  ["Habakkuk","하박국",3],
  ["Zephaniah","스바냐",3],
  ["Haggai","학개",2],
  ["Zechariah","스가랴",14],
  ["Malachi","말라기",4],
  ["Matthew","마태복음",28],
  ["Mark","마가복음",16],
  ["Luke","누가복음",24],
  ["John","요한복음",21],
  ["Acts","사도행전",28],
  ["Romans","로마서",16],
  ["1 Corinthians","고린도전서",16],
  ["2 Corinthians","고린도후서",13],
  ["Galatians","갈라디아서",6],
  ["Ephesians","에베소서",6],
  ["Philippians","빌립보서",4],
  ["Colossians","골로새서",4],
  ["1 Thessalonians","데살로니가전서",5],
  ["2 Thessalonians","데살로니가후서",3],
  ["1 Timothy","디모데전서",6],
  ["2 Timothy","디모데후서",4],
  ["Titus","디도서",3],
  ["Philemon","빌레몬서",1],
  ["Hebrews","히브리서",13],
  ["James","야고보서",5],
  ["1 Peter","베드로전서",5],
  ["2 Peter","베드로후서",3],
  ["1 John","요한일서",5],
  ["2 John","요한이서",1],
  ["3 John","요한삼서",1],
  ["Jude","유다서",1],
  ["Revelation","요한계시록",22]
  ];
  const pad = (n, w) => String(n).padStart(w, "0");
  const bookKey = en => String(en).replace(/\s+/g, "");
  const chapters = new Map();   // "Genesis|1" -> Map("verse|page" -> row)
  const refs = new Map();       // "Genesis|1" -> 그 장의 마지막 절 번호(장 파일의 BibleDB.ref로 하드 코딩)
  const loading = new Map();    // "Genesis|1" -> Promise
  const ck = (b, c) => bookKey(b) + "|" + c;
  const DB = window.BibleDB = {
    books: BOOKS.map((b, i) => ({ no: i + 1, en: b[0], ko: b[1], chapters: b[2], folder: pad(i + 1, 2) + "_" + b[0].replace(/ /g, "") })),
    book(en) { const key = bookKey(en); return DB.books.find(b => bookKey(b.en) === key); },
    path(en, ch) {
      const b = DB.book(en), nm = en.replace(/ /g, "");
      return "bible/" + b.folder + "/" + nm + "_" + pad(ch, 3) + ".js";
    },
    ref(en, ch, n) { refs.set(ck(en, ch), n | 0); },   // 장 파일이 실행되면서 호출
    verses(en, ch) { return refs.get(ck(en, ch)) || 0; }, // 0 = 아직 모름
    add(rows) {                  // 장 파일이 실행되면서 호출 — 같은 절·페이지는 덮어써서 중복이 생기지 않음
      (rows || []).forEach(r => {
        const k = ck(r.Bible, r.Chapter);
        if (!chapters.has(k)) chapters.set(k, new Map());
        chapters.get(k).set(r.Verse + "|" + r.Page, r);
      });
    },
    rows(en, ch) {               // 이미 읽어 둔 장의 줄들(절 → 페이지 순)
      const m = chapters.get(ck(en, ch));
      return m ? [...m.values()].sort((a, b) => a.Verse - b.Verse || a.Page - b.Page) : [];
    },
    get(en, ch, v, p) { const m = chapters.get(ck(en, ch)); return (m && m.get(v + "|" + p)) || null; },
    load(en, ch) {               // 장 파일을 한 번만 읽고, 끝나면 그 장의 줄들을 돌려줌(파일이 없으면 reject)
      const k = ck(en, ch);
      if (!loading.has(k)) {
        loading.set(k, new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = DB.path(en, ch);
          s.onload = () => res(DB.rows(en, ch));
          s.onerror = () => { loading.delete(k); s.remove(); rej(new Error("파일을 읽지 못했어요: " + s.getAttribute("src"))); };
          document.head.appendChild(s);
        }));
      }
      return loading.get(k);
    },
  };
})();
