# Authentication Flow - Sequence Diagrams (Mermaid)

This document contains Mermaid sequence diagrams for the authentication flow.
You can view these in GitHub, VS Code with Mermaid extension, or online at https://mermaid.live/

---

## 1. User Registration Flow

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Service as UserService
    participant DB as Database (Postgres)

    Client->>Router: POST /auth/users<br/>{username, email, password}
    Router->>Service: create_user(user_data)
    Service->>Service: Hash password (bcrypt)
    Service->>DB: INSERT INTO users<br/>(username, email, password,<br/>role='user', created_at=NOW())
    DB-->>Service: User created<br/>{id, username, email, role}
    Service-->>Router: User object
    Router-->>Client: 201 Created<br/>{username, email}
    Note over Client: Store user info<br/>(optional)
```

---

## 2. User Login Flow (JWT Token Generation)

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Service as UserService
    participant DB as Database (Postgres)

    Client->>Router: POST /auth/token<br/>(OAuth2 Form)<br/>username, password
    Router->>Service: login_for_access_token(form_data)
    Service->>Service: authenticate_user(username, password)
    Service->>DB: SELECT * FROM users<br/>WHERE username=?
    DB-->>Service: User record<br/>{id, username, password,<br/>role, created_at}
    Service->>Service: Verify password<br/>bcrypt.verify()
    Note over Service: Password ✅
    Service->>Service: create_access_token()<br/>(username, id, role)
    Note over Service: Create JWT payload:<br/>{sub, id, role, exp}<br/>Sign with SECRET_KEY<br/>Algorithm: HS256
    Service-->>Router: JWT Token
    Router-->>Client: 200 OK<br/>{access_token, token_type}
    Note over Client: Store token in<br/>localStorage
```

---

## 3. Protected Route Access (Regular User)

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Service as UserService

    Client->>Router: GET /auth/user<br/>Authorization: Bearer <token>
    Router->>Router: Dependency: oauth2_bearer<br/>Extract token from header
    Router->>Service: get_current_user(token)
    Service->>Service: decode_token()<br/>jwt.decode(token, SECRET_KEY)
    Note over Service: Payload:<br/>{sub, id, role, exp}<br/>Check expiration ✅
    Service-->>Router: User data<br/>{username, id, role}
    Router-->>Client: 200 OK<br/>{User: {username, id, role}}
```

---

## 4. Admin-Only Route Access (Admin User - Success)

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Deps as Dependencies
    participant DB as Database

    Client->>Router: GET /admin/users<br/>Authorization: Bearer <token>

    Note over Router,Deps: Dependency Chain Starts
    Router->>Deps: 1. oauth2_bearer<br/>Extract token
    Router->>Deps: 2. get_current_user(token)
    Deps->>Deps: Decode & verify JWT
    Note over Deps: Payload:<br/>{sub: "admin",<br/>id: 1,<br/>role: "admin"}
    Deps-->>Router: current_user<br/>{username, id, role}

    Router->>Deps: 3. require_admin_role(current_user)
    Deps->>Deps: Check if role == "admin"
    Note over Deps: role = "admin" ✅<br/>Access granted
    Deps-->>Router: Admin verified ✅

    Note over Router: Execute route handler
    Router->>DB: SELECT * FROM users
    DB-->>Router: All users data
    Router-->>Client: 200 OK<br/>[{user1}, {user2}, ...]
```

---

## 5. Admin Route Access DENIED (Regular User)

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Deps as Dependencies

    Client->>Router: GET /admin/users<br/>Authorization: Bearer <token><br/>(regular user token)

    Router->>Deps: get_current_user(token)
    Deps->>Deps: Decode JWT
    Note over Deps: Payload:<br/>{sub: "testuser",<br/>id: 2,<br/>role: "user"}
    Deps-->>Router: current_user

    Router->>Deps: require_admin_role(current_user)
    Deps->>Deps: Check if role == "admin"
    Note over Deps: role = "user"<br/>NOT "admin" ❌
    Deps->>Deps: raise HTTPException<br/>403 Forbidden
    Deps-->>Router: HTTPException
    Router-->>Client: 403 Forbidden<br/>{detail: "Admin access required"}
    Note over Client: Show error message<br/>or redirect
