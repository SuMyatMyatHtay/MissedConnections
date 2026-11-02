import fs from 'node:fs';
import path from 'node:path';
const values=fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>/^(?:SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_SECRET_KEY|GEMINI_API_KEY)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const found=files('dist').some(f=>values.some(v=>fs.readFileSync(f,'utf8').includes(v)));
if(found){console.error('Build contains a server secret. Do not deploy.');process.exit(1);}
console.log('Verified: no configured server secrets in the production build.');
