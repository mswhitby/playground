"""Verify the pinned challenge grader still matches the course being published."""
import importlib.util
import json
from pathlib import Path
from sandbox import encode
from worker import cases_for,execute
spec=importlib.util.spec_from_file_location('trusted_cases','challenge-grader/grader/run_tests.py')
trusted=importlib.util.module_from_spec(spec);spec.loader.exec_module(trusted)
curriculum=json.loads(Path('dist/data/computer-science-1/course.json').read_text())
assert set(trusted.MANIFEST)=={c['id'] for c in curriculum['challenges']}
for item in curriculum['challenges']:
 points,scope,cases=cases_for('challenge:'+item['id'],curriculum,trusted)
 assert points==item['points'] and scope=='grader_tests' and len(cases)>=len(item['examples'])
source='''def count_app_events(events):
 counts={'click':0,'view':0,'submit':0}
 for event in events: counts[event.lower()]+=1
 return counts
'''
_,_,cases=cases_for('challenge:app-event-type-tally',curriculum,trusted)
assert all(execute(source,inputs)==expected for inputs,expected in cases),'Published challenge function and grader differ'
print('All 24 challenge contracts and actual event-tally grading: PASS')
