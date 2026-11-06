// Read the existing curriculum contracts without changing their authoring format.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const source=resolve(process.argv[2]||'../computer-science-1'),target=resolve(process.argv[3]||'dist/data/computer-science-1');
const context=vm.createContext({window:{}});
const unitFiles=readdirSync(resolve(source,'docs/units')).filter(name=>/^data-\d\d\.js$/.test(name)).sort();
if(unitFiles.length<6)throw Error('Expected all six legacy Python units before packaging newer content.');
for(const file of unitFiles)vm.runInContext(readFileSync(resolve(source,'docs/units',file),'utf8'),context,{timeout:1000});
for(let part=1;part<=4;part++)vm.runInContext(readFileSync(resolve(source,'docs/challenges/data-'+part+'.js'),'utf8'),context,{timeout:1000});
vm.runInContext(readFileSync(resolve(source,'docs/learning-map.js'),'utf8'),context,{timeout:1000});
const {CS1_UNITS:lessons,CS1_CHALLENGES:challenges,CS1_LEARNING_MAP:learningMap}=context.window;
for(const [items,cases] of [[lessons,'cases'],[challenges,'examples']]){
 if(items?.length<(cases==='cases'?24:24)||new Set(items.map(x=>x.id)).size!==items.length)throw Error('Incomplete or duplicate Python curriculum');
 for(const item of items)if(!item.title||typeof item.starter!=='string'||!item[cases]?.length||item[cases].some(c=>typeof c.expected!=='string'))throw Error('Invalid Python activity: '+item.id);
}
for(const l of lessons){
 if(!['active','archived'].includes(l.status||'active'))throw Error('Invalid lesson status: '+l.id);
 readFileSync(resolve(source,'units',l.markdown),'utf8');
}
// Packaging retains archived lessons and their original activity IDs. Only the UI filters them.
mkdirSync(target,{recursive:true});
writeFileSync(resolve(target,'course.json'),JSON.stringify({schemaVersion:1,id:'computer-science-1',title:'Computer Science I',lessons,challenges,learningMap},null,2)+'\n');
cpSync(resolve(source,'units'),resolve(target,'units'),{recursive:true});
copyFileSync(resolve(source,'docs/python-worker.js'),resolve(target,'python-worker.js'));
console.log(`Packaged ${lessons.length} Python lessons (${lessons.filter(l=>l.status==='archived').length} archived) and ${challenges.length} challenges.`);
