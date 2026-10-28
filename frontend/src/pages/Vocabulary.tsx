import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Check, CheckCircle2, Plus, Volume2, X } from 'lucide-react';
import { getVocabulary, saveVocabulary, type VocabularyItem } from '../lib/learningStorage';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function Vocabulary() {
  const [items, setItems] = useState<VocabularyItem[]>(() => getVocabulary());
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [showMastered, setShowMastered] = useState(true);
  const tts = useSpeechSynthesis();

  useEffect(() => saveVocabulary(items), [items]);

  const addItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanWord = word.trim();
    const cleanMeaning = meaning.trim();
    if (!cleanWord || !cleanMeaning) return;
    setItems((current) => [{
      id: makeId(), word: cleanWord, meaning: cleanMeaning, example: example.trim(),
      createdAt: new Date().toISOString(), mastered: false,
    }, ...current]);
    setWord(''); setMeaning(''); setExample('');
  };

  const visibleItems = items.filter((item) => showMastered || !item.mastered);
  const masteredCount = items.filter((item) => item.mastered).length;

  return (
    <div className="app-container pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"><BookOpen className="h-3.5 w-3.5" /> PERSONAL LEARNING</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Vocabulary notebook</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Collect useful words and American expressions, listen to them, and review them over time.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Words mastered</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{masteredCount} <span className="text-sm font-medium text-slate-400">/ {items.length}</span></div>
        </div>
      </div>

      <form onSubmit={addItem} className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Add a word or phrase</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Word or expression
            <input value={word} onChange={(e) => setWord(e.target.value)} maxLength={100} required placeholder="e.g. get the ball rolling" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-brand-500" />
          </label>
          <label className="text-sm font-medium text-slate-700">Meaning
            <input value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={240} required placeholder="Start an activity or process" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-brand-500" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Example sentence (optional)
            <textarea value={example} onChange={(e) => setExample(e.target.value)} maxLength={500} rows={2} placeholder="Let's get the ball rolling by introducing ourselves." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 font-normal outline-none focus:border-brand-500" />
          </label>
        </div>
        <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"><Plus className="h-4 w-4" /> Save to notebook</button>
      </form>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Your saved vocabulary <span className="ml-1 text-sm font-normal text-slate-400">({visibleItems.length})</span></h2>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showMastered} onChange={(e) => setShowMastered(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Show mastered words</label>
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Your notebook is ready</p>
          <p className="mt-1 text-sm text-slate-500">Add your first word or phrase above. Your list is saved in this browser.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleItems.map((item) => (
            <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-card ${item.mastered ? 'border-emerald-200' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-lg font-bold text-slate-900">{item.word}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.meaning}</p>
                </div>
                <button type="button" onClick={() => tts.speak(item.word, { rate: 0.88 })} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700" aria-label={`Hear ${item.word}`} title="Hear pronunciation"><Volume2 className="h-4 w-4" /></button>
              </div>
              {item.example && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm italic leading-6 text-slate-600">“{item.example}”</p>}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, mastered: !entry.mastered } : entry))} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${item.mastered ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}>
                  {item.mastered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{item.mastered ? 'Mastered' : 'Mark mastered'}
                </button>
                <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /> Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-slate-400">Vocabulary is stored locally in this browser. It is not synced across devices or user accounts.</p>
    </div>
  );
}
