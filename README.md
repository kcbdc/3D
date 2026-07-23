# KOMSCO Neon Farm City — 표준 구조판

기존 정적 게임 실행 호환성을 유지하면서 소스 구조와 Cloudflare D1 API를 정리한 버전입니다.

## 실행

별도 빌드 없이 정적 서버에서 실행할 수 있습니다.

```bash
python -m http.server 8080
```

Cloudflare Pages:

```text
Framework preset: None
Build command: 비워 둠
Build output directory: /
```

## 중요

- 브라우저 실행 진입점은 루트 `index.html`과 `game.js`입니다.
- `src/`는 향후 게임 로직을 단계적으로 분리하기 위한 모듈형 소스 구조입니다.
- DB 연결은 `functions/api/db.js`, `wrangler.toml`, Cloudflare Pages Binding에서 관리합니다.
- Binding 이름은 반드시 `DB`입니다.
