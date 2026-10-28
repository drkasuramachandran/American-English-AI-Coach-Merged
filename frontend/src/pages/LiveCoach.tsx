import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, RefreshCw, Volume2 } from 'lucide-react';
import { saveLiveSession, type LiveTranscriptLine } from '../lib/learningStorage';

const API = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const modeLabels: Record<string, string> = {
  'free-conversation': 'Free conversation', 'everyday-english': 'Everyday American English',
  'job-interview': 'Job interview', pronunciation: 'Pronunciation practice', storytelling: 'Storytelling',
  debate: 'Debate and opinion', 'role-play': 'Role-play', 'daily-challenge': 'Daily challenge',
};

export default function LiveCoach() {
  const [status, setStatus] = useState('Session ended');
  const [mode, setMode] = useState('free-conversation');
  const [muted, setMuted] = useState(false);
  const [lines, setLines] = useState<LiveTranscriptLine[]>([]);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [sessionSource, setSessionSource] = useState<'live' | 'demo'>('live');
  const [savedCurrentSession, setSavedCurrentSession] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const channel = useRef<RTCDataChannel | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const audio = useRef<HTMLAudioElement | null>(null);
  const active = useRef(false);

  const cleanup = () => {
    if (timer.current !== undefined) window.clearInterval(timer.current);
    timer.current = undefined;
    channel.current?.close();
    pc.current?.getSenders().forEach((sender) => sender.track?.stop());
    pc.current?.close();
    stream.current?.getTracks().forEach((track) => track.stop());
    if (audio.current) audio.current.srcObject = null;
    channel.current = null;
    pc.current = null;
    stream.current = null;
    active.current = false;
    setMuted(false);
    setStatus('Session ended');
  };

  useEffect(() => () => cleanup(), []);

  const start = async (useDemo: boolean) => {
    cleanup();
    setError('');
    setLines([]);
    setSeconds(0);
    setSavedCurrentSession(false);
    setSessionSource(useDemo ? 'demo' : 'live');
    setStatus('Connecting');
    active.current = true;

    if (useDemo) {
      setStatus('Demo session');
      setLines([
        { role: 'assistant', text: 'Hi there! Let’s practice American English. What did you do today? This is a scripted preview, not a live AI conversation.' },
      ]);
      timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('This browser does not support microphone/WebRTC. Try an updated Chrome or Edge over HTTPS or localhost.');
      }
      const response = await fetch(`${API}/api/voice/session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, level: 'intermediate', speed: 'normal', correction_frequency: 'balanced' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Could not start realtime session.');

      const peer = new RTCPeerConnection();
      pc.current = peer;
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setStatus('Listening');
        else if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') setStatus('Reconnecting');
      };
      const remote = new MediaStream();
      const element = new Audio();
      element.autoplay = true;
      element.srcObject = remote;
      audio.current = element;
      peer.ontrack = (event) => event.streams[0].getTracks().forEach((track) => remote.addTrack(track));

      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      stream.current = microphone;
      microphone.getTracks().forEach((track) => peer.addTrack(track, microphone));

      const dataChannel = peer.createDataChannel('oai-events');
      channel.current = dataChannel;
      dataChannel.onmessage = (event) => {
        try {
          const value = JSON.parse(event.data);
          if (value.type === 'input_audio_buffer.speech_started') setStatus('Listening');
          if (value.type === 'response.created') setStatus('Processing');
          if (value.type === 'response.audio.delta') setStatus('AI speaking');
          if (value.type === 'response.audio_transcript.done' || value.type === 'response.output_audio_transcript.done') {
            if (value.transcript) setLines((previous) => [...previous, { role: 'assistant', text: value.transcript }]);
            setStatus('Listening');
          }
          if (value.type === 'conversation.item.input_audio_transcription.completed' && value.transcript) {
            setLines((previous) => [...previous, { role: 'user', text: value.transcript }]);
          }
          if (value.type === 'error') setError(value.error?.message || 'Realtime session error');
        } catch {
          // Ignore non-JSON or unrecognized realtime events.
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answer = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(data.model)}`, {
        method: 'POST', headers: { Authorization: `Bearer ${data.client_secret}`, 'Content-Type': 'application/sdp' }, body: offer.sdp,
      });
      if (!answer.ok) throw new Error('Realtime connection failed. Reconnect and check that your account has access to the configured model.');
      await peer.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
      timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
      setStatus('Connecting');
    } catch (caught) {
      cleanup();
      setStatus('Error');
      setError(caught instanceof Error ? caught.message : 'Could not start voice session.');
    }
  };

  const endAndSave = () => {
    const snapshot = lines.map((line) => ({ ...line }));
    if (snapshot.length && !savedCurrentSession) {
      saveLiveSession({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        createdAt: new Date().toISOString(),
        durationSeconds: seconds,
        lines: snapshot,
        source: sessionSource,
      });
      setSavedCurrentSession(true);
    }
    cleanup();
  };

  const toggleMic = () => {
    const next = !muted;
    stream.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };
  const fmt = (value: number) => `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  const running = active.current && status !== 'Error';

  return <div className="app-container max-w-4xl pt-8">
    <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">Live speaking studio</p><h1 className="mt-2 text-3xl font-bold">American English AI Coach</h1><p className="mt-2 text-slate-500">Practice speaking naturally, review your transcript, and save completed sessions to your learning history.</p></div>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium">Practice mode <select className="ml-2 max-w-full rounded-xl border p-2 text-slate-900" value={mode} onChange={(event) => setMode(event.target.value)} disabled={running}><option value="free-conversation">Free conversation</option><option value="everyday-english">Everyday American English</option><option value="job-interview">Job interview</option><option value="pronunciation">Pronunciation practice</option><option value="storytelling">Storytelling</option><option value="debate">Debate and opinion</option><option value="role-play">Role-play</option><option value="daily-challenge">Daily challenge</option></select></label>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{status}</span>
      </div>
      <div className="mx-auto my-8 flex max-w-sm flex-col items-center text-center"><div className={`flex h-28 w-28 items-center justify-center rounded-full ${status === 'AI speaking' ? 'animate-pulse bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}><Volume2 size={42} /></div><p className="mt-4 text-2xl font-semibold">{fmt(seconds)}</p><p className="mt-1 text-sm text-slate-500">Conversation time · {modeLabels[mode] || mode}</p></div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => void start(false)} disabled={running} className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Start real AI practice</button>
        <button type="button" onClick={() => void start(true)} disabled={running} className="rounded-full border px-5 py-3 font-semibold disabled:opacity-50">Demo Mode</button>
        <button type="button" onClick={toggleMic} disabled={!stream.current} className="rounded-full border p-3 disabled:opacity-40" aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff /> : <Mic />}</button>
        <button type="button" onClick={endAndSave} disabled={savedCurrentSession || (!running && lines.length === 0)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-3 font-semibold text-red-600 disabled:opacity-40"><PhoneOff size={17} /> {savedCurrentSession ? 'Session saved' : 'End and save session'}</button>
        <button type="button" onClick={() => void start(sessionSource === 'demo')} className="rounded-full border p-3" aria-label="Restart session"><RefreshCw /></button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="rounded-2xl bg-slate-50 p-4"><h2 className="mb-3 font-semibold">Live transcript</h2>{lines.length === 0 ? <p className="text-sm text-slate-500">Your conversation will appear here. Microphone access is requested when you start.</p> : <div className="max-h-72 space-y-3 overflow-y-auto">{lines.map((line, index) => <p key={index} className="text-sm leading-6"><b>{line.role === 'user' ? 'You:' : 'Coach:'}</b> {line.text}</p>)}</div>}</div>
      <p className="mt-3 text-xs text-slate-500">Demo Mode is scripted. Real mode requires server-side OpenAI API access. Saved transcripts are stored in this browser and are not uploaded. Pronunciation is not automatically scored from transcript text.</p>
    </section>
  </div>;
}
