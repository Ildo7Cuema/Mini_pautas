# Turmas RLS Policies Fix

## Problem

When escola users try to access the Dashboard, they get a permission error:

```
Dashboard: Error fetching turmas count: {message: ''}
Dashboard: Caught error: Error: Sem permissão para acessar dados. Verifique se seu perfil está configurado corretamente.
```

The debug output shows:
- User has an escola profile with `escola_id: fff6cb51-a2a5-48cd-8f8d-795d4a2fdbd2`
- User has `isEscola: true` and `isProfessor: false`
- The error occurs when trying to query the `turmas` table

## Root Cause

The issue is caused by **conflicting RLS policies** on the `turmas` table:

1. **Migration 003** (`003_update_rls_policies.sql`) created turmas policies that check:
   ```sql
   escola_id IN (
       SELECT escola_id FROM user_profiles 
       WHERE user_id = auth.uid() AND tipo_perfil = 'ESCOLA'
   )
   ```

2. **Migration 005** (`005_part1_drop_policies.sql`) dropped some policies for `escolas` and `user_profiles` tables, but **did NOT drop the turmas policies** from migration 003.

3. The old turmas policies from migration 003 are still active, but they don't work correctly with the current database structure because:
   - They query `user_profiles` to get the `escola_id`
   - However, the query logic doesn't properly match the escola's ID with the turmas

4. **Migration 005 Part 3** created a helper function `get_current_user_escola_id()` that correctly retrieves the escola_id for the current user, but the turmas policies were never updated to use this function.

## Solution

The fix involves three steps:

### Step 1: Drop Old Turmas Policies

Drop the old policies from migration 003 that are causing the permission errors:

```sql
DROP POLICY IF EXISTS "Escola pode ver suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode criar turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode atualizar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Escola pode deletar suas turmas" ON turmas;
DROP POLICY IF EXISTS "Professor pode ver turmas associadas" ON turmas;
```

### Step 2: Recreate Policies Using Helper Function

Create new policies that use the `get_current_user_escola_id()` helper function:

```sql
CREATE POLICY "Escola pode ver suas turmas"
    ON turmas FOR SELECT
    USING (escola_id = get_current_user_escola_id());

CREATE POLICY "Escola pode criar turmas"
    ON turmas FOR INSERT
    WITH CHECK (escola_id = get_current_user_escola_id());

-- ... and so on for UPDATE and DELETE
```

### Step 3: Verify Policies

Query the `pg_policies` system table to verify the new policies are in place:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'turmas'
ORDER BY policyname;
```

## How to Apply the Fix

### Option 1: Use Supabase SQL Editor (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/006_fix_turmas_rls_policies.sql`
5. Click **Run** to execute the migration
6. Verify the output shows the new policies were created

### Option 2: Use the Migration Script

Run the provided script:

```bash
chmod +x apply_turmas_rls_fix.sh
./apply_turmas_rls_fix.sh
```

This will guide you through the manual application process.

## Files Modified

1. **`supabase/migrations/005_part1_drop_policies.sql`**
   - Added turmas policies to the drop list

2. **`supabase/migrations/005_part3_helper_and_policies.sql`**
   - Added turmas policies using the helper function

3. **`supabase/migrations/006_fix_turmas_rls_policies.sql`** (NEW)
   - Consolidated migration file that can be run directly

4. **`apply_turmas_rls_fix.sh`** (NEW)
   - Helper script to guide the migration application

## Testing

After applying the migration:

1. Refresh the Dashboard page
2. The escola user should now be able to see:
   - Total turmas count
   - Total alunos count
   - Recent turmas list
3. No permission errors should appear in the console

## Technical Details

### Why the Helper Function Works

The `get_current_user_escola_id()` function:

```sql
CREATE OR REPLACE FUNCTION get_current_user_escola_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    escola_uuid UUID;
BEGIN
    SELECT escola_id INTO escola_uuid
    FROM user_profiles
    WHERE user_id = auth.uid() AND ativo = true
    LIMIT 1;
    RETURN escola_uuid;
END;
$$;
```

- Uses `SECURITY DEFINER` to run with elevated privileges
- Marked as `STABLE` for query optimization
- Returns the `escola_id` from `user_profiles` for the current authenticated user
- Works for both ESCOLA and PROFESSOR profile types (both have `escola_id`)

### How the Policies Work

For escola users:
1. User logs in → `auth.uid()` returns their user ID
2. Policy calls `get_current_user_escola_id()`
3. Function queries `user_profiles` WHERE `user_id = auth.uid()`
4. Returns the `escola_id` from the user's profile
5. Policy checks if `turmas.escola_id = returned escola_id`
6. If match → access granted ✅

For professor users:
1. Same process, but the `escola_id` in their profile points to their school
2. They can only see turmas where they are assigned via `turma_professores` table

## Next Steps

After applying this fix, you should:

1. ✅ Test the Dashboard with an escola user
2. ✅ Test the Dashboard with a professor user
3. ✅ Verify turma creation works
4. ✅ Verify alunos count displays correctly
5. Consider applying similar fixes to other tables if permission errors occur
