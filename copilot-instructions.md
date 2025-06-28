# 멘토-멘티 매칭 앱 개발 가이드

이 문서는 GitHub Copilot을 사용한 멘토-멘티 매칭 앱 개발에 대한 상세 가이드입니다.

## 📋 프로젝트 개요

### 목적
멘토와 멘티를 매칭해주는 웹 애플리케이션 개발

### 핵심 기능
- 회원가입/로그인 (JWT 인증)
- 프로필 관리 (이미지 업로드 포함)
- 멘토 검색 및 필터링
- 매칭 요청/수락/거절/취소
- 1:1 매칭 제약

### 기술 스택
- **Backend**: Express.js + SQLite + Sequelize
- **Frontend**: React + Vite + Context API
- **Authentication**: JWT (RFC 7519)
- **Documentation**: Swagger UI
- **Security**: Helmet, Rate Limiting, XSS Protection

## 🏗️ 아키텍처

### 폴더 구조
```
backend/
├── config/swagger.js          # Swagger 설정
├── middleware/
│   ├── auth.js               # JWT 인증
│   └── security.js           # 보안 미들웨어
├── models/index.js           # DB 모델 (User, MatchingRequest)
├── routes/
│   ├── auth.js              # 인증 API
│   ├── api.js               # 일반 API
│   └── matching-new.js      # 매칭 API
└── server.js                # 서버 진입점

frontend/
├── src/
│   ├── components/Navbar.jsx
│   ├── contexts/AuthContext.jsx
│   ├── pages/               # 각 페이지 컴포넌트
│   ├── services/api.js      # API 클라이언트
│   └── App.jsx
└── vite.config.js
```

### 데이터베이스 스키마

#### User 모델
```javascript
{
  id: INTEGER (PK, AUTO_INCREMENT),
  email: STRING (UNIQUE, NOT NULL),
  password: STRING (NOT NULL, HASHED),
  name: STRING (NOT NULL),
  role: ENUM('mentor', 'mentee'),
  profileImage: STRING (filename),
  bio: TEXT,
  skills: TEXT (JSON array),
  experience: INTEGER (멘토만),
  hourlyRate: DECIMAL (멘토만),
  isActive: BOOLEAN,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### MatchingRequest 모델
```javascript
{
  id: INTEGER (PK, AUTO_INCREMENT),
  menteeId: INTEGER (FK -> User.id),
  mentorId: INTEGER (FK -> User.id),
  message: TEXT,
  status: ENUM('pending', 'accepted', 'rejected'),
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

## 🔒 보안 구현

### 인증 시스템
- JWT 토큰: RFC 7519 클레임 (iss, sub, aud, exp, nbf, iat, jti)
- 비밀번호: bcrypt 해싱 (salt rounds: 12)
- 토큰 유효기간: 1시간

### 입력 검증
```javascript
// Joi 스키마 예시
const signupSchema = Joi.object({
  email: Joi.string().email().min(5).max(254).required(),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  name: Joi.string().min(1).max(100)
    .pattern(/^[a-zA-Z가-힣\s]+$/).required(),
  role: Joi.string().valid('mentor', 'mentee').required()
});
```

### 보안 미들웨어
- Rate Limiting: 분당 API 호출 제한
- XSS Protection: 모든 입력 데이터 sanitization
- Helmet: 보안 헤더 설정
- CORS: 허용된 도메인만 접근

## 🌐 API 설계

### 인증 API
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인

### 사용자 API
- `GET /api/me` - 내 정보 조회
- `PUT /api/profile` - 프로필 수정
- `GET /api/mentors` - 멘토 목록 (필터링/정렬)
- `GET /api/images/:role/:id` - 프로필 이미지

### 매칭 API
- `POST /api/match-requests` - 매칭 요청
- `GET /api/match-requests/outgoing` - 보낸 요청 목록
- `GET /api/match-requests/incoming` - 받은 요청 목록
- `PUT /api/match-requests/:id/accept` - 요청 수락
- `PUT /api/match-requests/:id/reject` - 요청 거절
- `DELETE /api/match-requests/:id` - 요청 취소

### 응답 형식
```javascript
// 성공 응답
{
  "id": 1,
  "profile": { /* 프로필 데이터 */ }
}

// 에러 응답
{
  "error": "Error message",
  "details": ["Validation error details"]
}
```

## 🎨 프론트엔드 구현

### 상태 관리 (AuthContext)
```javascript
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 로그인, 로그아웃, 토큰 검증 로직
};
```

### 페이지 구성
- `/` - 홈페이지
- `/login` - 로그인
- `/register` - 회원가입
- `/profile` - 프로필 관리
- `/mentors` - 멘토 목록 (멘티만)
- `/requests` - 매칭 요청 관리

### 테스트 속성
UI 테스트를 위한 속성 패턴:
- `id="component-name"` - 주요 컴포넌트
- `className="test-specific-class"` - 스타일과 무관한 테스트 클래스
- `data-testid="action-name"` - 특정 액션 요소

## 🧪 테스트 전략

### API 테스트
1. Swagger UI 사용 (http://localhost:8080/api-docs)
2. 순서: 회원가입 → 로그인 → 토큰 설정 → API 호출

### 시나리오 테스트
1. **멘토 등록**: 회원가입 → 프로필 설정 → 기술 스택 입력
2. **멘티 등록**: 회원가입 → 프로필 설정
3. **매칭 요청**: 멘티로 로그인 → 멘토 검색 → 요청 전송
4. **요청 처리**: 멘토로 로그인 → 요청 확인 → 수락/거절
5. **매칭 제약**: 한 멘토가 요청 수락 시 다른 요청 자동 거절 확인

### 보안 테스트
- 인증 없이 보호된 API 접근 시도
- 다른 사용자의 데이터 접근 시도
- XSS 공격 시도 (스크립트 태그 입력)
- Rate Limiting 테스트 (연속 요청)

## 🚀 배포 고려사항

### 환경 변수
```bash
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
CORS_ORIGIN=<production-domain>
```

### 프로덕션 최적화
- 데이터베이스 연결 풀 설정
- 로그 레벨 조정 (에러만)
- 압축 미들웨어 추가
- HTTPS 리다이렉트

## 🔧 개발 팁

### GitHub Copilot 활용
1. **함수 시그니처 작성** 후 구현 요청
2. **주석으로 의도 명시** 후 코드 생성
3. **에러 핸들링** 패턴 일관성 유지
4. **보안 관련 코드**는 반드시 검토

### 코드 품질
- ESLint/Prettier 설정 활용
- 컴포넌트 단위로 분리
- API 에러 처리 일관성
- 로딩 상태 표시

### 디버깅
- 브라우저 개발자 도구 Network 탭 활용
- 백엔드 콘솔 로그 확인
- JWT 토큰 유효성 검증 (jwt.io)
- Swagger UI로 API 직접 테스트

## 📝 문서화

### 필수 문서
- API 명세 (Swagger 자동 생성)
- 사용자 스토리
- 보안 정책
- 배포 가이드

### 코드 주석
- 복잡한 비즈니스 로직 설명
- 보안 관련 처리 설명
- API 응답 형식 문서화
- 에러 상황별 처리 방법

이 가이드를 참고하여 일관성 있고 안전한 코드를 작성하세요.
