# KOMSCO Weekend Farm City — 2.5D Isometric Edition

첨부된 캐릭터·건물·상점·다리·차량·환경 턴어라운드 자료의 색감과 구성을 참고하여,
기존 Three.js 3D 게임을 **3D 느낌이 강한 2D 아이소메트릭 캔버스 게임**으로 전환한 소스입니다.

## 핵심 구조

- Canvas 2D 아이소메트릭 렌더링
- 레고시티 풍의 절차형 도시 스케치
- 고화질 투명 PNG 캐릭터 컷아웃
- 연결된 순환도로·인도·강·다리
- 본부 업무 → 골드 → 씨앗 구매 → 밭 심기 → 성장 → 수확
- 키보드, 마우스, 모바일 조이스틱 지원
- 깊이감 있는 건물 프리즘, 그림자, 이동 차량·배, 환경 애니메이션
- 로컬 저장 및 Cloudflare Pages Functions 서버시간 API

## 실행

별도 빌드가 필요 없는 정적 프로젝트입니다.

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

GitHub Pages나 Cloudflare Pages에서는 프로젝트 파일을 그대로 배포하면 됩니다.

## 조작

- PC: WASD / 방향키 이동, Shift 달리기, E 또는 Enter 상호작용
- 모바일: 좌측 조이스틱, 우측 달리기, 중앙 상호작용 버튼
- 마우스 휠: 화면 배율
- 마우스 드래그: 카메라 이동

## Cloudflare Pages

- Framework preset: None
- Build command: 비워 둠
- Build output directory: `/`
- Functions는 `/functions/api/time.js`가 자동으로 `/api/time`으로 연결됩니다.

## 백엔드(Functions) 구조

```
functions/api/_lib/     ← 공용 헬퍼 전용 폴더. 이름이 _로 시작해서 라우팅 대상이 아님.
  db.js                    D1 접근 (requireDB, json)
  ai.js                    Workers AI 호출 (runChat, requireAI)
  moderation.js            욕설/부적절 콘텐츠 검열 (moderateText)
  social-auth.js           소셜로그인 공용 로직 (redirectToApp, upsertSocialUserAndIssueToken)

functions/api/*.js       ← 실제 라우트. _lib은 "./_lib/파일명.js"로 import
functions/api/*/*.js     ← 하위 폴더(auth/, dm/, favorites/, presence/, users/, admin/)의 라우트.
                            _lib은 "../_lib/파일명.js"로 import
```

**새 API 파일을 추가할 때 지켜야 할 규칙 (딱 이거 하나만 기억하면 됨):**
- `functions/api/` 바로 밑에 파일을 만든다 → `_lib` 참조는 `"./_lib/xxx.js"`
- `functions/api/어떤폴더/` 안에 파일을 만든다 → `_lib` 참조는 `"../_lib/xxx.js"`
- 공용 헬퍼를 새로 추가할 땐 반드시 `functions/api/_lib/` 안에만 만들 것 (다른 곳에 만들면 의도치 않게 실제 라우트(`/api/xxx`)로 노출됨)
- 기존 헬퍼 파일을 복사해서 새 라우트를 만들 때, import 경로도 반드시 새 파일 위치 기준으로 다시 계산할 것 (복붙 후 경로 그대로 두는 실수가 실제로 배포 실패를 일으킨 적 있음)

## 참고

도시 객체는 첨부된 턴어라운드 자료를 직접 복사한 것이 아니라, 동일한 블록형·레고시티 분위기를
Canvas 도형과 아이소메트릭 투영으로 재구성한 것입니다. 캐릭터는 이전 단계에서 분리한 고해상도 PNG 컷아웃을 사용합니다.
