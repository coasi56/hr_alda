# HR알다 프로젝트 전체 설계 계획

## Context
HR 담당자가 30명 이하 팀을 위한 Slack 연동 HR 자동화 시스템을 처음부터 구축한다.
개발 경험이 없는 사용자와 함께 단계별로 진행하며, Render.com 무료 플랜에 배포한다.
5가지 기능을 우선순위 순서대로 개발한다.

---

## 1. 폴더/파일 구조

```
hr-alda/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express 앱 진입점
│   │   ├── server.js                 # HTTP 서버 시작
│   │   ├── config/
│   │   │   ├── database.js           # PostgreSQL 연결 설정
│   │   │   ├── slack.js              # Slack Bolt 앱 초기화
│   │   │   └── google.js             # Google API 클라이언트 초기화
│   │   ├── routes/
│   │   │   ├── auth.js               # POST /api/auth/login, /logout
│   │   │   ├── alda.js               # GET/POST /api/alda/...
│   │   │   ├── members.js            # GET/POST /api/members/...
│   │   │   ├── birthday.js           # GET/POST /api/birthday/...
│   │   │   ├── notice.js             # GET/POST /api/notice/...
│   │   │   ├── onboarding.js         # GET/POST /api/onboarding/...
│   │   │   ├── calendar.js           # GET/POST /api/calendar/...
│   │   │   └── settings.js           # GET/PUT /api/settings/...
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── aldaController.js
│   │   │   ├── memberController.js
│   │   │   ├── birthdayController.js
│   │   │   ├── noticeController.js
│   │   │   ├── onboardingController.js
│   │   │   └── calendarController.js
│   │   ├── services/
│   │   │   ├── aldaService.js        # 이모지 집계, 한도 체크, DM 발송
│   │   │   ├── birthdayService.js    # 생일/기념일 감지, 메시지 발송
│   │   │   ├── noticeService.js      # 공지 예약, Block Kit 빌더
│   │   │   ├── onboardingService.js  # 온보딩 단계 실행
│   │   │   ├── googleSheetsService.js # 스프레드시트 동기화
│   │   │   └── googleCalendarService.js # 캘린더 이벤트 생성
│   │   ├── slack/
│   │   │   ├── listeners/
│   │   │   │   ├── reactionAdded.js  # 이모지 리액션 감지
│   │   │   │   └── reactionRemoved.js
│   │   │   └── commands/
│   │   │       ├── aldaCheck.js      # /alda_check
│   │   │       ├── aldaBoard.js      # /alda_board
│   │   │       ├── aldaLeft.js       # /alda_left
│   │   │       └── notice.js         # /notice
│   │   ├── schedulers/
│   │   │   ├── index.js              # 전체 스케줄러 등록
│   │   │   ├── aldaReset.js          # 매주 월요일 00:00 KST 한도 리셋
│   │   │   ├── birthdayCheck.js      # 매일 생일/기념일 체크 및 발송
│   │   │   ├── noticeDispatch.js     # 예약 공지 발송 (매분 체크)
│   │   │   └── onboardingDispatch.js # 온보딩 DM 발송 (매분 체크)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT 검증
│   │   │   └── errorHandler.js       # 전역 에러 핸들러
│   │   └── db/
│   │       ├── schema.sql            # 전체 테이블 DDL
│   │       └── seed.sql              # 초기 관리자 계정 시드
│   ├── package.json
│   ├── .env.example
│   └── Procfile                      # Render.com 배포용
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                   # 라우터 설정
│   │   ├── api/
│   │   │   └── client.js             # axios 인스턴스 + JWT 인터셉터
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx         # 메인 요약 대시보드
│   │   │   ├── AldaPage.jsx          # 알다 인정 관리
│   │   │   ├── BirthdayPage.jsx      # 생일/기념일 관리
│   │   │   ├── NoticePage.jsx        # 공지 예약 관리
│   │   │   ├── OnboardingPage.jsx    # 온보딩 관리
│   │   │   ├── CalendarPage.jsx      # 캘린더 연동
│   │   │   └── SettingsPage.jsx      # 환경 설정
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Header.jsx
│   │   │   ├── alda/
│   │   │   │   ├── AldaChart.jsx     # Chart.js 그래프
│   │   │   │   ├── AldaTable.jsx     # 이력 테이블
│   │   │   │   └── AldaFilter.jsx    # 날짜/유형 필터
│   │   │   ├── birthday/
│   │   │   │   ├── BirthdayCalendar.jsx
│   │   │   │   └── TemplateEditor.jsx
│   │   │   ├── notice/
│   │   │   │   └── NoticeEditor.jsx  # Block Kit 편집기
│   │   │   └── onboarding/
│   │   │       └── OnboardingTimeline.jsx
│   │   └── hooks/
│   │       ├── useAuth.js
│   │       └── useApi.js
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
└── README.md
```

