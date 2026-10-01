import argparse
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

bible_chinese_source_codes = dict(zip(
    "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(),
    bible_book_order,
))


def load_chinese_book_names():
  source_dir = os.path.join(BASE_DIR, "chinese_bible")
  file_pattern = re.compile(r"cmn-cu89s_\d+_([A-Z0-9]+)_(\d+)_read\.txt")
  names = {}
  chapters_by_book = {book: set() for book in bible_book_order}
  source_file_count = 0

  for filename in os.listdir(source_dir):
    match = file_pattern.fullmatch(filename)
    if not match:
      continue
    source_code, chapter_text = match.groups()
    if source_code == "000" and chapter_text == "000":
      continue
    book = bible_chinese_source_codes.get(source_code)
    if not book:
      raise ValueError(f"화합본 파일명의 책 코드가 목록에 없습니다: {filename}")

    with open(os.path.join(source_dir, filename), "r", encoding="utf-8-sig") as source_file:
      lines = [line.strip() for line in source_file if line.strip()]
    if len(lines) < 3 or not lines[0].endswith("."):
      raise ValueError(f"화합본 파일의 책/장 헤더가 올바르지 않습니다: {filename}")

    title = lines[0][:-1].strip()
    chapter = int(chapter_text)
    declared_chapter = int(lines[1].rstrip(".")) if lines[1].rstrip(".").isdigit() else None
    if declared_chapter != chapter:
      raise ValueError(f"화합본 파일명의 장과 본문 장이 다릅니다: {filename}")
    if chapter < 1 or chapter > bible_chapter_counts[book]:
      raise ValueError(f"화합본 파일의 장 번호가 범위를 벗어났습니다: {filename}")
    if book in names and names[book] != title:
      raise ValueError(f"화합본에서 한 책의 중국어 이름이 달라집니다: {book}")

    names[book] = title
    chapters_by_book[book].add(chapter)
    source_file_count += 1

  expected_chapters = {
      book: set(range(1, chapter_count + 1))
      for book, chapter_count in bible_chapter_counts.items()
  }
  incomplete = [
      (book, sorted(expected_chapters[book] - chapters_by_book[book]))
      for book in bible_book_order
      if chapters_by_book[book] != expected_chapters[book]
  ]
  if source_file_count != 1189 or len(names) != 66 or incomplete:
    raise ValueError(
        f"화합본 파일 구성이 66권·1189장 기준과 다릅니다: "
        f"파일={source_file_count}, 책={len(names)}, 누락={incomplete[:5]}"
    )

  if len(set(names.values())) != len(names):
    raise ValueError("화합본 중국어 책 이름이 서로 중복됩니다.")
  return names


bible_chinese_book_names = load_chinese_book_names()
for canonical_book, chinese_name in bible_chinese_book_names.items():
  existing = bible_books_master.get(chinese_name)
  if existing and existing[0] != canonical_book:
    raise ValueError(f"중국어 책 이름이 다른 책과 겹칩니다: {chinese_name}")
  bible_books_master[chinese_name] = (canonical_book, chinese_name)


def parse_chinese_numberless_chapters(lines, source_name):
  chapters = {}
  current_book = None
  current_chapter = None
  verse_lines = []

  def save_chapter():
    if current_book is None or current_chapter is None:
      return
    if not verse_lines:
      raise ValueError(f"중국어 장 본문이 비어 있습니다: {source_name}")
    key = (current_book, current_chapter)
    if key in chapters:
      raise ValueError(f"중국어 장이 중복됐습니다: {source_name} {key}")
    chapters[key] = list(verse_lines)
    verse_lines.clear()

  for line_number, raw_line in enumerate(lines, 1):
    line = raw_line.rstrip("\r\n")
    if line_number == 1 and line.startswith("\ufeff"):
      line = line[1:]
    if not line.strip():
      continue
    heading = line.strip()

    if heading.endswith("."):
      candidate = get_validated_book(heading[:-1].strip())
      if candidate:
        save_chapter()
        expected_title = bible_chinese_book_names.get(candidate)
        if expected_title != heading[:-1].strip():
          raise ValueError(f"중국어 책 이름이 화합본 기준과 다릅니다: {source_name}:{line_number}")
        current_book = candidate
        current_chapter = None
        continue

    chapter_match = re.fullmatch(r"(\d+)\.", heading)
    if chapter_match:
      save_chapter()
      if current_book is None:
        raise ValueError(f"책 이름보다 장 번호가 먼저 나왔습니다: {source_name}:{line_number}")
      current_chapter = int(chapter_match.group(1))
      if current_chapter < 1 or current_chapter > bible_chapter_counts[current_book]:
        raise ValueError(
            f"중국어 장 번호가 범위를 벗어났습니다: "
            f"{source_name}:{line_number} {current_book} {current_chapter}장"
        )
      continue

    if current_book is None or current_chapter is None:
      raise ValueError(f"책/장 헤더 밖의 중국어 본문입니다: {source_name}:{line_number}")
    verse_lines.append(line.rstrip())

  save_chapter()
  return chapters


