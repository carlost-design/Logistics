@echo off
echo.
echo 🚀 Initializing Supplier Offer Management System...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM Check if Convex is initialized
if not exist "convex\_generated" (
    echo ⚡ Initializing Convex...
    echo This will open your browser to sign in.
    echo.
    echo After Convex starts, keep this window open!
    echo.
    start cmd /k npx convex dev
    
    echo.
    echo 📋 Next steps:
    echo 1. Wait for Convex to initialize in the new window
    echo 2. Copy your Convex URL
    echo 3. Create .env.local:
    echo    NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
    echo 4. In a NEW terminal, run: npm run dev
    echo 5. Open http://localhost:3000
    echo.
) else (
    echo ✅ Convex already initialized
    echo.
    echo To start development:
    echo 1. Terminal 1: npx convex dev
    echo 2. Terminal 2: npm run dev
    echo 3. Open http://localhost:3000
)

pause



