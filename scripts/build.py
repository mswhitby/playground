"""Package the shared shell and validated content from separate course repositories."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--game-source',type=Path,default=root.parent/'game-programming');args=p.parse_args()
source=args.game_source.resolve();course=json.loads((source/'course.json').read_text())
subprocess.run(['node',str(root/'scripts/validate.mjs'),str(source/'course.json')],check=True)
for unit in course['units']:
 for lesson in unit['lessons']:
  exercise=lesson['exercise'];file=source/exercise['file']
  if file.read_text()!=exercise['starter']:raise ValueError('Published starter differs from '+str(file))
dist=root/'dist';shutil.rmtree(dist,ignore_errors=True);shutil.copytree(root/'public',dist)
target=dist/'data/game-programming';target.mkdir(parents=True);shutil.copy2(source/'course.json',target/'course.json')
(dist/'.nojekyll').write_text('')
commit=subprocess.run(['git','-C',str(source),'rev-parse','HEAD'],text=True,capture_output=True)
dirty=subprocess.run(['git','-C',str(source),'diff','--quiet','HEAD','--','course.json']).returncode != 0
(dist/'content-sources.json').write_text(json.dumps({'game-programming':{'repository':'mswhitby/game-programming','commit':commit.stdout.strip() if commit.returncode==0 and not dirty else None,'file':'course.json','sha256':hashlib.sha256((source/'course.json').read_bytes()).hexdigest()}},indent=2)+'\n')
print('Packaged shared Playground in',dist)
