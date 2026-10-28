import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Clock3, MessageSquare, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { deleteLiveSession, getLiveSessions, getVocabulary, saveVocabulary, updateLiveSession, type LiveSessionRecord, type SessionReport } from '../lib/learningStorage';

const modeLabels: Record<string, string> = {
  'free-conversation': 'Free conversation', 'everyday-english': 'Everyday American English',
  'job-interview': 'Job interview', pronunciation: 'Pronunciation practice', storytelling: 'Storytelling',
  debate: 'Debate and opinion', 'role-play': 'Role-play', 'daily-challenge': 'Daily challenge',
};
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
const formatDate = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function History() {
  const { sessions } = useApp();
  const [liveSessions, setLiveSessions] = useState<LiveSessionRecord[]>(() => getLiveSessions());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [reportErrors, setReportErrors] = useState<Record<string, string>>({});
  const [vocabRefresh, setVocabRefresh] = useState(0);
  void vocabRefresh;
  const practiceSessions = sessions.filter((session) => !session.sample).slice().sort((a, b) => b.date.localeCompare(a.date));

  const generateReport = async (session: LiveSessionRecord) => {
    setReportLoading(session.id);
    setReportErrors((current) => ({ ...current, [session.id]: '' }));
    try {
      const response = await fetch(`${API}/api/reports/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeLabels[session.mode] || session.mode, level: 'intermediate', transcript: session.lines }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not generate a report.');
      updateLiveSession(session.id, { report: data as SessionReport });
      setLiveSessions(getLiveSessions());
    } catch (caught) {
      setReportErrors((current) => ({ ...current, [session.id]: caught instanceof Error ? caught.message : 'Could not generate a report.' }));
    } finally {
      setReportLoading(null);
    }
  };

  const saveReportWord = (item: { word?: string; meaning?: string; example?: string }) => {
    const word = item.word?.trim();
    const meaning = item.meaning?.trim();
    if (!word || !meaning) return;
    const current = getVocabulary();
    if (!current.some((entry) => entry.word.toLowerCase() === word.toLowerCase())) {
      saveVocabulary([{ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, word, meaning, example: item.example || '', createdAt: new Date().toISOString(), mastered: false }, ...current]);
    }
    setVocabRefresh((value) => value + 1);
  };

  const removeSession = (id: string) => {
    if (!window.confirm('Delete this saved live-session transcript?')) return;
    deleteLiveSession(id);
    setLiveSessions(getLiveSessions());
    if (expanded === id) setExpanded(null);
  };

  return (
    <div className="app-container pt-10 sm:pt-14">
      <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"><MessageSquare className="h-3.5 w-3.5" /> YOUR LEARNING RECORD</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Session history</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Review saved live-coach transcripts and see the practice sessions recorded on this device.</p>

      <section className="mt-7">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Live Coach conversations</h2><span className="text-sm text-slate-400">{liveSessions.length} saved</span></div>
        {liveSessions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Clock3 className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No live sessions saved yet</p>
            <p className="mt-1 text-sm text-slate-500">After a Live Coach conversation, choose “End and save session” to keep its transcript here.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {liveSessions.map((session) => {
              const isOpen = expanded === session.id;
              const learnerTurns = session.lines.filter((line) => line.role === 'user').length;
              return <article key={session.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><MessageSquare className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-900">{modeLabels[session.mode] || session.mode} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{session.source === 'demo' ? 'Demo' : 'Live AI'}</span></h3><p className="mt-1 text-xs text-slate-500">{formatDate(session.createdAt)} · {formatDuration(session.durationSeconds)} · {learnerTurns} learner turns</p></div>
                  <button type="button" onClick={() => setExpanded(isOpen ? null : session.id)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700">{isOpen ? 'Hide details' : 'View details'}{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                  <button type="button" onClick={() => removeSession(session.id)} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete saved session"><Trash2 className="h-4 w-4" /></button>
                </div>
                {isOpen && <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-slate-800">AI learning report</h4><p className="text-xs text-slate-500">Text-based feedback; pronunciation is not scored.</p></div><button type="button" onClick={() => void generateReport(session)} disabled={reportLoading === session.id || session.lines.filter((line) => line.role === 'user').length === 0} className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{reportLoading === session.id ? 'Generating…' : session.report ? 'Refresh AI report' : 'Generate AI report'}</button></div>
                  {reportErrors[session.id] && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{reportErrors[session.id]}</p>}
                  {session.report && <div className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-4"><p className="text-sm leading-6 text-slate-700">{session.report.summary}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([['Overall', session.report.scores.overall], ['Grammar', session.report.scores.grammar], ['Vocabulary', session.report.scores.vocabulary], ['Fluency', session.report.scores.fluency]] as const).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-xl font-bold text-slate-800">{value === null ? '—' : value}</div></div>)}</div><p className="text-xs text-slate-500">{session.report.score_notes}</p>
                    {session.report.grammar.length > 0 && <div><h5 className="mb-2 text-sm font-semibold text-slate-800">Grammar suggestions</h5><div className="space-y-2">{session.report.grammar.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-slate-500">{item.original}</p><p className="mt-1 font-medium text-slate-800">{item.corrected}</p>{item.explanation && <p className="mt-1 text-xs text-slate-500">{item.explanation}</p>}</div>)}</div></div>}
                    {session.report.natural_expressions.length > 0 && <div><h5 className="mb-2 text-sm font-semibold text-slate-800">More natural American expressions</h5><div className="space-y-2">{session.report.natural_expressions.map((item, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">{item.original}</span><span className="mx-2 text-slate-300">→</span><span className="font-medium text-slate-800">{item.more_natural}</span></div>)}</div></div>}
                    {session.report.vocabulary.length > 0 && <div><h5 className="mb-2 text-sm font-semibold text-slate-800">Useful vocabulary</h5><div className="grid gap-2 sm:grid-cols-2">{session.report.vocabulary.map((item, index) => { const saved = Boolean(item.word && getVocabulary().some((entry) => entry.word.toLowerCase() === item.word!.toLowerCase())); return <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-800">{item.word}</p><p className="mt-1 text-slate-600">{item.meaning}</p>{item.example && <p className="mt-1 italic text-slate-500">{item.example}</p>}<button type="button" onClick={() => saveReportWord(item)} disabled={!item.word || !item.meaning || saved} className="mt-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-60">{saved ? "Saved to notebook" : "Save to notebook"}</button></div>})}</div></div>}
                    {session.report.pronunciation && <p className="text-xs text-slate-400">{session.report.pronunciation.note}</p>}
                  </div>}
                  <div className="space-y-3 border-t border-slate-200 pt-4"><h4 className="font-semibold text-slate-800">Transcript</h4>{session.lines.length ? session.lines.map((line, index) => <div key={`${session.id}-${index}`} className={`rounded-xl p-3 text-sm leading-6 ${line.role === 'user' ? 'ml-5 bg-brand-50 text-slate-800 sm:ml-12' : 'mr-5 bg-white text-slate-700 sm:mr-12'}`}><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{line.role === 'user' ? 'You' : 'Coach'}</div>{line.text}</div>) : <p className="text-sm text-slate-500">No transcript text was captured in this session.</p>}</div>
                </div>}
              </article>;
            })}
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">Structured practice sessions</h2><span className="text-sm text-slate-400">{practiceSessions.length} saved</span></div>
        {practiceSessions.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Completed scenario-based practice sessions will appear here.</p> : <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{practiceSessions.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 last:border-b-0"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500"><BookOpen className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{session.scenarioId.replace(/-/g, ' ')}</p><p className="mt-0.5 text-xs text-slate-500">{session.date} · {formatDuration(session.durationSeconds)} · {session.turnsCompleted} answers</p></div><div className="text-right"><div className="font-bold text-slate-800">{session.averageScore}</div><div className="text-[10px] uppercase text-slate-400">score</div></div></div>)}</div>}
      </section>
      <p className="mt-6 text-xs text-slate-400">History is stored in this browser on this device. This merged version does not yet sync transcripts to a cloud account.</p>
    </div>
  );
}
