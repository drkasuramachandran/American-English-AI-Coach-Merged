"""Honest transcript-based feedback scaffold; never labels text estimates as audio measurements."""
def transcript_report(transcript: list[dict]) -> dict:
    user_turns = [x.get('text','').strip() for x in transcript if x.get('role') == 'user' and x.get('text','').strip()]
    count = len(user_turns)
    return {
      'metric_basis': 'transcript-based estimate',
      'scores': {'grammar': None, 'vocabulary': None, 'fluency': None, 'overall': None, 'pronunciation': None},
      'notice': 'Scores are not generated until a validated assessment is available. Pronunciation requires audio-based evidence.',
      'grammar_improvements': [], 'natural_expressions': [], 'vocabulary_suggestions': [],
      'corrected_examples': [], 'useful_phrases': [],
      'recommended_exercise': 'Speak for one minute about your day, then retell it using past-tense verbs.',
      'user_turn_count': count
    }
