# Cloudflare D1 설정

## 1. D1 데이터베이스 생성

Cloudflare Dashboard에서 다음 순서로 이동합니다.

```text
Storage & Databases
→ D1 SQL Database
→ Create database
```

데이터베이스 이름:

```text
komsco-game
```

## 2. 스키마 실행

생성한 D1 데이터베이스의 Console에서 루트의 `schema.sql` 내용을 실행합니다.

## 3. Pages 프로젝트 Binding

```text
Workers & Pages
→ 해당 Pages 프로젝트
→ Settings
→ Bindings
→ Add binding
→ D1 database
```

Binding name:

```text
DB
```

Database:

```text
komsco-game
```

Preview와 Production에 모두 설정하는 것을 권장합니다.

## 4. wrangler.toml

`wrangler.toml`의 다음 값을 실제 D1 ID로 교체합니다.

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
preview_database_id = "REPLACE_WITH_YOUR_D1_PREVIEW_DATABASE_ID"
```

Pages 대시보드에서 Binding을 직접 설정하는 경우에도 `binding = "DB"` 이름은 동일해야 합니다.

## 5. API 주소

```text
POST /api/login
POST /api/save
GET  /api/load?userId=...
GET  /api/ranking
GET  /api/time
```