---

## 2. 데이터베이스 테이블 설계

### 관리자 계정
```sql
-- 관리자 계정 (최대 3명)
CREATE TABLE admins (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt 해시
  name        VARCHAR(100),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 공통: 구성원
```sql
-- 구글 스프레드시트에서 동기화된 구성원 데이터
CREATE TABLE members (
  id              SERIAL PRIMARY KEY,
  slack_user_id   VARCHAR(50) UNIQUE,       -- Slack User ID (U12345...)
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255),
  department      VARCHAR(100),
  birth_date      DATE,                     -- 생일 (연도 없이 저장 가능: 1990-03-15)
  join_date       DATE,                     -- 입사일
  is_active       BOOLEAN DEFAULT TRUE,
  synced_at       TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 기능 1: 알다 인정/칭찬 시스템
```sql
-- 이모지 리액션 이력 (원본 데이터)
CREATE TABLE alda_reactions (
  id              SERIAL PRIMARY KEY,
  from_slack_id   VARCHAR(50) NOT NULL,     -- 리액션 누른 사람
  to_slack_id     VARCHAR(50) NOT NULL,     -- 리액션 받은 사람
  emoji           VARCHAR(50) NOT NULL,     -- 알다-칭찬, 알다-신뢰, 알다-주도성, 알다-원팀
  message_ts      VARCHAR(50),             -- Slack 메시지 타임스탬프
  channel_id      VARCHAR(50),
  is_valid        BOOLEAN DEFAULT TRUE,    -- 자기 리액션 시 FALSE
  week_start      DATE NOT NULL,           -- 해당 주 월요일 (집계용)
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 주간 발송 한도 추적
CREATE TABLE alda_weekly_limits (
  id              SERIAL PRIMARY KEY,
  slack_user_id   VARCHAR(50) NOT NULL,
  week_start      DATE NOT NULL,           -- 해당 주 월요일
  sent_count      INTEGER DEFAULT 0,
  UNIQUE(slack_user_id, week_start)
);

-- 관리자 설정
CREATE TABLE alda_settings (
  id                    SERIAL PRIMARY KEY,
  weekly_limit          INTEGER DEFAULT 10,
  dm_notification_on    BOOLEAN DEFAULT FALSE,
  dm_notification_time  TIME DEFAULT '09:00', -- KST 기준 발송 시간
  updated_at            TIMESTAMP DEFAULT NOW()
);
```

### 기능 2: 생일/입사기념일 축하
```sql
-- 메시지 템플릿 (생일 공개/DM, 기념일 공개/DM 각 타입)
CREATE TABLE birthday_templates (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(30) NOT NULL,  -- birthday_public, birthday_dm, anniversary_public, anniversary_dm
  content       TEXT NOT NULL,         -- {{이름}}, {{생일}}, {{입사일}}, {{연차}}, {{부서}} 변수 포함
  is_active     BOOLEAN DEFAULT TRUE,
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 발송 이력
CREATE TABLE birthday_logs (
  id              SERIAL PRIMARY KEY,
  member_id       INTEGER REFERENCES members(id),
  type            VARCHAR(30) NOT NULL,  -- birthday / anniversary
  channel_id      VARCHAR(50),           -- 공개 메시지 발송 채널
  scheduled_date  DATE NOT NULL,         -- 실제 발송 예정일 (주말/공휴일 조정 후)
  sent_at         TIMESTAMP,
  status          VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  year            INTEGER NOT NULL       -- 대상 연도
);

-- 공휴일 등록
CREATE TABLE holidays (
  id          SERIAL PRIMARY KEY,
  date        DATE UNIQUE NOT NULL,
  name        VARCHAR(100),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 생일/기념일 발송 설정
CREATE TABLE birthday_settings (
  id                    SERIAL PRIMARY KEY,
  send_time             TIME DEFAULT '09:00', -- KST
  public_channel_id     VARCHAR(50),           -- 축하 메시지 발송 채널
  updated_at            TIMESTAMP DEFAULT NOW()
);
```

