"""Trusted queue worker. No student code runs in this process or sees its credentials."""
import ast
import importlib.util
import json
import os
from pathlib import Path
import selectors
import subprocess
import tempfile
import time
import urllib.request
import uuid
from sandbox import encode

IMAGE='python:3.12-slim'

def request_for(case):
    call=ast.parse(case['call'],mode='eval').body
    if not isinstance(call,ast.Call) or not isinstance(call.func,ast.Name):
        raise ValueError('Unsupported authored function call')
    return {'mode':'function','function':call.func.id,'args':[ast.literal_eval(a) for a in call.args],'kwargs':{k.arg:ast.literal_eval(k.value) for k in call.keywords}}

def cases_for(activity,curriculum,trusted):
    kind,_,slug=activity.partition(':')
    if kind=='challenge':
        item=next((c for c in curriculum['challenges'] if c['id']==slug),None)
        if not item or slug not in trusted.TESTS:return None
        fn=item['examples'][0]['call'].split('(',1)[0]
        cases=[({'mode':'function','function':fn,'args':args,'tuple_positions':[1,2] if slug=='robot-maze-navigator' else []},encode(expected)) for _,args,expected in trusted.TESTS[slug]]
        return trusted.MANIFEST[slug],'grader_tests',cases
    if kind=='lesson':
        item=next((l for l in curriculum['lessons'] if l['id']==slug),None)
        if not item:return None
        cases=[({'mode':'script'} if item['mode']=='script' else request_for(c),encode(c['expected'] if item['mode']=='script' else ast.literal_eval(c['expected']))) for c in item['cases']]
        return item['points'],'published_tests',cases
    return None

def execute(source,request):
    """Read bounded actual output; compare it with expectations only in the parent."""
    with tempfile.TemporaryDirectory() as directory:
        folder=Path(directory);folder.chmod(0o755)
        (folder/'main.py').write_text(source,encoding='utf-8')
        (folder/'sandbox.py').write_text(Path(__file__).with_name('sandbox.py').read_text())
        name='playground-'+uuid.uuid4().hex
        command=['docker','run','--rm','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','32','--memory','128m','--cpus','1','--user','65534:65534','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--mount','type=bind,source='+str(folder)+',target=/work,readonly','-i',IMAGE,'python','-I','-B','/work/sandbox.py']
        process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        output=bytearray();deadline=time.monotonic()+6
        try:
            process.stdin.write(json.dumps(request).encode());process.stdin.close()
            with selectors.DefaultSelector() as poll:
                poll.register(process.stdout,selectors.EVENT_READ)
                while time.monotonic()<deadline:
                    ready=poll.select(.1)
                    if ready:
                        chunk=process.stdout.read1(8192)
                        if not chunk:break
                        output.extend(chunk)
                        if len(output)>65536:return None
                    elif process.poll() is not None:break
            if process.poll() is None:process.wait(timeout=.2)
            if process.returncode in (125,126,127):raise RuntimeError('Container could not start')
            if process.returncode:return None
            result=json.loads(output)
            return result.get('value') if isinstance(result,dict) else None
        except (subprocess.TimeoutExpired,json.JSONDecodeError,UnicodeDecodeError,BrokenPipeError):return None
        finally:
            if process.poll() is None:process.kill()
            process.wait()
            subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)

def rpc(name,payload):
    url=os.environ['SUPABASE_URL'].rstrip('/')+'/rest/v1/rpc/'+name
    key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)

def main():
    spec=importlib.util.spec_from_file_location('trusted_cases',os.environ['GRADER_CASES_DIR']+'/run_tests.py')
    trusted=importlib.util.module_from_spec(spec);spec.loader.exec_module(trusted)
    curriculum=json.loads(Path(os.environ['GRADER_CURRICULUM']).read_text())
    processed=0
    deadline=time.monotonic()+7*60
    while processed<60 and time.monotonic()<deadline:
        jobs=rpc('playground_claim_grades',{'p_limit':1})
        if not jobs:break
        job=jobs[0]
        result={'p_id':job['id'],'p_lease':job['lease'],'p_status':'error','p_version':os.environ['GRADER_VERSION']}
        try:
            contract=cases_for(job['activity_id'],curriculum,trusted)
            if contract is None:result['p_status']='unavailable'
            else:
                points,scope,cases=contract
                if not 0<len(cases)<=60:raise ValueError('Invalid grader case count')
                source=job['files'].get('main.py')
                if not isinstance(source,str) or len(source.encode())>30000:source='raise ValueError("Invalid source")'
                passed=sum(execute(source,inputs)==expected for inputs,expected in cases)
                result.update(p_status='graded',p_possible=points,p_passed=passed,p_total=len(cases),p_scope=scope)
        except Exception:
            # An infrastructure problem is not a zero for the student.
            print('Grading infrastructure error; result marked for review',flush=True)
        if rpc('playground_finish_grade',result) is not True:raise RuntimeError('Grade lease expired or was replaced')
        processed+=1
    print('Finished',processed,'submitted snapshots')

if __name__=='__main__':main()
