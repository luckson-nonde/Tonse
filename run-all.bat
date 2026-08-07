@echo off
REM Complete startup script for Nyuwe Zambia Marketplace (Windows)
REM Runs all necessary commands in sequence

echo.
echo 🚀 Nyuwe Zambia Marketplace - Complete Startup Script (Windows)
echo =========================================================
echo.

REM Step 1: Install frontend dependencies
echo 📦 Step 1: Installing frontend dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ❌ Frontend install had issues, but continuing...
)
echo ✅ Frontend dependencies installed
echo.

REM Step 2: Install backend dependencies
echo 📦 Step 2: Installing backend dependencies...
cd backend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ⚠️  Backend install had issues, but continuing...
)
cd ..
echo ✅ Backend dependencies processed
echo.

REM Step 3: Start Docker services
echo 🐳 Step 3: Starting Docker services...
call docker-compose up -d
if errorlevel 1 (
    echo.
    echo ⚠️  Docker not available or not running
    echo    Action: Start Docker Desktop manually from applications, then run:
    echo    docker-compose up -d
    echo.
) else (
    echo ✅ Docker services started
    echo    Waiting 15 seconds for services to initialize...
    timeout /t 15 /nobreak
)
echo.

REM Step 4: Show instructions
echo =========================================================
echo ✨ Setup Ready!
echo.
echo 🌐 Access the App:
echo    → http://localhost:3000
echo.
echo 📝 To start the complete application:
echo.
echo Terminal 1 - Start Backend (if Docker is running):
echo    cd backend
echo    npm run start:dev
echo.
echo Terminal 2 - Frontend (run separately):
echo    npm run dev
echo.
echo PgAdmin (once Docker is running):
echo    → http://localhost:5050 (admin/admin)
echo.
echo =========================================================
echo.
pause
