import os
import re

# =====================================================================
# [성경 66권 완벽 전수조사 마스터 사전]
# =====================================================================
bible_books_master = {
    # --- [구약 39권] ---
    "Genesis": ("Genesis", "창세기"), "창세기": ("Genesis", "창세기"),
    "Exodus": ("Exodus", "출애굽기"), "출애굽기": ("Exodus", "출애굽기"),
    "Leviticus": ("Leviticus", "레위기"), "레위기": ("Leviticus", "레위기"),
    "Numbers": ("Numbers", "민수기"), "민수기": ("Numbers", "민수기"),
    "Deuteronomy": ("Deuteronomy", "신명기"), "신명기": ("Deuteronomy", "신명기"),
    "Joshua": ("Joshua", "여호수아"), "여호수아": ("Joshua", "여호수아"),
    "Judges": ("Judges", "사사기"), "사사기": ("Judges", "사사기"),
    "Ruth": ("Ruth", "룻기"), "룻기": ("Ruth", "룻기"),
    "1Samuel": ("1Samuel", "사무엘상"), "Samuel1": ("1Samuel", "사무엘상"), "사무엘상": ("1Samuel", "사무엘상"),
    "2Samuel": ("2Samuel", "사무엘하"), "Samuel2": ("2Samuel", "사무엘하"), "사무엘하": ("2Samuel", "사무엘하"),
    "1Kings": ("1Kings", "열왕기상"), "Kings1": ("1Kings", "열왕기상"), "열왕기상": ("1Kings", "열왕기상"),
    "2Kings": ("2Kings", "열왕기하"), "Kings2": ("2Kings", "열왕기하"), "열왕기하": ("2Kings", "열왕기하"),
    "1Chronicles": ("1Chronicles", "역대상"), "Chronicles1": ("1Chronicles", "역대상"), "역대상": ("1Chronicles", "역대상"),
    "2Chronicles": ("2Chronicles", "역대하"), "Chronicles2": ("2Chronicles", "역대하"), "역대하": ("2Chronicles", "역대하"),
    "Ezra": ("Ezra", "에스라"), "에스라": ("Ezra", "에스라"),
    "Nehemiah": ("Nehemiah", "느헤미야"), "느헤미야": ("Nehemiah", "느헤미야"),
    "Esther": ("Esther", "에스더"), "에스더": ("Esther", "에스더"),
    "Job": ("Job", "욥기"), "욥기": ("Job", "욥기"),
    "Psalms": ("Psalms", "시편"), "Psalm": ("Psalms", "시편"), "Psamls": ("Psalms", "시편"), "시편": ("Psalms", "시편"),
    "Proverbs": ("Proverbs", "잠언"), "잠언": ("Proverbs", "잠언"),
    "Ecclesiastes": ("Ecclesiastes", "전도서"), "전도서": ("Ecclesiastes", "전도서"),
    "SongofSolomon": ("SongofSolomon", "아가"), "Song of Solomon": ("SongofSolomon", "아가"), 
    "SongofSongs": ("SongofSolomon", "아가"), "Song of Songs": ("SongofSolomon", "아가"), "아가": ("SongofSolomon", "아가"),
    "Lamentations": ("Lamentations", "예레미야애가"), "Lamentiation": ("Lamentations", "예레미야애가"), "예레미야애가": ("Lamentations", "예레미야애가"),
    "Isaiah": ("Isaiah", "이사야"), "이사야": ("Isaiah", "이사야"),
    "Jeremiah": ("Jeremiah", "예레미야"), "예레미야": ("Jeremiah", "예레미야"),
    "Ezekiel": ("Ezekiel", "에스겔"), "에스겔": ("Ezekiel", "에스겔"),
    "Daniel": ("Daniel", "다니엘"), "다니엘": ("Daniel", "다니엘"),
    "Hosea": ("Hosea", "호세아"), "호세아": ("Hosea", "호세아"),
    "Joel": ("Joel", "요엘"), "요엘": ("Joel", "요엘"),
    "Amos": ("Amos", "아모스"), "아모스": ("Amos", "아모스"),
    "Obadiah": ("Obadiah", "오바댜"), "오바댜": ("Obadiah", "오바댜"),
    "Jonah": ("Jonah", "요나"), "요나": ("Jonah", "요나"),
    "Micah": ("Micah", "미가"), "미가": ("Micah", "미가"),
    "Nahum": ("Nahum", "나훔"), "나훔": ("Nahum", "나훔"),
    "Habakkuk": ("Habakkuk", "하박국"), "하박국": ("Habakkuk", "하박국"),
    "Zephaniah": ("Zephaniah", "스바냐"), "스바냐": ("Zephaniah", "스바냐"),
    "Haggai": ("Haggai", "학개"), "학개": ("Haggai", "학개"),
    "Zechariah": ("Zechariah", "스가랴"), "스가랴": ("Zechariah", "스가랴"),
    "Malachi": ("Malachi", "말라기"), "말라기": ("Malachi", "말라기"),

    # --- [신약 27권] ---
    "Matthew": ("Matthew", "마태복음"), "마태복음": ("Matthew", "마태복음"),
    "Mark": ("Mark", "마가복음"), "마가복음": ("Mark", "마가복음"),
    "Luke": ("Luke", "누가복음"), "누가복음": ("Luke", "누가복음"),
    "John": ("John", "요한복음"), "요한복음": ("John", "요한복음"),
    "Acts": ("Acts", "사도행전"), "사도행전": ("Acts", "사도행전"),
    "Romans": ("Romans", "로마서"), "로마서": ("Romans", "로마서"),
    "1Corinthians": ("1Corinthians", "고린도전서"), "Corinthians1": ("1Corinthians", "고린도전서"), "고린도전서": ("1Corinthians", "고린도전서"),
    "2Corinthians": ("2Corinthians", "고린도후서"), "Corinthians2": ("2Corinthians", "고린도후서"), "고린도후서": ("2Corinthians", "고린도후서"),
    "Galatians": ("Galatians", "갈라디아서"), "갈라디아서": ("Galatians", "갈라디아서"),
    "Ephesians": ("Ephesians", "에베소서"), "에베소서": ("Ephesians", "에베소서"),
    "Philippians": ("Philippians", "빌립보서"), "빌립보서": ("Philippians", "빌립보서"),
    "Colossians": ("Colossians", "골로새서"), "골로새서": ("Colossians", "골로새서"),
    "1Thessalonians": ("1Thessalonians", "데살로니가전서"), "Thessalonians1": ("1Thessalonians", "데살로니가전서"), "데살로니가전서": ("1Thessalonians", "데살로니가전서"),
    "2Thessalonians": ("2Thessalonians", "데살로니가후서"), "Thessalonians2": ("2Thessalonians", "데살로니가후서"), "데살로니가후서": ("2Thessalonians", "데살로니가후서"),
    "1Timothy": ("1Timothy", "디모데전서"), "Timothy1": ("1Timothy", "디모데전서"), "디모데전서": ("1Timothy", "디모데전서"),
    "2Timothy": ("2Timothy", "디모데후서"), "Timothy2": ("2Timothy", "디모데후서"), "디모데후서": ("2Timothy", "디모데후서"),
    "Titus": ("Titus", "디도서"), "디도서": ("Titus", "디도서"),
    "Philemon": ("Philemon", "빌레몬서"), "빌레몬서": ("Philemon", "빌레몬서"),
    "Hebrews": ("Hebrews", "히브리서"), "히브리서": ("Hebrews", "히브리서"),
    "James": ("James", "야고보서"), "야고보서": ("James", "야고보서"),
    "1Peter": ("1Peter", "베드로전서"), "Peter1": ("1Peter", "베드로전서"), "베드로전서": ("1Peter", "베드로전서"),
    "2Peter": ("2Peter", "베드로후서"), "Peter2": ("2Peter", "베드로후서"), "베드로후서": ("2Peter", "베드로후서"),
    "1John": ("1John", "요한일서"), "John1": ("1John", "요한일서"), "요한일서": ("1John", "요한일서"),
    "2John": ("2John", "요한이서"), "John2": ("2John", "요한이서"), "요한이서": ("2John", "요한이서"),
    "3John": ("3John", "요한삼서"), "John3": ("3John", "요한삼서"), "요한삼서": ("3John", "요한삼서"),
    "Jude": ("Jude", "유다서"), "유다서": ("Jude", "유다서"),
    "Revelation": ("Revelation", "요한계시록"), "요한계시록": ("Revelation", "요한계시록"),
}

