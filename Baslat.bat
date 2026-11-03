@echo off
cd /d "%~dp0"
title Calculus 2 Ogrenim Portali
echo ========================================================
echo Calculus 2 Ogrenim Portali Baslatiliyor...
echo ========================================================

:: Check if python is available
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Python bulundu, yerel sunucu aciliyor [http://localhost:8080]...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: Otherwise fallback to powershell built-in server
echo Windows PowerShell ile yerel sunucu aciliyor...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\server.ps1"

:end
pause
