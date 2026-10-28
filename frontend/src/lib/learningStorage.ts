import { loadJSON, saveJSON } from './storage';

const VOCABULARY_KEY = 'aesc.vocabulary.v1';
const LIVE_SESSIONS_KEY = 'aesc.live-sessions.v1';

export interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  example: string;
  createdAt: string;
  mastered: boolean;
}

export interface LiveTranscriptLine {
  role: 'user' | 'assistant';
  text: string;
}

export interface SessionReport {
  summary: string;
  scores: { grammar: number | null; vocabulary: number | null; fluency: number | null; overall: number | null };
  score_notes: string;
  grammar: { original?: string; corrected?: string; explanation?: string }[];
  natural_expressions: { original?: string; more_natural?: string }[];
  vocabulary: { word?: string; meaning?: string; example?: string }[];
  clarity: string;
  fluency: string;
  repeated_mistakes: string[];
  next_exercise?: { title?: string; reason?: string } | null;
  user_word_count: number;
  pronunciation?: { status: string; note: string };
}

export interface LiveSessionRecord {
  id: string;
  mode: string;
  createdAt: string;
  durationSeconds: number;
  lines: LiveTranscriptLine[];
  source: 'live' | 'demo';
  report?: SessionReport;
}

export function getVocabulary(): VocabularyItem[] {
  return loadJSON<VocabularyItem[]>(VOCABULARY_KEY, []);
}

export function saveVocabulary(items: VocabularyItem[]): void {
  saveJSON(VOCABULARY_KEY, items);
}

export function getLiveSessions(): LiveSessionRecord[] {
  return loadJSON<LiveSessionRecord[]>(LIVE_SESSIONS_KEY, []);
}

export function saveLiveSession(session: LiveSessionRecord): void {
  const sessions = getLiveSessions();
  saveJSON(LIVE_SESSIONS_KEY, [session, ...sessions].slice(0, 100));
}

export function updateLiveSession(id: string, patch: Partial<LiveSessionRecord>): void {
  saveJSON(LIVE_SESSIONS_KEY, getLiveSessions().map((session) => session.id === id ? { ...session, ...patch } : session));
}

export function deleteLiveSession(id: string): void {
  saveJSON(LIVE_SESSIONS_KEY, getLiveSessions().filter((session) => session.id !== id));
}