bible_database = {}

def get_validated_book(name):
  if not name:
    return None
  cleaned = name.strip()
  compact_key = cleaned.replace(" ", "").replace("_", "")
  
  if cleaned in bible_books_master:
    return bible_books_master[cleaned][0]
  if compact_key in bible_books_master:
    return bible_books_master[compact_key][0]
    
  return None

def sanitize_text(text):
  if not text:
    return ""
  return text.replace('"', '\\"')

def read_file_lines(filename):
  for enc in ["utf-8", "cp949", "euc-kr"]:
    try:
      with open(filename, "r", encoding=enc) as f:
        return f.readlines()
    except UnicodeDecodeError:
      continue
    except FileNotFoundError:
      print(f"알림: '{filename}' 파일을 찾지 못했습니다.")
      return None
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

    if ":" not in line:
      validated = get_validated_book(line)
      if validated:
        current_book = validated
      continue

    tokens = line.split(None, 1)
    if len(tokens) < 1:
      continue

    part1 = tokens[0]
    remainder = tokens[1] if len(tokens) > 1 else ""

    if ":" in part1:
      chap_verse_part = part1
      text_part = remainder
    else:
      sub_tokens = remainder.split(None, 1)
      if len(sub_tokens) < 1:
        continue
      chap_verse_part = sub_tokens[0]
      text_part = sub_tokens[1] if len(sub_tokens) > 1 else ""

    if "0:0" in chap_verse_part or ":" not in chap_verse_part:
      continue

    try:
      chapter_str, verse_str = chap_verse_part.split(":", 1)
      chapter = int(chapter_str)
      verse = int(verse_str)
    except ValueError:
      continue

    if not current_book or get_validated_book(current_book) is None:
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

    db[ref_key][target_lang] = sanitize_text(text_part)

  print(f"[{filename}] ({target_lang}) 데이터 불러오기 성공!")

