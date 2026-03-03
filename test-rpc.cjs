const http = require('http');
const https = require('https');
const fs = require('fs');

const envStr = fs.readFileSync('.env.local', 'utf8');
const env = envStr.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length) acc[key] = value.join('=').replace(/^"|"$/g, '').replace('\r', '');
  return acc;
}, {});

const sqlStr = fs.readFileSync('supabase/migrations/20260303_fix_apply_template_constraint_error.sql', 'utf8');

const data = JSON.stringify({ query: sqlStr });

const url = new URL(env.VITE_SUPABASE_URL + '/rest/v1/rpc/exec_sql'); // PostgREST doesn't support exec_sql directly unless defined. 
// I will just use postgres directly using psql. Wait, no. I can write a small deno script or use psql if installed. Let's see if psql works.
