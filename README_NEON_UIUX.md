# KOMSCO Neon Farm City — UI/UX 고도화본

## 디자인 방향

변경 전 시안의 야간 네온 도시와 시네마틱 게임 로비 스타일을 기반으로 다음을 반영했습니다.

- 고대 캐릭터와 미래형 도시가 결합된 K-퓨처리즘 분위기
- 네온 간판, 야간 수로, 고층 빌딩 조명, 황금색 액션 버튼
- 캐릭터 선택 화면을 세로형 영웅 카드 방식으로 재설계
- 상단 프로필·레벨·재화·미션·랭킹·도감·설정 UI
- 좌측 퀘스트 패널과 우측 우편·이벤트 메뉴
- 하단 게임형 내비게이션과 강조된 상호작용 버튼
- 모바일 조이스틱 및 RUN 버튼 유지
- 기존 업무→씨앗구매→재배→수확 게임 루프 유지

## 배포 구조

```text
index.html
style.css
game.js
public/
├─ assets/
│  ├─ characters/
│  └─ ui/design_concept.png
functions/
```

## GitHub Pages

- Branch: main
- Folder: /(root)
- 별도 빌드 없음

## Cloudflare Pages

- Framework preset: None
- Build command: 비워 둠
- Build output directory: /