```

---

## 6. Token Expiration Flow

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Service as UserService

    Client->>Router: GET /auth/user<br/>Authorization: Bearer <token><br/>(expired token)
    Router->>Service: get_current_user(token)
    Service->>Service: decode_token()
    Note over Service: jwt.decode()<br/>Check expiration:<br/>exp < now() ❌<br/>raise JWTError
    Service-->>Router: JWTError caught<br/>HTTPException<br/>401 Unauthorized
    Router-->>Client: 401 Unauthorized<br/>{detail: "Could not validate user"}
    Note over Client: Interceptor catches 401<br/>Remove token from localStorage<br/>Redirect to /login
```

---

## 7. Invalid/Tampered Token Flow

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant Service as UserService

    Client->>Router: GET /auth/user<br/>Authorization: Bearer <invalid_token>
    Router->>Service: get_current_user(token)
    Service->>Service: decode_token()
    Note over Service: jwt.decode()<br/>Verify signature:<br/>signature != expected ❌<br/>raise JWTError
    Service-->>Router: JWTError caught<br/>HTTPException<br/>401 Unauthorized
    Router-->>Client: 401 Unauthorized<br/>{detail: "Could not validate token"}
    Note over Client: Redirect to login
```

---

## 8. Complete Admin Dashboard Access Flow

```mermaid
sequenceDiagram
    participant Client as Client (React)
    participant Router as FastAPI Router
    participant AuthDep as Auth Dependencies
    participant AdminSvc as Admin Service
    participant DB as Database

    Note over Client: User clicks "Admin Dashboard"
    Client->>Client: Check localStorage<br/>for access_token

    alt Token exists
        Client->>Router: GET /admin/dashboard/stats<br/>Authorization: Bearer <token>

        Note over Router,AuthDep: Authentication & Authorization
        Router->>AuthDep: oauth2_bearer (extract token)
        Router->>AuthDep: get_current_user(token)
        AuthDep->>AuthDep: JWT decode & verify
        Note over AuthDep: Extract:<br/>{username, id, role}

        Router->>AuthDep: require_admin_role(user)

        alt User is Admin
            Note over AuthDep: role == "admin" ✅
            AuthDep-->>Router: Admin verified

            Router->>AdminSvc: get_dashboard_stats()
            AdminSvc->>DB: SELECT COUNT(*) FROM users
            DB-->>AdminSvc: Total users: 150
            AdminSvc->>DB: SELECT COUNT(*)<br/>WHERE role='admin'
            DB-->>AdminSvc: Admin users: 5
            AdminSvc->>DB: SELECT COUNT(*)<br/>WHERE created_at > NOW() - 7 days
            DB-->>AdminSvc: New users this week: 12
            AdminSvc-->>Router: Dashboard statistics
            Router-->>Client: 200 OK<br/>{totalUsers: 150,<br/>adminUsers: 5,<br/>newUsers: 12}
            Note over Client: Render dashboard<br/>with statistics

        else User is NOT Admin
            Note over AuthDep: role == "user" ❌
            AuthDep->>AuthDep: raise 403 Forbidden
            AuthDep-->>Router: HTTPException
            Router-->>Client: 403 Forbidden
            Note over Client: Show "Access Denied"<br/>Redirect to user dashboard
        end

    else No token
        Note over Client: No token found
        Client->>Client: Redirect to /login
    end
