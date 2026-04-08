# FairLeave

FairLeave is an intelligent, fair, quota-based Friday leave management system designed for college departments and classes. It ensures that students who haven't received recent Friday leaves get higher priority, eliminating bias and favoritism in quota allocations.

## Features

- **Role-Based Access**:
  - Super Admin: Manages global department requests and analytics.
  - Leader (Department Admin): Manages class semester, blocks exam/holiday Fridays, and handles student lists.
  - Student: Requests normal/emergency leaves, views queue position, and tracks history.
- **Fairness Engine**: A sophisticated algorithm that calculates a "Fairness Score" for each student based on their leave history, penalty points, and class average, ensuring equal distribution.
- **Smart Calendar Engine**: Auto-generates the Friday calendar for a semester, automatically blocking known Indian holidays, and allowing manual blocks for exams, tours, and breaks.
- **Prediction System**: Tells students their queue position and confidence level of getting a leave *before* they even apply.
- **WhatsApp Export**: Leaders can export the final confirmed list with a single click to paste directly into WhatsApp groups.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v3, Recharts, React Router v6
- **Backend**: Node.js, Express, Mongoose, JWT Authentication
- **Database**: MongoDB (Atlas)

## Setup & Running Locally

1. **Prerequisites**: Node.js (v18+) and MongoDB.
2. **Install Dependencies**:
   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```
3. **Environment Setup**:
   Ensure the `server/.env` file contains your `MONGODB_URI` and `JWT_SECRET`.
4. **Seed Database** (Optional, for demo data):
   ```bash
   cd server
   node seed.js
   ```
5. **Run the App**:
   You can run both concurrently or in separate terminals:
   
   **Terminal 1 (Backend)**:
   ```bash
   cd server
   npm run dev
   ```
   **Terminal 2 (Frontend)**:
   ```bash
   cd client
   npm run dev
   ```

## Design System

The application features a modern, mobile-first dark theme inspired by premium AI platforms:
- **Primary Accent**: Fierce Orange/Red (`#E84D1A`)
- **Backgrounds**: Deep blacks and elevated "glass" panes.
- **Typography**: `Plus Jakarta Sans` for headings, `DM Sans` for body text.

## Deployment

- **Frontend**: Ready for Vercel. Simply connect your GitHub repository and set the framework preset to "Vite". Configure `VITE_API_BASE_URL` in environment variables.
- **Backend**: Ready for Render. Connect your repo, set the build command to `npm install` and start command to `node server.js` in the `server` directory.

---
*Built with ❤️ for fair student opportunities.*
