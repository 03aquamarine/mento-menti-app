# 멘토-멘티 매칭 플랫폼

전문가와 함께 성장할 수 있는 멘토-멘티 매칭 서비스입니다.

## � 프로젝트 구조

```
mentor-mentee-platform/
├── backend/                 # Express.js 백엔드 서버
│   ├── config/             # 설정 파일들
│   ├── middleware/         # 미들웨어
│   ├── models/             # 데이터베이스 모델
│   ├── routes/             # API 라우트
│   ├── uploads/            # 업로드된 파일들
│   ├── .env               # 환경 변수
│   ├── server.js          # 서버 진입점
│   └── package.json       # 백엔드 의존성
├── frontend/               # React 프론트엔드
│   ├── src/               # 소스 코드
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 페이지 컴포넌트
│   │   └── services/      # API 서비스
│   ├── public/            # 정적 파일들
│   ├── index.html         # HTML 템플릿
│   ├── vite.config.js     # Vite 설정
│   └── package.json       # 프론트엔드 의존성
├── .vscode/               # VS Code 설정
├── mentor-mentee-*.md     # 요구사항 및 명세 문서
└── README.md
```

## �🚀 기능

### 사용자 관리

- 회원가입 및 로그인 (JWT 인증)
- 프로필 관리 (이미지 업로드 포함)
- 멘토/멘티 역할 선택

### 멘토링 매칭

- 스킬 기반 멘토 검색 및 필터링
- 멘토링 요청 생성 및 관리
- 매칭 요청 수락/거절 시스템

### API 문서

- Swagger/OpenAPI 통합 문서화
- 실시간 API 테스트 가능

## 🛠 기술 스택

### Backend

- **Node.js** + **Express.js**
- **SQLite** (Sequelize ORM)
- **JWT** 인증
- **Swagger** API 문서화
- **Sharp** 이미지 처리

### Frontend

- **React 18**
- **Vite** 빌드 도구
- **React Router** 라우팅
- **CSS3** 스타일링
- **Context API** 상태 관리

## 📋 요구사항

- Node.js 18+
- npm 또는 yarn

## 🚀 설치 및 실행

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd mentor-mentee-platform
```

### 2. 백엔드 설정 및 실행

```bash
cd backend
npm install
cp .env.example .env  # 환경변수 설정
npm run dev
```

백엔드 서버가 `http://localhost:8080`에서 실행됩니다.

### 3. 프론트엔드 설정 및 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드 서버가 `http://localhost:3000`에서 실행됩니다.

### 4. VS Code에서 실행 (권장)

VS Code의 Command Palette (`Cmd+Shift+P`)에서:
- `Tasks: Run Task` → `Start Both Servers` 선택

또는 개별 실행:
- `Start Backend Server`: 백엔드만 실행
- `Start Frontend Server`: 프론트엔드만 실행
# 백엔드 의존성 설치
cd backend
npm install

# 프론트엔드 의존성 설치
cd ..
npm install
```

### 2. 환경 변수 설정

백엔드 폴더에 `.env` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
DB_STORAGE=database.sqlite
CORS_ORIGIN=http://localhost:5173
```

### 3. 서버 실행

#### 백엔드 서버 실행 (포트 3001)

```bash
cd backend
npm run dev
```

#### 프론트엔드 서버 실행 (포트 5173)

```bash
# 새 터미널에서
npm run dev
```

### 4. 브라우저에서 확인

- **프론트엔드**: http://localhost:5173
- **API 문서**: http://localhost:3001/api-docs
- **백엔드 상태**: http://localhost:3001/health

## 📁 프로젝트 구조

```
├── backend/
│   ├── config/         # 설정 파일 (Swagger 등)
│   ├── middleware/     # 인증 미들웨어
│   ├── models/         # 데이터베이스 모델
│   ├── routes/         # API 라우트
│   ├── uploads/        # 업로드 파일 저장소
│   ├── .env           # 환경 변수
│   ├── server.js      # 메인 서버 파일
│   └── package.json
├── src/
│   ├── components/     # React 컴포넌트
│   ├── contexts/       # Context API (상태 관리)
│   ├── pages/          # 페이지 컴포넌트
│   ├── services/       # API 서비스
│   └── App.jsx
├── public/
└── package.json
```

