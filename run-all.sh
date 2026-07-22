#!/bin/bash
# Complete startup script for ProQuote Zambia Marketplace
# Runs all necessary commands in sequence

echo "🚀 ProQuote Zambia Marketplace - Complete Startup Script"
echo "================================================"
echo ""

# Step 1: Install frontend dependencies
echo "📦 Step 1: Installing frontend dependencies..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "❌ Frontend install failed"
    exit 1
fi
echo "✅ Frontend dependencies installed"
echo ""

# Step 2: Install backend dependencies
echo "📦 Step 2: Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "❌ Backend install failed"
    echo "⚠️  Continuing anyway - may have partial installation"
fi
echo "✅ Backend dependencies processed"
cd ..
echo ""

# Step 3: Start Docker services (if available)
echo "🐳 Step 3: Starting Docker services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "⚠️  Docker not available - some features won't work"
    echo "   Start Docker Desktop manually and run: docker-compose up -d"
else
    echo "✅ Docker services started"
    echo "   Waiting 10 seconds for services to initialize..."
    sleep 10
fi
echo ""

# Step 4: Run database migrations (if database is ready)
if [ "$(docker ps -q -f name=tonse-postgres)" ]; then
    echo "💾 Step 4: Running database migrations..."
    cd backend
    npm run migrations:run
    if [ $? -eq 0 ]; then
        echo "✅ Migrations completed"
    else
        echo "⚠️  Migrations had issues (database may not be ready yet)"
    fi
    cd ..
else
    echo "⏭️  Step 4: Skipped (Docker not ready)"
fi
echo ""

# Step 5: Show next steps
echo "============================================"
echo "✨ Setup Complete!"
echo ""
echo "🌐 Frontend Server:"
echo "   → http://localhost:3000"
echo ""
echo "📝 Next steps (run in separate terminals):"
echo ""
echo "Terminal 1 - Start Backend:"
echo "   cd backend"
echo "   npm run start:dev"
echo ""
echo "Terminal 2 - Frontend Already Running:"
echo "   npm run dev"
echo ""
echo "🔍 Monitor:"
echo "   - PgAdmin: http://localhost:5050 (admin/admin)"
echo "   - Logs: Check terminal outputs"
echo ""
echo "============================================"
