**Vanilla Notion (vanillanotion.io)**

간단한, 클라이언트 사이드 Notion 스타일 프로토타입입니다. 순수 Vanilla JavaScript, HTML, CSS 만으로 구현되었고 모든 데이터는 브라우저의 `localStorage`에 저장됩니다.

**주요 목적**: 교육용/프로토타입 목적의 경량 노트 앱으로, 문서 트리 관리, 에디터, 툴바, 즐겨찾기, 휴지통, 퀵서치, 테마 등 Notion의 핵심 UX 패턴을 재현합니다.

**핵심 특징**

- **로컬 퍼시스턴스**: 모든 문서·설정은 `localStorage`에 저장됩니다.
- **반응형 UI**: 데스크톱에서 모바일(최소 320px)까지 대응하도록 설계되었습니다.
- **문서 트리**: 중첩 문서(하위 페이지) 관리, 드래그 앤 드롭(일부 기능은 미세 조정 필요)
- **에디터 및 툴바**: 기본 서식(굵게/기울임/코드/목록/인용 등)
- **즐겨찾기 / 휴지통 / 퀵서치**: 문서 빠른 접근 및 복원 기능
- **테마**: 라이트 / 다크 / 자동(시스템 우선) 지원, 로컬에 저장

---

**빠른 시작**

- 파일 직접 열기: 브라우저에서 `index.html` 또는 `app.html`을 열어 확인할 수 있습니다.
- 로컬 서버 (권장): 프로젝트 루트에서 간단한 HTTP 서버로 서빙하세요.

  - Python 3 (간단):

    ```bash
    python3 -m http.server 8000
    # 브라우저에서 http://localhost:8000 열기
    ```

  - VS Code: `Live Server` 확장 사용 가능.

브라우저 요구사항: 최신 Chromium 계열, Firefox, Safari 등 현대 브라우저(ES6+) 권장.

---

**테스트 계정 (개발용)**

- 이 저장소에는 로컬 개발 편의를 위해 기본 테스트 계정이 자동으로 시드됩니다.
- 계정 정보:

  - 이메일: `test@gmail.com`
  - 비밀번호: `1541`

- 동작 방식: 페이지 로드 시 `js/seed-users.js`가 실행되어 `localStorage`의 `vnotion:users` 배열을 확인하고, 동일 이메일이 없으면 테스트 계정을 추가합니다. 이미 존재하면 중복으로 추가되지 않습니다.
- 제거/재시드: 테스트 계정을 제거하려면 개발자 도구에서 `localStorage`의 `vnotion:users` 값을 수정하거나 삭제하면 됩니다. (예: Chrome DevTools → Application → Local Storage)

> 보안 주의: 이 계정은 로컬 개발용입니다.

**프로젝트 구조 (요약)**

- `index.html` — 홈페이지(랜딩 페이지)
- `app.html` — 메인 애플리케이션(문서 편집기 및 사이드바)
- `login.html`, `signup.html`, `forgot-password.html` — 인증 관련 UI(로컬 스토리지 기반 시뮬레이션)
- `css/` — 스타일시트 디렉터리
  - `app.css` — 메인 앱 스타일 (사이드바, navbar, editor 등)
  - `home.css`, `login.css`, `signup.css`, `forgot-password.css` — 각 페이지 전용 스타일
- `js/` — 클라이언트 로직
  - `app.js` — 애플리케이션 상태, 문서 CRUD, 렌더링, 사이드바 토글 등 핵심 로직
  - `home.js`, `login.js`, `signup.js`, `forgot-password.js` — 각 페이지 전용 스크립트
- `README.md` — 이 파일

---

**구현 노트 / 동작 방식**

- 문서 및 사용자 상태는 `localStorage`에 JSON으로 저장됩니다. (스토리지 키 접두사: `vnotion:user:`)
- 테마는 `localStorage`의 `vnotion:theme` 키로 보관됩니다.
- 반응형 브레이크포인트는 `app.css`에 정의되어 있으며, 매우 작은 화면(320px 수준)까지 폴백 스타일이 준비되어 있습니다.
