# Quota Manager

Quota Manager is an intelligent, rotation-based Friday leave management system designed for college departments and classes. It ensures that students who haven't received recent Friday leaves get higher priority, eliminating bias and favoritism in quota allocations.

## Features

- **Multi-Department Support**: Super Admin can manage multiple departments, each with their own Admin and student roster.
- **Smart Calendar Engine**: Automatically generates semester calendars, auto-blocking public holidays, exams, and breaks.
- **Rotation Engine**: A sophisticated algorithm that prioritizes students who have never received quota, then those with the least usage and longest wait time.
- **Swap System**: Students can swap quota spots with WhatsApp deep link integration for communication.
- **Smart Warnings**: Automated alerts for admins when students are falling behind or overusing emergency leaves.
- **Student Dashboard**: Students can view their queue position, predicted next quota date, and manage swap requests.
- **Analytics & Reports**: Visual charts and reports for admins to monitor rotation distribution.

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Auth**: JWT-based authentication with role-based access
- **Deployment**: Vercel (frontend) + Render (backend)

## Roles

| Role | Description |
|------|-------------|
| Super Admin | Manages departments, approves admin requests, global analytics |
| Admin | Manages students, runs rotation engine, publishes lists |
| Student | Views dashboard, accepts/rejects spots, requests swaps |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd quota-manager

# Server
cd server
npm install
cp .env.example .env  # Configure your MongoDB URI and JWT secret
npm run dev

# Client (new terminal)
cd client
npm install
npm run dev
```

### Environment Variables

**Server (.env)**:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

**Client (.env)**:
```
VITE_API_BASE_URL=http://localhost:5000
```

*Built with ❤️ for equal student opportunities.*
