@echo off
cd /d "%~dp0"
title StegoShield AI - Image Steganography Suite
echo ======================================================================
echo   Launching Image Steganography Web Application
echo   Key-Seeded LSB Matching & Robust DCT Embedding (AES-256-GCM)
echo ======================================================================
echo.
echo Starting web server at http://127.0.0.1:5000 ...
echo Opening your web browser in 2 seconds...
echo.
echo NOTE: Do NOT close this black terminal window while using the website!
echo ======================================================================

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5000"

python app.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The server encountered an issue. See above messages.
    pause
)
pause
