# TaskFlow — Project & Task Management System

A full-stack management system for teams to plan projects, assign tasks and track progress, with **role-based access control** (Admin / Manager / Member).

**Stack:** React 19 + Vite + Tailwind CSS · Node.js + Express 5 · SQLite (better-sqlite3) · JWT auth · Zod validation · Recharts

---

## Features

| Area | Highlights |
|---|---|
| Authentication | JWT login/register, bcrypt password hashing, rate-limited auth endpoints, auto-logout on expired session |
| Dashboard | Role-aware stats, team-workload bar chart (admin), status donut chart, upcoming tasks, recent activity |
| Projects | Grid/list views, search & status filters, progress bars, owners & team members, create/edit/delete |
| Kanban board | Per-project board with drag-and-drop status changes (permission-checked) |
| Tasks | Filterable table (project, status, priority, overdue, "assigned to me"), inline status change, detail view with comments |
| User management (admin) | Create/edit/delete users, assign roles, activate/deactivate accounts, workload overview |
| Activity logs (admin) | Full audit trail with filters and pagination |
| Settings | Edit profile, change password, view your role's permissions |

## Roles & permissions

| Capability | Admin | Manager | Member |
|---|:-:|:-:|:-:|
| View all projects & tasks | ✅ | Own / member projects | Member projects |
| Create projects | ✅ | ✅ | — |
| Edit / delete projects & manage team | ✅ any | ✅ own projects | — |
| Create / edit / delete / assign tasks | ✅ any | ✅ in own projects | — |
| Change task status | ✅ | ✅ in own projects | ✅ tasks assigned to them |
| Comment on tasks | ✅ | ✅ | ✅ |
| Manage users & roles | ✅ | — | — |
| View activity logs | ✅ | — | — |

Permissions are enforced **on the server** (`server/src/utils/access.js`, `authorize()` middleware); the UI just hides actions you can't perform.

## Demo accounts

The database is seeded automatically on first start.

| Role | Email | Password |
|---|---|---|
| Admin | admin@taskflow.com | Admin@123 |
| Manager | manager@taskflow.com | Manager@123 |
| Member | member@taskflow.com | Member@123 |

More seeded users: `rohan@` (manager), `karan@`, `ananya@`, `vikram@` (members, password `Member@123`).

---

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
# 1. Install dependencies for both apps
npm run install:all

# 2. Configure the API (optional — sensible defaults are used)
cp server/.env.example server/.env   # then set a strong JWT_SECRET

# 3. Run in development (two terminals)
npm run dev:server   # API on http://localhost:5000
npm run dev:client   # UI  on http://localhost:5173 (proxies /api to :5000)
```

### Production build

```bash
npm run build   # builds client into client/dist
npm start       # Express serves the API *and* the built UI on http://localhost:5000
```

Reset the database to demo data at any time with `npm run seed`.

### Environment variables (`server/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | API port |
| `JWT_SECRET` | `dev-secret-change-me` | **Change in production** |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `DB_PATH` | `./data/taskflow.db` | SQLite file location |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |

---

## Project structure

```
taskflow/
├── server/                 Express REST API
│   └── src/
│       ├── index.js        App bootstrap, middleware, static hosting
│       ├── config.js       Env config & enums
│       ├── db.js           SQLite connection + schema
│       ├── seed.js         Demo data
│       ├── middleware/     auth (JWT + role guard), error handling
│       ├── routes/         auth, users, projects, tasks (+comments), dashboard, activity
│       └── utils/          access control, validation, activity logger, errors
└── client/                 React SPA
    └── src/
        ├── api/client.js   Fetch wrapper + all API calls
        ├── context/        AuthContext (session, roles)
        ├── components/     Layout, UI kit, forms, task board/detail
        └── pages/          Login, Register, Dashboard, Projects, ProjectDetail, Tasks, Users, Activity, Profile
```

## Database schema

- **users** — id, name, email, password_hash, role (`admin|manager|member`), status (`active|inactive`), job_title, last_login_at
- **projects** — id, name, description, status (`planning|active|on_hold|completed`), start_date, due_date, owner_id → users
- **project_members** — project_id → projects, user_id → users
- **tasks** — id, project_id, title, description, status (`todo|in_progress|review|done`), priority (`low|medium|high|urgent`), assignee_id, created_by, due_date, completed_at
- **comments** — id, task_id, user_id, body
- **activity_logs** — id, user_id, project_id, action, entity_type, entity_id, message

## REST API

All endpoints except `/api/auth/login`, `/api/auth/register` and `/api/health` require `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Log in, returns `{ token, user }` |
| POST | `/api/auth/register` | Public | Self-register (Member role) |
| GET | `/api/auth/me` | Any | Current user |
| PUT | `/api/auth/me` | Any | Update own profile |
| PUT | `/api/auth/me/password` | Any | Change own password |
| GET | `/api/dashboard` | Any | Role-scoped statistics |
| GET | `/api/users` | Admin, Manager | List users (`search`, `role`, `status`) |
| GET/POST | `/api/users`, `/api/users/:id` | Admin | Get / create users |
| PUT/DELETE | `/api/users/:id` | Admin | Update / delete user |
| GET | `/api/projects` | Any (scoped) | List projects (`search`, `status`) |
| GET | `/api/projects/:id` | Members | Project with team |
| POST | `/api/projects` | Admin, Manager | Create project |
| PUT/DELETE | `/api/projects/:id` | Owner, Admin | Update / delete project |
| GET | `/api/tasks` | Any (scoped) | List tasks (`project_id`, `status`, `priority`, `assignee_id`, `mine`, `overdue`, `search`) |
| GET | `/api/tasks/:id` | Project members | Task details |
| POST | `/api/tasks` | Project owner, Admin | Create task |
| PUT/DELETE | `/api/tasks/:id` | Project owner, Admin | Update / delete task |
| PATCH | `/api/tasks/:id/status` | Assignee, owner, Admin | Change status |
| GET/POST | `/api/tasks/:id/comments` | Project members | List / add comments |
| DELETE | `/api/tasks/:id/comments/:cid` | Author, Admin | Delete comment |
| GET | `/api/activity` | Admin | Audit log (`entity_type`, `action`, `search`, `limit`, `offset`) |

Errors are returned as `{ "error": "message", "details": [...] }` with appropriate HTTP status codes (400, 401, 403, 404, 409).
