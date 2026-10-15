export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  sample: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  spokenSummary?: string;
  romanizedPronunciation?: string;
  timestamp: Date;
  audioBase64?: string;
  image?: string;
  hazardWarning?: string | null;
  detectedLanguage?: string;
  suggestedReplies?: string[];
  objectsOrLabels?: string[];
}

export interface VisionAnalysis {
  summary: string;
  urgentHazards: string[];
  pathClear: boolean;
  navigationAdvice: string;
  detectedText: string[];
  identifiedItems: Array<{
    name: string;
    location: string;
    distance: string;
  }>;
  audioAlert: string;
}

export interface TranslationResult {
  translatedText: string;
  romanizedPronunciation?: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  culturalNote?: string;
  reverseTranslation?: string;
}

export type AssistantMode = 'voice-chat' | 'vision-nav' | 'interpreter' | 'quick-tools';
