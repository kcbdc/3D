# KOMSCO 2.5D 게임 — No-Module 오류 수정본

이 버전은 ES Module을 사용하지 않습니다.

## 핵심 확인사항

- `game.js`에 `import` 또는 `export` 문이 없습니다.
- `index.html`은 아래와 같이 일반 스크립트로 실행합니다.

```html
<script defer src="./game.js?v=20260723-nomodule"></script>
```

- npm, Vite, 빌드 과정이 필요 없습니다.
- ZIP 내부 파일을 기존 GitHub/Cloudflare 배포 폴더에 **전체 덮어쓰기**해야 합니다.
- 예전 `src`, `dist`, `main.js`, `public` 폴더와 섞지 마세요.

## GitHub Pages

저장소 루트에 다음 항목이 보여야 합니다.

```text
index.html
style.css
game.js
assets/
functions/
```

Pages 설정:

```text
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

## Cloudflare Pages

```text
Framework preset: None
Build command: 비워 둠
Build output directory: /
```

배포 후 브라우저에서 `Ctrl + F5` 또는 주소 뒤에 `?v=20260723`을 붙여 접속하세요.
