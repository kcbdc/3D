# KOMSCO Farm Universe — Vite + Three.js

브라우저에서 `three` 패키지명을 직접 해석하지 못해 발생하던 오류를 제거하기 위해 Vite 번들 구조로 재구성한 프로젝트입니다.

## 로컬 테스트

Node.js 20 이상에서 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 표시된 주소(기본 `http://localhost:5173`)로 접속합니다.

프로덕션 빌드 확인:

```bash
npm run build
npm run preview
```

`dist/` 폴더가 실제 배포 대상입니다. 저장소의 `src` 폴더를 GitHub Pages에 직접 공개하지 마십시오.

## GitHub Pages 자동 배포

1. 프로젝트 전체를 GitHub 저장소 루트에 업로드합니다.
2. 저장소 기본 브랜치를 `main`으로 둡니다.
3. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 설정합니다.
4. `main` 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 `dist`를 생성해 배포합니다.

저장소가 `https://github.com/kcbdc/3D`라면 배포 주소는 일반적으로 다음과 같습니다.

```text
https://kcbdc.github.io/3D/
```

기존처럼 `/3D/public/`로 접속하지 않습니다.

## 수동 배포

```bash
npm install
npm run build
```

생성된 `dist` 폴더의 내용만 Pages 배포 브랜치 또는 호스팅 서비스에 올립니다.

## 폴더 구조

```text
├─ index.html
├─ src/main.js
├─ public/assets/models/*.glb
├─ cloudflare/
├─ vite.config.js
└─ .github/workflows/deploy-pages.yml
```

## Cloudflare 백엔드

`cloudflare` 폴더는 Workers + D1 백엔드 골격입니다. GitHub Pages는 정적 호스팅이므로 `/api/save`를 제공하지 않습니다. 현재 게임은 GitHub Pages에서 `localStorage`로 저장하고, Workers 배포 환경에서는 API 저장 기능을 연결할 수 있습니다.

## 문제 확인

빌드 후 아래 파일이 존재해야 합니다.

```text
dist/index.html
dist/assets/*.js
dist/assets/models/hunmin.glb
```


## Cloudflare Pages Functions
- `functions/api/test.js`
- `functions/api/save.js`
- `functions/api/load.js`
- `functions/api/ranking.js`

자세한 배포 절차는 `CLOUDFLARE_SETUP.md`를 참조하세요.

## 2026 UI/UX 고도화 적용사항
- 자연스러운 연속형 강·하천 제방·교량·순환 도로·인도 재배치
- 3인칭 가속/감속 이동, 달리기, 카메라 추적 및 충돌 보정
- GLB 애니메이션 클립 자동 탐색·재생, 미포함 모델은 보행 바운스 보정
- 모바일 HUD, 접이식 퀘스트, 미니맵·나침반·거리 안내
- 첫 사용자 튜토리얼, 코스튬 색상/모자, 가방·지도·설정 UI
- 서버시간 API(`/api/time`)를 이용한 농작물 심기 시각 기준
- 저사양/고품질 렌더링 선택 및 모바일 자동 최적화

### 정식 서비스 전 추가 권장
현재 버전은 상용화 전 단계의 고도화 프로토타입입니다. 원본 GLB에 실제 스켈레톤/걷기·달리기 애니메이션이 있어야 완전한 리깅 애니메이션이 작동합니다. 정식 운영에서는 NavMesh 생성 도구, 사용자별 인증 토큰, 서버 측 재화 검증, KTX2/Meshopt 변환 파이프라인과 모델별 LOD 제작을 별도 적용하는 것을 권장합니다.

## 2026 UI/UX 고도화 반영 사항

- 연속형 강·제방·도로·인도·교량 월드 재배치
- 3인칭 카메라, 가속·감속, 달리기, 건물 충돌 보정
- GLB 애니메이션 자동 탐색 및 무애니메이션 모델 보행 보정
- 미니맵, 거리 기반 상호작용, 튜토리얼, 반응형 모바일 HUD
- 업무→골드→씨앗 구매→재배→수확 게임 루프
- 코스튬 색상·모자, 가방, 지도, 그래픽 설정
- Cloudflare Pages Functions `/api/time` 기반 식물 심기 시각 기록

### 정식 서비스 전 추가 권장

현재 GLB에 스켈레톤 애니메이션 클립이 없다면 코드 기반 보행 보정만 적용됩니다. 완전한 상용 품질을 위해서는 리깅된 Idle/Walk/Run 애니메이션, NavMesh 베이크, 사용자 인증, 서버 권한 검증, LOD 모델 제작, KTX2 텍스처 및 Meshopt/Draco 압축 파이프라인이 필요합니다.
