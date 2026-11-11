const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('settings').select('*');
  console.log('Error:', error);
  console.log('keys in settings:', data?.map(d => ({ key: d.key, updated_at: d.updated_at })));
  const p = data?.find(d => d.key === 'site_projects');
  if (p) {
    const val = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
    console.log('Projects count in Supabase:', val?.projects?.length);
    console.log('Projects in Supabase:', val?.projects?.map(x => ({ id: x.id, title: x.title, slug: x.slug, showOnHome: x.showOnHome })));
  } else {
    console.log('site_projects NOT FOUND in Supabase!');
  }
}
run();
