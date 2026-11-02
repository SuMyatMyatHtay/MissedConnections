import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const base=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!base||!key){console.log('Supabase is not configured.');process.exit(1);}
try{
 const response=await fetch(`${base}/auth/v1/settings`,{headers:{apikey:key}});
 const settings=await response.json();
 console.log(JSON.stringify({authSettingsStatus:response.status,anonymousEnabled:settings.anonymous_users_enabled??settings.external?.anonymous}));
 for(const table of ['rooms','room_members','introductions']){
  const r=await fetch(`${base}/rest/v1/${table}?select=*&limit=0`,{headers:{apikey:key}});
  const body=await r.json();console.log(JSON.stringify({table,status:r.status,error:Array.isArray(body)?undefined:body.message}));
 }
 const client=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:anonymous,error:anonymousError}=await client.auth.signInAnonymously();
 console.log(JSON.stringify({anonymousSignIn:!anonymousError,error:anonymousError?.message}));
 const adminKey=env.SUPABASE_SERVICE_ROLE_KEY;
 if(anonymous.user&&adminKey){
  const admin=createClient(base,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
  await admin.auth.admin.deleteUser(anonymous.user.id);
 }
}catch(e){console.log(`Backend check failed: ${e.message}`);process.exitCode=1;}
