CREATE TABLE IF NOT EXISTS game_saves(user_id TEXT PRIMARY KEY,save_data TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

-- 아래 두 테이블은 login.js/ranking.js에서 이미 참조하고 있었지만 이 schema.sql엔 빠져있었음
-- (배포 시 테이블이 없으면 두 API가 전부 실패했을 것). 커뮤니티/로그인 기반 작업을 위해 정리.
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL DEFAULT '조폐 히어로',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
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