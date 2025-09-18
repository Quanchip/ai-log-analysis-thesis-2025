1. User Registration Flow (POST /auth/users)

  Client Request → router.py:43 → UserService.create_user() → 
  service.py:23
                            ↓
  Password hashed with bcrypt → User saved to database → User 
  object returned

2. Login Flow (POST /auth/token)

  Client sends username/password → router.py:49 →
  UserService.login_for_access_token()
                            ↓
  service.py:48 → authenticate_user() → service.py:40
                            ↓
  Query database for user → Verify password with bcrypt →
  service.py:44
                            ↓
  If valid → create_access_token() → service.py:56
                            ↓
  JWT created with: {sub: username, id: user_id, exp: 
  expiration} → Return token

3. Protected Endpoint Access (GET /auth/user)

  Client sends: Authorization: Bearer <token> → router.py:33
                            ↓
  get_current_user_dependency() → router.py:14 → oauth2_bearer
  extracts token
                            ↓
  UserService.get_current_user() → service.py:73
  ↓
  decode_token() → service.py:62 → JWT decoded and validated
  ↓
  Extract username & user_id from payload → Return user data