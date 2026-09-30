import os

# 표준 영문 책 이름을 한글 이름으로 변환해주는 사전
english_to_korean = {
    "Genesis": "창세기",
    "Exodus": "출애굽기",
    "Leviticus": "레위기",
    "Numbers": "민수기",
    "Deuteronomy": "신명기",
    "Joshua": "여호수아",
    "Judges": "사사기",
    "Ruth": "룻기",
    "Samuel1": "사무엘상",
    "Samuel2": "사무엘하",
    "Kings1": "열왕기상",
    "Kings2": "열왕기하",
    "Chronicles1": "역대상",
    "Chronicles2": "역대하",
    "Ezra": "에스라",
    "Nehemiah": "느헤미야",
    "Esther": "에스더",
    "Job": "욥기",
    "Psalms": "시편",
    "Proverbs": "잠언",
    "Ecclesiastes": "전도서",
    "SongofSongs": "아가",
    "Isaiah": "이사야",
    "Jeremiah": "예레미야",
    "Lamentations": "예레미야애가",
    "Ezekiel": "에스겔",
    "Daniel": "다니엘",
    "Hosea": "호세아",
    "Joel": "요엘",
    "Amos": "아모스",
    "Obadiah": "오바댜",
    "Jonah": "요나",
    "Micah": "미가",
    "Nahum": "나훔",
    "Habakkuk": "하박국",
    "Zephaniah": "스바냐",
    "Haggai": "학개",
    "Zechariah": "스가랴",
    "Malachi": "말라기",
    "Matthew": "마태복음",
    "Mark": "마가복음",
    "Luke": "누가복음",
    "John": "요한복음",
    "Acts": "사도행전",
    "Romans": "로마서",
    "Corinthians1": "고린도전서",
    "Corinthians2": "고린도후서",
    "Galatians": "갈라디아서",
    "Ephesians": "에베소서",
    "Philippians": "빌립보서",
    "Colossians": "골로새서",
    "Thessalonians1": "데살로니가전서",
    "Thessalonians2": "데살로니가후서",
    "Timothy1": "디모데전서",
    "Timothy2": "디모데후서",
    "Titus": "디도서",
    "Philemon": "빌레몬서",
    "Hebrews": "히브리서",
    "James": "야고보서",
    "Peter1": "베드로전서",
    "Peter2": "베드로후서",
    "John1": "요한일서",
    "John2": "요한이서",
    "John3": "요한삼서",
    "Jude": "유다서",
    "Revelation": "요한계시록",
}

bible_database = {}


def normalize_book_name(name):
  """텍스트에 적힌 영어 책 이름 표기를 코드 표준 형식으로 정돈합니다."""
  cleaned = name.strip().replace(" ", "").title()
  # 1 Samuel -> Samuel1 형태 등으로 변환 필요시 매핑
  mapping_fixes = {
      "1Samuel": "Samuel1",
      "2Samuel": "Samuel2",
      "1Kings": "Kings1",
      "2Kings": "Kings2",
      "1Chronicles": "Chronicles1",
      "2Chronicles": "Chronicles2",
      "SongOfSongs": "SongofSongs",
      "SongOfSolomon": "SongofSongs",
      "1Corinthians": "Corinthians1",
      "2Corinthians": "Corinthians2",
      "1Thessalonians": "Thessalonians1",
      "2Thessalonians": "Thessalonians2",
      "1Timothy": "Timothy1",
      "2Timothy": "Timothy2",
      "1Peter": "Peter1",
      "2Peter": "Peter2",
      "1John": "John1",
      "2John": "John2",
      "3John": "John3",
  }
  return mapping_fixes.get(cleaned, cleaned)


def read_file_lines(filename):
  encodings_to_try = ["utf-8", "cp949", "euc-kr"]
  for enc in encodings_to_try:
    try:
      with open(filename, "r", encoding=enc) as f:
        return f.readlines()
    except UnicodeDecodeError:
      continue
    except FileNotFoundError:
      print(f"알림: '{filename}' 파일을 찾지 못했습니다.")
      return None
  print(f"알림: '{filename}' 파일의 인코딩을 읽어오지 못했습니다.")
  return None


