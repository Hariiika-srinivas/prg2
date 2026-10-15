import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Camera,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Play,
  Square,
  Copy,
  ChevronDown,
  Layers,
  Check,
} from 'lucide-react';
import { Language, ChatMessage } from '../types';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';
import {
  playAudioCue,
  playBase64Audio,
  stopSpeaking,
  speakWithBrowserTts,
  VoiceRecognitionController,
} from '../utils/audio';

interface VoiceChatViewProps {
  currentLanguage: Language;
  onOpenLanguageSelector: () => void;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  onChangeVoiceName: (voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr') => void;
}

export const VoiceChatView: React.FC<VoiceChatViewProps> = ({
  currentLanguage,
  onOpenLanguageSelector,
  voiceName,
  onChangeVoiceName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [persona, setPersona] = useState<'helpful-companion' | 'navigator' | 'brief-expert'>('helpful-companion');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const recognitionRef = useRef<VoiceRecognitionController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    recognitionRef.current = new VoiceRecognitionController();
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  // Set initial welcome message in the selected language
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      text: currentLanguage.sample,
      spokenSummary: currentLanguage.sample,
      timestamp: new Date(),
      suggestedReplies: [
        'Describe what is around me',
        'Check for walking hazards',
        'Help me translate something',
        'Tell me what features you have',
      ],
    };
    setMessages([welcomeMsg]);
  }, [currentLanguage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  // Toggle voice listening
  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    stopSpeaking();
    setIsSpeaking(false);
    playAudioCue('listen-start');
    setIsListening(true);
    setInterimTranscript('');

    const langCode = currentLanguage.code === 'en' ? 'en-US' : currentLanguage.code;

    if (recognitionRef.current && recognitionRef.current.isSupported) {
      recognitionRef.current.start(
        langCode,
        (data) => {
          setInterimTranscript(data.transcript);
          if (data.isFinal) {
            handleSendMessage(data.transcript);
            stopListening();
          }
        },
        (err) => {
          console.warn('Speech recognition error:', err);
          stopListening();
        },
        () => {
          setIsListening(false);
        }
      );
    } else {
      // Fallback prompt
      const manual = prompt('Speech recognition not supported directly on this browser. Type your voice query:');
      if (manual) {
        handleSendMessage(manual);
      }
      setIsListening(false);
    }
  };

  const stopListening = () => {
    playAudioCue('listen-stop');
    setIsListening(false);
    recognitionRef.current?.stop();
  };

  // Speak a message using Gemini TTS or Web Speech Synthesis
  const handleSpeakText = async (text: string, msgId?: string) => {
    try {
      stopSpeaking();
      setIsSpeaking(true);
      if (msgId) setCurrentlyPlayingId(msgId);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
          language: currentLanguage.code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
          setIsSpeaking(false);
          setCurrentlyPlayingId(null);
          return;
        }
      }

