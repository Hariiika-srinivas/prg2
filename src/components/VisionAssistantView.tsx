import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Scan,
  Volume2,
  VolumeX,
  RefreshCw,
  Eye,
  FileText,
  Navigation,
  Compass,
  Upload,
} from 'lucide-react';
import { Language, VisionAnalysis } from '../types';
import { playAudioCue, playBase64Audio, stopSpeaking, speakWithBrowserTts } from '../utils/audio';

interface VisionAssistantViewProps {
  currentLanguage: Language;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
}

export const VisionAssistantView: React.FC<VisionAssistantViewProps> = ({
  currentLanguage,
  voiceName,
}) => {
  const [taskMode, setTaskMode] = useState<'obstacle_safety' | 'read_text' | 'explore_room' | 'find_item'>('obstacle_safety');
  const [isScanning, setIsScanning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoiceAlert, setAutoVoiceAlert] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysis | null>(null);
  const [continuousScan, setContinuousScan] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sample demo environments for quick testing when camera is unavailable
  const DEMO_SAMPLES = [
    {
      title: 'Hallway with Steps',
      task: 'obstacle_safety' as const,
      dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><rect x="150" y="240" width="300" height="40" fill="%23cbd5e1"/><rect x="180" y="280" width="240" height="40" fill="%2394a3b8"/><rect x="210" y="320" width="180" height="40" fill="%2364748b"/><polygon points="200,80 400,80 480,240 120,240" fill="%23334155"/><text x="300" y="160" font-family="sans-serif" font-size="20" fill="%23f8fafc" text-anchor="middle">STAIRS DESCENDING AHEAD</text></svg>',
    },
    {
      title: 'Street Sign & Shop',
      task: 'read_text' as const,
      dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a"/><rect x="120" y="100" width="360" height="120" rx="16" fill="%232563eb"/><text x="300" y="150" font-family="sans-serif" font-weight="bold" font-size="28" fill="%23ffffff" text-anchor="middle">METRO STATION</text><text x="300" y="190" font-family="sans-serif" font-size="18" fill="%23bfdbfe" text-anchor="middle">EXIT 4 • WAY TO CITY BUS</text></svg>',
    },
    {
      title: 'Living Room Obstacles',
      task: 'explore_room' as const,
      dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e1b4b"/><rect x="60" y="220" width="160" height="120" rx="8" fill="%234338ca"/><text x="140" y="280" fill="%23e0e7ff" font-size="16" text-anchor="middle">Armchair (Left)</text><rect x="360" y="200" width="180" height="140" rx="8" fill="%234f46e5"/><text x="450" y="270" fill="%23e0e7ff" font-size="16" text-anchor="middle">Coffee Table (Right)</text><rect x="240" y="300" width="80" height="40" rx="4" fill="%23e11d48"/><text x="280" y="325" fill="%23ffffff" font-size="12" text-anchor="middle">Bag on Floor</text></svg>',
    },
  ];

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access not granted or not available. You can upload an image or select a demo scenario.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopSpeaking();
    };
  }, []);

  // Continuous scanner loop
  useEffect(() => {
    let timer: any;
    if (continuousScan && !isScanning) {
      timer = setTimeout(() => {
        captureAndAnalyze();
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [continuousScan, isScanning]);

  // Capture frame from video or use uploaded image
  const captureAndAnalyze = async (manualImage?: string) => {
    let base64 = manualImage || capturedImage;

    if (!base64 && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(base64);
      }
    }

    if (!base64) return;

    setIsScanning(true);
    playAudioCue('click');

    try {
      const res = await fetch('/api/vision-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          task: taskMode,
          language: currentLanguage.code,
        }),
      });

      const json = await res.json();
      setIsScanning(false);

      if (json.success && json.data) {
        const data: VisionAnalysis = json.data;
        setAnalysisResult(data);

        // Sound alert
        if (data.urgentHazards && data.urgentHazards.length > 0) {
          playAudioCue('hazard');
        } else {
          playAudioCue('success');
        }

        // Voice Readout
        if (autoVoiceAlert && (data.audioAlert || data.summary)) {
          speakAnnouncement(data.audioAlert || data.summary);
        }
      }
    } catch (err) {
      console.error('Vision analysis error:', err);
      setIsScanning(false);
    }
  };

  const speakAnnouncement = async (text: string) => {
    try {
      stopSpeaking();
      setIsSpeaking(true);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
          language: currentLanguage.code,
          style: 'Urgent clear spatial guidance',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64, data.mimeType || 'audio/wav');
          setIsSpeaking(false);
          return;
        }
      }
      await speakWithBrowserTts(text, currentLanguage.code);
    } catch {
      await speakWithBrowserTts(text, currentLanguage.code);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setCapturedImage(b64);
      captureAndAnalyze(b64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto w-full px-2 sm:px-4">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Mode Navigation Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { id: 'obstacle_safety', label: 'Obstacle & Safety', icon: AlertTriangle, color: 'text-rose-400' },
          { id: 'read_text', label: 'Read Text & Signs', icon: FileText, color: 'text-sky-400' },
          { id: 'explore_room', label: 'Explore Room', icon: Eye, color: 'text-emerald-400' },
          { id: 'find_item', label: 'Locate Items', icon: Navigation, color: 'text-amber-400' },
        ].map((m) => {
          const Icon = m.icon;
          const isActive = taskMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setTaskMode(m.id as any);
                playAudioCue('click');
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${m.color}`} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Viewport & Camera Section */}
      <div className="relative flex-1 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-2xl">
        {/* Video stream or Image Preview */}
        <div className="relative w-full h-full min-h-[220px] flex items-center justify-center bg-black/40">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Analyzed frame"
              className="w-full h-full object-cover max-h-[340px]"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover max-h-[340px]"
            />
          )}

          {/* Scanner HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/20 rounded-3xl flex flex-col justify-between p-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs text-indigo-300 font-mono flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                {isScanning ? 'ANALYZING SCENE...' : 'VISION SENSOR ACTIVE'}
              </span>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setAutoVoiceAlert(!autoVoiceAlert)}
                  className={`p-2 rounded-xl backdrop-blur-md border text-xs flex items-center gap-1.5 ${
                    autoVoiceAlert
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400'
                  }`}
                  title="Toggle automatic spoken voice alerts"
                >
                  {autoVoiceAlert ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="hidden sm:inline">Voice Alert</span>
                </button>
              </div>
            </div>

            {/* Target Crosshair */}
            <div className="self-center flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-dashed border-indigo-400/40 rounded-2xl flex items-center justify-center">
                <Compass className="w-8 h-8 text-indigo-400/50 animate-pulse" />
              </div>
            </div>

            {/* Path status pill */}
            {analysisResult && (
              <div className="self-center">
                <div
                  className={`px-4 py-1.5 rounded-full font-bold text-xs tracking-wide flex items-center gap-2 shadow-lg backdrop-blur-md ${
                    analysisResult.urgentHazards && analysisResult.urgentHazards.length > 0
                      ? 'bg-rose-600/90 text-white animate-bounce'
                      : analysisResult.pathClear
                      ? 'bg-emerald-600/90 text-white'
                      : 'bg-amber-600/90 text-white'
                  }`}
                >
                  {analysisResult.urgentHazards && analysisResult.urgentHazards.length > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4" /> HAZARD DETECTED
                    </>
                  ) : analysisResult.pathClear ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> PATH CLEAR FORWARD
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" /> CAUTION REQUIRED
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Demo scenarios when camera is unavailable */}
        {cameraError && !capturedImage && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800">
            <p className="text-xs text-amber-400 mb-2 font-medium">{cameraError}</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_SAMPLES.map((demo, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTaskMode(demo.task);
                    setCapturedImage(demo.dataUrl);
                    captureAndAnalyze(demo.dataUrl);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600/30 text-xs text-slate-200 border border-slate-700 rounded-xl transition-all"
                >
                  Try: {demo.title}
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white rounded-xl flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* Results & Spoken Description Panel */}
        <div className="p-4 bg-slate-900/95 border-t border-slate-800 max-h-48 overflow-y-auto">
          {analysisResult ? (
            <div className="space-y-2.5">
              {/* Spoken Audio Summary Banner */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/40">
                <div className="flex items-start gap-2.5">
                  <Volume2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Spoken Assistant Guidance ({currentLanguage.name}):
                    </span>
                    <p className="text-sm text-slate-100 font-medium">
                      {analysisResult.audioAlert || analysisResult.summary}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => speakAnnouncement(analysisResult.audioAlert || analysisResult.summary)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs shrink-0 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Replay
                </button>
              </div>

              {/* Detected Text / OCR if any */}
              {analysisResult.detectedText && analysisResult.detectedText.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                    Detected Text / Signs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.detectedText.map((t, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-200">
                        "{t}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Items Grid */}
              {analysisResult.identifiedItems && analysisResult.identifiedItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysisResult.identifiedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex items-center gap-1.5 text-slate-300"
                    >
                      <span className="font-semibold text-slate-100">{item.name}</span>
                      <span className="text-[10px] text-indigo-300 font-mono">({item.location}, {item.distance})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-slate-400">
              Point your camera at your surroundings or an obstacle, then tap <strong>Scan Scene</strong> to get immediate spoken assistance.
            </div>
          )}
        </div>
      </div>

      {/* Action Trigger Buttons */}
      <div className="flex items-center gap-2.5 mt-3">
        {/* Main Scan Trigger */}
        <button
          onClick={() => {
            if (capturedImage) {
              setCapturedImage(null);
            }
            captureAndAnalyze();
          }}
          disabled={isScanning}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
        >
          <Scan className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Surroundings...' : 'Scan Scene Now'}</span>
        </button>

        {/* Live Camera Reset / Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload or pick image"
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
        >
          <Upload className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            setCapturedImage(null);
            setAnalysisResult(null);
            startCamera();
          }}
          title="Reset camera stream"
          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
