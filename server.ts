import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Gemini SDK with User-Agent header as required
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Supported Languages catalog
const SUPPORTED_LANGUAGES = [
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

// Health Check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiEngine: 'gemini-3.8-flash',
    ttsEngine: 'gemini-3.8-flash-lite-tts',
    hasApiKey: hasKey,
    supportedLanguagesCount: SUPPORTED_LANGUAGES.length,
  });
});

// Languages list
app.get('/api/languages', (req, res) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
  });
});

// Voice AI Chat & Multimodal Assistant
app.post('/api/chat', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server. Please check environment variables.',
      });
    }

    const {
      message = '',
      language = 'en',
      conversationHistory = [],
      imageBase64,
      imageMimeType = 'image/jpeg',
      mode = 'assistant', // 'assistant' | 'navigation' | 'translator' | 'vision'
      voicePersona = 'helpful-companion', // 'helpful-companion' | 'navigator' | 'brief-expert'
    } = req.body;

    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

    // Build system instruction
    const systemPrompt = `You are Drishti Voice AI, an intelligent multilingual voice & vision assistant.
Target Language: "${targetLangObj.name}" (${targetLangObj.nativeName}).
Current Operational Mode: ${mode}.
Voice Persona: ${voicePersona}.

CRITICAL GUIDELINES:
1. Always respond in the target language (${targetLangObj.name}), unless the user specifically asks to translate or speak in another tongue.
2. If the user provided an image (camera snapshot / scene), carefully describe what is visible with an emphasis on orientation, accessibility, obstacles, text/signs, or details relevant to someone navigating or inspecting the environment.
3. Make your spoken response natural, concise, and clear for voice synthesis (spoken out loud). Avoid markdown tables, long asterisks, or formatting that sounds awkward when read aloud.
4. Provide structured JSON matching this exact format:
{
  "replyText": "The natural conversational response in ${targetLangObj.name}",
  "spokenSummary": "A concise 1-2 sentence version tailored specifically for voice readout",
  "romanizedPronunciation": "Romanized phonetics if the script is non-Latin (e.g. Hindi, Japanese, Arabic, Telugu), else empty string",
  "detectedLanguage": "${targetLangObj.code}",
  "suggestedReplies": ["Quick reply 1", "Quick reply 2", "Quick reply 3"],
  "hazardWarning": "Alert if any physical obstacles, stairs, cars, or drops are spotted in image, else null",
  "objectsOrLabels": ["object1", "object2"]
}
Only output valid JSON with no backticks or extraneous text.`;

    // Prepare contents
    const contents: any[] = [];

    // Include recent history if provided
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const item of conversationHistory.slice(-4)) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text || item.content || '' }],
        });
      }
    }

    const currentParts: any[] = [];
    if (imageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ''),
        },
      });
    }

    const userText = message.trim() || (imageBase64 ? 'Please describe what you see in front of me and assist me.' : 'Hello, please introduce yourself.');
    currentParts.push({ text: userText });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const rawText = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = {
        replyText: rawText,
        spokenSummary: rawText,
        romanizedPronunciation: '',
        detectedLanguage: language,
        suggestedReplies: ['Tell me more', 'Scan again', 'Translate this'],
        hazardWarning: null,
        objectsOrLabels: [],
      };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process voice AI chat request',
    });
  }
});

// Text-to-Speech endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const {
      text,
      voiceName = 'Kore', // 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
      style = 'Clear, natural, helpful voice assistant',
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required for TTS' });
    }

    // Limit text length for fast TTS generation
    const trimmedText = text.slice(0, 800);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({
        error: 'No audio returned from Gemini TTS',
      });
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voiceName,
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to synthesize speech',
    });
  }
});

// Audio Transcription endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const { audioBase64, mimeType = 'audio/webm', languageHint = 'en' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const cleanedBase64 = audioBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanedBase64,
            },
          },
          {
            text: `Transcribe the speech in this audio accurately. If the speech is in a language other than English (e.g. Hindi, Spanish, French, Telugu, etc.), transcribe it in its native script as well as provide the detected language code. Return a JSON object: {"transcript": "transcribed text", "detectedLanguage": "language code like en, hi, es", "confidence": "high|medium|low"}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let result = { transcript: '', detectedLanguage: languageHint, confidence: 'medium' };
    try {
      result = JSON.parse(raw);
    } catch {
      result.transcript = raw.trim();
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to transcribe audio',
    });
  }
});

// Multi-Language Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const { text, sourceLang = 'auto', targetLang = 'es' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for translation' });
    }

    const sourceLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLang);
    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || SUPPORTED_LANGUAGES[0];

    const prompt = `Translate the following speech or text into ${targetLangObj.name} (${targetLangObj.nativeName}).
Source Language: ${sourceLangObj ? sourceLangObj.name : 'Auto-detect'}
Input text: "${text}"

Provide the translation, romanized pronunciation (if target script is non-Latin), detected source language, and cultural context note.
Return JSON in this format:
{
  "translatedText": "the translation in ${targetLangObj.name}",
  "romanizedPronunciation": "romanized phonetics if non-Latin, otherwise empty",
  "detectedSourceLanguage": "language code",
  "targetLanguage": "${targetLangObj.code}",
  "culturalNote": "brief explanation if idioms or polite forms apply",
  "reverseTranslation": "back-translation to English or source"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const raw = response.text || '{}';
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        translatedText: raw,
        romanizedPronunciation: '',
        detectedSourceLanguage: sourceLang,
        targetLanguage: targetLang,
        culturalNote: '',
      };
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in /api/translate:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate',
    });
  }
});

// Vision & Obstacle Assistance endpoint
app.post('/api/vision-assist', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server.',
      });
    }

    const {
      imageBase64,
      imageMimeType = 'image/jpeg',
      task = 'obstacle_safety', // 'obstacle_safety' | 'read_text' | 'explore_room' | 'find_item'
      language = 'en',
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
    const cleanedBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const prompt = `You are Drishti AI Vision Assistant helping a visually impaired or hands-free user explore and navigate safely.
Task: ${task}.
Output Language: ${langObj.name} (${langObj.nativeName}).

Analyze the camera frame and return valid JSON:
{
  "summary": "1-2 sentences clear verbal description of the scene in ${langObj.name}",
  "urgentHazards": ["hazard 1", "hazard 2"] (e.g. stairs, open doors, wires, low overhang, wet floor, approaching vehicles; empty array if clear),
  "pathClear": true/false (true if path forward is unobstructed),
  "navigationAdvice": "clear directional guidance (e.g. 'Clear path forward for 5 feet. Turn slightly right to avoid table.') in ${langObj.name}",
  "detectedText": ["any signs, menus, labels or readable text found in image"],
  "identifiedItems": [
    { "name": "item name", "location": "left / center / right / foreground / background", "distance": "near / mid / far" }
  ],
  "audioAlert": "Concise high-priority voice prompt to announce to the user"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: cleanedBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        summary: raw,
        urgentHazards: [],
        pathClear: true,
        navigationAdvice: raw,
        detectedText: [],
        identifiedItems: [],
        audioAlert: raw,
      };
    }

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/vision-assist:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze vision frame',
    });
  }
});

// Setup Vite middleware in dev or static server in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Drishti Voice AI & Vision Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
