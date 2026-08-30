@echo off
echo.
echo ================================================
echo   SOAR Incident Containment Engine
echo   Starting Backend Server...
echo ================================================
echo.
cd /d "%~dp0backend"
echo Installing dependencies...
pip install -r requirements.txt --quiet
echo.
echo Backend running at http://127.0.0.1:8000
echo Open frontend\index.html in your browser.
echo Press Ctrl+C to stop the server.
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
