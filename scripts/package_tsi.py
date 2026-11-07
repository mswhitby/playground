"""Publish only the replacement TSI curriculum into the shared application."""
import hashlib,json,shutil,subprocess
from pathlib import Path

def package_tsi(dist,source=None):
 target=Path(dist)/'data/tsi-math'
 if source and target.exists():
  shutil.rmtree(target)
 if not source:
  if not (target/'content/20-day-program.json').exists():
   raise FileNotFoundError('TSI authoring checkout is required for replacement curriculum')
 else:
  source=Path(source).resolve()
  files=['content/20-day-program.json','content/math-locator-profiles.json','content/diagnostic-20day-v1.json','content/strand-lessons-v1.json']
  catalog=json.loads((source/'content/strand-lessons-v1.json').read_text())
  for item in catalog['lessons']:
   files.extend([item['student_lesson'],item['teacher_key']])
  for file in files:
   dest=target/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/file,dest)
  commit=subprocess.run(['git','-C',str(source),'rev-parse','HEAD'],capture_output=True,text=True)
  (target/'source.json').write_text(json.dumps({'repository':'mswhitby/TSI','commit':commit.stdout.strip() if commit.returncode==0 else None})+'\n')
 plan=json.loads((target/'content/20-day-program.json').read_text())
 assert len(plan['days'])==20 and [d['day'] for d in plan['days']]==list(range(1,21))
 profiles=json.loads((target/'content/math-locator-profiles.json').read_text())['profiles']
 assert len(profiles)==81 and len({p['code'] for p in profiles})==81
 diagnostic=json.loads((target/'content/diagnostic-20day-v1.json').read_text())['items']
 assert len(diagnostic)>=12 and {q['strand'] for q in diagnostic}=={'quantitative','algebraic','geometry','statistics'}
 metadata=json.loads((target/'source.json').read_text()) if (target/'source.json').exists() else {}
 metadata['file']='content/20-day-program.json'
 metadata['sha256']=hashlib.sha256((target/metadata['file']).read_bytes()).hexdigest()
 return metadata
