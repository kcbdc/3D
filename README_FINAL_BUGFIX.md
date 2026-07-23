# KOMSCO 네온시티 최종 버그 수정본

## 수정된 오류

- 캐릭터가 반투명하게 보이던 문제 수정
- 캐릭터 이미지에 남아 있던 카드형 배경 제거
- 도시 배경에 박혀 있던 캐릭터 2명 제거
- 배경에 포함돼 있던 기존 상단·하단 HUD 제거
- 공중에 떠다니던 NPC 캐릭터 렌더링 완전 중단
- 과거 저장 데이터로 캐릭터가 이동 불가 영역에서 시작하던 문제 보정
- 캐릭터는 도로·인도·다리에서만 이동
- 건물과 강 통과 불가
- 서비스워커 캐시 버전 갱신

## 실행 구조

```text
index.html
style.css
game.js
public/
├─ assets/
│  ├─ characters_fixed/
│  └─ ui/city_neon_world_final_clean.jpg
functions/
manifest.webmanifest
sw.js
```

별도 npm 또는 Vite 빌드가 필요 없습니다.

## 배포 후 확인

주소 뒤에 다음 값을 붙여 캐시 없이 확인하세요.

```text
?v=20260723-bugfix-final
```

이동 충돌 영역 확인:

```text
?debug=1&v=20260723-bugfix-final
```
