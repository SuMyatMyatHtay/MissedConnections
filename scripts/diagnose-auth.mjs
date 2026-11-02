import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{
 const index=line.indexOf('=');
 return [line.slice(0,index),line.slice(index+1).trim().replace(/^['"]|['"]$/g,'')];
}));
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const settingsResponse=await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY}});
const settings=await settingsResponse.json();
const email=`qa-login-${Date.now()}@example.com`,password='QaLogin-123456';
let userId;
try{
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
 if(created.error)throw created.error;
 userId=created.data.user.id;
 const login=await client.auth.signInWithPassword({email,password});
 console.log(JSON.stringify({settings:{disableSignup:settings.disable_signup,emailAutoconfirm:settings.mailer_autoconfirm,anonymousUsersEnabled:settings.anonymous_users_enabled},confirmedAccountLogin:{success:!login.error,hasSession:Boolean(login.data.session),error:login.error?.message}},null,2));
}finally{
 if(userId)await admin.auth.admin.deleteUser(userId);
}
