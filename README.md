# KOMSCO 네온시티 낮·밤 자동 전환 및 모바일 가로 고정판

## Cloudflare Pages

- Framework preset: None
- Build command: 비워 둠
- Build output directory: `/`
- D1 Binding: `DB`

## 시간 기준

- 06:00~17:59: `world_final_day.jpg`
- 18:00~05:59: `world_final.jpg`

## 이동

보이는 청색 유도선과 실제 이동 판정은 `src/config/world-data.js`의 동일한 노드·간선 데이터를 사용합니다.

## 모바일 가로 화면

PWA manifest, Screen Orientation API, 세로 화면 CSS 회전을 함께 적용했습니다.
