@echo off
title Guruji Supermart - Local Server & Live Web
cd /d "%~dp0"
echo =========================================================
echo       GURUJI SUPERMART - FORTUNE RESIDENCY
echo =========================================================
echo Starting Store Server on Port 8000...
start /b python run_server.py
timeout /t 3 /nobreak >nul
echo Starting Public HTTPS Live Tunnel...
start /b cloudflared.exe tunnel --url http://localhost:8000
echo.
echo Store is running!
echo Local: http://localhost:8000
echo Admin: http://localhost:8000/admin (PIN: 1234)
echo.
pause
