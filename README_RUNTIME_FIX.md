# 런타임 오류 완전 수정판

## 확인된 실제 원인

이전 성능 최적화 과정에서 정규식 치환 범위가 넓게 적용되어 다음 함수가 `game.js`에서 삭제되었습니다.

- `drawPlayer()`
- `isMoving()`
- `update()`

첫 렌더링 프레임에서 `drawPlayer is not defined` 또는 `update is not defined` 오류가 발생했으며,
전역 오류 처리 화면에는 브라우저 보안 정책 때문에 `Script error.`만 표시될 수 있었습니다.

## 수정 사항

- 누락된 세 함수 복원
- 캐릭터 렌더링과 이동 업데이트 정상화
- 오래된 저장 데이터 검증 및 자동 초기화
- HTML 요소가 누락되어도 전체 실행이 중단되지 않도록 모바일 버튼 바인딩 보강
- 오류 발생 시 스택·파일명·줄·열 번호 표시
- 서비스워커 캐시 버전 전면 갱신
- HTML·JS·CSS Network First 및 no-store 요청 적용
