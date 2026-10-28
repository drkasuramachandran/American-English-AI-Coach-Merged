@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo Setup - American English AI Speaking Coach
echo ================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found. Install Python 3.11 or newer and enable Add Python to PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js 20 or newer.
  pause
  exit /b 1
)

echo [1/4] Creating project-specific Python virtual environment...
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Could not create .venv. Check that Python's venv component is installed.
    pause
    exit /b 1
  )
)

echo.
echo [2/4] Updating pip inside the virtual environment...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto failed

echo.
echo [3/4] Installing backend dependencies into .venv...
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 goto failed

echo.
echo [4/4] Preparing environment and installing frontend dependencies...
if not exist "backend\.env" copy "backend\.env.example" "backend\.env"

cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto failed

echo.
echo Setup finished.
echo Edit backend\.env, then run start-dev.bat.
pause
exit /b 0

:failed
echo.
echo [ERROR] Setup did not complete. Review the error above and retry.
pause
exit /b 1
