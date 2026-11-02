export function scoreMatch(a,b){
  const aSkills = new Set(a.skills || []), bSkills = new Set(b.skills || []);
  const aNeeds = new Set(a.looking_for || []), bNeeds = new Set(b.looking_for || []);
  const complement = [...aNeeds].filter(x=>bSkills.has(x)).length + [...bNeeds].filter(x=>aSkills.has(x)).length;
  const shared = [...aSkills].filter(x=>bSkills.has(x)).length;
  const aWords = new Set(`${a.bio || ''} ${a.project || ''}`.toLowerCase().match(/[a-z]{4,}/g)||[]);
  const bWords = new Set(`${b.bio || ''} ${b.project || ''}`.toLowerCase().match(/[a-z]{4,}/g)||[]);
  const overlap = [...aWords].filter(x=>bWords.has(x) && !['with','that','this','from','looking','building','want','help'].includes(x)).length;
  const score = Math.min(98, 35 + Math.min(42, complement*14) + Math.min(12, shared*4) + Math.min(9, overlap*3));
  let why = '';
  const neededByYou = [...aNeeds].filter(x=>bSkills.has(x));
  const neededByThem = [...bNeeds].filter(x=>aSkills.has(x));
  if (neededByYou.length) why = `${b.name} has ${neededByYou.join(', ')} skills you're looking for.`;
  else if (neededByThem.length) why = `${b.name} is looking for your ${neededByThem.join(', ')} expertise.`;
  else if (shared) why = `You both work with ${[...aSkills].filter(x=>bSkills.has(x)).join(', ')}.`;
  else why = `You might bring different perspectives to each other's projects.`;
  if (neededByYou.length && neededByThem.length) why += ` You can help them with ${neededByThem.join(', ')}.`;
  const icebreaker = neededByYou.length ? `How have you used ${neededByYou[0]} in your projects?` : `What inspired you to build ${b.project || 'your current project'}?`;
  return {score,why,icebreaker,reciprocal:neededByYou.length>0&&neededByThem.length>0,relevant:complement>0};
}
