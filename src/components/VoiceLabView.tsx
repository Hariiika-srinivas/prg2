import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Sliders,
  CheckCircle2,
  Cpu,
  Radio,
  Play,
  Square,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Language } from '../types';
import { playAudioCue, playBase64Audio, stopSpeaking, speakWithBrowserTts } from '../utils/audio';

interface VoiceLabViewProps {
  currentLanguage: Language;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  onChangeVoiceName: (voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr') => void;
  backendOnline: boolean;
}

export const VoiceLabView: React.FC<VoiceLabViewProps> = ({
  currentLanguage,
  voiceName,
  onChangeVoiceName,
  backendOnline,
}) => {
  const [testText, setTestText] = useState(
    'Step carefully. Two concrete stairs descending 1 meter ahead on your path.'
  );
  const [selectedStyle, setSelectedStyle] = useState('Clear spatial navigation guide');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastAudioLatency, setLastAudioLatency] = useState<number | null>(null);

  const STYLES = [
    'Clear spatial navigation guide',
    'Warm, empathetic companion',
    'Urgent hazard alert broadcast',
    'Polite international diplomat',
    'Cheerful and encouraging',
  ];

  const VOICES: Array<{ id: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'; desc: string; tone: string }> = [
    { id: 'Kore', desc: 'Natural Female Voice', tone: 'Balanced, clear and friendly' },
    { id: 'Puck', desc: 'Energetic Male Voice', tone: 'Dynamic and vibrant' },
    { id: 'Zephyr', desc: 'Warm Calm Voice', tone: 'Gentle, soothing and patient' },
    { id: 'Fenrir', desc: 'Deep Authoritative Voice', tone: 'Confident and clear' },
    { id: 'Charon', desc: 'Crisp Formal Voice', tone: 'Direct and professional' },
  ];

  const handleTestTts = async () => {
    try {
      stopSpeaking();
      setIsPlaying(true);
      const startTime = performance.now();

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voiceName,
          style: selectedStyle,
          language: currentLanguage.code,
        }),
      });

      const latency = Math.round(performance.now() - startTime);
      setLastAudioLatency(latency);

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
          setIsPlaying(false);
          return;
        }
      }

      await speakWithBrowserTts(testText, currentLanguage.code);
    } catch {
      await speakWithBrowserTts(testText, currentLanguage.code);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full px-2 sm:px-4 overflow-y-auto space-y-4 pb-6">
      {/* Diagnostics Card */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">Voice AI Diagnostics & Health</h2>
              <p className="text-xs text-slate-400">Real-time status of backend models & speech engines</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
              backendOnline ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {backendOnline ? 'Engine Active' : 'Connecting'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Reasoning Model</span>
            <span className="font-bold text-slate-100 font-mono">gemini-3.8-flash</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">TTS Voice Model</span>
            <span className="font-bold text-indigo-400 font-mono">gemini-3.8-flash-lite-tts</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Active Language</span>
            <span className="font-bold text-slate-100">{currentLanguage.name} {currentLanguage.flag}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block mb-1">Last Synthesis Latency</span>
            <span className="font-bold text-emerald-400 font-mono">
              {lastAudioLatency ? `${lastAudioLatency} ms` : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Gemini Voice Synthesis Studio */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">Voice Persona & Speech Studio</h3>
            <p className="text-xs text-slate-400">Configure speech cadence, emotional inflection, and tone</p>
          </div>
        </div>

        {/* Voices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
          {VOICES.map((v) => {
            const isSelected = voiceName === v.id;
            return (
              <div
                key={v.id}
                onClick={() => {
                  onChangeVoiceName(v.id);
                  playAudioCue('click');
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-100">{v.id}</span>
                  {isSelected && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold">Selected</span>}
                </div>
                <p className="text-xs text-slate-300 font-medium">{v.desc}</p>
                <p className="text-[11px] text-slate-500 mt-1">{v.tone}</p>
              </div>
            );
          })}
        </div>

        {/* Style Selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">Speech Demeanor & Style Prompt</label>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStyle(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedStyle === st
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input to Synthesize */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">Custom Text to Synthesize</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Play Synthesized Speech Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestTts}
            disabled={isPlaying || !testText.trim()}
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current animate-pulse" />
                <span>Playing Voice...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Synthesize & Speak with Gemini Voice</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              stopSpeaking();
              setIsPlaying(false);
            }}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Stop Audio
          </button>
        </div>
      </div>

      {/* Voice Commands Cheatsheet */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100">Voice Assistant Hands-Free Commands</h3>
            <p className="text-xs text-slate-400">Speak these anytime into the microphone</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { cmd: '"Describe what you see"', desc: 'Triggers visual scene description of obstacles & room' },
            { cmd: '"Is the path clear?"', desc: 'Checks forward walking path for trip hazards & drops' },
            { cmd: '"Translate this into Hindi / Spanish"', desc: 'Translates speech or text with Romanized phonetics' },
            { cmd: '"Read the sign / text"', desc: 'Performs OCR text extraction and verbal reading' },
            { cmd: '"Find my keys / wallet / door"', desc: 'Searches for target objects in camera frame' },
            { cmd: '"Repeat that louder"', desc: 'Repeats the last guidance announcement' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span className="font-bold text-indigo-300 font-mono block mb-0.5">{item.cmd}</span>
              <span className="text-slate-400 text-[11px]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
