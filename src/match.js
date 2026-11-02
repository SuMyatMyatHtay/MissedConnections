export const intents=[
 {id:'hiring',label:'I’m hiring',short:'Hiring'},
 {id:'job_seeking',label:'I’m looking for work',short:'Open to work'},
 {id:'networking',label:'Just networking',short:'Networking'}
];
export const intentLabel=id=>intents.find(i=>i.id===id)?.short||'Networking';

// Free-text skills are matched exactly (after normalising) or by family, so "React" meets "Frontend".
const ALIASES={reactjs:'react',vuejs:'vue',golang:'go',js:'javascript',ts:'typescript',k8s:'kubernetes',pm:'product management',ml:'machine learning'};
const norm=s=>String(s).toLowerCase().replace(/\.(?=js\b)/g,'').replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ').trim();
const key=s=>ALIASES[norm(s)]||norm(s);
const FAMILIES={
 frontend:['frontend','react','vue','angular','svelte','css','html','javascript','typescript','nextjs','mobile'],
 backend:['backend','nodejs','python','java','go','rust','ruby','php','sql','postgres','api','supabase','django'],
 ai:['ai / llm','ai','llm','machine learning','nlp','prompt engineering'],
 design:['design','ux','ui / ux','figma','product design'],
 product:['product','product management','strategy'],
 marketing:['marketing','growth','seo','content','sales','branding'],
 cloud:['cloud','aws','gcp','azure','devops','kubernetes','docker'],
 data:['data','analytics','data science','sql','data engineering'],
 community:['community','events','partnerships','recruiting'],
 business:['business','sales','finance','fundraising','operations','strategy']
};
const familyOf=new Map();
for(const [family,skills] of Object.entries(FAMILIES))for(const skill of skills){const k=key(skill);if(!familyOf.has(k))familyOf.set(k,new Set());familyOf.get(k).add(family);}
function strength(a,b){
 const ka=key(a),kb=key(b);
 if(ka===kb)return 1;
 const fa=familyOf.get(ka),fb=familyOf.get(kb);
 return fa&&fb&&[...fa].some(f=>fb.has(f))?.6:0;
}
// How well `offered` covers `wanted` (0..1), plus the skills that hit. Only the first three wanted skills set the bar.
function coverage(wanted,offered){
 const hits=[];let total=0;
 for(const want of wanted){
  let best=0,have='';
  for(const o of offered){const s=strength(want,o);if(s>best){best=s;have=o;}}
  total+=best;if(best)hits.push({want,have});
 }
 return {value:Math.min(1,total/Math.max(1,Math.min(wanted.length,3))),hits};
}

const list=v=>Array.isArray(v)?v.filter(Boolean):[];
const unique=a=>[...new Set(a)];
const first=name=>(name||'They').split(' ')[0];
const STOP=new Set(['with','that','this','from','looking','building','want','help','working','about','their','have','your']);
const words=p=>new Set(`${p.project||''} ${p.headline||''} ${p.bio||''}`.toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!STOP.has(w))||[]);

// Scores how worthwhile it is for `a` to talk to `b` at a networking event.
export function scoreMatch(a,b){
 const aSkills=list(a.skills),bSkills=list(b.skills),aWants=list(a.looking_for),bWants=list(b.looking_for);
 const toMe=coverage(aWants,bSkills),toThem=coverage(bWants,aSkills);
 const ia=a.intent||'networking',ib=b.intent||'networking';
 const hire=(ia==='hiring'&&ib==='job_seeking')||(ia==='job_seeking'&&ib==='hiring');
 const affinity=hire?1:(ia==='networking'||ib==='networking')?.4:ia===ib?(ia==='hiring'?.3:.15):.3;
 // When a hirer meets a job seeker, what matters is whether the seeker's skills cover the hirer's search.
 const fit=hire?(ia==='hiring'?toMe.value:toThem.value):0;
 const skill=.65*Math.max(toMe.value,toThem.value)+.35*Math.min(toMe.value,toThem.value);
 const sharedSkills=aSkills.filter(x=>bSkills.some(y=>strength(x,y)===1));
 const bWords=words(b),overlap=[...words(a)].filter(w=>bWords.has(w)).length;
 const sameCompany=a.company&&b.company&&norm(a.company)===norm(b.company);
 const score=Math.round(Math.max(10,Math.min(98,25+38*skill+14*affinity+20*fit+6*Math.min(1,sharedSkills.length/2)+6*Math.min(1,overlap/3)-(sameCompany?15:0))));

 const at=b.company?` at ${b.company}`:'';
 const youHelp=unique(toThem.hits.map(h=>h.want)),theyHelp=unique(toMe.hits.map(h=>h.have));
 let why,icebreaker,label;
 if(hire&&ia==='hiring'){
  label=fit>0?'Hiring match':'Open to work';
  why=theyHelp.length?`${b.name}${at} is open to work and brings ${theyHelp.join(', ')}, which is what you’re hiring for.`:`${b.name}${at} is open to work. Their skills don’t match your search exactly, but it’s worth a chat.`;
  icebreaker=theyHelp.length?`Ask ${first(b.name)} what kind of role they want next and what they’ve built with ${theyHelp[0]}.`:`Ask ${first(b.name)} what kind of role they’re looking for next.`;
 }else if(hire){
  label=fit>0?'Job opportunity':'Hiring now';
  why=youHelp.length?`${b.name}${at} is hiring for ${youHelp.join(', ')}, skills you have.`:`${b.name}${at} is hiring, though not for your listed skills yet.`;
  icebreaker=youHelp.length?`Ask ${first(b.name)} what their team needs most in a ${youHelp[0]} hire.`:`Ask ${first(b.name)} which roles ${b.company||'they'} are hiring for.`;
 }else{
  label=theyHelp.length&&youHelp.length?'You can help each other':theyHelp.length||youHelp.length?'A useful connection':'A new perspective';
  if(theyHelp.length)why=`${b.name} has ${theyHelp.join(', ')} skills you’re looking for.`;
  else if(youHelp.length)why=`${b.name} is looking for your ${youHelp.join(', ')} expertise.`;
  else if(sharedSkills.length)why=`You both work with ${unique(sharedSkills).join(', ')}.`;
  else why='You might bring different perspectives to each other’s work.';
  if(theyHelp.length&&youHelp.length)why+=` You can help them with ${youHelp.join(', ')}.`;
  icebreaker=theyHelp.length?`How have you used ${theyHelp[0]} in your projects?`
   :b.project?`I heard you’re working on “${b.project}”. How did that start?`
   :b.company?`What’s the most interesting thing happening at ${b.company} right now?`
   :'What brought you to this event?';
 }
 return {score,why,icebreaker,label,reciprocal:theyHelp.length>0&&youHelp.length>0,relevant:toMe.value>0||toThem.value>0,hire};
}