## 📖 API 엔드포인트

### 인증

- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

### 사용자

- `GET /api/users/profile` - 내 프로필 조회
- `PUT /api/users/profile` - 프로필 업데이트
- `POST /api/users/profile/image` - 프로필 이미지 업로드
- `GET /api/users/mentors` - 멘토 목록 조회
- `GET /api/users/:id` - 특정 사용자 조회

### 매칭

- `POST /api/matching/requests` - 매칭 요청 생성
- `GET /api/matching/requests` - 매칭 요청 목록 조회
- `PUT /api/matching/requests/:id/respond` - 매칭 요청 응답
- `DELETE /api/matching/requests/:id` - 매칭 요청 취소

자세한 API 문서는 http://localhost:3001/api-docs 에서 확인하세요.

## 🎯 사용 방법

1. **회원가입**: 멘토 또는 멘티로 가입
2. **프로필 설정**: 스킬, 경험, 자기소개 등록
3. **멘토 검색**: (멘티) 스킬별 멘토 검색 및 매칭 요청
4. **요청 관리**: (멘토) 받은 요청 수락/거절 처리
5. **매칭 확인**: 성공적인 매칭 관리

## 🔧 개발 정보

### VSCode 작업 설정

`.vscode/tasks.json`에 미리 설정된 작업들:

- `Start Backend Server`: 백엔드 서버 시작
- `Start Frontend Server`: 프론트엔드 서버 시작

### 데이터베이스

SQLite 데이터베이스가 자동으로 생성되며, 서버 시작 시 테이블이 자동 생성됩니다.

### 파일 업로드

프로필 이미지는 `backend/uploads/profiles/` 폴더에 저장됩니다.

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 📞 지원

문제가 있거나 질문이 있으시면 이슈를 생성해 주세요.

## 🔒 보안 강화

이 애플리케이션은 OWASP Top 10을 기반으로 다음과 같은 보안 기능이 구현되어 있습니다:

### 인증 및 권한 관리
- **JWT 토큰**: RFC 7519 표준 준수, 1시간 유효기간
- **비밀번호 정책**: 최소 8자, 대소문자/숫자 조합 필수
- **Role-based Access Control**: 멘토/멘티 역할별 접근 제어

### 입력 검증 및 데이터 보호
- **XSS 방어**: 모든 사용자 입력 sanitization
- **SQL 인젝션 방어**: Sequelize ORM 파라미터화 쿼리
- **입력 길이 제한**: 모든 필드별 적절한 길이 제한
- **파일 업로드 보안**: 이미지 형식/크기 검증

### 네트워크 보안
- **Rate Limiting**: API 호출 횟수 제한 (일반: 100회/분, 인증: 5회/분)
- **CORS 정책**: 특정 도메인에서만 접근 허용
- **Security Headers**: Helmet.js를 통한 보안 헤더 설정
- **Content Security Policy**: XSS 공격 방어

### 에러 처리
- **정보 노출 방지**: 프로덕션에서 상세 에러 정보 숨김
- **구조화된 에러 응답**: 일관된 에러 메시지 형식
- **로깅**: 보안 이벤트 모니터링

## 📦 배포 정보

현재 이 프로젝트는 로컬 개발 환경에서만 지원됩니다. 배포를 원하시면, 다음 단계를 참고하세요:

1. **환경 설정**: 프로덕션용 환경 변수를 설정합니다.
2. **데이터베이스 마이그레이션**: 프로덕션 데이터베이스에 테이블을 생성합니다.
3. **정적 파일 서빙**: 프론트엔드 빌드 파일을 서빙할 웹 서버를 설정합니다.
4. **모니터링 및 로깅**: 프로덕션 환경의 로그를 모니터링하고, 이상 징후를 탐지합니다.

자세한 배포 가이드는 추후 제공될 예정입니다.
