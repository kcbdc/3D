CREATE TABLE IF NOT EXISTS game_saves(user_id TEXT PRIMARY KEY,save_data TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

-- 아래 두 테이블은 login.js/ranking.js에서 이미 참조하고 있었지만 이 schema.sql엔 빠져있었음
-- (배포 시 테이블이 없으면 두 API가 전부 실패했을 것). 커뮤니티/로그인 기반 작업을 위해 정리.
-- provider/provider_user_id: 소셜로그인(카카오/네이버/구글) 지원을 위해 추가. 기존 이메일
-- 로그인은 provider='email', provider_user_id=이메일 주소로 취급. 소셜 로그인은 각 서비스가
-- 이메일을 안 줄 수도 있어(특히 카카오) email은 nullable로 변경.
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_user_id TEXT,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT '조폐 히어로',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  UNIQUE(provider, provider_user_id)
);
CREATE TABLE IF NOT EXISTS rankings(
  user_id TEXT PRIMARY KEY,
  score INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  harvest INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- 소셜로그인 콜백이 발급하는 1회용 단기 토큰. 프론트엔드가 이 토큰을 즉시 실제 계정 정보로
-- 교환하고 나면 바로 삭제됨(재사용 불가) -- 로그인 완료 URL에 사용자 ID를 그대로 노출하지
-- 않기 위한 장치.
CREATE TABLE IF NOT EXISTS login_tokens(
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 1:1 쪽지 (전체 커뮤니티 채팅과 완전히 분리된 별도 테이블)
CREATE TABLE IF NOT EXISTS direct_messages(
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  FOREIGN KEY(sender_id) REFERENCES users(id),
  FOREIGN KEY(recipient_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_dm_recipient_unread ON direct_messages(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_dm_thread ON direct_messages(sender_id, recipient_id, created_at);

-- 즐겨찾기 (연락처 탭 상단 고정 표시용). 최근 대화 목록은 별도 테이블 없이 direct_messages에서
-- 바로 도출합니다 (대화가 곧 그 자체로 '최근 기록'이라 중복 상태를 따로 관리할 필요가 없음).
CREATE TABLE IF NOT EXISTS favorites(
  user_id TEXT NOT NULL,
  favorite_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, favorite_user_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(favorite_user_id) REFERENCES users(id)
);

-- 친구 응원하기 (하루 1회, 친구당). claimed=0인 응원은 받는 사람의 다음 하트비트에서
-- 전달(우편함 지급)되고 claimed=1로 표시됨.
CREATE TABLE IF NOT EXISTS cheers(
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  claimed INTEGER DEFAULT 0,
  FOREIGN KEY(sender_id) REFERENCES users(id),
  FOREIGN KEY(recipient_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_cheers_recipient_unclaimed ON cheers(recipient_id, claimed);

-- AI(Cloudflare Workers AI)로 생성한 본부 미션 저장. 기존 game-systems.js의 정적 미션 풀을
-- 대체하지 않고 보충하는 용도 -- 클라이언트가 이 테이블에서 가져온 미션과 정적 미션을 섞어 사용.
CREATE TABLE IF NOT EXISTS ai_missions(
  id TEXT PRIMARY KEY,
  node TEXT NOT NULL,
  title TEXT NOT NULL,
  spec TEXT NOT NULL,
  rule_idx INTEGER,
  options_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_missions_node ON ai_missions(node);

-- 안드로이드 앱(FCM)이 발급받은 푸시 토큰 저장소. 토큰 자체를 기본키로 써서, 같은 기기에서
-- 다른 계정으로 로그인하면 소유자(user_id)만 갱신되도록 한다 (기기당 여러 행이 쌓이지 않음).
-- 한 계정이 여러 기기(폰 교체 등)를 갖는 것은 자연스럽게 허용됨 -- user_id는 UNIQUE가 아님.
CREATE TABLE IF NOT EXISTS push_tokens(
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);