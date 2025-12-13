#!/bin/bash

# ============================================
# Script to Apply Turmas RLS Policies Fix
# ============================================

echo "🔧 Applying turmas RLS policies fix migration..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if we have the required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing required environment variables."
    echo ""
    echo "Please apply the migration manually:"
    echo "1. Go to your Supabase Dashboard (https://app.supabase.com)"
    echo "2. Select your project"
    echo "3. Navigate to SQL Editor"
    echo "4. Execute the following files in order:"
    echo "   - supabase/migrations/005_part1_drop_policies.sql"
    echo "   - supabase/migrations/005_part2_register_function.sql"
    echo "   - supabase/migrations/005_part3_helper_and_policies.sql"
    echo "   - supabase/migrations/005_part4_unique_constraints.sql"
    echo ""
    exit 1
fi

echo "📋 Migration files to be applied:"
echo "   1. 005_part1_drop_policies.sql - Drop old policies"
echo "   2. 005_part2_register_function.sql - Register function"
echo "   3. 005_part3_helper_and_policies.sql - Helper function and new policies"
echo "   4. 005_part4_unique_constraints.sql - Unique constraints"
echo ""

echo "Please apply these migrations manually in the Supabase SQL Editor:"
echo ""
echo "1. Go to: https://app.supabase.com"
echo "2. Select your project"
echo "3. Navigate to SQL Editor"
echo "4. Execute each file in order"
echo ""
echo "The migrations are located in: supabase/migrations/"
echo ""
echo "✅ After applying, the turmas RLS policies will work correctly with escola profiles."