### 기능 3: Slack 공지 예약 발송
```sql
-- 공지 (예약 포함)
CREATE TABLE notices (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255),              -- 관리자용 내부 제목
  channel_id      VARCHAR(50) NOT NULL,
  blocks          JSONB NOT NULL,            -- Slack Block Kit JSON
  scheduled_at    TIMESTAMP NOT NULL,        -- 발송 예약 시간 (UTC)
  status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled, sent, cancelled, failed
  created_by      INTEGER REFERENCES admins(id),
  sent_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 기능 4: 온보딩 자동화
```sql
-- 온보딩 프로그램 템플릿
CREATE TABLE onboarding_programs (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 프로그램별 단계 템플릿 (Day 1, Day 3, Day 7 등)
CREATE TABLE onboarding_steps (
  id              SERIAL PRIMARY KEY,
  program_id      INTEGER REFERENCES onboarding_programs(id),
  step_order      INTEGER NOT NULL,
  day_offset      INTEGER NOT NULL,     -- 입사 후 N일째 발송
  recipient_type  VARCHAR(10) NOT NULL, -- 'new_hire' 또는 'buddy'
  content         TEXT NOT NULL,        -- {{이름}}, {{버디이름}} 등 변수
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 실행 중인 온보딩 인스턴스
CREATE TABLE onboarding_instances (
  id              SERIAL PRIMARY KEY,
  member_id       INTEGER REFERENCES members(id),
  buddy_member_id INTEGER REFERENCES members(id),
  program_id      INTEGER REFERENCES onboarding_programs(id),
  start_date      DATE NOT NULL,        -- 입사일 기준
  status          VARCHAR(20) DEFAULT 'active', -- active, completed, stopped
  created_at      TIMESTAMP DEFAULT NOW()
);

-- 온보딩 DM 발송 이력
CREATE TABLE onboarding_logs (
  id              SERIAL PRIMARY KEY,
  instance_id     INTEGER REFERENCES onboarding_instances(id),
  step_id         INTEGER REFERENCES onboarding_steps(id),
  slack_user_id   VARCHAR(50) NOT NULL,
  scheduled_at    TIMESTAMP NOT NULL,
  sent_at         TIMESTAMP,
  status          VARCHAR(20) DEFAULT 'pending' -- pending, sent, failed, skipped
);
```

### 기능 5: 구글 캘린더 연동
```sql
-- 캘린더 이벤트 이력
CREATE TABLE calendar_events (
  id                  SERIAL PRIMARY KEY,
  google_event_id     VARCHAR(255),             -- Google Calendar 이벤트 ID
  title               VARCHAR(255) NOT NULL,
  event_date          DATE NOT NULL,
  attendees           JSONB,                    -- 참석자 이메일 배열
  source_type         VARCHAR(30),              -- birthday, anniversary, onboarding, manual
  source_id           INTEGER,                  -- 원본 레코드 ID
  created_at          TIMESTAMP DEFAULT NOW()
);

-- 구글 연동 설정
CREATE TABLE google_settings (
  id                      SERIAL PRIMARY KEY,
  calendar_id             VARCHAR(255),
  spreadsheet_id          VARCHAR(255),
  spreadsheet_range       VARCHAR(100) DEFAULT 'Sheet1!A:Z',
  last_synced_at          TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT NOW()
);
```

---

## 3. 개발 순서 및 작업 목록

### Phase 0: 프로젝트 초기 세팅 (첫 번째 세션)
- [ ] `hr-alda/` 루트 디렉토리 생성
- [ ] `backend/` — Node.js + Express 기본 구조 생성, `package.json` 초기화
- [ ] `frontend/` — Vite + React 프로젝트 생성
- [ ] `backend/src/db/schema.sql` — 전체 테이블 DDL 작성
- [ ] `.env.example` — 환경변수 목록 작성
- [ ] `README.md` — 로컬 실행 방법 작성

### Phase 1: 인증 시스템 + 관리자 대시보드 기반
- [ ] PostgreSQL 연결 설정 (`config/database.js`)
- [ ] 관리자 로그인 API (`POST /api/auth/login`) + JWT 발급
- [ ] JWT 검증 미들웨어
- [ ] 초기 관리자 계정 시드 스크립트 (`db/seed.sql`)
- [ ] React 로그인 페이지 + Sidebar/Header 레이아웃
- [ ] axios 클라이언트 (토큰 자동 첨부)

### Phase 2: 기능 1 — 알다 인정/칭찬 시스템 ⭐ 최우선
- [ ] Slack Bolt 앱 초기화 (`config/slack.js`)
- [ ] 이모지 리액션 감지 리스너 (`slack/listeners/reactionAdded.js`)
  - 자기 리액션 무효 처리 + DM 안내
  - 주간 한도(10개) 체크 및 차단
  - `alda_reactions` 테이블 저장
- [ ] 주간 한도 리셋 스케줄러 (매주 월요일 00:00 KST)
- [ ] 슬래시 커맨드 3개: `/alda_check`, `/alda_board`, `/alda_left`
- [ ] DM 알림 스케줄러 (관리자 설정 시간에 일괄 발송)
- [ ] 알다 관리자 API (`routes/alda.js`)
  - 이력 조회 (날짜/유형 필터)
  - 상위 수신자 통계
  - 설정 조회/수정 (주간 한도, DM 알림 시간)
- [ ] 알다 대시보드 페이지 (`AldaPage.jsx`)
  - Chart.js 막대/원형 그래프
  - 이력 테이블 + 필터
  - Excel 다운로드 (exceljs)
  - 설정 패널

### Phase 3: 기능 2 — 생일/입사기념일 축하
- [ ] Google Sheets API 연동 (`services/googleSheetsService.js`)
- [ ] [불러오기] 버튼 → 구성원 DB 동기화 API
- [ ] 공휴일 등록 API + UI
- [ ] 주말/공휴일 → 직전 영업일 계산 로직
- [ ] 생일/기념일 체크 스케줄러 (매일 실행)
  - 오늘 대상자 감지
  - 공개 채널 축하 메시지 발송
  - 당사자 DM 복리후생 안내
- [ ] 메시지 템플릿 관리 API + UI (변수 치환 미리보기 포함)
- [ ] 생일 대시보드 (`BirthdayPage.jsx`)
  - 월별 캘린더 뷰
  - 발송 이력 테이블

### Phase 4: 기능 3 — Slack 공지 예약 발송
- [ ] Slack Block Kit 기반 공지 저장 API
- [ ] 공지 예약 발송 스케줄러 (매분 체크)
- [ ] `/notice` 슬래시 커맨드 (Slack Modal로 작성)
- [ ] 공지 대시보드 (`NoticePage.jsx`)
  - 텍스트/이미지/버튼 편집기
  - 예약 목록, 수정/취소 기능

### Phase 5: 기능 4 — 온보딩 자동화
- [ ] 온보딩 프로그램/단계 CRUD API
- [ ] 온보딩 인스턴스 생성 (수동 등록 / 구글 스프레드시트 신규 행 감지)
- [ ] 온보딩 DM 발송 스케줄러
- [ ] 온보딩 대시보드 (`OnboardingPage.jsx`)
  - 진행 현황 타임라인
  - 중단 기능

### Phase 6: 기능 5 — 구글 캘린더 연동
- [ ] Google Calendar API 연동 (`services/googleCalendarService.js`)
- [ ] 이벤트 생성 + 참석자 초대 API
- [ ] 생일/온보딩 등록 시 '캘린더 등록' 체크박스 연동
- [ ] 캘린더 대시보드 (`CalendarPage.jsx`)

### Phase 7: 배포
- [ ] `Procfile` 작성 (Render.com용)
- [ ] 프론트엔드 빌드 → 백엔드에서 정적 파일 서빙 또는 별도 서비스
- [ ] Render.com PostgreSQL 데이터베이스 생성
- [ ] 환경변수 설정 (Render 대시보드)
- [ ] Slack 앱 설정 (Event Subscriptions, Slash Commands URL 업데이트)

---

## 4. 필요한 환경변수 목록

```env
# ── 서버 ──────────────────────────────────────
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://hr-alda.onrender.com

# ── 데이터베이스 ──────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/hr_alda

# ── JWT 인증 ──────────────────────────────────
JWT_SECRET=랜덤-비밀키-32자-이상
JWT_EXPIRES_IN=7d

# ── Slack ─────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-...        # Bot User OAuth Token
SLACK_SIGNING_SECRET=...        # Slack App Signing Secret
SLACK_APP_TOKEN=xapp-...        # Socket Mode App-Level Token (개발용)

# ── Google ────────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL=hr-alda@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_CALENDAR_ID=primary

# ── 초기 관리자 계정 (seed.sql 실행용) ──────────
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=초기비밀번호
```

---

## 5. 핵심 기술 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| Slack 연결 방식 | HTTP (Event Subscriptions) | Render.com은 Socket Mode 장기 연결 불안정 |
| 시간대 | 스케줄러는 UTC 기준 변환, 표시는 KST | node-cron은 서버 시간 기준 |
| 프론트 배포 | 백엔드와 같은 Render 서비스에서 정적 파일 서빙 | 무료 플랜 서비스 수 절약 |
| DB ORM | 없음 (node-postgres `pg` 직접 사용) | 의존성 최소화, 명확한 SQL |
| 비밀번호 | bcrypt 해시 | JWT와 함께 표준 보안 방식 |

---

## 6. 검증 방법

1. **로컬 테스트**: `docker-compose up`으로 PostgreSQL 실행 → 백엔드 `npm run dev` → 프론트 `npm run dev`
2. **Slack 로컬 테스트**: ngrok으로 로컬 포트를 공개 URL로 노출 → Slack 앱 Event URL 임시 설정
3. **Phase별 완료 기준**:
   - Phase 2: Slack에서 이모지 달면 DB에 기록되고 `/alda_check`로 확인 가능
   - Phase 3: 테스트 구성원 생일 날짜를 오늘로 설정 → 스케줄러 수동 트리거 → Slack 메시지 확인
   - Phase 7: Render 배포 후 실제 Slack 워크스페이스에서 전체 기능 동작 확인
