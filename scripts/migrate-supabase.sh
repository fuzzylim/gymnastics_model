#!/bin/bash

echo "🔄 Running migrations on Supabase..."

# Wait for database to be ready
until docker exec supabase-db pg_isready -U postgres; do
  echo "Waiting for database..."
  sleep 2
done

# Set database URL for local Supabase
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Run Drizzle migrations
echo "📝 Pushing schema to database..."
npm run db:push

echo "✅ Migrations complete!"

# Optionally seed the database
read -p "Do you want to seed the database? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎉 Database setup complete!"