'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type ThemeKey = 'sunset' | 'ocean' | 'aurora' | 'neon';

const THEMES: Record<
  ThemeKey,
  {
    label: string;
    colors: [string, string, string];
    particle: string;
    glow: string;
  }
> = {
  sunset: {
    label: 'غروب',
    colors: ['#ff5f6d', '#ffc371', '#fdc830'],
    particle: 'rgba(255, 255, 255, 0.08)',
    glow: '255, 200, 120'
  },
  ocean: {
    label: 'محيط',
    colors: ['#0093e9', '#80d0c7', '#3a86ff'],
    particle: 'rgba(255, 255, 255, 0.12)',
    glow: '140, 220, 255'
  },
  aurora: {
    label: 'شفق',
    colors: ['#654ea3', '#eaafc8', '#4facfe'],
    particle: 'rgba(255, 255, 255, 0.1)',
    glow: '210, 180, 255'
  },
  neon: {
    label: 'نيون',
    colors: ['#12c2e9', '#c471ed', '#f64f59'],
    particle: 'rgba(255, 255, 255, 0.16)',
    glow: '250, 120, 200'
  }
};

type FloatingShape = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  wobble: number;
};

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const SHAPES_COUNT = 28;

function generateShapes(): FloatingShape[] {
  return Array.from({ length: SHAPES_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 55 + 25,
    speed: Math.random() * 0.35 + 0.15,
    drift: Math.random() * Math.PI * 2,
    wobble: Math.random() * 0.8 + 0.2
  }));
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim());
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    const words = paragraph.split(/\s+/);
    let current = words.shift() ?? '';

    words.forEach((word) => {
      const testLine = `${current} ${word}`.trim();
      const metrics = ctx.measureText(testLine);
      if (metrics.width <= maxWidth) {
        current = testLine;
      } else {
        lines.push(current);
        current = word;
      }
    });

    lines.push(current);
  });

  return lines;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();
  const shapesRef = useRef<FloatingShape[]>(generateShapes());
  const recorderRef = useRef<MediaRecorder>();
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const [text, setText] = useState<string>('النص يولد المشاعر، دع كلماتك تلمع في فيديو متحرك أنيق.');
  const [duration, setDuration] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(56);
  const [theme, setTheme] = useState<ThemeKey>('sunset');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('جاهز لتحويل النص إلى فيديو.');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '24px';
    canvas.style.boxShadow = '0 40px 80px rgba(5, 8, 25, 0.45)';
  }, []);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, timestamp: number) => {
      const themeConfig = THEMES[theme];
      const time = timestamp / 1000;

      const [c1, c2, c3] = themeConfig.colors;
      const gradientShift = (Math.sin(time * 0.8) + 1) / 2;

      const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * (1 - gradientShift), CANVAS_WIDTH, CANVAS_HEIGHT * gradientShift);
      gradient.addColorStop(0, c1);
      gradient.addColorStop(0.5, c2);
      gradient.addColorStop(1, c3);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = `rgba(${themeConfig.glow}, 0.35)`;
      ctx.filter = 'blur(120px)';
      ctx.beginPath();
      ctx.ellipse(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.32 + Math.sin(time * 0.9) * 30, CANVAS_WIDTH * 0.45, CANVAS_HEIGHT * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      shapesRef.current.forEach((shape, index) => {
        const offset = (time * shape.speed + index * 0.03) % 1;
        const x = (shape.x + Math.sin(time * 0.6 + shape.drift) * 0.05) * CANVAS_WIDTH;
        const y = ((shape.y + offset) % 1) * CANVAS_HEIGHT;
        const size = shape.size * (1 + Math.sin(time * 2 + shape.drift) * shape.wobble * 0.2);

        ctx.beginPath();
        ctx.fillStyle = themeConfig.particle;
        ctx.ellipse(x, y, size, size * 0.6, Math.sin(time + shape.drift), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 0.35;
      const overlay = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      overlay.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
      overlay.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1;

      ctx.fillStyle = `rgba(${themeConfig.glow}, 0.15)`;
      ctx.fillRect(CANVAS_WIDTH * 0.18, CANVAS_HEIGHT * 0.22, CANVAS_WIDTH * 0.64, CANVAS_HEIGHT * 0.56);

      const displayText = text.trim().length > 0 ? text : 'أدخل نصك ليتم تحويله إلى فيديو متوهّج.';
      ctx.font = `600 ${fontSize}px "Cairo", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = wrapLines(ctx, displayText, CANVAS_WIDTH * 0.62);
      const lineHeight = fontSize * 1.35;
      const totalHeight = lineHeight * lines.length;

      lines.forEach((line, index) => {
        const centerY = CANVAS_HEIGHT / 2 - totalHeight / 2 + lineHeight * index + lineHeight / 2;
        const pulse = 0.8 + 0.2 * Math.sin(time * 1.2 + index);

        ctx.fillStyle = `rgba(10, 12, 26, ${0.75 * pulse})`;
        ctx.fillRect(CANVAS_WIDTH * 0.22, centerY - lineHeight / 2 - 12, CANVAS_WIDTH * 0.56, lineHeight + 24);

        ctx.shadowBlur = 32;
        ctx.shadowColor = `rgba(${themeConfig.glow}, 0.45)`;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * pulse})`;
        ctx.fillText(line, CANVAS_WIDTH / 2, centerY);
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = `rgba(${themeConfig.glow}, 0.22)`;
      ctx.fillRect(CANVAS_WIDTH * 0.22, CANVAS_HEIGHT * 0.23, 6, CANVAS_HEIGHT * 0.54);
      ctx.fillRect(CANVAS_WIDTH * 0.72, CANVAS_HEIGHT * 0.23, 6, CANVAS_HEIGHT * 0.54);
    },
    [fontSize, text, theme]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const render = (time: number) => {
      drawFrame(ctx, time);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawFrame]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  const handleGenerateVideo = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDownloadUrl(null);

    if (typeof window === 'undefined') {
      setError('هذه الميزة تعمل داخل المتصفح فقط.');
      return;
    }
    if (!canvasRef.current) {
      setError('المعاينة غير متاحة، أعد تحميل الصفحة.');
      return;
    }
    if (!('MediaRecorder' in window)) {
      setError('متصفحك لا يدعم MediaRecorder، استخدم Chrome أو Edge حديثاً.');
      return;
    }

    const canvas = canvasRef.current;

    try {
      const capturedStream = canvas.captureStream(30);
      if (!capturedStream) {
        throw new Error('تعذر بدء بث اللوحة.');
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const destination = audioContext.createMediaStreamDestination();
      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainRef.current = masterGain;
      masterGain.connect(destination);
      masterGain.connect(audioContext.destination);

      const baseOscillator = audioContext.createOscillator();
      baseOscillator.type = 'sine';
      baseOscillator.frequency.setValueAtTime(220, audioContext.currentTime);
      baseOscillator.connect(masterGain);
      baseOscillator.start();
      oscillatorRef.current = baseOscillator;

      const lfoOscillator = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfoOscillator.type = 'sine';
      lfoOscillator.frequency.setValueAtTime(0.6, audioContext.currentTime);
      lfoGain.gain.setValueAtTime(30, audioContext.currentTime);
      lfoOscillator.connect(lfoGain);
      lfoGain.connect(baseOscillator.frequency);
      lfoOscillator.start();
      lfoRef.current = lfoOscillator;

      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();

      const combinedStream = new MediaStream([...capturedStream.getTracks(), ...destination.stream.getTracks()]);

      const preferredMimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      const mimeType = preferredMimeTypes.find((type) => {
        try {
          return MediaRecorder.isTypeSupported(type);
        } catch {
          return false;
        }
      });

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          chunks.push(evt.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType ?? 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus('تم إنشاء الفيديو بنجاح. قم بالتنزيل أو شاركه.');
        setIsGenerating(false);

        capturedStream.getTracks().forEach((track) => track.stop());
        destination.stream.getTracks().forEach((track) => track.stop());

        lfoOscillator.stop();
        baseOscillator.stop();
        noiseSource.stop();

        audioContext.close().catch(() => undefined);
        audioContextRef.current = null;
        recorderRef.current = undefined;
      };

      recorder.onerror = () => {
        setError('حدث خطأ أثناء التسجيل، حاول مجدداً.');
        setIsGenerating(false);
        recorder.stop();
      };

      setIsGenerating(true);
      setStatus('جاري إنشاء الفيديو... سيتم الانتهاء تلقائياً.');
      recorder.start();

      stopTimerRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, duration * 1000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      setError('تعذر إنشاء الفيديو، تأكد من دعم المتصفح وحاول مجدداً.');
    }
  };

  return (
    <main className="page">
      <div className="studio">
        <section className="panel controls">
          <header>
            <h1>محول النص إلى فيديو</h1>
            <p>حوّل أفكارك المكتوبة إلى فيديو أنيق متحرك مباشرة من متصفحك.</p>
          </header>

          <form className="form" onSubmit={handleGenerateVideo}>
            <label>
              النص
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="اكتب النص الذي تريد تحويله إلى فيديو..."
                rows={6}
                required
              />
            </label>

            <label>
              مدة الفيديو: <strong>{duration} ثانية</strong>
              <input type="range" min={5} max={30} step={1} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
            </label>

            <label>
              حجم الخط: <strong>{fontSize}px</strong>
              <input type="range" min={32} max={72} step={1} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
            </label>

            <label>
              النمط البصري
              <div className="themes">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`theme ${theme === key ? 'active' : ''}`}
                    onClick={() => setTheme(key)}
                    aria-pressed={theme === key}
                  >
                    <span className="swatch" style={{ background: `linear-gradient(135deg, ${THEMES[key].colors[0]}, ${THEMES[key].colors[2]})` }} />
                    <span>{THEMES[key].label}</span>
                  </button>
                ))}
              </div>
            </label>

            <button type="submit" className="generate" disabled={isGenerating}>
              {isGenerating ? 'جارٍ التحويل...' : 'إنشاء فيديو'}
            </button>

            {error ? <p className="error">{error}</p> : null}
            <p className="status">{status}</p>
          </form>
        </section>

        <section className="panel preview">
          <div className="canvas-wrapper">
            <canvas ref={canvasRef} />
          </div>

          {downloadUrl ? (
            <a className="download" href={downloadUrl} download="text-to-video.webm">
              تحميل الفيديو
            </a>
          ) : null}
        </section>
      </div>

      <style jsx>{`
        .page {
          width: 100%;
          max-width: 1200px;
        }

        .studio {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 2.5rem;
          background: rgba(14, 16, 34, 0.85);
          border-radius: 32px;
          padding: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 60px 120px rgba(3, 7, 18, 0.55);
        }

        @media (max-width: 1080px) {
          .studio {
            grid-template-columns: 1fr;
            padding: 2rem;
          }
        }

        .panel {
          background: rgba(10, 12, 28, 0.75);
          border-radius: 24px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .controls header h1 {
          margin: 0 0 0.5rem;
          font-size: 2rem;
        }

        .controls header p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        textarea {
          resize: vertical;
          min-height: 160px;
        }

        input[type='range'] {
          accent-color: #76c4ff;
        }

        .themes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .theme {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          border: 1px solid transparent;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, border 0.15s ease, background 0.15s ease;
        }

        .theme:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .theme.active {
          background: rgba(118, 196, 255, 0.15);
          border-color: rgba(118, 196, 255, 0.4);
          box-shadow: 0 15px 35px rgba(118, 196, 255, 0.12);
        }

        .swatch {
          display: inline-block;
          width: 32px;
          height: 32px;
          border-radius: 12px;
        }

        .generate {
          background: linear-gradient(135deg, #3a7bd5, #3a6073);
          border-radius: 18px;
          padding: 1rem 1.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }

        .generate:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(58, 123, 213, 0.35);
        }

        .generate:disabled {
          opacity: 0.6;
          cursor: progress;
          filter: grayscale(0.2);
        }

        .status {
          margin: 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.95rem;
        }

        .error {
          margin: 0;
          color: #ff9d9d;
          font-weight: 600;
        }

        .preview {
          align-items: center;
          justify-content: center;
          background: rgba(8, 10, 24, 0.65);
        }

        .canvas-wrapper {
          width: 100%;
        }

        .download {
          margin-top: 1.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.85rem 1.5rem;
          border-radius: 16px;
          border: 1px solid rgba(118, 196, 255, 0.35);
          color: rgba(255, 255, 255, 0.92);
          font-weight: 600;
          background: rgba(118, 196, 255, 0.12);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease;
        }

        .download:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 40px rgba(118, 196, 255, 0.25);
          border-color: rgba(118, 196, 255, 0.6);
        }
      `}</style>
    </main>
  );
}
