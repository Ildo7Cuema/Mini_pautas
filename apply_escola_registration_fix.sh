#!/bin/bash

# ============================================
# Script to Apply School Registration Fix Migration
# ============================================

echo "🔧 Applying school registration fix migration..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
    echo "2. Select your project"
    echo "3. Navigate to SQL Editor"
    echo "4. Copy and paste the contents of: supabase/migrations/005_fix_escola_registration_rls.sql"
    echo "5. Run the SQL script"
    echo ""
    echo "📋 Migration file location: supabase/migrations/005_fix_escola_registration_rls.sql"
    echo ""
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  No local Supabase project detected."
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
    echo "2. Select your project (https://afueujnyeglgnaylaxmp.supabase.co)"
    echo "3. Navigate to SQL Editor"
    echo "4. Copy and paste the contents of: supabase/migrations/005_fix_escola_registration_rls.sql"
    echo "5. Run the SQL script"
    echo ""
    echo "📋 Migration file location: supabase/migrations/005_fix_escola_registration_rls.sql"
    echo ""
    exit 1
fi

# Apply migration using Supabase CLI
echo "Applying migration via Supabase CLI..."
supabase db execute -f supabase/migrations/005_fix_escola_registration_rls.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test school registration in the application"
    echo "2. Verify that new schools can be created"
    echo "3. Verify that user_profile is created automatically"
else
    echo ""
    echo "❌ Migration failed. Please apply manually:"
    echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
    echo "2. Select your project"
    echo "3. Navigate to SQL Editor"
    echo "4. Copy and paste the contents of: supabase/migrations/005_fix_escola_registration_rls.sql"
    echo "5. Run the SQL script"
fi