      // Fallback to browser TTS
      await speakWithBrowserTts(text, currentLanguage.code);
    } catch (err) {
      console.warn('Speech synthesis fallback:', err);
      await speakWithBrowserTts(text, currentLanguage.code);
    } finally {
      setIsSpeaking(false);
      setCurrentlyPlayingId(null);
    }
  };

  // Send message to Gemini Voice AI backend
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text && !attachedImage) return;

    setInputText('');
    setInterimTranscript('');
    stopListening();
    stopSpeaking();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text || 'Analyze this image',
      image: attachedImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    const currentImg = attachedImage;
    setAttachedImage(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: currentLanguage.code,
          imageBase64: currentImg,
          mode: 'assistant',
          voicePersona: persona,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      const json = await response.json();
      setIsThinking(false);

      if (json.success && json.data) {
        const d = json.data;
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: d.replyText || 'I processed your request.',
          spokenSummary: d.spokenSummary || d.replyText,
          romanizedPronunciation: d.romanizedPronunciation,
          timestamp: new Date(),
          hazardWarning: d.hazardWarning,
          detectedLanguage: d.detectedLanguage,
          suggestedReplies: d.suggestedReplies,
          objectsOrLabels: d.objectsOrLabels,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (d.hazardWarning) {
          playAudioCue('hazard');
        } else {
          playAudioCue('success');
        }

        // Auto-play voice response if enabled
        if (autoSpeak) {
          const textToSpeak = d.spokenSummary || d.replyText;
          handleSpeakText(textToSpeak, assistantMsg.id);
        }
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: json.error || 'Sorry, could not process request.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setIsThinking(false);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Network error communicating with Voice AI backend.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      playAudioCue('success');
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full px-2 sm:px-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 mb-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Active Language Chip */}
          <button
            onClick={onOpenLanguageSelector}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
          >
            <span className="text-base">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Voice Persona Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Mode:
            </span>
            {(['helpful-companion', 'navigator', 'brief-expert'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  persona === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'helpful-companion' ? 'Companion' : p === 'navigator' ? 'Navigator' : 'Expert'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gemini Voice Actor Selector */}
          <select
            value={voiceName}
            onChange={(e) => onChangeVoiceName(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="Kore">Voice: Kore (Natural Female)</option>
            <option value="Puck">Voice: Puck (Energetic Male)</option>
            <option value="Zephyr">Voice: Zephyr (Calm Warm)</option>
            <option value="Fenrir">Voice: Fenrir (Deep Confident)</option>
            <option value="Charon">Voice: Charon (Authoritative)</option>
          </select>

          {/* Auto Speak Toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Auto Voice Playback Active' : 'Auto Voice Playback Muted'}
            className={`p-2 rounded-xl transition-all border ${
              autoSpeak
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto pr-1 space-y-4 mb-3"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isPlaying = currentlyPlayingId === msg.id && isSpeaking;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${
                  isUser
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                {/* Attached user image thumbnail if present */}
                {msg.image && (
                  <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-h-48">
                    <img src={msg.image} alt="User snapshot" className="w-full object-cover" />
                  </div>
                )}

                {/* Hazard Warning Callout */}
                {msg.hazardWarning && (
                  <div className="mb-3 flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-400">
                        Attention / Obstacle Detected
                      </span>
                      <span>{msg.hazardWarning}</span>
                    </div>
                  </div>
                )}

                {/* Main Message Text */}
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal">
                  {msg.text}
                </p>

                {/* Romanized Pronunciation for non-Latin script assistance */}
                {msg.romanizedPronunciation && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                      Phonetic Pronunciation:
                    </span>
                    <p className="text-xs text-slate-300 italic font-mono">
                      "{msg.romanizedPronunciation}"
                    </p>
                  </div>
                )}

                {/* Labels / Objects detected tags */}
                {msg.objectsOrLabels && msg.objectsOrLabels.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {msg.objectsOrLabels.map((lbl, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/60"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions row for assistant message */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (isPlaying) {
                            stopSpeaking();
                            setIsSpeaking(false);
                            setCurrentlyPlayingId(null);
                          } else {
                            handleSpeakText(msg.spokenSummary || msg.text, msg.id);
                          }
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isPlaying
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current" /> Stop Voice
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" /> Speak Again
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Suggested quick replies underneath assistant message */}
              {!isUser && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-2">
                  {msg.suggestedReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(reply)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 transition-all cursor-pointer shadow-sm"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Interim / Live speech recognition transcript bubble */}
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-3xl p-4 bg-indigo-600/30 border border-indigo-500/50 text-indigo-100 rounded-tr-none animate-pulse flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400 animate-bounce" />
              <p className="text-sm italic">"{interimTranscript}"</p>
            </div>
          </div>
        )}

        {/* AI Thinking Animation */}
        {isThinking && (
          <div className="flex items-center gap-2 p-3 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl w-fit animate-pulse">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Drishti Voice AI is thinking in {currentLanguage.name}...</span>
          </div>
        )}
      </div>

      {/* Audio Waveform & Status Indicator */}
      {(isListening || isSpeaking || isThinking) && (
        <div className="mb-2">
          <AudioWaveVisualizer
            isListening={isListening}
            isSpeaking={isSpeaking}
            isThinking={isThinking}
          />
          <p className="text-center text-xs font-medium tracking-wide text-indigo-400">
            {isListening
              ? `Listening in ${currentLanguage.name}... Speak now`
              : isSpeaking
              ? `Speaking with Gemini ${voiceName} Voice`
              : `Analyzing query...`}
          </p>
        </div>
      )}

      {/* Interactive Bottom Control Panel / Voice Orb */}
      <div className="relative p-3 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
        {/* Attached image preview banner if user selected a photo */}
        {attachedImage && (
          <div className="mb-2.5 p-2 bg-slate-950 rounded-2xl flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src={attachedImage}
                alt="Selected"
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Image attached for Voice Vision AI
                </span>
                <span className="text-[11px] text-slate-400">Ask a question or tap mic to speak</span>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Snapshot / Camera upload button */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach a snapshot for vision assistance"
            className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all shrink-0"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Main Voice Orb Button */}
          <div className="relative flex items-center justify-center shrink-0">
            {isListening && (
              <div className="absolute inset-0 rounded-2xl bg-rose-500/30 animate-pulse-ring" />
            )}
            <button
              type="button"
              onClick={handleToggleListening}
              className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/40 ring-4 ring-rose-500/20 animate-pulse'
                  : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:brightness-110'
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6 animate-spin" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Text input for fallback typing */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={
                isListening
                  ? 'Listening to speech...'
                  : `Type or speak in ${currentLanguage.name}...`
              }
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Send text button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() && !attachedImage}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
