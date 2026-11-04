import unittest
from sandbox import encode,run
from worker import request_for,cases_for

class Contracts(unittest.TestCase):
 def test_exact_types_and_mapping_order(self):
  self.assertNotEqual(encode(True),encode(1))
  self.assertNotEqual(encode((1,)),encode([1]))
  self.assertEqual(encode({'a':1,'b':2}),encode({'b':2,'a':1}))
 def test_script_and_return_are_separate(self):
  self.assertEqual(run({'mode':'script'},'print("Ready")'),encode('Ready'))
  self.assertEqual(run({'mode':'function','function':'add','args':[2,3]},'def add(a,b):\n return a+b'),encode(5))
  self.assertEqual(run({'mode':'function','function':'add','args':[2,3]},'def add(a,b):\n print(a+b)'),encode(None))
 def test_literal_calls_only(self):
  self.assertEqual(request_for({'call':'join([1, 2], end="!")'})['kwargs'],{'end':'!'})
  with self.assertRaises(ValueError):request_for({'call':'__import__("os").system("pwd")'})
 def test_scope_and_unknown_activity(self):
  class Trusted:
   MANIFEST={'count':10}
   TESTS={'count':[['unpublished',[4],8]]}
  curriculum={'challenges':[{'id':'count','examples':[{'call':'double(2)'}]}],'lessons':[{'id':'intro','mode':'script','points':5,'cases':[{'expected':'Hello'}]}]}
  score,scope,cases=cases_for('challenge:count',curriculum,Trusted)
  self.assertEqual((score,scope),(10,'grader_tests'))
  self.assertNotIn('expected',cases[0][0]);self.assertEqual(cases[0][0]['function'],'double')
  self.assertEqual(cases_for('lesson:intro',curriculum,Trusted)[1],'published_tests')
  self.assertIsNone(cases_for('challenge:missing',curriculum,Trusted))

if __name__=='__main__':unittest.main()
