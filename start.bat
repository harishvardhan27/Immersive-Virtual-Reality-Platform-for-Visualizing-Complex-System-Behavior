@echo off
echo ========================================
echo   Neural Network 3D Visualizer
echo   Quick Start Script
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed!
        echo Please check your Node.js installation.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
) else (
    echo [1/3] Dependencies already installed
    echo.
)

echo [2/3] Starting development server...
echo.
echo The app will open at: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the dev server
call npm run dev

pause
