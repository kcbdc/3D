# KOMSCO Farm Universe 3D

Three.js와 실제 GLB 모델을 사용하는 재구성형 프로토타입입니다.

## 구현 범위
- 연결된 순환형 도로·인도, 연속형 강과 제방, 2개 다리
- 5개 본부의 GLB 건물과 입구 접근형 상호작용
- 훈민·다임·순식 GLB 아바타 선택 및 3인칭 이동
- 회사 업무 → 골드 → 씨앗 구매 → 주말농장 재배·수확 루프
- 모바일 조이스틱, 드래그 카메라, 미니맵, 반응형 HUD
- 저사양 자동 품질 조정, 픽셀비율·그림자·오브젝트 수 최적화
- Cloudflare Workers + D1 저장 API 골격

## 로컬 실행
정적 파일은 ES Module과 GLB를 사용하므로 파일 더블클릭이 아니라 로컬 서버로 실행해야 합니다.

```bash
npm install
npm run dev
```

## Cloudflare 배포
1. `npx wrangler d1 create komsco-farm-universe`
2. 출력된 database_id를 `wrangler.toml`에 입력
3. `npm run db:init`
4. `npm run deploy`

## 상용화 전 추가 필요
- 사용자 인증 및 슬롯별 사용자 ID 연동
- 실제 서버 기준 성장시간 검증과 치팅 방지
- GLB 애니메이션 리깅 및 코스튬 파츠 표준화
- 충돌 메시/NavMesh, NPC·차량 AI, 사운드, 접근성
- 모델 LOD·KTX2 텍스처·Meshopt/Draco 압축
- 개인정보 처리방침, 운영자 도구, 로그·분석·장애 대응
