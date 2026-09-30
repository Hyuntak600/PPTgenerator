# 성경 데이터베이스

- `bibledb.js` : 66권 목록 + 장 파일 읽기 (수정 불필요)
- `01_Genesis/` ... `66_Revelation/` : 책별 폴더, 그 안에 장별 파일 (`Genesis_001.js`)
- 장 파일 한 줄 형식:

```js
{Bible:"John",Chapter:3,Verse:16,Page:1,Kor:"",Chn:"",Eng:"",Ind:""},
```

한 절이 길어 슬라이드를 나눌 때는 `Page`를 2, 3...으로 올려 줄을 추가합니다.