```

---

## 9. Frontend Authentication Context Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as React Component
    participant AuthCtx as AuthContext
    participant API as API Service
    participant Backend as FastAPI

    Note over User,Backend: App Initialization
    User->>UI: Open application
    UI->>AuthCtx: AuthProvider mounts
    AuthCtx->>AuthCtx: Check localStorage<br/>for access_token

    alt Token exists
        AuthCtx->>API: getCurrentUser()
        API->>Backend: GET /auth/user<br/>Authorization: Bearer <token>
        Backend-->>API: {username, id, role}
        API-->>AuthCtx: User data
        AuthCtx->>AuthCtx: setUser(userData)<br/>setLoading(false)
        AuthCtx-->>UI: isAuthenticated: true
        Note over UI: Render authenticated UI
    else No token
        AuthCtx->>AuthCtx: setLoading(false)
        AuthCtx-->>UI: isAuthenticated: false
        Note over UI: Show login/register options
    end

    Note over User,Backend: User Login
    User->>UI: Enter credentials<br/>Click "Login"
    UI->>AuthCtx: login(username, password)
    AuthCtx->>API: authAPI.login(username, password)
    API->>Backend: POST /auth/token<br/>FormData: username, password
    Backend-->>API: {access_token, token_type}
    API-->>AuthCtx: Token data
    AuthCtx->>AuthCtx: localStorage.setItem('access_token')
    AuthCtx->>API: getCurrentUser()
    API->>Backend: GET /auth/user<br/>Authorization: Bearer <token>
    Backend-->>API: {username, id, role}
    API-->>AuthCtx: User data
    AuthCtx->>AuthCtx: setUser(userData)
    AuthCtx-->>UI: {success: true}
    UI->>UI: navigate('/dashboard')

    Note over User,Backend: Protected Route Access
    User->>UI: Navigate to /dashboard
    UI->>UI: ProtectedRoute component
    UI->>AuthCtx: Check isAuthenticated

    alt Is Authenticated
        AuthCtx-->>UI: true
        Note over UI: Render Dashboard
    else Not Authenticated
        AuthCtx-->>UI: false
        UI->>UI: <Navigate to="/login" />
    end

    Note over User,Backend: Logout
    User->>UI: Click "Logout"
    UI->>AuthCtx: logout()
    AuthCtx->>AuthCtx: localStorage.removeItem('access_token')<br/>setUser(null)
    AuthCtx-->>UI: User logged out
    UI->>UI: Redirect to home page
```

---

## 10. API Interceptor Flow (Automatic Token Handling)

```mermaid
sequenceDiagram
    participant Component as React Component
    participant API as Axios Instance
    participant Interceptor as Request/Response Interceptors
    participant Backend as FastAPI

    Note over Component,Backend: Request Interceptor
    Component->>API: api.get('/admin/users')
    API->>Interceptor: Request Interceptor
    Interceptor->>Interceptor: Get token from localStorage

    alt Token exists
        Note over Interceptor: Add header:<br/>Authorization: Bearer <token>
        Interceptor->>Backend: GET /admin/users<br/>Authorization: Bearer <token>
        Backend-->>Interceptor: Response

        Note over Interceptor,Backend: Response Interceptor
        Interceptor->>Interceptor: Check response status

        alt Status 200-299 (Success)
            Interceptor-->>API: Return response
            API-->>Component: Data

        else Status 401 (Unauthorized)
            Note over Interceptor: Token expired or invalid
            Interceptor->>Interceptor: localStorage.removeItem('access_token')
            Interceptor->>Interceptor: window.location.href = '/login'
            Interceptor-->>API: Reject with error
            API-->>Component: Error

        else Status 403 (Forbidden)
            Note over Interceptor: User lacks permissions
            Interceptor-->>API: Reject with error
            API-->>Component: Error
            Note over Component: Show "Access Denied"
        end

    else No token
        Note over Interceptor: No Authorization header
        Interceptor->>Backend: GET /admin/users
        Backend-->>Interceptor: 401 Unauthorized
        Interceptor->>Interceptor: window.location.href = '/login'
    end
```

---

## How to View These Diagrams

### Option 1: GitHub
1. Push this file to GitHub
2. GitHub automatically renders Mermaid diagrams

### Option 2: VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open this file in VS Code
3. Press `Ctrl+Shift+V` (Preview Markdown)

### Option 3: Online Editor
1. Go to https://mermaid.live/
2. Copy and paste any diagram code
3. Edit and export as PNG/SVG

### Option 4: Documentation Tools
- GitLab (built-in support)
- Notion (with Mermaid blocks)
- Confluence (with Mermaid plugin)
- Docusaurus (built-in support)

---

## JWT Token Structure

```mermaid
graph LR
    A[JWT Token] --> B[Header]
    A --> C[Payload]
    A --> D[Signature]

    B --> B1["alg: HS256<br/>typ: JWT"]
    C --> C1["sub: username<br/>id: user_id<br/>role: user/admin<br/>exp: timestamp"]
    D --> D1["HMACSHA256(<br/>header + payload,<br/>SECRET_KEY)"]

    style A fill:#2563eb,color:#fff
    style B fill:#10b981,color:#fff
    style C fill:#f59e0b,color:#fff
    style D fill:#ef4444,color:#fff
```

---

