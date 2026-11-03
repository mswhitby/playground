// Read the existing curriculum contracts without changing their authoring format.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
const source=resolve(process.argv[2]||'../computer-science-1'),target=resolve(process.argv[3]||'dist/data/computer-science-1');
const context=vm.createContext({window:{}});
for(let unit=1;unit<=6;unit++)vm.runInContext(readFileSync(resolve(source,'docs/units/data-'+String(unit).padStart(2,'0')+'.js'),'utf8'),context,{timeout:1000});
for(let part=1;part<=4;part++)vm.runInContext(readFileSync(resolve(source,'docs/challenges/data-'+part+'.js'),'utf8'),context,{timeout:1000});
vm.runInContext(readFileSync(resolve(source,'docs/learning-map.js'),'utf8'),context,{timeout:1000});
const {CS1_UNITS:lessons,CS1_CHALLENGES:challenges,CS1_LEARNING_MAP:learningMap}=context.window;
for(const [items,cases] of [[lessons,'cases'],[challenges,'examples']]){
 if(items?.length!==24||new Set(items.map(x=>x.id)).size!==24)throw Error('Incomplete Python curriculum');
 for(const item of items)if(!item.title||typeof item.starter!=='string'||!item[cases]?.length||item[cases].some(c=>typeof c.expected!=='string'))throw Error('Invalid Python activity: '+item.id);
}
for(const l of lessons)readFileSync(resolve(source,'units',l.markdown),'utf8');
mkdirSync(target,{recursive:true});
writeFileSync(resolve(target,'course.json'),JSON.stringify({schemaVersion:1,id:'computer-science-1',title:'Computer Science I',lessons,challenges,learningMap},null,2)+'\n');
cpSync(resolve(source,'units'),resolve(target,'units'),{recursive:true});
copyFileSync(resolve(source,'docs/python-worker.js'),resolve(target,'python-worker.js'));
console.log('Packaged all 24 Python lessons and 24 challenges from computer-science-1.');
