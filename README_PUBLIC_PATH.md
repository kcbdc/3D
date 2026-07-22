# 캐릭터 이미지 public 경로 수정본

캐릭터 이미지 기준 경로를 다음과 같이 변경했습니다.

```javascript
const CHARACTER_BASE_URL = "./public/assets/characters/";
```

적용 위치:

- 게임 캔버스 캐릭터 이미지 선로딩
- 캐릭터 선택 카드 이미지
- 이미지 로딩 실패 콘솔 진단

필수 배포 구조:

```text
index.html
style.css
game.js
public/
└─ assets/
   └─ characters/
      ├─ hunmin.png
      ├─ daim.png
      └─ sunsik.png
```

GitHub Pages 주소가 `/3D/`이면 실제 이미지 주소는 다음 형태입니다.

```text
https://kcbdc.github.io/3D/public/assets/characters/hunmin.png
```

배포 후 강력 새로고침하거나 주소 뒤에 캐시 무효화 쿼리를 붙여 확인하세요.
