
# 🎯 The Culling Games Platform

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Cloud Run](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white)

An enterprise-grade, highly scalable competitive event management platform built for a 40-day intensive hackathon. Designed to support live leaderboards, strategic power-ups, role-based access control, and a rigorous multi-tier verification pipeline.

Unlike standard prototypes built on NoSQL sandboxes, **The Culling Games** utilizes a fully relational PostgreSQL database, secure JWT session revocation, media offloading, and containerized microservices deployment to ensure zero downtime and absolute data integrity under heavy concurrent loads.

---

## 🚀 Key Features

### 🔐 Advanced Role-Based Access Control (RBAC)
The system operates on a strict 4-tier hierarchy:
* **Super Admin (Master Key):** Can bulk-import teams via CSV, manually override team scores, force-reset passwords across multiple teams simultaneously, download JSON system backups, and control global game states.
* **Game Master:** Controls the event timeline, sets weekly point caps, approves 'Power' requests, broadcasts global alerts, and handles final approval of all task submissions.
* **Coordinator:** Assigned to oversee specific teams. Responsible for reviewing task submissions, verifying proof of execution, and assigning initial point values.
* **Team Leader:** Submits tasks, queries coordinators, requests powers, targets other teams with Curses, and tracks their live ranking on the leaderboard.

### ⚔️ Game Mechanics & Strategy
* **Dynamic Task Directives:** Support for Standard, Bonus, and One-Time tasks.
* **The Arsenal (Powers):** Teams in the Top 10 (or those who complete Bonus Tasks) can acquire **Curses** (to deduct points from rivals) and **Shields** (to auto-block incoming Curses).
* **Weekly Point Caps:** Automated logic restricts how many points a team can earn per week to ensure competitive balance.
* **Disqualification Engine:** Admins can instantly terminate or requalify teams, which updates their status live on the global board.

### 🛡️ Enterprise Security & Data Integrity
* **Single-Session Enforcement:** A custom JWT blocklist utilizing an `active_sessions` database table ensures a team can only be logged in on one device at a time.
* **Media Offloading:** To preserve database performance, all image/PDF proofs are uploaded directly to **Cloudinary**, storing only the secure URLs in PostgreSQL.
* **Data Sanitization:** The bulk CSV uploader automatically handles encodings, skips duplicate emails, dynamically assigns IDs, and securely hashes default passwords using `bcrypt`.

---

## 🏗️ System Architecture

### Frontend
* **Framework:** React.js powered by Vite for lightning-fast HMR and optimized builds.
* **Styling:** Tailwind CSS with a custom dark-mode aesthetic.
* **State Management:** React Context API (`AuthContext`, `ToastContext`) using `sessionStorage` for secure tab isolation.
* **Deployment:** Vercel

### Backend
* **Framework:** Python Flask with Flask-RESTful routing.
* **Authentication:** Flask-JWT-Extended with custom middleware decorators (`@role_required`).
* **ORM & Database:** SQLAlchemy interfacing with a **Supabase PostgreSQL** instance via an IPv4 Session Pooler.
* **Containerization:** Custom Dockerfile utilizing `python:3.11-slim` and `Gunicorn` WSGI server for concurrent request handling.
* **Deployment:** Google Cloud Run (Serverless, auto-scaling compute).

---

## 🛠️ Local Development Setup

### Prerequisites
* Python 3.11+
* Node.js v18+
* PostgreSQL Database (or Supabase account)
* Cloudinary Account

### Backend Setup
1. Clone the repository and navigate to the backend directory:

   ```bash
   cd CULLING_GAMES/backend


3.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows:
    venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate
    ```
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Set up your `.env` file with your database and Cloudinary keys.
6.  Initialize the database and run the server:
    ```bash
    flask db upgrade
    python run.py
    ```
    *The backend will start on `http://127.0.0.1:5000`*

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd CULLING_GAMES/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and set the API URL:
    ```env
    VITE_API_URL=[http://127.0.0.1:5000/api](http://127.0.0.1:5000/api)
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```


-----

## 📦 Deployment Overview

**Backend (Google Cloud Run):**
The backend is containerized using Docker and deployed to Google Cloud Run to ensure high availability.

```bash
gcloud run deploy culling-games-api --source . --region asia-south1 --allow-unauthenticated
```

**Frontend (Vercel):**
The frontend is deployed via Vercel, securely pointing to the Google Cloud Run API instance.

-----

An enterprise-grade, highly scalable competitive event management platform built for a 40-day intensive hackathon. **Successfully deployed and maintained to support 200+ active users for over a month with zero downtime.** Designed to support live leaderboards, strategic power-ups, role-based access control, and a rigorous multi-tier verification pipeline.

Unlike standard prototypes built on NoSQL sandboxes, **The Culling Games** utilizes a fully relational PostgreSQL database, secure JWT session revocation, media offloading, and containerized microservices deployment to ensure absolute data integrity under heavy concurrent loads.

-----


## 👨‍💻 Developer

**Aditya Yadav** *Secretary of SAIGE | Systems Architect* Passionate about building robust, scalable systems that challenge the status quo.

[](https://www.linkedin.com/in/aditya1610)
[](https://github.com/Aadityya07)

> *"Code is power. Wield it wisely."*
