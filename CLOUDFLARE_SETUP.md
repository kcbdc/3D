# Cloudflare Pages + D1 배포

## Pages 생성
1. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git
2. GitHub 저장소 선택
3. Framework preset: Vite
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Root directory: 비움
7. Save and Deploy

## Pages Functions 확인
배포 뒤 `https://프로젝트.pages.dev/api/test` 접속.

## D1 생성 및 테이블 적용
1. Storage & Databases → D1 → Create database
2. 이름 예: `komsco-game-db`
3. D1 콘솔에서 `cloudflare/schema.sql` 전체 실행

## Pages에 D1 바인딩
Pages 프로젝트 → Settings → Bindings → Add → D1 database
- Variable name: `DB`
- Database: `komsco-game-db`

바인딩 후 새 배포를 실행해야 적용됩니다.

## API
- GET `/api/test`
- POST `/api/save`
- GET `/api/load?userId=...`
- GET `/api/ranking`
