#!/bin/bash
echo "🔧 Applying recursion fix migration..."

if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    exit 1
fi

supabase db execute -f supabase/migrations/20260109_fix_recursion_final.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
else
    echo "❌ Migration failed."
    exit 1
fi
