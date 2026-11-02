import { supabase, isLive } from './supabase';
import { demoPeople } from './demo';

const demoRoom = { id: 'demo', code: 'DEMO', name: 'Claude × Supabase · Demo room', meeting_point: 'Registration desk', owner_id: 'demo-user' };
export const demoMembers = demoPeople.map(p => ({ ...p, user_id: p.id, room_id: 'demo', offers: p.skills.join(', '), needs: p.looking_for.join(', '), available: true, discoverable: true }));
let sessionPromise;
export function sessionUser() {
 return sessionPromise ||= getSessionUser().catch(error=>{sessionPromise=null;throw error;});
}
async function getSessionUser() {
 if (!isLive) return 'demo-user';
 const { data, error } = await supabase.auth.getSession();
 if (error) throw error;
 if (data.session) return data.session.user.id;
 const result = await supabase.auth.signInAnonymously();
 if (result.error) throw result.error;
 return result.data.user.id;
}
function checked(result) { if (result.error) throw result.error; return result.data; }
export async function findRoom(code) {
 if (!isLive) { if(code.toUpperCase() !== 'DEMO') throw new Error('Connect Supabase to create shared rooms. Use DEMO to explore locally.'); return demoRoom; }
 const rows = checked(await supabase.rpc('find_room', { invite_code: code }));
 if (!rows?.length) throw new Error('Room not found. Check your invitation code.');
 const room = rows[0];
 const owner = await supabase.from('rooms').select('owner_id').eq('id',room.id).maybeSingle();
 return {...room, owner_id: owner.data?.owner_id};
}
export async function createRoom(form, userId) {
 if (!isLive) throw new Error('Connect Supabase to create a room for real attendees. You can explore the demo below.');
 const id=crypto.randomUUID();
 checked(await supabase.from('rooms').insert({id,...form,owner_id:userId}));
 return checked(await supabase.from('rooms').select('*').eq('id',id).single());
}
export async function roomData(roomId) {
 if (!isLive) return {members:demoMembers, intros:[]};
 const [members,intros] = await Promise.all([supabase.from('room_members').select('*').eq('room_id',roomId),supabase.from('introductions').select('*').eq('room_id',roomId)]);
 return {members:checked(members),intros:checked(intros)};
}
export async function saveMember(roomId,userId,profile,exists=false) {
 const row={room_id:roomId,user_id:userId,...profile};
 if (isLive) {
  const result=exists
   ? await supabase.from('room_members').update(profile).eq('room_id',roomId).eq('user_id',userId)
   : await supabase.from('room_members').insert(row);
  checked(result);
 }
 return row;
}
export async function sendIntro(roomId,sender,recipient) {
 return checked(await supabase.from('introductions').insert({room_id:roomId,sender_id:sender,recipient_id:recipient}).select().single());
}
export async function replyIntro(id,status) { checked(await supabase.from('introductions').update({status}).eq('id',id)); }
