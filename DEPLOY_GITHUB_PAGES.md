# GitHub Pages 배포 절차

1. 기존 저장소의 `/public` 폴더만 교체하는 방식은 중단합니다.
2. 이 프로젝트의 전체 파일을 저장소 루트에 업로드합니다.
3. GitHub `Settings → Pages`에서 Source를 `GitHub Actions`로 설정합니다.
4. Actions 탭에서 `Deploy Vite site to GitHub Pages`가 성공했는지 확인합니다.
5. 접속 주소는 `https://kcbdc.github.io/3D/`입니다. `/public/`을 붙이지 않습니다.

## 로컬 확인

```bash
npm install
npm run dev
```

## 오류 확인

- `npm run build`가 성공해야 합니다.
- GitHub Actions 로그에서 Vite build가 성공해야 합니다.
- 브라우저 개발자도구 Network에서 `assets/*.js`와 `assets/models/*.glb`가 200이어야 합니다.
