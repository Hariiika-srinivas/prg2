import React from 'react';
import {
  Mic,
  Eye,
  Languages,
  Settings,
  Globe2,
  Activity,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { Language, AssistantMode } from '../types';
import { stopSpeaking, playAudioCue } from '../utils/audio';

interface HeaderProps {
  currentMode: AssistantMode;
  onChangeMode: (mode: AssistantMode) => void;
  currentLanguage: Language;
  onOpenLanguageSelector: () => void;
  backendOnline: boolean;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onChangeMode,
  currentLanguage,
  onOpenLanguageSelector,
  backendOnline,
  isHighContrast,
  onToggleHighContrast,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Brand & Status */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Drishti Voice AI
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                  v3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Multimodal Multilingual Assistant</p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => {
                stopSpeaking();
                playAudioCue('listen-stop');
              }}
              title="Silence audio"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
            >
              <VolumeX className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenLanguageSelector}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200"
            >
              <span>{currentLanguage.flag}</span>
              <span className="text-[11px]">{currentLanguage.code.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-inner w-full sm:w-auto overflow-x-auto justify-center">
          {[
            { id: 'voice-chat', label: 'Voice AI', icon: Mic },
            { id: 'vision-nav', label: 'Vision & Safety', icon: Eye },
            { id: 'interpreter', label: 'Interpreter', icon: Languages },
            { id: 'quick-tools', label: 'Voice Lab', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playAudioCue('click');
                  onChangeMode(tab.id as AssistantMode);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Controls */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Silence Audio Panic Button */}
          <button
            onClick={() => {
              stopSpeaking();
              playAudioCue('listen-stop');
            }}
            title="Silence active speech"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <VolumeX className="w-4 h-4" />
          </button>

          {/* Language Selector Button */}
          <button
            onClick={onOpenLanguageSelector}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-all hover:border-slate-700"
          >
            <span className="text-base">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
          </button>

          {/* Backend Status indicator */}
          <div
            title={backendOnline ? 'Gemini Backend Connected & Healthy' : 'Connecting to Backend...'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="hidden md:inline font-sans font-medium text-slate-300">
              {backendOnline ? 'Gemini Live' : 'Connecting'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
