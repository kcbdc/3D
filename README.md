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
