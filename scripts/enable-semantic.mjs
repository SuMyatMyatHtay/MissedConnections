import fs from 'node:fs';
const file='.env';let text=fs.readFileSync(file,'utf8');
if(/^VITE_ENABLE_SEMANTIC_MATCHING=/m.test(text))text=text.replace(/^VITE_ENABLE_SEMANTIC_MATCHING=.*$/m,'VITE_ENABLE_SEMANTIC_MATCHING=true');
else text+='\nVITE_ENABLE_SEMANTIC_MATCHING=true\n';
fs.writeFileSync(file,text);console.log('Semantic matching enabled.');
