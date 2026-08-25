@echo off
setlocal enabledelayedexpansion

set VPS_USER=root
set VPS_IP=88.222.214.155
set REMOTE_BASE=/var/www/ssb-platform

set LOCAL_KEY=%~dp0ssb_deploy_key
set SSH_KEY=%USERPROFILE%\.ssh\ssb_deploy_key
set REPO_DIR=%~dp0

echo ==========================================
echo Starting SSB Platform Deployment
echo ==========================================

if not exist "%LOCAL_KEY%" (
    echo [ERROR] ssb_deploy_key not found next to this script.
    echo Make sure deploy2.bat and ssb_deploy_key are in the same folder.
    pause
    exit /b 1
)

REM Setup secure key copy on NTFS drive to prevent "permissions too open" errors on mapped drives
if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
copy /y "%LOCAL_KEY%" "%SSH_KEY%" >nul

REM Windows OpenSSH refuses to use a key file with loose/inherited permissions.
icacls "%SSH_KEY%" /inheritance:r >nul 2>&1
icacls "%SSH_KEY%" /grant:r "%USERNAME%:R" >nul 2>&1

echo.
echo [1/3] Committing and pushing to GitHub...
cd /d "%REPO_DIR%"
git add .
git commit -m "deploy: automated push before VPS deployment" >nul 2>&1
git push origin main
if errorlevel 1 (
    echo [ERROR] Git push failed. Fix the error above, then re-run this script.
    pause
    exit /b 1
)

echo.
echo [2/3] Pulling latest code on VPS and building...
ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% "cd %REMOTE_BASE% && git pull origin main && npm run build"
if errorlevel 1 (
    echo [ERROR] Build failed on the VPS. See the error above.
    pause
    exit /b 1
)

echo.
echo [3/3] Restarting app with PM2...
ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% "pm2 restart ssb-platform --update-env"

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
pause
