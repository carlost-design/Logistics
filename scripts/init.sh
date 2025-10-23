#!/bin/bash

echo "🚀 Initializing Supplier Offer Management System..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if Convex is initialized
if [ ! -d "convex/_generated" ]; then
    echo "⚡ Initializing Convex..."
    echo "This will open your browser to sign in."
    echo "Keep the terminal open after initialization!"
    echo ""
    npx convex dev &
    CONVEX_PID=$!
    
    echo ""
    echo "⏳ Waiting for Convex to initialize (30 seconds)..."
    sleep 30
    
    echo ""
    echo "✅ Convex initialized!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy your Convex URL from above"
    echo "2. Create .env.local:"
    echo "   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
    echo "3. In a new terminal, run: npm run dev"
    echo "4. Open http://localhost:3000"
    echo ""
    echo "⚠️  Keep this terminal open (Convex dev server is running)"
    echo ""
    
    wait $CONVEX_PID
else
    echo "✅ Convex already initialized"
    echo ""
    echo "To start development:"
    echo "1. Terminal 1: npx convex dev"
    echo "2. Terminal 2: npm run dev"
    echo "3. Open http://localhost:3000"
fi



