import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.prompts import instructions, MODES
from app.feedback import transcript_report
from app.auth import hash_password, verify_password

def test_prompt_modes_and_safe_rules():
    assert len(MODES) >= 8
    prompt = instructions('job-interview', 'beginner', 'slow', 'frequent')
    assert 'Never penalize an understandable non-American accent' in prompt
    assert 'job-interview' not in prompt or 'Job Interview' in prompt

def test_feedback_does_not_fabricate_scores():
    result = transcript_report([{'role':'user','text':'I went shopping.'}])
    assert result['metric_basis'] == 'transcript-based estimate'
    assert result['scores']['pronunciation'] is None
    assert result['user_turn_count'] == 1

def test_password_hashing():
    hashed = hash_password('a-long-test-password')
    assert hashed != 'a-long-test-password'
    assert verify_password('a-long-test-password', hashed)
    assert not verify_password('wrong-password', hashed)