## Authentication State Machine

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated

    Unauthenticated --> Authenticating: Login attempt
    Authenticating --> Authenticated: Valid credentials
    Authenticating --> Unauthenticated: Invalid credentials

    Authenticated --> CheckingAdmin: Access admin route
    CheckingAdmin --> AdminAccess: Role = admin
    CheckingAdmin --> Forbidden: Role = user
    Forbidden --> Authenticated: Return to dashboard

    Authenticated --> Unauthenticated: Token expired
    Authenticated --> Unauthenticated: Logout
    AdminAccess --> Authenticated: Navigate away

    Authenticated --> RefreshNeeded: Token near expiry
    RefreshNeeded --> Authenticated: Token refreshed
    RefreshNeeded --> Unauthenticated: Refresh failed
```

---

## Security Layers

```mermaid
graph TB
    subgraph Client["Client Side (React)"]
        A[User Input] --> B[Form Validation]
        B --> C[Protected Routes]
        C --> D[Auth Context]
    end

    subgraph Network["Network Layer"]
        E[HTTPS] --> F[CORS]
        F --> G[Authorization Header]
    end

    subgraph Server["Server Side (FastAPI)"]
        H[Router] --> I[OAuth2Bearer]
        I --> J[JWT Verification]
        J --> K[Role Check]
        K --> L[Route Handler]
    end

    subgraph Database["Database Layer"]
        M[Password Hashing] --> N[SQL Injection Prevention]
        N --> O[Parameterized Queries]
    end

    D --> E
    G --> H
    L --> M

    style Client fill:#3b82f6,color:#fff
    style Network fill:#10b981,color:#fff
    style Server fill:#f59e0b,color:#fff
    style Database fill:#ef4444,color:#fff
```

---

## Complete Request Flow (All Layers)

```mermaid
flowchart TD
    Start([User Action]) --> CheckAuth{Token in<br/>localStorage?}

    CheckAuth -->|No| Login[Show Login Page]
    Login --> SubmitCreds[Submit Credentials]
    SubmitCreds --> BackendAuth[Backend Authentication]
    BackendAuth --> CheckPass{Password<br/>Valid?}

    CheckPass -->|Yes| CreateJWT[Create JWT Token<br/>with role claim]
    CheckPass -->|No| LoginFail[401 Unauthorized]
    LoginFail --> Login

    CreateJWT --> StoreToken[Store Token in<br/>localStorage]
    StoreToken --> Authenticated

    CheckAuth -->|Yes| Authenticated[Request with<br/>Authorization Header]

    Authenticated --> ServerReceive[Server Receives Request]
    ServerReceive --> ExtractToken[Extract JWT from Header]
    ExtractToken --> VerifyJWT{JWT Valid?}

    VerifyJWT -->|No| Return401[Return 401]
    Return401 --> ClearToken[Clear localStorage]
    ClearToken --> Login

    VerifyJWT -->|Yes| CheckExpiry{Token<br/>Expired?}
    CheckExpiry -->|Yes| Return401
    CheckExpiry -->|No| ExtractRole[Extract Role from JWT]

    ExtractRole --> AdminRoute{Admin Route<br/>Requested?}

    AdminRoute -->|No| ExecuteHandler[Execute Route Handler]
    AdminRoute -->|Yes| CheckRole{Role =<br/>admin?}

    CheckRole -->|No| Return403[403 Forbidden]
    Return403 --> ShowError[Show Error Page]

    CheckRole -->|Yes| ExecuteHandler
    ExecuteHandler --> DBQuery[Query Database]
    DBQuery --> ReturnData[Return Response]
    ReturnData --> UpdateUI[Update UI]
    UpdateUI --> End([Complete])

    ShowError --> End

    style Start fill:#3b82f6,color:#fff
    style Authenticated fill:#10b981,color:#fff
    style ExecuteHandler fill:#f59e0b,color:#fff
    style End fill:#8b5cf6,color:#fff
    style Return401 fill:#ef4444,color:#fff
    style Return403 fill:#ef4444,color:#fff
```

---

## Implementation Reference

| Component | File | Responsibility |
|-----------|------|----------------|
| User Model | `backend/src/auth/models.py` | Database schema with role enum |
| Auth Service | `backend/src/auth/service.py` | JWT creation, validation, user auth |
| Dependencies | `backend/src/auth/dependencies.py` | Admin role checking |
| Router | `backend/src/auth/router.py` | API endpoints |
| Frontend API | `frontend/src/services/api.js` | Axios with interceptors |
| Auth Context | `frontend/src/contexts/AuthContext.jsx` | Global auth state |
| Protected Route | `frontend/src/components/ProtectedRoute.jsx` | Route guarding |

---

This documentation provides complete visual representations of your authentication system!