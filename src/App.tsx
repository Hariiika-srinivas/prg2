/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceChatView } from './components/VoiceChatView';
import { VisionAssistantView } from './components/VisionAssistantView';
import { MultilingualInterpreterView } from './components/MultilingualInterpreterView';
import { VoiceLabView } from './components/VoiceLabView';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { Language, AssistantMode } from './types';

const DEFAULT_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', voice: 'Kore', sample: 'Hello! How can I assist your navigation and queries today?' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', voice: 'Zephyr', sample: 'नमस्ते! आज मैं आपकी दृष्टि और नेविगेशन में कैसे मदद कर सकता हूँ?' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', voice: 'Kore', sample: '¡Hola! ¿En qué puedo ayudarte hoy con tu navegación o preguntas?' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', voice: 'Zephyr', sample: 'Bonjour! Comment puis-je vous assister aujourd’hui?' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', voice: 'Fenrir', sample: 'Hallo! Wie kann ich Ihnen heute bei der Navigation behilflich sein?' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', voice: 'Kore', sample: 'こんにちは！本日のナビゲーションやご質問をお手伝いします。' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', flag: '🇨🇳', voice: 'Kore', sample: '你好！请问今天有什么我可以为您导航或解答的？' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', voice: 'Fenrir', sample: 'مرحباً! كيف يمكنني مساعدتك اليوم في التنقل والاستفسارات؟' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', voice: 'Puck', sample: 'నమస్కారం! మీ ప్రయాణం మరియు సందేహాలలో నేను ఎలా సహాయపడగలను?' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', voice: 'Kore', sample: 'வணக்கம்! உங்கள் பயணம் மற்றும் கேள்விகளுக்கு நான் எவ்வாறு உதவலாம்?' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', voice: 'Zephyr', sample: 'নমস্কার! আজ আপনাকে কীভাবে সাহায্য করতে পারি?' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', voice: 'Kore', sample: 'Olá! Como posso ajudar você hoje com navegação e orientações?' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', voice: 'Fenrir', sample: 'Здравствуйте! Чем я могу помочь вам в навигации сегодня?' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', voice: 'Kore', sample: '안녕하세요! 오늘 어떤 안내와 도움이 필요하신가요?' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', voice: 'Zephyr', sample: 'Ciao! Come posso aiutarti oggi con la navigazione e le tue domande?' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', voice: 'Zephyr', sample: 'नमस्कार! आज मी तुम्हाला कशी मदत करू शकतो?' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', voice: 'Puck', sample: 'Merhaba! Bugün size nasıl yardımcı olabilirim?' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', voice: 'Kore', sample: 'Xin chào! Tôi có thể hỗ trợ điều hướng gì cho bạn hôm nay?' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', voice: 'Puck', sample: 'Halo! Ada yang bisa saya bantu untuk navigasi hari ini?' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', voice: 'Zephyr', sample: 'નમસ્તે! આજે હું તમારી કઈ રીતે મદદ કરી શકું?' },
];

export default function App() {
  const [languages, setLanguages] = useState<Language[]>(DEFAULT_LANGUAGES);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(DEFAULT_LANGUAGES[0]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('voice-chat');
  const [voiceName, setVoiceName] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [isHighContrast, setIsHighContrast] = useState(false);

  // Fetch languages and backend health on load
  useEffect(() => {
    fetch('/api/languages')
      .then((res) => res.json())
      .then((data) => {
        if (data.languages && Array.isArray(data.languages)) {
          setLanguages(data.languages);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch languages from server:', err);
      });

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setBackendOnline(data.status === 'ok');
      })
      .catch(() => {
        setBackendOnline(false);
      });
  }, []);

  // Update voice whenever language changes if voice is specified
  const handleSelectLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    if (lang.voice) {
      setVoiceName(lang.voice);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast
          ? 'bg-black text-yellow-300 font-semibold'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Application Header */}
      <Header
        currentMode={currentMode}
        onChangeMode={setCurrentMode}
        currentLanguage={currentLanguage}
        onOpenLanguageSelector={() => setIsLanguageModalOpen(true)}
        backendOnline={backendOnline}
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      {/* Main View Display */}
      <main className="flex-1 py-3 overflow-hidden flex flex-col">
        {currentMode === 'voice-chat' && (
          <VoiceChatView
            currentLanguage={currentLanguage}
            onOpenLanguageSelector={() => setIsLanguageModalOpen(true)}
            voiceName={voiceName}
            onChangeVoiceName={setVoiceName}
          />
        )}

        {currentMode === 'vision-nav' && (
          <VisionAssistantView
            currentLanguage={currentLanguage}
            voiceName={voiceName}
          />
        )}

        {currentMode === 'interpreter' && (
          <MultilingualInterpreterView
            languages={languages}
            currentLanguage={currentLanguage}
            voiceName={voiceName}
          />
        )}

        {currentMode === 'quick-tools' && (
          <VoiceLabView
            currentLanguage={currentLanguage}
            voiceName={voiceName}
            onChangeVoiceName={setVoiceName}
            backendOnline={backendOnline}
          />
        )}
      </main>

      {/* Multilingual Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={currentLanguage}
        onSelectLanguage={handleSelectLanguage}
        languages={languages}
      />
    </div>
  );
}
