#!/bin/bash

echo "🚀 Starting Supabase local development..."

# Load environment variables
export $(cat .env.supabase | xargs)

# Create necessary directories
mkdir -p supabase/db/data
mkdir -p supabase/storage
mkdir -p supabase/functions

# Start Supabase
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

echo "✅ Supabase is starting up!"
echo ""
echo "📚 Services:"
echo "  - Supabase Studio: http://localhost:3100"
echo "  - API Gateway: http://localhost:8000"
echo "  - Database: postgresql://postgres:postgres@localhost:5432/postgres"
echo "  - Inbucket (email): http://localhost:9000"
echo ""
echo "🔑 Keys:"
echo "  - Anon Key: ${ANON_KEY}"
echo "  - Service Key: ${SERVICE_KEY}"
echo ""
echo "📝 Dashboard credentials:"
echo "  - Username: ${DASHBOARD_USERNAME}"
echo "  - Password: ${DASHBOARD_PASSWORD}"
echo ""
echo "To stop Supabase, run: docker-compose down"