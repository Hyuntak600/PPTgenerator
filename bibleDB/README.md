# 성경 데이터베이스

- `bibledb.js` : 66권 목록 + 장 파일 읽기 (수정 불필요)
- `01_Genesis/` ... `66_Revelation/` : 책별 폴더, 그 안에 장별 파일 (`Genesis_001.js`)
- `chinese_verse_map.json` : 중국어 원본의 절 범위와 한국어 기준 절 번호 차이 매핑
- 장 파일 한 줄 형식:

```js
	{Bible:"John", Chapter:3, Verse:16, Page:1,
		Kor:"한국어 본문",
		Chn:"中文正文",
		Eng:"English text",
		Ind:"Teks Indonesia"
	},
```

한 절이 길어 슬라이드를 나눌 때는 `Page`를 2, 3...으로 올려 줄을 추가합니다.

중국어 원문이 여러 절을 한 묶음으로 제공하는 경우 본문은 시작 절 행에 한 번 저장하고, `ChnVerseEnd`에 포함되는 마지막 절 번호를 저장합니다. 원문에 없는 절 경계를 임의로 만들지 않습니다.

인도네시아어 파일은 `Genesis 1` 같은 책·장 제목과 `1:1` 같은 절 번호를 사용합니다. `bibleDB` 폴더에서 아래 명령으로 절 대응을 먼저 확인한 뒤, dry-run 옵션을 빼고 실행하면 `Ind` 필드만 갱신됩니다.

```powershell
python export_bible_js.py --indonesian-source BibleData_Ind.txt --dry-run-indonesian
python export_bible_js.py --indonesian-source BibleData_Ind.txt
```

기존 장 파일 행을 언어별 여러 줄 형식으로 재배치하려면 `bibleDB` 폴더에서 `python export_bible_js.py --format-language-rows`를 실행합니다. 번역 필드 값은 변경하지 않습니다.
