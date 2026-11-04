"""CI-only check of actual execution confinement. No database credentials required."""
from sandbox import encode
from worker import execute
import os
request={'mode':'function','function':'solution','args':[4]}
assert execute('def solution(n):\n return n*2',request)==encode(8)
assert execute('def solution(n):\n return True',request)!=encode(1)
assert execute('while True: pass',request) is None
os.environ['GRADER_SENTINEL_SECRET']='must-not-reach-student'
source='''def solution(n):
 import os,socket
 assert 'GRADER_SENTINEL_SECRET' not in os.environ
 assert not os.path.exists('/var/run/docker.sock')
 try:
  open('/work/main.py','w').write('changed')
  return False
 except OSError: pass
 try:
  socket.create_connection(('1.1.1.1',80),timeout=1)
  return False
 except OSError: pass
 return True
'''
assert execute(source,request)==encode(True)
assert execute('import os; os.write(1,b"x"*1000000)',request) is None
print('Docker confinement, limits, secret isolation and actual returns: PASS')