def map_chinese_verse_groups(chapters):
  mapping_path = os.path.join(BASE_DIR, "chinese_verse_map.json")
  with open(mapping_path, "r", encoding="utf-8") as mapping_file:
    mapping = json.load(mapping_file)
  verse_ranges = mapping.get("verse_ranges", {})
  target_ranges = mapping.get("target_ranges", {})
  used_ranges = set()
  used_targets = set()
  mapped_chapters = {}

  for (book, chapter), verse_lines in chapters.items():
    chapter_key = f"{book}|{chapter}"
    source_ranges = verse_ranges.get(chapter_key, {})
    source_target_ranges = target_ranges.get(chapter_key, {})
    groups_by_target = {}
    source_verse = 1

    for text in verse_lines:
      source_end = int(source_ranges.get(str(source_verse), source_verse))
      if source_end < source_verse:
        raise ValueError(f"중국어 원본 절 범위가 잘못됐습니다: {chapter_key} {source_verse}")
      if source_end != source_verse:
        used_ranges.add((chapter_key, str(source_verse)))

      target_range = source_target_ranges.get(str(source_verse))
      if target_range:
        target_start, target_end = map(int, target_range)
        used_targets.add((chapter_key, str(source_verse)))
      else:
        target_start, target_end = source_verse, source_end
      if target_start < 1 or target_end < target_start:
        raise ValueError(f"중국어 대상 절 범위가 잘못됐습니다: {chapter_key} {target_start}-{target_end}")

      existing = groups_by_target.get(target_start)
      if existing:
        if existing[0] != target_end:
          raise ValueError(f"중국어 대상 절 범위가 겹칩니다: {chapter_key} {target_start}")
        groups_by_target[target_start] = (target_end, existing[1] + " " + text)
      else:
        groups_by_target[target_start] = (target_end, text)
      source_verse = source_end + 1

    mapped_chapters[book, chapter] = [
        (start, end, text)
        for start, (end, text) in sorted(groups_by_target.items())
    ]

  configured_ranges = {
      (chapter_key, start)
      for chapter_key, ranges in verse_ranges.items()
      for start in ranges
  }
  configured_targets = {
      (chapter_key, start)
      for chapter_key, ranges in target_ranges.items()
      for start in ranges
  }
  if used_ranges != configured_ranges or used_targets != configured_targets:
    raise ValueError(
        f"중국어 절 매핑표와 본문이 다릅니다: "
        f"누락 범위={sorted(configured_ranges - used_ranges)[:5]}, "
        f"미사용 범위={sorted(used_ranges - configured_ranges)[:5]}, "
        f"누락 대상={sorted(configured_targets - used_targets)[:5]}, "
        f"미사용 대상={sorted(used_targets - configured_targets)[:5]}"
    )
  return mapped_chapters


def load_chinese_numberless_file(filename):
  with open(filename, "r", encoding="utf-8-sig") as source_file:
    chapters = parse_chinese_numberless_chapters(source_file.readlines(), filename)

  expected_refs = {
      (book, chapter)
      for book, chapter_count in bible_chapter_counts.items()
      for chapter in range(1, chapter_count + 1)
  }
  if set(chapters) != expected_refs:
    missing = sorted(
        expected_refs - set(chapters), key=lambda item: (bible_book_numbers[item[0]], item[1])
    )
    extra = sorted(set(chapters) - expected_refs)
    raise ValueError(
        f"중국어 통합 파일 구성이 66권·1189장 기준과 다릅니다. "
        f"누락={missing[:5]}, 범위 밖={extra[:5]}"
    )
  return map_chinese_verse_groups(chapters)


