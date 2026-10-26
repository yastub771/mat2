@echo off
title Calculus 2 Portali
echo ========================================================
echo Calculus 2 Portali Baslatiliyor...
echo ========================================================

:: Check if python is available
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Python bulundu, yerel sunucu aciliyor...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: Otherwise fallback to powershell built-in
echo Windows PowerShell ile sunucu aciliyor...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"

:end
pause
