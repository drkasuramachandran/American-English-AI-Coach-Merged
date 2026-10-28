@echo off
setlocal
cd /d "%~dp0"

title American English AI Speaking Coach

echo ================================================
echo American English AI Speaking Coach - Merged
echo ================================================
echo.

if not exist "backend\.env" (
  echo [ERROR] backend\.env was not found.
  echo Please run setup.bat first and configure your API key.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] Python virtual environment was not found.
  echo Please run setup.bat first.
  pause
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo [ERROR] Frontend dependencies were not found.
  echo Please run setup.bat first.
  pause
  exit /b 1
)

echo [1/3] Starting backend...
start "American English Coach - Backend" /D "%~dp0backend" cmd /k ""%~dp0.venv\Scripts\python.exe" -m uvicorn server:app --reload --host 127.0.0.1 --port 8000"

echo.
echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Starting frontend...
start "American English Coach - Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 3000"

echo.
echo Waiting for website to start...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Opening American English AI Speaking Coach...
start "" "http://localhost:3000"

echo.
echo Website opening in your default browser.
echo Keep both backend and frontend windows open while using the app.
echo.
pause
endlocal