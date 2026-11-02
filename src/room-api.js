import { supabase, isLive } from './supabase';
import { demoPeople } from './demo';

const demoRoom = { id: 'demo', code: 'DEMO', name: 'Claude × Supabase · Demo room', meeting_point: 'Registration desk', owner_id: 'demo-user' };
export const demoMembers = demoPeople.map(p => ({ ...p, user_id: p.id, room_id: 'demo', offers: p.skills.join(', '), needs: p.looking_for.join(', '), available: true, discoverable: true }));
const demoUser={id:'demo-user',email:'demo@example.com',isAnonymous:false};
const toUser=u=>u?{id:u.id,email:u.email||'',isAnonymous:Boolean(u.is_anonymous)}:null;
// No automatic sign-in: people choose between an account and guest mode.
export async function currentUser() {
 if (!isLive) return demoUser;
 const { data, error } = await supabase.auth.getSession();
 if (error) throw error;
 return toUser(data.session?.user);
}
async function dropGuestSession() {
 const { data } = await supabase.auth.getSession();
 if (data.session?.user?.is_anonymous) await supabase.auth.signOut();
}
export async function signIn(email, password) {
 if (!isLive) return demoUser;
 await dropGuestSession();
 return toUser(checked(await supabase.auth.signInWithPassword({ email, password })).user);
}
// Returns null when the project requires email confirmation before the first login.
export async function signUp(email, password) {
 if (!isLive) return demoUser;
 await dropGuestSession();
 const data = checked(await supabase.auth.signUp({ email, password }));
 return data.session ? toUser(data.user) : null;
}
export async function signInGuest() {
 if (!isLive) return demoUser;
 const { data } = await supabase.auth.getSession();
 if (data.session) return toUser(data.session.user);
 const result = await supabase.auth.signInAnonymously();
 if (result.error) throw new Error(`${result.error.message}. Enable anonymous sign-ins in Supabase Authentication settings.`);
 return toUser(result.data.user);
}
export async function signOut() { if (isLive) await supabase.auth.signOut(); }
function checked(result) { if (result.error) throw result.error; return result.data; }
export async function findRoom(code) {
 if (!isLive) { if(code.toUpperCase() !== 'DEMO') throw new Error('Connect Supabase to create shared rooms. Use DEMO to explore locally.'); return demoRoom; }
 const rows = checked(await supabase.rpc('find_room', { invite_code: code }));
 if (!rows?.length) throw new Error('Room not found. Check your invitation code.');
 return rows[0];
}
export async function createRoom(form, userId) {
 if (!isLive) throw new Error('Connect Supabase to create a room for real attendees. You can explore the demo below.');
 const id=crypto.randomUUID();
 checked(await supabase.from('rooms').insert({id,...form,owner_id:userId}));
 return checked(await supabase.from('rooms').select('*').eq('id',id).single());
}
export async function roomData(roomId) {
 if (!isLive) return {members:demoMembers, intros:[]};
 const [members,intros,contacts] = await Promise.all([supabase.from('room_members').select('*').eq('room_id',roomId),supabase.from('introductions').select('*').eq('room_id',roomId),supabase.from('member_contacts').select('user_id,email').eq('room_id',roomId)]);
 // Row-level security decides whose email we may see: our own, accepted connections, or everyone for the organizer.
 const emails=new Map(checked(contacts).map(c=>[c.user_id,c.email]));
 return {members:checked(members).map(m=>({...m,email:emails.get(m.user_id)||''})),intros:checked(intros)};
}
// Pre-fills the form for returning account holders from their most recent room.
export async function lastProfile(userId) {
 if (!isLive) return null;
 const { data } = await supabase.from('room_members').select('name,headline,company,intent,project,skills,looking_for').eq('user_id',userId).order('created_at',{ascending:false}).limit(1).maybeSingle();
 return data;
}
export async function saveMember(roomId,userId,profile,exists=false) {
 const { email, ...rest } = profile;
 const row={room_id:roomId,user_id:userId,...rest};
 if (isLive) {
  checked(exists
   ? await supabase.from('room_members').update(rest).eq('room_id',roomId).eq('user_id',userId)
   : await supabase.from('room_members').insert(row));
  if (email) checked(await supabase.from('member_contacts').upsert({room_id:roomId,user_id:userId,email}));
 }
 return {...row,email};
}
export async function sendIntro(roomId,sender,recipient) {
 return checked(await supabase.from('introductions').insert({room_id:roomId,sender_id:sender,recipient_id:recipient}).select().single());
}
export async function replyIntro(id,status) { checked(await supabase.from('introductions').update({status}).eq('id',id)); }
