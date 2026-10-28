
@echo off
setlocal
title Upload American English AI Coach to GitHub

echo ============================================================
echo   American English AI Speaking Coach - GitHub Upload
echo ============================================================
echo.

cd /d "C:\Users\ramac\Desktop\American-English-AI-Coach-Merged"

if errorlevel 1 (
    echo ERROR: Could not open the project folder.
    pause
    exit /b 1
)

REM Check Git installation
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or is not in PATH.
    echo Install Git for Windows from https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Initialize Git if needed
if not exist ".git" (
    echo Initializing Git repository...
    git init
    if errorlevel 1 goto :error
) else (
    echo Git repository already initialized.
)

REM Create a .gitignore if none exists
if not exist ".gitignore" (
    echo Creating .gitignore...
    (
        echo # Secrets
        echo .env
        echo .env.*
        echo !.env.example
        echo !.env.sample
        echo **/.env
        echo **/.env.*
        echo !**/.env.example
        echo !**/.env.sample
        echo *.pem
        echo *.key
        echo *token.json*
        echo *credentials.json*
        echo.
        echo # Python
        echo .venv/
        echo venv/
        echo **/__pycache__/
        echo **/.pytest_cache/
        echo *.pyc
        echo.
        echo # Node
        echo node_modules/
        echo **/node_modules/
        echo dist/
        echo build/
        echo **/dist/
        echo.
        echo # Local databases and logs
        echo *.db
        echo *.sqlite
        echo *.sqlite3
        echo *.log
        echo.
        echo # IDE and OS
        echo .idea/
        echo .vscode/
        echo .DS_Store
    ) > .gitignore
) else (
    echo Existing .gitignore found; leaving it unchanged.
)

REM Set the GitHub remote
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/drkasuramachandran/American-English-AI-Coach-Merged.git
) else (
    git remote set-url origin https://github.com/drkasuramachandran/American-English-AI-Coach-Merged.git
)

if errorlevel 1 goto :error

echo.
echo ============================================================
echo   REVIEW FILES BEFORE UPLOADING
echo ============================================================
echo.
echo The script will stage files but will NOT commit or push yet.
echo Inspect the list carefully for API keys or private data.
echo.
git add .
if errorlevel 1 goto :error

git status
echo.
echo Check that backend\.env, frontend\.env, API keys, databases,
echo .venv, and node_modules are not staged for upload.
echo.
echo IMPORTANT: .gitignore cannot remove files already tracked
echo by Git, and it cannot detect secrets inside source code.
echo.
pause

echo.
echo If the staged files are safe, the next steps are:
echo.
echo   git diff --cached
echo   git commit -m "Add merged American English AI Speaking Coach"
echo   git branch -M main
echo   git push -u origin main
echo.
echo These commands are intentionally NOT run automatically.
echo Review the files and execute the commands manually.
echo.
pause
exit /b 0

:error
echo.
echo ERROR: A Git operation failed.
echo Read the message above before trying again.
pause
exit /b 1
