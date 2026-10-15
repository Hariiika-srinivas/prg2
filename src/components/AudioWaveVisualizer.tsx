import React, { useEffect, useRef } from 'react';

interface AudioWaveVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  accentColor?: string;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  isListening,
  isSpeaking,
  isThinking,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Base activity level
      let intensity = 0.15;
      if (isListening) intensity = 0.85;
      else if (isSpeaking) intensity = 0.75;
      else if (isThinking) intensity = 0.45;

      const bars = 36;
      const barWidth = 3;
      const spacing = (width - bars * barWidth) / (bars + 1);

      for (let i = 0; i < bars; i++) {
        const x = spacing + i * (barWidth + spacing);
        // Sinusoidal wave simulation with varied frequencies
        const sinVal = Math.sin(phase * 0.08 + i * 0.28) * Math.cos(phase * 0.05 + i * 0.15);
        const dynamicHeight = Math.max(6, Math.abs(sinVal) * (height * 0.85) * intensity);

        // Color gradient based on state
        const gradient = ctx.createLinearGradient(0, centerY - dynamicHeight / 2, 0, centerY + dynamicHeight / 2);

        if (isListening) {
          gradient.addColorStop(0, '#f43f5e'); // Rose
          gradient.addColorStop(0.5, '#ec4899'); // Pink
          gradient.addColorStop(1, '#a855f7'); // Purple
        } else if (isSpeaking) {
          gradient.addColorStop(0, '#06b6d4'); // Cyan
          gradient.addColorStop(0.5, '#3b82f6'); // Blue
          gradient.addColorStop(1, '#6366f1'); // Indigo
        } else if (isThinking) {
          gradient.addColorStop(0, '#fbbf24'); // Amber
          gradient.addColorStop(0.5, '#f59e0b');
          gradient.addColorStop(1, '#d97706');
        } else {
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#334155');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const top = centerY - dynamicHeight / 2;
        ctx.roundRect(x, top, barWidth, dynamicHeight, 2);
        ctx.fill();
      }

      phase += 1;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isListening, isSpeaking, isThinking]);

  return (
    <div className="relative w-full max-w-md mx-auto h-16 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={380}
        height={64}
        className="w-full h-full object-contain"
      />
    </div>
  );
};
