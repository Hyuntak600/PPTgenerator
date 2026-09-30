import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

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
    "1Kings": ("1Kings", "열왕기상"), "Kings1": ("1Kings", "열왕기상"), "1Ki": ("1Kings", "열왕기상"), "열왕기상": ("1Kings", "열왕기상"),
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
    "1John": ("1John", "요한일서"), "John1": ("1John", "요한일서"), "요한일서": ("1John", "요한일서"), "요한1서": ("1John", "요한일서"),
    "2John": ("2John", "요한이서"), "John2": ("2John", "요한이서"), "요한이서": ("2John", "요한이서"), "요한2서": ("2John", "요한이서"),
    "3John": ("3John", "요한삼서"), "John3": ("3John", "요한삼서"), "요한삼서": ("3John", "요한삼서"), "요한3서": ("3John", "요한삼서"),
    "Jude": ("Jude", "유다서"), "유다서": ("Jude", "유다서"),
    "Revelation": ("Revelation", "요한계시록"), "요한계시록": ("Revelation", "요한계시록"),
}

bible_book_order = (
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
    "Judges", "Ruth", "1Samuel", "2Samuel", "1Kings", "2Kings",
    "1Chronicles", "2Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
    "Psalms", "Proverbs", "Ecclesiastes", "SongofSolomon", "Isaiah",
    "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
    "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark",
    "Luke", "John", "Acts", "Romans", "1Corinthians", "2Corinthians",
    "Galatians", "Ephesians", "Philippians", "Colossians", "1Thessalonians",
    "2Thessalonians", "1Timothy", "2Timothy", "Titus", "Philemon",
    "Hebrews", "James", "1Peter", "2Peter", "1John", "2John", "3John",
    "Jude", "Revelation",
)
bible_book_numbers = {
    book_name: number for number, book_name in enumerate(bible_book_order, 1)
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

def load_bible_chapter_counts():
  loader_path = os.path.join(BASE_DIR, "bibledb.js")
  with open(loader_path, "r", encoding="utf-8") as loader_file:
    loader_text = loader_file.read()

  entries = re.findall(r'\["([^"]+)","[^"]+",(\d+)\]', loader_text)
  counts = {}
  order = []
  for book_label, chapter_count in entries:
    book = get_validated_book(book_label)
    if not book or book in counts:
      raise ValueError(f"bibledb.js의 책 목록을 해석할 수 없습니다: {book_label}")
    counts[book] = int(chapter_count)
    order.append(book)

  if tuple(order) != bible_book_order:
    raise ValueError("bibledb.js의 66권 순서가 내보내기 책 목록과 다릅니다.")
  return counts


bible_chapter_counts = load_bible_chapter_counts()

def sanitize_text(text):
  if not text:
    return ""
  return text

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
  current_book_id = None

  for line_number, line in enumerate(lines, 1):
    line = line.strip()
    if not line:
      continue

    if ":" not in line:
      validated = get_validated_book(line)
      if validated:
        current_book = validated
        current_book_id = None
      continue

    tokens = line.split(None, 1)
    if len(tokens) < 1:
      continue

    part1 = tokens[0]
    remainder = tokens[1] if len(tokens) > 1 else ""
    row_book_id = int(part1) if part1.isdigit() else None

    if ":" in part1:
      chap_verse_part = part1
      text_part = remainder
    else:
      sub_tokens = remainder.split(None, 1)
      if len(sub_tokens) < 1:
        continue
      chap_verse_part = sub_tokens[0]
      text_part = sub_tokens[1] if len(sub_tokens) > 1 else ""

    if chap_verse_part == "0:0":
      header_book = None
      metadata = text_part.split(",")
      for book_label in reversed(metadata):
        header_book = get_validated_book(book_label)
        if header_book:
          break
      expected_book_id = bible_book_numbers.get(header_book)
      expected_chapters = bible_chapter_counts.get(header_book)
      declared_chapters = int(metadata[-1]) if metadata and metadata[-1].isdigit() else None
      if not header_book:
        raise ValueError(f"책 이름을 확인할 수 없습니다 ({filename}:{line_number})")
      if row_book_id != expected_book_id:
        raise ValueError(
            f"책 번호가 이름과 맞지 않습니다 ({filename}:{line_number}): "
            f"{row_book_id} != {expected_book_id} ({header_book})"
        )
      if declared_chapters != expected_chapters:
        raise ValueError(
            f"책의 장 수가 기준과 다릅니다 ({filename}:{line_number}): "
            f"{declared_chapters} != {expected_chapters} ({header_book})"
        )
      current_book = header_book
      current_book_id = row_book_id
      continue

    if ":" not in chap_verse_part:
      continue

    try:
      chapter_str, verse_str = chap_verse_part.split(":", 1)
      chapter = int(chapter_str)
      verse = int(verse_str)
    except ValueError:
      continue

    if not current_book or get_validated_book(current_book) is None:
      raise ValueError(f"책 헤더 없이 구절 데이터가 나왔습니다 ({filename}:{line_number})")
    if current_book_id is not None and row_book_id != current_book_id:
      raise ValueError(
          f"구절의 책 번호가 헤더와 다릅니다 ({filename}:{line_number}): "
          f"{row_book_id} != {current_book_id} ({current_book})"
      )
    if chapter < 1 or chapter > bible_chapter_counts[current_book]:
      raise ValueError(
          f"장 번호가 범위를 벗어났습니다 ({filename}:{line_number}): "
          f"{current_book} {chapter}장 (최대 {bible_chapter_counts[current_book]}장)"
      )
    if verse < 1:
      raise ValueError(f"절 번호는 1 이상이어야 합니다 ({filename}:{line_number}): {verse}")

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
  book_number = bible_book_numbers.get(book_name)
  if book_number is None:
    raise ValueError(f"성경 책 이름이 목록에 없습니다: {book_name}")

  expected_folder = f"{book_number:02d}_{book_name.replace(' ', '')}"
  folder_path = os.path.join(BASE_DIR, expected_folder)
  if not os.path.isdir(folder_path):
    raise FileNotFoundError(
        f"기존 성경 폴더를 찾지 못했습니다: {folder_path} (새 폴더는 만들지 않았습니다)"
    )
  return folder_path

def replace_js_string_property(line, property_name, value):
  match = re.search(rf'(\b{re.escape(property_name)}\s*:\s*)"', line)
  if not match:
    raise ValueError(f"JS 행에 {property_name} 문자열 필드가 없습니다: {line.strip()}")

  end = match.end()
  while end < len(line):
    if line[end] == "\\":
      end += 2
      continue
    if line[end] == '"':
      return (
          line[:match.start()]
          + match.group(1)
          + json.dumps(value, ensure_ascii=False)
          + line[end + 1:]
      )
    end += 1

  raise ValueError(f"JS 행의 {property_name} 문자열이 닫히지 않았습니다.")


def read_js_string_property(line, property_name):
  match = re.search(rf'\b{re.escape(property_name)}\s*:\s*"', line)
  if not match:
    raise ValueError(f"JS 행에 {property_name} 문자열 필드가 없습니다: {line.strip()}")

  start = match.end() - 1
  end = start + 1
  while end < len(line):
    if line[end] == "\\":
      end += 2
      continue
    if line[end] == '"':
      return json.loads(line[start:end + 1])
    end += 1
  raise ValueError(f"JS 행의 {property_name} 문자열이 닫히지 않았습니다.")


def parse_js_row(line):
  if "{Bible:" not in line and "{ Bible:" not in line:
    return None

  book_match = re.search(r'\bBible\s*:\s*"([^"\\]+)"', line)
  values = {}
  for field in ("Chapter", "Verse", "Page"):
    match = re.search(rf'\b{field}\s*:\s*(\d+)', line)
    if not match:
      raise ValueError(f"JS 행에 {field} 숫자 필드가 없습니다: {line.strip()}")
    values[field] = int(match.group(1))
  if not book_match:
    raise ValueError(f"JS 행에 Bible 문자열 필드가 없습니다: {line.strip()}")
  return book_match.group(1), values["Chapter"], values["Verse"], values["Page"]


def repair_duplicate_chapter_files():
  ref_pattern = re.compile(r'BibleDB\.ref\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*\)')
  groups = {}
  for folder_name in sorted(os.listdir(BASE_DIR)):
    folder_path = os.path.join(BASE_DIR, folder_name)
    if not os.path.isdir(folder_path):
      continue
    for file_name in sorted(os.listdir(folder_path)):
      if not file_name.lower().endswith(".js"):
        continue
      file_path = os.path.join(folder_path, file_name)
      with open(file_path, "r", encoding="utf-8") as source_file:
        content = source_file.read()
      refs = list(ref_pattern.finditer(content))
      if len(refs) != 1:
        raise ValueError(f"BibleDB.ref가 정확히 하나가 아닙니다: {file_path}")
      raw_book, chapter_text, verse_count_text = refs[0].groups()
      book = get_validated_book(raw_book)
      if not book:
        raise ValueError(f"알 수 없는 성경 책 이름입니다: {raw_book} ({file_path})")
      chapter = int(chapter_text)
      if chapter < 1 or chapter > bible_chapter_counts[book]:
        raise ValueError(f"책에 없는 장 번호입니다: {book} {chapter}장 ({file_path})")
      key = (book, chapter)
      groups.setdefault(key, []).append((file_path, content, int(verse_count_text)))

  expected_refs = {
      (book, chapter)
      for book, chapter_count in bible_chapter_counts.items()
      for chapter in range(1, chapter_count + 1)
  }
  if set(groups) != expected_refs:
    missing = sorted(
        expected_refs - set(groups), key=lambda item: (bible_book_numbers[item[0]], item[1])
    )
    extra = sorted(set(groups) - expected_refs)
    raise ValueError(f"장 파일 구성이 66권 기준과 다릅니다. 누락={missing[:5]}, 범위 밖={extra[:5]}")

  plans = []
  duplicate_paths = []
  conflicts = {field: 0 for field in ("Kor", "Chn", "Eng", "Ind")}

  for (book, chapter), copies in sorted(
      groups.items(), key=lambda item: (bible_book_numbers[item[0][0]], item[0][1])
  ):
    target_path = os.path.join(
        find_existing_book_dir(book), f"{book}_{chapter:03d}.js"
    )
    target_copy = next((copy for copy in copies if copy[0] == target_path), None)
    if target_copy is None:
      raise FileNotFoundError(f"정식 위치의 장 파일이 없습니다: {target_path}")

    lines = target_copy[1].splitlines(keepends=True)
    add_start = next((i for i, line in enumerate(lines) if "BibleDB.add([" in line), None)
    add_end = next(
        (i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)), None
    )
    if add_start is None or add_end is None or add_end <= add_start:
      raise ValueError(f"정식 장 파일의 BibleDB.add 배열이 올바르지 않습니다: {target_path}")

    row_indexes = {}
    duplicate_row_indexes = []
    maximum_verse = max(copy[2] for copy in copies)

    def merge_row(target_index, source_line):
      target_line = lines[target_index]
      for field in ("Kor", "Chn", "Eng", "Ind"):
        target_value = read_js_string_property(target_line, field)
        source_value = read_js_string_property(source_line, field)
        if not target_value and source_value:
          target_line = replace_js_string_property(target_line, field, source_value)
        elif target_value and source_value and target_value != source_value:
          conflicts[field] += 1
      lines[target_index] = target_line

    for index in range(add_start + 1, add_end):
      row = parse_js_row(lines[index])
      if row is None:
        continue
      raw_row_book, row_chapter, verse, page = row
      if get_validated_book(raw_row_book) != book or row_chapter != chapter:
        raise ValueError(f"정식 파일 내부의 책/장이 잘못됐습니다: {target_path}:{index + 1}")
      lines[index] = replace_js_string_property(lines[index], "Bible", book)
      key = (verse, page)
      if key in row_indexes:
        merge_row(row_indexes[key], lines[index])
        duplicate_row_indexes.append(index)
      else:
        row_indexes[key] = index
      maximum_verse = max(maximum_verse, verse)

    for source_path, source_content, source_verse_count in copies:
      maximum_verse = max(maximum_verse, source_verse_count)
      if source_path == target_path:
        continue
      source_lines = source_content.splitlines(keepends=True)
      source_start = next(
          (i for i, line in enumerate(source_lines) if "BibleDB.add([" in line), None
      )
      source_end = next(
          (i for i, line in enumerate(source_lines) if re.match(r"\s*\]\);\s*$", line)),
          None,
      )
      if source_start is None or source_end is None or source_end <= source_start:
        raise ValueError(f"중복 파일의 BibleDB.add 배열이 올바르지 않습니다: {source_path}")

      for index in range(source_start + 1, source_end):
        row = parse_js_row(source_lines[index])
        if row is None:
          continue
        raw_row_book, row_chapter, verse, page = row
        if get_validated_book(raw_row_book) != book or row_chapter != chapter:
          raise ValueError(f"중복 파일 내부의 책/장이 잘못됐습니다: {source_path}:{index + 1}")
        maximum_verse = max(maximum_verse, verse)
        key = (verse, page)
        if key not in row_indexes:
          raise ValueError(
              f"정식 파일에만 없는 고유 절이 있어 사본을 삭제하지 않았습니다: "
              f"{source_path} {book} {chapter}:{verse} page {page}"
          )
        merge_row(row_indexes[key], source_lines[index])
      duplicate_paths.append(source_path)

    for index in reversed(duplicate_row_indexes):
      del lines[index]
    add_end = next(
        i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)
    )
    updated = "".join(lines)
    updated, ref_count = ref_pattern.subn(
        lambda _: f'BibleDB.ref({json.dumps(book, ensure_ascii=False)},{chapter},{maximum_verse})',
        updated,
        count=1,
    )
    if ref_count != 1:
      raise ValueError(f"정식 파일의 BibleDB.ref를 고치지 못했습니다: {target_path}")

    korean_book_name = next(
        (ko for canonical, ko in bible_books_master.values() if canonical == book), book
    )
    updated_lines = updated.splitlines(keepends=True)
    if updated_lines and updated_lines[0].startswith("//"):
      updated_lines[0] = f"// {korean_book_name} {chapter}장 · {book} {chapter}\n"
    plans.append((target_path, "".join(updated_lines)))

  for target_path, content in plans:
    with open(target_path, "w", encoding="utf-8", newline="") as target_file:
      target_file.write(content)
  for duplicate_path in duplicate_paths:
    os.remove(duplicate_path)

  print(
      f"정식 장 파일 {len(plans)}개 확인, 중복 파일 {len(duplicate_paths)}개 제거; "
      f"영어 충돌 {conflicts['Eng']}건은 정식 파일 내용 유지"
  )


