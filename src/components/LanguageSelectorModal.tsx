import React, { useState, useMemo } from 'react';
import { Search, Volume2, Check, X, Globe2 } from 'lucide-react';
import { Language } from '../types';
import { playBase64Audio, speakWithBrowserTts, playAudioCue } from '../utils/audio';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  languages: Language[];
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
  languages,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [playingSampleLang, setPlayingSampleLang] = useState<string | null>(null);

  const filteredLanguages = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return languages;
    return languages.filter(
      (l) =>
        l.name.toLowerCase().includes(term) ||
        l.nativeName.toLowerCase().includes(term) ||
        l.code.toLowerCase().includes(term)
    );
  }, [languages, searchTerm]);

  const handlePlaySample = async (e: React.MouseEvent, lang: Language) => {
    e.stopPropagation();
    playAudioCue('click');
    setPlayingSampleLang(lang.code);

    try {
      // Try Gemini TTS first
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: lang.sample,
          voiceName: lang.voice,
          style: 'Friendly native greeting',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
          setPlayingSampleLang(null);
          return;
        }
      }

      // Fallback
      await speakWithBrowserTts(lang.sample, lang.code);
    } catch {
      await speakWithBrowserTts(lang.sample, lang.code);
    } finally {
      setPlayingSampleLang(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Select Language</h2>
              <p className="text-xs text-slate-400">Choose your preferred Voice AI assistance language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, script or code (e.g. Hindi, हिन्दी, es)..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Language Grid */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          {filteredLanguages.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No languages matching "{searchTerm}"
            </div>
          ) : (
            filteredLanguages.map((lang) => {
              const isSelected = selectedLanguage.code === lang.code;
              const isPlaying = playingSampleLang === lang.code;

              return (
                <div
                  key={lang.code}
                  onClick={() => {
                    playAudioCue('success');
                    onSelectLanguage(lang);
                    onClose();
                  }}
                  className={`w-full group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{lang.flag}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">{lang.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {lang.code.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{lang.nativeName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Preview voice in this language"
                      disabled={isPlaying}
                      onClick={(e) => handlePlaySample(e, lang)}
                      className={`p-2 rounded-xl transition-all ${
                        isPlaying
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredLanguages.length} languages available</span>
          <span className="text-indigo-400 font-medium">Powered by Gemini Voice AI</span>
        </div>
      </div>
    </div>
  );
};
