"""Runs INSIDE an unprivileged container. Receives inputs, never expected answers."""
import contextlib
import io
import json
import sys

def encode(value):
    kind=type(value).__name__
    if type(value) in (str,int,float,bool,type(None)):
        return [kind,value]
    if type(value) in (list,tuple):
        return [kind,[encode(v) for v in value]]
    if type(value) is dict:
        return [kind,sorted([[encode(k),encode(v)] for k,v in value.items()],key=lambda pair:json.dumps(pair[0],sort_keys=True))]
    raise ValueError('Unsupported return type')

def run(request,source):
    env={'__name__':'__main__' if request['mode']=='script' else 'student'}
    stream=io.StringIO()
    with contextlib.redirect_stdout(stream),contextlib.redirect_stderr(io.StringIO()):
        exec(compile(source,'main.py','exec'),env)
        if request['mode']=='script':
            output=stream.getvalue().replace('\r\n','\n')
            return encode(output[:-1] if output.endswith('\n') else output)
        fn=env.get(request['function'],env.get('solution'))
        if not callable(fn):
            raise NameError('Required function missing')
        args=request['args']
        for position in request.get('tuple_positions',[]):
            args[position]=tuple(args[position])
        return encode(fn(*args,**request.get('kwargs',{})))

if __name__=='__main__':
    try:
        source=open('/work/main.py',encoding='utf-8').read()
        result={'value':run(json.load(sys.stdin),source)}
        print(json.dumps(result,allow_nan=False))
    except BaseException:
        # Keep student errors and output out of trusted parsing and backend logs.
        print('{"error":"Code did not return a valid result"}')
