import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const adminKey=env.SUPABASE_SERVICE_ROLE_KEY||env.VITE_SUPABASE_SECRET_KEY;
test('two attendees join by invitation, accept an introduction, and meet',async({browser})=>{
 test.skip(!env.VITE_SUPABASE_URL||!adminKey,'Live Supabase credentials required');
 const admin=createClient(env.VITE_SUPABASE_URL,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const contexts=await Promise.all([browser.newContext(),browser.newContext({viewport:{width:390,height:844}})]);
 const [host,guest]=await Promise.all(contexts.map(c=>c.newPage()));
 const errors=[];[host,guest].forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 let roomId;const userIds=[];
 try{
  await host.goto('/');await host.getByRole('button',{name:'Create an event room'}).click();
  const eventName=`QA room ${Date.now()}`;
  await host.getByLabel('Event name',{exact:true}).fill(eventName);
  await host.getByRole('button',{name:'Create room & get QR code'}).click();
  await expect(host.getByRole('heading',{name:'Bring your room to life.'})).toBeVisible();
  const url=await host.getByLabel('Invitation link').inputValue();
  const result=await admin.from('rooms').select('id,owner_id').eq('name',eventName).single();
  if(result.error)throw result.error;roomId=result.data.id;userIds.push(result.data.owner_id);
  await host.getByRole('button',{name:'Close dialog'}).click();
  await expect(host.getByRole('heading',{name:'Your room is ready.'})).toBeVisible();
  async function introduce(page,name,offer,need){
   await page.getByLabel('Your name',{exact:true}).fill(name);
   await page.getByLabel('What are you building or exploring?').fill('An AI tutor for university students');
   await page.getByLabel('What would you love help with?').fill(need);
   await page.getByLabel('What can you help someone with?').fill(offer);
  }
  await guest.goto(url);await introduce(guest,'QA Bob','Product design','React prototypes');
  await guest.getByRole('button',{name:'+ Design',exact:true}).first().click();
  await guest.getByRole('button',{name:'+ Frontend',exact:true}).last().click();
  await guest.getByRole('button',{name:'Find my people'}).click();
  await expect(host.getByText('QA Bob',{exact:true})).toBeVisible({timeout:15000});
  await host.screenshot({path:'test-results/organizer-live.png',fullPage:true});
  await host.getByRole('button',{name:'Join matching too'}).click();
  await introduce(host,'QA Alice','React prototypes','Product design');
  await host.getByRole('button',{name:'+ Frontend',exact:true}).first().click();
  await host.getByRole('button',{name:'+ Design',exact:true}).last().click();
  await host.getByRole('button',{name:'Find my people'}).click();
  await expect(guest.getByText('QA Alice',{exact:true})).toBeVisible({timeout:15000});
  await expect(host.getByText('You can help each other',{exact:true})).toBeVisible();
  await host.getByRole('button',{name:'Let’s meet',exact:true}).click();
  await guest.getByRole('tab',{name:/Introductions/}).click();
  await guest.getByRole('button',{name:'Let’s meet',exact:true}).click();
  await expect(guest.getByRole('article').getByText('You’re both in! Meet at Registration desk.',{exact:true})).toBeVisible();
  await host.getByRole('tab',{name:/Introductions/}).click();
  await expect(host.getByRole('button',{name:'We met'})).toBeVisible();
  await host.getByRole('button',{name:'We met'}).click();
  await expect(guest.getByText('You met. A connection worth keeping.')).toBeVisible({timeout:15000});
  await host.screenshot({path:'test-results/desktop-room.png',fullPage:true});await guest.screenshot({path:'test-results/mobile-room.png',fullPage:true});
  expect(errors).toEqual([]);
 }finally{
  if(roomId){const users=await admin.from('room_members').select('user_id').eq('room_id',roomId);userIds.push(...(users.data||[]).map(m=>m.user_id));await admin.from('introductions').delete().eq('room_id',roomId);await admin.from('room_members').delete().eq('room_id',roomId);await admin.from('rooms').delete().eq('id',roomId);}
  for(const id of new Set(userIds))await admin.auth.admin.deleteUser(id);
  await Promise.allSettled(contexts.map(c=>c.close()));
 }
});