def load_and_update_bible(filename, target_lang, db=bible_database):
  lines = read_file_lines(filename)
  if lines is None:
    return

  current_book = None

  for line in lines:
    line = line.strip()
    if not line:
      continue

    # 콜론(:)이 없으면 영어 책 이름 헤더로 인식
    if ":" not in line:
      current_book = normalize_book_name(line)
      continue

    # 콜론이 있으면 절 본문 데이터 (예: "1:1 태초에...")
    tokens = line.split(None, 1)
    if len(tokens) < 1:
      continue

    chap_verse_part = tokens[0]
    text_part = tokens[1] if len(tokens) > 1 else ""

    if "0:0" in chap_verse_part or ":" not in chap_verse_part:
      continue

    try:
      chapter_str, verse_str = chap_verse_part.split(":", 1)
      chapter = int(chapter_str)
      verse = int(verse_str)
    except ValueError:
      continue

    if not current_book:
      continue

    book_name = current_book
    ref_key = (book_name, chapter, verse)

    if ref_key not in db:
      db[ref_key] = {
          "Bible": book_name,
          "Chapter": chapter,
          "Verse": verse,
          "Page": 1,
          "Kor": "",
          "Chn": "",
          "Eng": "",
          "Ind": "",
      }

    db[ref_key][target_lang] = text_part

  print(f"[{filename}] ({target_lang}) 데이터 불러오기 성공!")


def find_existing_book_dir(book_name):
  current_dir = "."
  for item in os.listdir(current_dir):
    item_path = os.path.join(current_dir, item)
    if os.path.isdir(item_path):
      clean_item = (
          item.lower()
          .replace("1", "")
          .replace("2", "")
          .replace("3", "")
          .replace("_", "")
      )
      clean_book = (
          book_name.lower().replace("1", "").replace("2", "").replace("3", "")
      )
      if clean_book in clean_item:
        return item_path

  new_dir = os.path.join(current_dir, book_name)
  os.makedirs(new_dir, exist_ok=True)
  return new_dir


def export_to_js_files(db):
  chapter_groups = {}
  for ref_key, data in db.items():
    book = data["Bible"]
    chap = data["Chapter"]
    group_key = (book, chap)

    if group_key not in chapter_groups:
      chapter_groups[group_key] = []
    chapter_groups[group_key].append(data)

  for (book, chap), verses in chapter_groups.items():
    book_dir = find_existing_book_dir(book)

    file_name = f"{book}_{chap:03d}.js"
    file_path = os.path.join(book_dir, file_name)

    max_verse = max(v["Verse"] for v in verses) if verses else 0
    kor_book_name = english_to_korean.get(book, book)

    js_content = f"// {kor_book_name} {chap}장 · {book} {chap}\n"
    js_content += (
        '// [절 수] 아래 숫자를 이 장의 마지막 절 번호로 고치세요. 그 개수만큼만'
        " 절 드롭다운에 나와요.\n"
    )
    js_content += f'BibleDB.ref("{book}",{chap},{max_verse});\n'
    js_content += "BibleDB.add([\n"

    for data in verses:
      js_content += (
          f'  {{Bible:"{data["Bible"]}", Chapter:{data["Chapter"]},'
          f' Verse:{data["Verse"]}, Page:{data["Page"]},'
          f' Kor:"{data["Kor"]}", Chn:"{data["Chn"]}", Eng:"{data["Eng"]}",'
          f' Ind:"{data["Ind"]}"}},\n'
      )

    js_content += "]);\n"

    with open(file_path, "w", encoding="utf-8") as f:
      f.write(js_content)

    print(f"생성/덮어쓰기 완료: {file_path}")


if __name__ == "__main__":
  load_and_update_bible("BibleData_Kor.txt", "Kor")
  load_and_update_bible("BibleData_Chn.txt", "Chn")
  load_and_update_bible("BibleData_Eng.txt", "Eng")
  load_and_update_bible("BibleData_Ind.txt", "Ind")

  print("\n--- 전체 성경 .js 파일 일괄 추출 및 정리 시작 ---")
  export_to_js_files(bible_database)
  print("모든 작업이 완료되었습니다!")