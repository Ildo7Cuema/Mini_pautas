import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = envStr.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length) acc[key] = value.join('=').replace(/^"|"$/g, '');
  return acc;
}, {});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function getTurmaAndTemplate() {
    try {
        const { data: turma } = await supabase.from('turmas').select('id, escola_id').limit(1).single();
        const { data: template } = await supabase.from('disciplinas_template').select('id, escola_id').eq('escola_id', turma.escola_id).limit(1).single();
        const { data: prof } = await supabase.from('professores').select('id').eq('escola_id', turma.escola_id).limit(1).single();
        if(!turma || !template || !prof) return console.log('Missing data for test');
        console.log(`Applying template ${template.id} to turma ${turma.id} with prof ${prof.id}`);
        const { data, error } = await supabase.rpc('apply_template_to_turma', { 
            p_turma_id: turma.id, p_template_id: template.id, p_professor_id: prof.id 
        }); 
        console.log('Result data:', data, 'Result error:', error); 
    } catch(e) {
        console.error('Catch error:', e);
    }
}
getTurmaAndTemplate().then(() => console.log('Done'));
