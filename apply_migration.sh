#!/bin/bash

# ============================================
# Script to Apply Trimestre Migration to Supabase
# ============================================

echo "🔧 Applying database migration for trimestre column..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of: supabase/apply_trimestre_migration.sql"
    echo "4. Run the SQL script"
    echo ""
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  No Supabase project detected locally."
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
    echo "2. Select your project"
    echo "3. Navigate to SQL Editor"
    echo "4. Copy and paste the contents of: supabase/apply_trimestre_migration.sql"
    echo "5. Run the SQL script"
    echo ""
    exit 1
fi

# Apply migration using Supabase CLI
echo "Applying migration via Supabase CLI..."
supabase db execute -f supabase/apply_trimestre_migration.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test inserting grades in the application"
    echo "2. Verify grades persist correctly"
    echo "3. Check that grades for different trimesters are stored separately"
else
    echo ""
    echo "❌ Migration failed. Please apply manually:"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of: supabase/apply_trimestre_migration.sql"
    echo "4. Run the SQL script"
fi
