/**
 * Script to apply the escola registration fix migration
 * This script reads the migration SQL file and executes it using the Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials')
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local')
    process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
    console.log('🔧 Applying escola registration fix migration...\n')

    try {
        // Read the migration file
        const migrationPath = join(__dirname, 'supabase', 'migrations', '005_fix_escola_registration_rls.sql')
        const migrationSQL = readFileSync(migrationPath, 'utf-8')

        console.log('📄 Migration file loaded successfully')
        console.log('📋 Executing SQL...\n')

        // Execute the migration
        // Note: The anon key might not have permissions to modify policies
        // This will likely require service role key or manual application
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

        if (error) {
            console.error('❌ Migration failed:', error.message)
            console.error('\n⚠️  The anon key does not have permissions to modify RLS policies.')
            console.error('\nPlease apply the migration manually:')
            console.error('1. Go to your Supabase Dashboard (https://app.supabase.com)')
            console.error('2. Select your project')
            console.error('3. Navigate to SQL Editor')
            console.error('4. Copy and paste the contents of: supabase/migrations/005_fix_escola_registration_rls.sql')
            console.error('5. Run the SQL script')
            process.exit(1)
        }

        console.log('✅ Migration applied successfully!\n')
        console.log('Next steps:')
        console.log('1. Test school registration in the application')
        console.log('2. Verify that new schools can be created')
        console.log('3. Verify that user_profile is created automatically')

    } catch (err) {
        console.error('❌ Error:', err.message)
        console.error('\nPlease apply the migration manually via Supabase Dashboard')
        process.exit(1)
    }
}

applyMigration()
