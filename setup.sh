#!/bin/bash

# Nyuwe Zambia Marketplace - Complete Setup Script
# Run this script to set up the entire development environment

set -e

echo "================================================"
echo "🚀 Nyuwe Zambia Marketplace - Full Stack Setup"
echo "================================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo "✅ All prerequisites found"
echo ""

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check PostgreSQL connection
until docker exec tonse_postgres pg_isready -U tonse_user -d tonse_db > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ PostgreSQL is ready"
echo ""

# Setup backend
echo "🔧 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "  Creating .env file..."
    cp .env.example .env
    echo "  ⚠️  Please update .env with your configuration"
fi

echo "  Installing dependencies..."
npm install > /dev/null 2>&1

echo "  Running migrations..."
npm run migration:run > /dev/null 2>&1

echo "✅ Backend setup complete"
echo ""

cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
if [ ! -d node_modules ]; then
    echo "  Installing dependencies..."
    npm install > /dev/null 2>&1
fi
echo "✅ Frontend setup complete"
echo ""

# Display instructions
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "📍 Services Running:"
echo "  • PostgreSQL:     localhost:5432"
echo "  • PgAdmin:        http://localhost:5050"
echo "  • Backend:        http://localhost:3001"
echo "  • Frontend:       http://localhost:5173"
echo ""
echo "🚀 Start Development Servers:"
echo ""
echo "  Terminal 1 - Backend:"
echo "    cd backend && npm run start:dev"
echo ""
echo "  Terminal 2 - Frontend:"
echo "    npm run dev"
echo ""
echo "🔐 Default Admin Credentials:"
echo "  PgAdmin:"
echo "    Email: admin@tonse.local"
echo "    Password: admin"
echo ""
echo "🔑 API Authentication:"
echo "  • Register: POST /auth/register"
echo "  • Login:    POST /auth/login"
echo "  • Use Token: Authorization: Bearer <access_token>"
echo ""
echo "📚 Documentation:"
echo "  • Setup Guide:  ./FULLSTACK_SETUP.md"
echo "  • Backend Docs: ./backend/README.md"
echo ""
echo "================================================"