def load_chinese_numberless_sources():
  source_dir = os.path.join(BASE_DIR, "chinese_bible")
  file_pattern = re.compile(r"cmn-cu89s_\d+_([A-Z0-9]+)_(\d+)_read\.txt")
  chapters = {}

  for filename in os.listdir(source_dir):
    match = file_pattern.fullmatch(filename)
    if not match:
      continue
    source_code, chapter_text = match.groups()
    if source_code == "000" and chapter_text == "000":
      continue
    expected_book = bible_chinese_source_codes.get(source_code)
    if not expected_book:
      raise ValueError(f"화합본 파일명의 책 코드가 목록에 없습니다: {filename}")

    source_path = os.path.join(source_dir, filename)
    with open(source_path, "r", encoding="utf-8-sig") as source_file:
      parsed = parse_chinese_numberless_chapters(source_file.readlines(), filename)
    if len(parsed) != 1:
      raise ValueError(f"장별 중국어 원본에 장이 하나가 아닙니다: {filename}")
    (book, chapter), verse_lines = next(iter(parsed.items()))
    if book != expected_book or chapter != int(chapter_text):
      raise ValueError(f"화합본 파일명 코드와 책/장이 다릅니다: {filename}")
    if (book, chapter) in chapters:
      raise ValueError(f"중국어 원본 장이 중복됐습니다: {book} {chapter}장")
    chapters[book, chapter] = verse_lines

  expected_refs = {
      (book, chapter)
      for book, chapter_count in bible_chapter_counts.items()
      for chapter in range(1, chapter_count + 1)
  }
  if set(chapters) != expected_refs:
    missing = sorted(
        expected_refs - set(chapters), key=lambda item: (bible_book_numbers[item[0]], item[1])
    )
    extra = sorted(set(chapters) - expected_refs)
    raise ValueError(f"중국어 원본 장 구성이 다릅니다. 누락={missing[:5]}, 범위 밖={extra[:5]}")
  return map_chinese_verse_groups(chapters)


def sanitize_text(text):
  if not text:
    return ""
  return text

