@echo off
title Push Guruji Supermart to GitHub for 24/7 Render Hosting
cd /d "%~dp0"
echo ================================================================
echo       GURUJI SUPERMART - 24/7 CLOUD DEPLOYMENT HELPER
echo ================================================================
echo.
echo Step 1: Logging into GitHub...
"C:\Program Files\GitHub CLI\gh.exe" auth login -w -p https
echo.
echo Step 2: Creating GitHub repository 'guruji-supermart'...
"C:\Program Files\GitHub CLI\gh.exe" repo create guruji-supermart --public --source=. --remote=origin --push
echo.
echo ================================================================
echo Repository successfully pushed to GitHub!
echo Now visit https://dashboard.render.com:
echo 1. Click "New +" -> "Web Service"
echo 2. Connect your 'guruji-supermart' repo
echo 3. Render will deploy it 24/7 on https://guruji-supermart.onrender.com!
echo ================================================================
pause
