-- ============================================
-- MIGRATION: Add RESTORE_ESCOLA action type
-- Purpose: Allow logging of escola restoration actions
-- Date: 2026-01-03
-- ============================================

-- Drop the existing constraint
ALTER TABLE superadmin_actions 
DROP CONSTRAINT IF EXISTS superadmin_actions_action_type_check;

-- Add the new constraint with RESTORE_ESCOLA included
ALTER TABLE superadmin_actions 
ADD CONSTRAINT superadmin_actions_action_type_check 
CHECK (action_type IN (
    'ACTIVATE_ESCOLA',
    'DEACTIVATE_ESCOLA',
    'BLOCK_ESCOLA',
    'UNBLOCK_ESCOLA',
    'EDIT_ESCOLA',
    'CREATE_ESCOLA',
    'DELETE_ESCOLA',
    'RESTORE_ESCOLA',  -- NEW: Added for escola restoration
    'VIEW_ESCOLA_DATA',
    'EDIT_SYSTEM_CONFIG',
    'CREATE_USER',
    'EDIT_USER',
    'DELETE_USER',
    'EXPORT_DATA',
    'OTHER'
));

-- ============================================
-- END OF MIGRATION
-- ============================================
