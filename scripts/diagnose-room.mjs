import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{
 const index=line.indexOf('=');
 return [line.slice(0,index),line.slice(index+1).trim().replace(/^['"]|['"]$/g,'')];
}));
const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:session,error:sessionError}=await client.auth.signInAnonymously();
if(sessionError)throw sessionError;
const userId=session.user.id;
try{
 const roomId=crypto.randomUUID();
 const noSelect=await client.from('rooms').insert({id:roomId,owner_id:userId,name:'RLS diagnostic no select',meeting_point:'Desk'});
 const withSelect=await client.from('rooms').insert({owner_id:userId,name:'RLS diagnostic select',meeting_point:'Desk'}).select().single();
 const roomRead=await client.from('rooms').select('*').eq('id',roomId).maybeSingle();
 const memberRead=await client.from('room_members').select('*').eq('room_id',roomId);
 console.log(JSON.stringify({userId,noSelect:{status:noSelect.status,error:noSelect.error?.message},withSelect:{status:withSelect.status,error:withSelect.error?.message,data:withSelect.data},roomRead:{status:roomRead.status,error:roomRead.error?.message,data:roomRead.data},memberRead:{status:memberRead.status,error:memberRead.error?.message,data:memberRead.data}},null,2));
}finally{
 await admin.from('rooms').delete().eq('owner_id',userId);
 await admin.auth.admin.deleteUser(userId);
}
