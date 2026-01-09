#!/bin/bash
export PGPASSWORD=postgres
/Applications/Postgres.app/Contents/Versions/latest/bin/psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20260109_fix_recursion_final.sql
