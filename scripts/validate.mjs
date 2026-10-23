import fs from 'node:fs';
import {validateCourse} from '../public/model.mjs';
const course=validateCourse(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
console.log(`Validated ${course.units.length} units, ${course.units.flatMap(u=>u.lessons).length} lessons, and ${course.units.reduce((n,u)=>n+u.quiz.questions.length,0)} questions.`);
