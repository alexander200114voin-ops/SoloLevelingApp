@echo off
title Solo Leveling HUD System Starter
echo [SYSTEM] Launching Solo Leveling API and Frontend Interface...

:: 1. Запуск Бэкенда в отдельном скрытом окне
start /min "Solo Leveling Backend" cmd /c "cd /d C:\Users\User\Desktop\Scripts\SoloLevelingApp\backend && python -m uvicorn main:app --reload --port 8000"
echo [SYSTEM] FastAPI Server started on http://127.0.0.1:8000

:: 2. Запуск Фронтенда
start "Solo Leveling Frontend" cmd /c "cd /d C:\Users\User\Desktop\Scripts\SoloLevelingApp\frontend && npm run dev"
echo [SYSTEM] Vite Frontend Development server initialized on http://localhost:4000

echo [SYSTEM] All engines active. System is operational.
pause