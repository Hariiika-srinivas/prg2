import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  ArrowRightLeft,
  Volume2,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { Language, TranslationResult } from '../types';
import {
  playAudioCue,
  playBase64Audio,
  stopSpeaking,
  speakWithBrowserTts,
  VoiceRecognitionController,
} from '../utils/audio';

interface MultilingualInterpreterViewProps {
  languages: Language[];
  currentLanguage: Language;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
}

interface ConversationTurn {
  id: string;
  speaker: 'A' | 'B';
  originalText: string;
  sourceLang: Language;
  translatedText: string;
  targetLang: Language;
  romanized?: string;
  culturalNote?: string;
  timestamp: Date;
}

export const MultilingualInterpreterView: React.FC<MultilingualInterpreterViewProps> = ({
  languages,
  currentLanguage,
  voiceName,
}) => {
  // Speaker A language (defaults to currentLanguage or English)
  const [langA, setLangA] = useState<Language>(
    currentLanguage || languages.find((l) => l.code === 'en') || languages[0]
  );
  // Speaker B language (defaults to Hindi or Spanish)
  const [langB, setLangB] = useState<Language>(
    languages.find((l) => l.code === 'hi') || languages.find((l) => l.code === 'es') || languages[1]
  );

  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeakingTurnId, setIsSpeakingTurnId] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [manualSpeaker, setManualSpeaker] = useState<'A' | 'B'>('A');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recognitionRef = useRef<VoiceRecognitionController | null>(null);

  // Quick phrasebook for emergency, navigation, and health
  const PHRASEBOOK = [
    { text: 'Excuse me, can you help me find the train station?', cat: 'Navigation' },
    { text: 'Where is the nearest hospital or pharmacy?', cat: 'Emergency' },
    { text: 'Is this path safe to walk on?', cat: 'Safety' },
    { text: 'How much does this cost?', cat: 'Shopping' },
    { text: 'I am visually impaired and need assistance.', cat: 'Accessibility' },
  ];

  // Swap Languages A and B
  const handleSwapLanguages = () => {
    playAudioCue('click');
    const temp = langA;
    setLangA(langB);
    setLangB(temp);
  };

  // Start speech recognition for either Speaker A or Speaker B
  const handleStartListening = (speaker: 'A' | 'B') => {
    stopSpeaking();
    playAudioCue('listen-start');
    setActiveSpeaker(speaker);

    const sourceLang = speaker === 'A' ? langA : langB;
    const targetLang = speaker === 'A' ? langB : langA;
    const langCode = sourceLang.code === 'en' ? 'en-US' : sourceLang.code;

    if (!recognitionRef.current) {
      recognitionRef.current = new VoiceRecognitionController();
    }

    if (recognitionRef.current.isSupported) {
      recognitionRef.current.start(
        langCode,
        (data) => {
          if (data.isFinal && data.transcript.trim()) {
            handleTranslateText(data.transcript.trim(), speaker, sourceLang, targetLang);
            handleStopListening();
          }
        },
        (err) => {
          console.warn('Speech recognition error:', err);
          handleStopListening();
        },
        () => {
          setActiveSpeaker(null);
        }
      );
    } else {
      const promptText = prompt(`Speak or type in ${sourceLang.name} (${sourceLang.nativeName}):`);
      if (promptText) {
        handleTranslateText(promptText, speaker, sourceLang, targetLang);
      }
      handleStopListening();
    }
  };

  const handleStopListening = () => {
    playAudioCue('listen-stop');
    setActiveSpeaker(null);
    recognitionRef.current?.stop();
  };

  // Execute translation via backend
  const handleTranslateText = async (
    text: string,
    speaker: 'A' | 'B',
    sourceLang: Language,
    targetLang: Language
  ) => {
    if (!text.trim()) return;

    setIsTranslating(true);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang: sourceLang.code,
          targetLang: targetLang.code,
        }),
      });

      const json = await res.json();
      setIsTranslating(false);

      if (json.success && json.data) {
        const d: TranslationResult = json.data;
        const newTurn: ConversationTurn = {
          id: Date.now().toString(),
          speaker,
          originalText: text,
          sourceLang,
          translatedText: d.translatedText,
          targetLang,
          romanized: d.romanizedPronunciation,
          culturalNote: d.culturalNote,
          timestamp: new Date(),
        };

        setHistory((prev) => [newTurn, ...prev]);
        playAudioCue('success');

        // Automatically speak the translated output in target language!
        speakTranslation(d.translatedText, targetLang, newTurn.id);
      }
    } catch (err) {
      console.error('Translation error:', err);
      setIsTranslating(false);
    }
  };

  // Speak translation using Gemini TTS or Web Speech
  const speakTranslation = async (text: string, lang: Language, turnId?: string) => {
    try {
      stopSpeaking();
      if (turnId) setIsSpeakingTurnId(turnId);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: lang.voice || voiceName,
          language: lang.code,
          style: 'Clear, polite, natural conversational interpreter',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
          setIsSpeakingTurnId(null);
          return;
        }
      }

      await speakWithBrowserTts(text, lang.code);
    } catch {
      await speakWithBrowserTts(text, lang.code);
    } finally {
      setIsSpeakingTurnId(null);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full px-2 sm:px-4">
      {/* Language Pair Selector & Swap Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md mb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Speaker A Language */}
          <div className="flex-1 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-1">
              Speaker A
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{langA.flag}</span>
              <select
                value={langA.code}
                onChange={(e) => {
                  const found = languages.find((l) => l.code === e.target.value);
                  if (found) setLangA(found);
                }}
                className="bg-transparent text-sm font-bold text-slate-100 focus:outline-none w-full cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwapLanguages}
            title="Swap Languages"
            className="p-3 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all shrink-0 active:scale-95"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>

          {/* Speaker B Language */}
          <div className="flex-1 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 block mb-1">
              Speaker B
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{langB.flag}</span>
              <select
                value={langB.code}
                onChange={(e) => {
                  const found = languages.find((l) => l.code === e.target.value);
                  if (found) setLangB(found);
                }}
                className="bg-transparent text-sm font-bold text-slate-100 focus:outline-none w-full cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Live Microphone Station */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Speaker A Microphone Card */}
        <div
          onClick={() => {
            if (activeSpeaker === 'A') handleStopListening();
            else handleStartListening('A');
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-lg ${
            activeSpeaker === 'A'
              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-4 ring-indigo-500/20'
              : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-indigo-500/40'
          }`}
        >
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-2.5 transition-transform ${
              activeSpeaker === 'A'
                ? 'bg-indigo-500 text-white scale-105 animate-pulse shadow-lg shadow-indigo-500/40'
                : 'bg-indigo-500/20 text-indigo-400 group-hover:scale-105'
            }`}
          >
            {activeSpeaker === 'A' ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </div>
          <span className="font-bold text-sm text-slate-100">
            {activeSpeaker === 'A' ? 'Listening to Speaker A...' : `Speak ${langA.name}`}
          </span>
          <span className="text-xs text-indigo-400 font-medium mt-0.5">
            {langA.nativeName} {langA.flag}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Tap to speak & translate to {langB.name}</span>
        </div>

        {/* Speaker B Microphone Card */}
        <div
          onClick={() => {
            if (activeSpeaker === 'B') handleStopListening();
            else handleStartListening('B');
          }}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-lg ${
            activeSpeaker === 'B'
              ? 'bg-pink-600/30 border-pink-500 text-pink-200 ring-4 ring-pink-500/20'
              : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-pink-500/40'
          }`}
        >
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-2.5 transition-transform ${
              activeSpeaker === 'B'
                ? 'bg-pink-500 text-white scale-105 animate-pulse shadow-lg shadow-pink-500/40'
                : 'bg-pink-500/20 text-pink-400 group-hover:scale-105'
            }`}
          >
            {activeSpeaker === 'B' ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </div>
          <span className="font-bold text-sm text-slate-100">
            {activeSpeaker === 'B' ? 'Listening to Speaker B...' : `Speak ${langB.name}`}
          </span>
          <span className="text-xs text-pink-400 font-medium mt-0.5">
            {langB.nativeName} {langB.flag}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">Tap to speak & translate to {langA.name}</span>
        </div>
      </div>

      {/* Quick Phrasebook Chips */}
      <div className="mb-3 overflow-x-auto pb-1 flex items-center gap-1.5 scrollbar-none">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0 font-medium px-1">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Phrases:
        </span>
        {PHRASEBOOK.map((phrase, i) => (
          <button
            key={i}
            onClick={() => handleTranslateText(phrase.text, 'A', langA, langB)}
            className="text-xs px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 transition-all shrink-0 cursor-pointer"
          >
            {phrase.text}
          </button>
        ))}
      </div>

      {/* Live Translating Banner */}
      {isTranslating && (
        <div className="mb-3 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
          <span>Translating with Gemini Multilingual AI...</span>
        </div>
      )}

      {/* Conversation Turns Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-3xl">
            <Volume2 className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Bi-directional Voice Interpreter Ready</p>
            <p className="text-xs max-w-sm mt-1">
              Tap Speaker A to speak in {langA.name}, or tap Speaker B to speak in {langB.name}. Drishti will translate and speak aloud instantly!
            </p>
          </div>
        ) : (
          history.map((turn) => {
            const isSpeakerA = turn.speaker === 'A';
            const isSpeaking = isSpeakingTurnId === turn.id;

            return (
              <div
                key={turn.id}
                className={`p-4 rounded-3xl border transition-all ${
                  isSpeakerA
                    ? 'bg-indigo-950/20 border-indigo-900/40'
                    : 'bg-pink-950/20 border-pink-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60">
                  <span
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isSpeakerA ? 'text-indigo-400' : 'text-pink-400'
                    }`}
                  >
                    <span>Speaker {turn.speaker}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      ({turn.sourceLang.name} → {turn.targetLang.name})
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        speakTranslation(turn.translatedText, turn.targetLang, turn.id)
                      }
                      title="Speak translated audio"
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSpeaking
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyText(turn.translatedText, turn.id)}
                      title="Copy translation"
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === turn.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Original spoken query */}
                <p className="text-xs text-slate-400 italic mb-1.5">
                  "{turn.originalText}"
                </p>

                {/* Translated output */}
                <p className="text-base font-bold text-slate-100 leading-snug">
                  {turn.translatedText}
                </p>

                {/* Phonetics & Cultural info */}
                {turn.romanized && (
                  <div className="mt-2 text-xs font-mono text-indigo-300 italic">
                    Pronunciation: "{turn.romanized}"
                  </div>
                )}
                {turn.culturalNote && (
                  <p className="mt-1 text-[11px] text-slate-400 font-sans">
                    💡 {turn.culturalNote}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Input Bar */}
      <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
        <select
          value={manualSpeaker}
          onChange={(e) => setManualSpeaker(e.target.value as any)}
          className="bg-slate-950 text-xs font-bold text-slate-300 rounded-xl px-2.5 py-2 border border-slate-800 focus:outline-none"
        >
          <option value="A">As A ({langA.code.toUpperCase()})</option>
          <option value="B">As B ({langB.code.toUpperCase()})</option>
        </select>

        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualInput.trim()) {
              const src = manualSpeaker === 'A' ? langA : langB;
              const tgt = manualSpeaker === 'A' ? langB : langA;
              handleTranslateText(manualInput.trim(), manualSpeaker, src, tgt);
              setManualInput('');
            }
          }}
          placeholder={`Type message to translate & speak out loud...`}
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none px-2"
        />

        <button
          onClick={() => {
            if (manualInput.trim()) {
              const src = manualSpeaker === 'A' ? langA : langB;
              const tgt = manualSpeaker === 'A' ? langB : langA;
              handleTranslateText(manualInput.trim(), manualSpeaker, src, tgt);
              setManualInput('');
            }
          }}
          disabled={!manualInput.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