def read_file_lines(filename):
  for enc in ["utf-8-sig", "cp949", "euc-kr"]:
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
  current_chapter = None

  for line_number, line in enumerate(lines, 1):
    line = line.strip()
    if not line:
      continue

    if ":" not in line:
      chapter_heading = re.fullmatch(r"(.+?)\s+(\d+)", line)
      if chapter_heading:
        chapter_book = get_validated_book(chapter_heading.group(1))
        if chapter_book:
          chapter = int(chapter_heading.group(2))
          if chapter < 1 or chapter > bible_chapter_counts[chapter_book]:
            raise ValueError(f"장 제목의 번호가 범위를 벗어났습니다 ({filename}:{line_number})")
          current_book = chapter_book
          current_book_id = None
          current_chapter = chapter
          continue
      validated = get_validated_book(line)
      if validated:
        current_book = validated
        current_book_id = None
        current_chapter = None
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
      current_chapter = None
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
      if current_chapter is not None and chapter != current_chapter:
        raise ValueError(
          f"장 제목과 구절 번호가 다릅니다 ({filename}:{line_number}): "
          f"{current_chapter}장 제목 아래 {chapter}:{verse}"
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


def set_js_number_property(line, property_name, value):
  pattern = re.compile(rf"(,\s*{re.escape(property_name)}\s*:\s*)\d+")
  if value is None:
    return pattern.sub(lambda match: match.group(1) + "0", line, count=1)
  if pattern.search(line):
    return pattern.sub(lambda match: match.group(1) + str(int(value)), line, count=1)
  closing_brace = line.rfind("}")
  if closing_brace < 0:
    raise ValueError(f"JS 행에 객체 닫는 괄호가 없습니다: {line.strip()}")
  return line[:closing_brace] + f", {property_name}:{int(value)}" + line[closing_brace:]


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


def iter_js_rows(lines, add_start, add_end):
  index = add_start + 1
  while index < add_end:
    if not re.search(r"\{\s*Bible\s*:", lines[index]):
      index += 1
      continue
    start = index
    if re.search(r"\}\s*,?\s*$", lines[index]):
      end = index
    else:
      end = next(
          (candidate for candidate in range(index + 1, add_end)
           if re.fullmatch(r"\s*}\s*,?\s*", lines[candidate])),
          None,
      )
      if end is None:
        raise ValueError(f"JS 행의 객체 닫는 줄을 찾지 못했습니다: {start + 1}")
    block = "".join(lines[start:end + 1])
    row = parse_js_row(block)
    if row is not None:
      yield start, end, row, block
    index = end + 1


def replace_js_row_property(lines, start, end, property_name, value, numeric=False):
  block = "".join(lines[start:end + 1])
  updated = (
      set_js_number_property(block, property_name, value)
      if numeric else replace_js_string_property(block, property_name, value)
  )
  replacement = updated.splitlines(keepends=True)
  lines[start:end + 1] = replacement
  return start, start + len(replacement) - 1


def format_js_row(data):
  lines = [
      "  {"
      + f"Bible:{json.dumps(data['Bible'], ensure_ascii=False)}, "
      + f"Chapter:{data['Chapter']}, Verse:{data['Verse']}, Page:{data['Page']},\n",
      f"    Kor:{json.dumps(data.get('Kor', ''), ensure_ascii=False)},\n",
      f"    Chn:{json.dumps(data.get('Chn', ''), ensure_ascii=False)},\n",
      f"    Eng:{json.dumps(data.get('Eng', ''), ensure_ascii=False)},\n",
  ]
  indonesian_line = f"    Ind:{json.dumps(data.get('Ind', ''), ensure_ascii=False)}"
  range_end = data.get("ChnVerseEnd")
  if range_end and range_end > data["Verse"]:
    lines.extend((indonesian_line + ",\n", f"    ChnVerseEnd:{range_end}\n"))
  else:
    lines.append(indonesian_line + "\n")
  lines.append("  },\n")
  return "".join(lines)


def reformat_existing_js_rows(dry_run=False):
  plans = []
  row_count = 0
  for book in bible_book_order:
    folder = find_existing_book_dir(book)
    for chapter in range(1, bible_chapter_counts[book] + 1):
      target_path = os.path.join(folder, f"{book}_{chapter:03d}.js")
      if not os.path.isfile(target_path):
        raise FileNotFoundError(f"기존 장 파일이 없습니다: {target_path}")
      with open(target_path, "r", encoding="utf-8") as source_file:
        original = source_file.read()
      lines = original.splitlines(keepends=True)
      add_start = next((i for i, line in enumerate(lines) if "BibleDB.add([" in line), None)
      add_end = next(
          (i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)), None
      )
      if add_start is None or add_end is None or add_end <= add_start:
        raise ValueError(f"기존 장 파일의 BibleDB.add 배열이 올바르지 않습니다: {target_path}")

      reformatted = []
      cursor = 0
      chapter_rows = 0
      for start, end, row, block in iter_js_rows(lines, add_start, add_end):
        reformatted.extend(lines[cursor:start])
        row_data = {
            "Bible": row[0],
            "Chapter": row[1],
            "Verse": row[2],
            "Page": row[3],
        }
        for field in ("Kor", "Chn", "Eng", "Ind"):
          row_data[field] = read_js_string_property(block, field)
        range_match = re.search(r"\bChnVerseEnd\s*:\s*(\d+)", block)
        if range_match:
          row_data["ChnVerseEnd"] = int(range_match.group(1))
        reformatted.append(format_js_row(row_data))
        cursor = end + 1
        chapter_rows += 1
      reformatted.extend(lines[cursor:])
      if not chapter_rows:
        raise ValueError(f"장 파일에 성경 행이 없습니다: {target_path}")
      row_count += chapter_rows
      plans.append((target_path, "".join(reformatted)))

  if not dry_run:
    for target_path, content in plans:
      with open(target_path, "w", encoding="utf-8", newline="") as target_file:
        target_file.write(content)
  action = "행 형식 검증" if dry_run else "행 형식 변경"
  print(f"{action} 완료: {len(plans)}개 장 파일, {row_count}개 절 행, 번역 내용 변경 0개")


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
    duplicate_row_spans = []
    maximum_verse = max(copy[2] for copy in copies)

    def merge_row(target_span, source_block):
      target_start, target_end = target_span
      target_block = "".join(lines[target_start:target_end + 1])
      for field in ("Kor", "Chn", "Eng", "Ind"):
        target_value = read_js_string_property(target_block, field)
        source_value = read_js_string_property(source_block, field)
        if not target_value and source_value:
          target_block = replace_js_string_property(target_block, field, source_value)
        elif target_value and source_value and target_value != source_value:
          conflicts[field] += 1
      replacement = target_block.splitlines(keepends=True)
      lines[target_start:target_end + 1] = replacement

    for start, end, row, block in iter_js_rows(lines, add_start, add_end):
      raw_row_book, row_chapter, verse, page = row
      if get_validated_book(raw_row_book) != book or row_chapter != chapter:
        raise ValueError(f"정식 파일 내부의 책/장이 잘못됐습니다: {target_path}:{start + 1}")
      updated_block = replace_js_string_property(block, "Bible", book)
      replacement = updated_block.splitlines(keepends=True)
      lines[start:end + 1] = replacement
      key = (verse, page)
      if key in row_indexes:
        merge_row(row_indexes[key], updated_block)
        duplicate_row_spans.append((start, end))
      else:
        row_indexes[key] = (start, start + len(replacement) - 1)
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

      for start, _, row, source_block in iter_js_rows(source_lines, source_start, source_end):
        raw_row_book, row_chapter, verse, page = row
        if get_validated_book(raw_row_book) != book or row_chapter != chapter:
          raise ValueError(f"중복 파일 내부의 책/장이 잘못됐습니다: {source_path}:{start + 1}")
        maximum_verse = max(maximum_verse, verse)
        key = (verse, page)
        if key not in row_indexes:
          raise ValueError(
              f"정식 파일에만 없는 고유 절이 있어 사본을 삭제하지 않았습니다: "
              f"{source_path} {book} {chapter}:{verse} page {page}"
          )
        merge_row(row_indexes[key], source_block)
      duplicate_paths.append(source_path)

    for start, end in sorted(duplicate_row_spans, reverse=True):
      del lines[start:end + 1]
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
    for start, end, row, _ in iter_js_rows(lines, add_start, add_end):
      row_book, row_chapter, verse, page = row
      if row_book != book or row_chapter != chapter:
        raise ValueError(f"파일 경로와 JS 행의 성경/장이 다릅니다: {source_path}:{start + 1}")
      rows_by_verse.setdefault(verse, []).append((start, end, page))

    new_rows = []
    for verse, korean_text in sorted(verses.items()):
      existing_rows = rows_by_verse.get(verse, [])
      if existing_rows:
        target_start, target_end, _ = min(
            existing_rows, key=lambda item: (item[2] != 1, item[2])
        )
        replace_js_row_property(lines, target_start, target_end, "Kor", korean_text)
        for start, end, _ in existing_rows:
          if start != target_start:
            replace_js_row_property(lines, start, end, "Kor", "")
      else:
        new_rows.append(format_js_row({
            "Bible": book,
            "Chapter": chapter,
            "Verse": verse,
            "Page": 1,
            "Kor": korean_text,
            "Chn": "",
            "Eng": "",
            "Ind": "",
        }))

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