def export_korean_to_existing_files(db):
  chapter_groups = {}
  for data in db.values():
    book = get_validated_book(data["Bible"])
    if not book:
      continue
    chapter = data["Chapter"]
    chapter_groups.setdefault((book, chapter), {})[data["Verse"]] = data.get("Kor", "")

  expected_refs = {
      (book, chapter)
      for book, chapter_count in bible_chapter_counts.items()
      for chapter in range(1, chapter_count + 1)
  }
  if set(chapter_groups) != expected_refs:
    missing = sorted(
        expected_refs - set(chapter_groups), key=lambda item: (bible_book_numbers[item[0]], item[1])
    )
    extra = sorted(set(chapter_groups) - expected_refs)
    raise ValueError(f"한글 원본 장 구성이 66권 기준과 다릅니다. 누락={missing[:5]}, 범위 밖={extra[:5]}")

  plans = []
  relocations = []
  planned_targets = set()

  for (book, chapter), verses in sorted(
      chapter_groups.items(), key=lambda item: (bible_book_numbers[item[0][0]], item[0][1])
  ):
    folder = find_existing_book_dir(book)
    file_name = f"{book}_{chapter:03d}.js"
    target_path = os.path.join(folder, file_name)
    source_path = target_path

    if not os.path.isfile(source_path):
      candidates = []
      for directory, _, names in os.walk(BASE_DIR):
        if file_name not in names:
          continue
        candidate = os.path.join(directory, file_name)
        with open(candidate, "r", encoding="utf-8") as existing_file:
          candidate_text = existing_file.read()
        ref = re.search(r'BibleDB\.ref\(\s*"([^"]+)"\s*,\s*(\d+)\s*,', candidate_text)
        if ref and ref.group(1) == book and int(ref.group(2)) == chapter:
          candidates.append(candidate)
      if len(candidates) != 1:
        raise FileNotFoundError(
            f"기존 장 파일을 하나로 찾을 수 없습니다: {book} {chapter}장 ({len(candidates)}개 후보)"
        )
      source_path = candidates[0]
      relocations.append((source_path, target_path))

    if target_path in planned_targets:
      raise ValueError(f"같은 장 파일을 두 번 갱신하려고 합니다: {target_path}")
    planned_targets.add(target_path)

    with open(source_path, "r", encoding="utf-8") as existing_file:
      original = existing_file.read()

    ref_pattern = re.compile(
        r'(BibleDB\.ref\(\s*'
        + re.escape(json.dumps(book, ensure_ascii=False))
        + rf'\s*,\s*{chapter}\s*,)\s*\d+(\s*\);)'
    )
    updated, ref_count = ref_pattern.subn(
        lambda match: match.group(1) + str(max(verses)) + match.group(2),
        original,
        count=1,
    )
    if ref_count != 1:
      raise ValueError(f"장 파일의 BibleDB.ref를 정확히 하나 찾지 못했습니다: {source_path}")

    lines = updated.splitlines(keepends=True)
    add_start = next((i for i, line in enumerate(lines) if "BibleDB.add([" in line), None)
    add_end = next((i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)), None)
    if add_start is None or add_end is None or add_end <= add_start:
      raise ValueError(f"기존 장 파일의 BibleDB.add 배열 형식이 올바르지 않습니다: {source_path}")

    rows_by_verse = {}
    for index in range(add_start + 1, add_end):
      row = parse_js_row(lines[index])
      if row is None:
        continue
      row_book, row_chapter, verse, page = row
      if row_book != book or row_chapter != chapter:
        raise ValueError(f"파일 경로와 JS 행의 성경/장이 다릅니다: {source_path}:{index + 1}")
      rows_by_verse.setdefault(verse, []).append((index, page))

    new_rows = []
    for verse, korean_text in sorted(verses.items()):
      existing_rows = rows_by_verse.get(verse, [])
      if existing_rows:
        target_index = min(existing_rows, key=lambda item: (item[1] != 1, item[1]))[0]
        lines[target_index] = replace_js_string_property(lines[target_index], "Kor", korean_text)
        for index, _ in existing_rows:
          if index != target_index:
            lines[index] = replace_js_string_property(lines[index], "Kor", "")
      else:
        new_rows.append(
            "  {"
            + f"Bible:{json.dumps(book, ensure_ascii=False)}, Chapter:{chapter}, "
            + f"Verse:{verse}, Page:1, Kor:{json.dumps(korean_text, ensure_ascii=False)}, "
            + 'Chn:"", Eng:"", Ind:""},\n'
        )

    if new_rows:
      lines[add_end:add_end] = new_rows
    plans.append((source_path, target_path, "".join(lines)))

  for source_path, target_path, _ in plans:
    if source_path != target_path and os.path.exists(target_path):
      raise FileExistsError(f"이동 대상 파일이 이미 있습니다: {target_path}")

  for source_path, target_path, content in plans:
    with open(source_path, "w", encoding="utf-8", newline="") as output_file:
      output_file.write(content)

  for source_path, target_path in relocations:
    os.replace(source_path, target_path)

  print(
      f"한글 데이터 반영 완료: {len(plans)}개 기존 장 파일, "
      f"새 장 파일 생성 0개, 잘못 배치된 파일 이동 {len(relocations)}개"
  )


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
          f'  {{Bible:{json.dumps(data["Bible"], ensure_ascii=False)}, Chapter:{data["Chapter"]},'
          f' Verse:{data["Verse"]}, Page:{data["Page"]},'
          f' Kor:{json.dumps(data["Kor"], ensure_ascii=False)},'
          f' Chn:{json.dumps(data["Chn"], ensure_ascii=False)},'
          f' Eng:{json.dumps(data["Eng"], ensure_ascii=False)},'
          f' Ind:{json.dumps(data["Ind"], ensure_ascii=False)}}},\n'
      )

    js_content += "]);\n"

    with open(file_path, "w", encoding="utf-8") as f:
      f.write(js_content)

    print(f"생성/덮어쓰기 완료: {file_path}")

if __name__ == "__main__":
  load_and_update_bible(os.path.join(BASE_DIR, "BibleData_Kor.txt"), "Kor")

  print("\n--- 기존 장 파일의 한글 본문 갱신 시작 ---")
  export_korean_to_existing_files(bible_database)
  print("\n--- 책/장 번호 전수 정리 및 중복 파일 제거 시작 ---")
  repair_duplicate_chapter_files()
  print("모든 작업이 완료되었습니다!")