def find_existing_book_dir(book_name):
  """
  폴더 이름 앞에 '01_', '1.', 'abc_' 등 불규칙한 접두사나 번호가 붙어 있어도
  그 안에 책 이름(예: genesis, 1kings, peter 등)이 포함되어 있다면 
  찰떡같이 찾아내어 그 폴더를 반환하고, 저장 시에는 '1Kings', '2Peter' 같은 
  규칙적인 표준 이름으로 깔끔하게 정돈합니다.
  """
  current_dir = "."
  target_clean = book_name.lower().replace(" ", "").replace("_", "")
  
  # 1. 이미 존재하는 폴더들 중 책 이름 키워드를 포함하는 폴더가 있는지 스마트 탐색
  for item in os.listdir(current_dir):
    item_path = os.path.join(current_dir, item)
    if os.path.isdir(item_path):
      item_clean = item.lower().replace(" ", "").replace("_", "").replace("-", "")
      # 불규칙한 앞 숫자나 특수문자 뒤에 정식 책 이름이 포함되어 있는지 확인
      if target_clean in item_clean:
        return item_path

  # 2. 일치하는 폴더가 아예 없다면 규칙적인 표준 이름으로 새 폴더 생성
  new_dir = os.path.join(current_dir, book_name)
  os.makedirs(new_dir, exist_ok=True)
  return new_dir

def export_to_js_files(db):
  chapter_groups = {}
  for ref_key, data in db.items():
    book = data["Bible"]
    if get_validated_book(book) is None:
      continue
      
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
    
    kor_book_name = book
    for k, v in bible_books_master.items():
      if v[0] == book:
        kor_book_name = v[1]
        break

    js_content = f"// {kor_book_name} {chap}장 · {book} {chap}\n"
    js_content += '// [절 수] 아래 숫자를 이 장의 마지막 절 번호로 고치세요.\n'
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