def export_chinese_to_existing_files(chinese_chapters=None, dry_run=False):
  if chinese_chapters is None:
    chinese_chapters = load_chinese_numberless_sources()
  plans = []
  group_count = 0
  range_count = 0

  for (book, chapter), verse_groups in sorted(
      chinese_chapters.items(), key=lambda item: (bible_book_numbers[item[0][0]], item[0][1])
  ):
    target_path = os.path.join(
        find_existing_book_dir(book), f"{book}_{chapter:03d}.js"
    )
    if not os.path.isfile(target_path):
      raise FileNotFoundError(f"기존 장 파일이 없어 새로 만들지 않았습니다: {target_path}")

    with open(target_path, "r", encoding="utf-8") as target_file:
      original = target_file.read()
    ref_match = re.search(
        r'BibleDB\.ref\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*\d+\s*\)',
        original,
    )
    if not ref_match or ref_match.group(1) != book or int(ref_match.group(2)) != chapter:
      raise ValueError(f"기존 장 파일의 책/장 정보가 다릅니다: {target_path}")

    lines = original.splitlines(keepends=True)
    add_start = next((i for i, line in enumerate(lines) if "BibleDB.add([" in line), None)
    add_end = next(
        (i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)), None
    )
    if add_start is None or add_end is None or add_end <= add_start:
      raise ValueError(f"기존 장 파일의 BibleDB.add 배열이 올바르지 않습니다: {target_path}")

    rows_by_verse = {}
    for start, end, row, _ in iter_js_rows(lines, add_start, add_end):
      row_book, row_chapter, verse, page = row
      if row_book != book or row_chapter != chapter:
        raise ValueError(f"기존 행의 책/장이 다릅니다: {target_path}:{start + 1}")
      rows_by_verse.setdefault(verse, []).append((start, end, page))

    updated_lines = list(lines)
    for verse, verse_end, chinese_text in verse_groups:
      if verse_end < verse:
        raise ValueError(f"중국어 절 범위가 잘못됐습니다: {book} {chapter}:{verse}-{verse_end}")
      page_one_rows = [
          (start, end) for start, end, page in rows_by_verse.get(verse, []) if page == 1
      ]
      if len(page_one_rows) != 1:
        raise ValueError(f"기존 절 행이 하나가 아닙니다: {target_path} {chapter}:{verse}")
      for covered_verse in range(verse, verse_end + 1):
        covered_rows = [
            start for start, _, page in rows_by_verse.get(covered_verse, []) if page == 1
        ]
        if len(covered_rows) != 1:
          raise ValueError(
              f"중국어 범위의 대상 절 행이 하나가 아닙니다: "
              f"{target_path} {chapter}:{covered_verse}"
          )
        start, end = page_one_rows[0]
        replace_js_row_property(updated_lines, start, end, "Chn", chinese_text)
        replace_js_row_property(
          updated_lines, start, end, "ChnVerseEnd",
          verse_end if verse_end > verse else None, numeric=True
      )
      group_count += 1
      range_count += verse_end > verse
    plans.append((target_path, "".join(updated_lines)))

  if not dry_run:
    for target_path, content in plans:
      with open(target_path, "w", encoding="utf-8", newline="") as target_file:
        target_file.write(content)

  action = "중국어 반영" if not dry_run else "중국어 사전 검증"
  print(
      f"{action} 완료: {len(plans)}개 기존 장 파일, {group_count}개 중국어 본문 그룹, "
      f"그중 절 범위 그룹 {range_count}개, 새 파일 생성 0개"
  )


