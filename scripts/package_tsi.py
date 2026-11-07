"""Bundle the TSI curriculum snapshot; optionally refresh from its authoring checkout."""
import hashlib,json,shutil,subprocess
from pathlib import Path
def package_tsi(dist,source=None):
 target=Path(dist)/'data/tsi-math'
 if source:
  source=Path(source).resolve()
  files=['content/diagnostic-v1.json','course.json','content/week-01-student.json','teachers/week-01/answers.json','resources/pearson-selections.json','print/week-01-student-packet.html']+[f'teachers/week-01/day-{n:02}.md' for n in range(1,6)]+['teachers/week-01/overview.md','teachers/week-01/answer-key.md']
  for f in files:
   dest=target/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/f,dest)
  # Publish the 20-day plan and four supplemental practice lessons without changing legacy IDs.
  extras=['content/20-day-program.json','content/math-locator-profiles.json','content/strand-lessons-v1.json']
  catalog=json.loads((source/'content/strand-lessons-v1.json').read_text())
  for lesson in catalog['lessons']:
   extras.extend([lesson['student_lesson'],lesson['teacher_key']])
  for f in extras:
   dest=target/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/f,dest)
  sha=subprocess.run(['git','-C',str(source),'rev-parse','HEAD'],text=True,capture_output=True)
  dirty=subprocess.run(['git','-C',str(source),'status','--porcelain'],text=True,capture_output=True)
  (target/'source.json').write_text(json.dumps({'repository':'mswhitby/TSI','commit':sha.stdout.strip() if sha.returncode==0 and not dirty.stdout.strip() else None},indent=2)+'\n')
 manifest=json.loads((target/'course.json').read_text());data=json.loads((target/'content/week-01-student.json').read_text());key=json.loads((target/'teachers/week-01/answers.json').read_text())['items']
 sessions=manifest['weeks'][0]['sessions'];assert len(sessions)==len(data['days'])==5
 ids=[q['id'] for d in data['days'] for group in ['warmup','guided','practice','exit','check'] for q in d.get(group,[])]
 assert len(ids)==len(set(ids))==50 and set(ids)==set(key),'TSI content/key mismatch'
 assert all(sum(p['minutes'] for p in s['timing'])==30 for s in sessions),'TSI session timing'
 meta=json.loads((target/'source.json').read_text());meta['file']='content/week-01-student.json';meta['sha256']=hashlib.sha256((target/meta['file']).read_bytes()).hexdigest()
 return meta
