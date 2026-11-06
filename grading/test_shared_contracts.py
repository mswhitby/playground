"""Check shared-bank contracts without needing access to the private repository."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from worker import shared_cases_for

class SharedChallengeContracts(unittest.TestCase):
    def test_private_cases_are_loaded_without_revealing_expected_values(self):
        with tempfile.TemporaryDirectory() as root:
            problem=Path(root)/'problems'/'sample-test'
            (problem/'tests').mkdir(parents=True)
            (problem/'config.json').write_text(json.dumps({
                'id':'sample-test','points':15,'signature':{'python':'sample_test'}
            }))
            (problem/'tests'/'hidden.json').write_text(json.dumps({
                'challengeId':'sample-test',
                'cases':[{'input':[[1,2]],'expected':3},{'input':[[]],'expected':0}]
            }))
            possible,scope,cases=shared_cases_for('challenge:shared-sample-test',root)
            self.assertEqual((possible,scope,len(cases)),(15,'grader_tests',2))
            self.assertEqual(cases[0][0]['function'],'sample_test')
            self.assertEqual(cases[0][0]['args'],[[1,2]])
            self.assertIsNone(shared_cases_for('challenge:shared-../../secrets',root))
            self.assertIsNone(shared_cases_for('challenge:shared-unknown',root))
            self.assertIsNone(shared_cases_for('challenge:shared-sample-test',None))

if __name__=='__main__':unittest.main()