def export_indonesian_to_existing_files(db, dry_run=False):
  chapter_groups = {}
  for data in db.values():
    book = get_validated_book(data["Bible"])
    if not book:
      continue
    key = (book, data["Chapter"])
    chapter_groups.setdefault(key, {})[data["Verse"]] = data.get("Ind", "")

  expected_chapters = {
      (book, chapter)
      for book, chapter_count in bible_chapter_counts.items()
      for chapter in range(1, chapter_count + 1)
  }
  if set(chapter_groups) != expected_chapters:
    missing = sorted(expected_chapters - set(chapter_groups))
    extra = sorted(set(chapter_groups) - expected_chapters)
    raise ValueError(
        f"인도네시아어 원본 장 구성이 66권 기준과 다릅니다: "
        f"누락={missing[:5]}, 범위 밖={extra[:5]}"
    )

  verse_overrides = {
      ("2Corinthians", 13): {12: 12, 13: 12, 14: 13},
  }
  for key, overrides in verse_overrides.items():
    source_verses = chapter_groups.get(key, {})
    if not set(overrides).issubset(source_verses):
      raise ValueError(f"인도네시아어 절 번호 예외가 원본과 다릅니다: {key}")
    mapped_verses = {}
    for source_verse, text in source_verses.items():
      target_verse = overrides.get(source_verse, source_verse)
      mapped_verses[target_verse] = (
          mapped_verses[target_verse] + " " + text
          if target_verse in mapped_verses else text
      )
    chapter_groups[key] = mapped_verses

  plans = []
  verse_count = 0
  for (book, chapter), verses in sorted(
      chapter_groups.items(), key=lambda item: (bible_book_numbers[item[0][0]], item[0][1])
  ):
    target_path = os.path.join(
        find_existing_book_dir(book), f"{book}_{chapter:03d}.js"
    )
    if not os.path.isfile(target_path):
      raise FileNotFoundError(f"기존 장 파일이 없어 새로 만들지 않았습니다: {target_path}")

    with open(target_path, "r", encoding="utf-8") as target_file:
      original = target_file.read()
    ref_match = re.search(
        r'BibleDB\.ref\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*\d+\s*\)',
        original,
    )
    if not ref_match or ref_match.group(1) != book or int(ref_match.group(2)) != chapter:
      raise ValueError(f"기존 장 파일의 책/장 정보가 다릅니다: {target_path}")

    lines = original.splitlines(keepends=True)
    add_start = next((i for i, line in enumerate(lines) if "BibleDB.add([" in line), None)
    add_end = next(
        (i for i, line in enumerate(lines) if re.match(r"\s*\]\);\s*$", line)), None
    )
    if add_start is None or add_end is None or add_end <= add_start:
      raise ValueError(f"기존 장 파일의 BibleDB.add 배열이 올바르지 않습니다: {target_path}")

    rows_by_verse = {}
    for start, end, row, _ in iter_js_rows(lines, add_start, add_end):
      row_book, row_chapter, verse, page = row
      if row_book != book or row_chapter != chapter:
        raise ValueError(f"기존 행의 책/장이 다릅니다: {target_path}:{start + 1}")
      rows_by_verse.setdefault(verse, []).append((start, end, page))

    updated_lines = list(lines)
    for verse, indonesian_text in sorted(verses.items()):
      page_one_rows = [
          (start, end) for start, end, page in rows_by_verse.get(verse, []) if page == 1
      ]
      if len(page_one_rows) != 1:
        raise ValueError(f"기존 절 행이 하나가 아닙니다: {target_path} {chapter}:{verse}")
      start, end = page_one_rows[0]
      replace_js_row_property(updated_lines, start, end, "Ind", indonesian_text)
      verse_count += 1
    plans.append((target_path, "".join(updated_lines)))

  if not dry_run:
    for target_path, content in plans:
      with open(target_path, "w", encoding="utf-8", newline="") as target_file:
        target_file.write(content)

  action = "인도네시아어 반영" if not dry_run else "인도네시아어 사전 검증"
  print(
      f"{action} 완료: {len(plans)}개 기존 장 파일, {verse_count}개 절, 새 파일 생성 0개"
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
      js_content += format_js_row(data)

    js_content += "]);\n"

    with open(file_path, "w", encoding="utf-8") as f:
      f.write(js_content)

    print(f"생성/덮어쓰기 완료: {file_path}")

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument(
      "--chinese-source",
      help="책 이름·장 번호·절별 줄이 들어 있는 중국어 통합 파일 경로",
  )
  parser.add_argument(
      "--indonesian-source",
      help="인도네시아어 파일 경로 (예: BibleData_Ind.txt)",
  )
  parser.add_argument(
      "--dry-run-indonesian",
      action="store_true",
      help="인도네시아어 절 매핑만 검증하고 파일은 변경하지 않습니다",
  )
  parser.add_argument(
      "--format-language-rows",
      action="store_true",
      help="기존 장 파일의 언어별 문자열을 여러 줄 형식으로 재배치합니다",
  )
  args = parser.parse_args()

  if args.format_language_rows:
    reformat_existing_js_rows()
    raise SystemExit(0)

  if args.indonesian_source:
    indonesian_source = args.indonesian_source
    if not os.path.isabs(indonesian_source):
      indonesian_source = os.path.join(BASE_DIR, indonesian_source)
    indonesian_database = {}
    load_and_update_bible(indonesian_source, "Ind", db=indonesian_database)
    export_indonesian_to_existing_files(
        indonesian_database, dry_run=args.dry_run_indonesian
    )
    print("모든 작업이 완료되었습니다!")
    raise SystemExit(0)
  if args.dry_run_indonesian:
    parser.error("--dry-run-indonesian은 --indonesian-source와 함께 사용해야 합니다.")

  load_and_update_bible(os.path.join(BASE_DIR, "BibleData_Kor.txt"), "Kor")

  print("\n--- 기존 장 파일의 한글 본문 갱신 시작 ---")
  export_korean_to_existing_files(bible_database)
  print("\n--- 책/장 번호 전수 정리 및 중복 파일 제거 시작 ---")
  repair_duplicate_chapter_files()

  if args.chinese_source:
    chinese_source = args.chinese_source
    if not os.path.isabs(chinese_source):
      chinese_source = os.path.join(BASE_DIR, chinese_source)
    print("\n--- 통합 화합본 중국어 갱신 시작 ---")
    export_chinese_to_existing_files(load_chinese_numberless_file(chinese_source))
  else:
    print("중국어 통합 파일을 지정하지 않아 중국어 본문은 갱신하지 않았습니다.")

  print("모든 작업이 완료되었습니다!")