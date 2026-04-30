<<<<<<< HEAD
# TeamTask – Team Task Manager

A full-stack collaborative task management web application built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JS.

## Features

- **Authentication** – JWT-based signup/login
- **Projects** – Create projects, add/remove members
- **Tasks** – Kanban board (To Do / In Progress / Done), priority levels, due dates, assignments
- **Dashboard** – Stats, overdue tasks, tasks per user, recent activity
- **Role-Based Access** – Admin (full control) and Member (view/update own tasks)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken) |
| Deployment | Railway |

## Project Structure

```
task-manager/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── projectRole.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | Get all user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project details |
| PUT | /api/projects/:id | Update project (Admin) |
| DELETE | /api/projects/:id | Delete project (Admin) |
| POST | /api/projects/:id/members | Add member (Admin) |
| DELETE | /api/projects/:id/members/:userId | Remove member (Admin) |
| PUT | /api/projects/:id/members/:userId/role | Update member role (Admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks/project/:projectId | Get project tasks |
| POST | /api/tasks | Create task (Admin) |
| GET | /api/tasks/:id | Get task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task (Admin) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Get overall stats |
| GET | /api/dashboard/project/:id | Get project stats |

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### Frontend
Open `frontend/index.html` in a browser, or use Live Server extension in VS Code.

## Deployment on Railway

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/task-manager.git
git push -u origin main
```

### Step 2: Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Set **Root Directory** to `backend`
5. Add environment variables:
   - `MONGO_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = a long random string (e.g., use `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = your frontend URL (add after deploying frontend)
6. Railway auto-detects Node.js and runs `npm start`

### Step 3: Deploy Frontend on Railway
1. In the same project, click **New Service** → **GitHub Repo**
2. Set **Root Directory** to `frontend`
3. Set **Start Command** to: `npx serve . -p $PORT`
4. Add environment variable: none needed (API URL is auto-detected)

### Step 4: Update API URL
In `frontend/app.js`, the `API_BASE` variable auto-detects:
- `localhost` → uses `http://localhost:5000/api`
- Production → uses `/api` (same domain) or update to your Railway backend URL

If frontend and backend are on different Railway services, update line 3 in `app.js`:
```js
const API_BASE = 'https://your-backend.up.railway.app/api';
```

### Step 5: MongoDB Atlas Setup
1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user
3. Whitelist all IPs: `0.0.0.0/0` (for Railway)
4. Get connection string and add to Railway env vars

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (Railway sets this) | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for JWT signing | `abc123...` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://...railway.app` |
=======
# team-task-manager
Full-stack Team Task Manager with role-based access (Admin/Member), project management, and task tracking built using MERN stack.
>>>>>>> fef39af0939fd6a332a819f9d8142d266a4ec163
