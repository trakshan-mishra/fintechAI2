import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Camera, Upload, FileText, Loader2, Sparkles,
  MessageSquare, Send, X, ZoomIn, ChevronLeft,
  ChevronRight, PenLine, Plus, Trash2, RefreshCw
} from 'lucide-react';
import Webcam from 'react-webcam';
import { toast } from 'sonner';

// ─── Gemini Vision Helper ────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_MODEL   = 'gemini-flash-latest';

/** Convert a base64 data-URL or blob URL to { inlineData: {data, mimeType} } */
async function toGeminiPart(src) {
  // If it's already a data-URL (from webcam / FileReader)
  if (src.startsWith('data:')) {
    const [header, data] = src.split(',');
    const mimeType = header.match(/:(.*?);/)[1];
    return { inlineData: { data, mimeType } };
  }
  // Blob URL — fetch and convert
  const blob = await fetch(src).then(r => r.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [header, data] = reader.result.split(',');
      const mimeType = header.match(/:(.*?);/)[1];
      resolve({ inlineData: { data, mimeType } });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const SUMMARY_PROMPT = `You are an expert financial accountant assistant analyzing bill/receipt images.

Carefully analyze ALL provided images. Pay special attention to:
- HANDWRITTEN notes, tips, corrections, or annotations
- Crossed-out or modified amounts
- Sticky notes or written additions

Provide a structured summary with these exact sections:

## 📋 Bills Overview
List each bill with: Merchant Name | Date | Total Amount

## 🛒 Items Breakdown
For each bill, list the individual items with quantities and prices.

## ✍️ Handwritten Notes Found
List any handwritten adjustments, tips, or annotations detected. Write "None detected" if absent.

## 💰 Financial Summary
- Subtotal (sum of all bills before tax/tip): ₹/$ X
- Total Tax: ₹/$ X
- Total Tips/Gratuity: ₹/$ X
- **Grand Total across all bills: ₹/$ X**

## 📊 Spending Insights
Quick analysis: top categories, unusual items, or notable observations.

Be precise with numbers. If currency is ambiguous, use the symbol shown on the receipt.`;

async function callGeminiVision(imageSrcs, userQuestion = null) {
  if (!GEMINI_API_KEY) throw new Error('REACT_GEMINI_API_KEY is not set in your .env file');

  const imageParts = await Promise.all(imageSrcs.map(toGeminiPart));

  const promptText = userQuestion
    ? `${SUMMARY_PROMPT}\n\n---\n\n## 💬 User Question\n"${userQuestion}"\nAnswer this question specifically at the end of your response under a "## Answer" heading.`
    : SUMMARY_PROMPT;

  const body = {
    contents: [{
      parts: [
        { text: promptText },
        ...imageParts,
      ]
    }],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.2,
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map(p => p.text || '').join('').trim() || 'No response generated.';
}

// ─── Markdown Renderer (lightweight) ────────────────────────────────────────

function MarkdownBlock({ text }) {
  const html = text
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$3</h3>'.replace('$3', '$1'))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul class="md-ul">${s}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return (
    <div
      className="md-content"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

// ─── Image Thumbnail Strip ────────────────────────────────────────────────────

function ImageStrip({ images, activeIdx, onSelect, onRemove, onAdd }) {
  return (
    <div className="image-strip">
      {images.map((src, i) => (
        <div
          key={i}
          className={`thumb-wrapper ${i === activeIdx ? 'active' : ''}`}
          onClick={() => onSelect(i)}
        >
          <img src={src} alt={`Receipt ${i + 1}`} className="thumb-img" />
          <button
            className="thumb-remove"
            onClick={e => { e.stopPropagation(); onRemove(i); }}
            title="Remove"
          >
            <X size={10} />
          </button>
          <span className="thumb-num">{i + 1}</span>
        </div>
      ))}
      <button className="thumb-add" onClick={onAdd} title="Add more images">
        <Plus size={18} />
      </button>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMsg({ role, content, loading }) {
  return (
    <div className={`chat-msg ${role}`}>
      <div className="chat-avatar">
        {role === 'ai' ? <Sparkles size={14} /> : <MessageSquare size={14} />}
      </div>
      <div className="chat-bubble">
        {loading
          ? <span className="typing-dots"><span/><span/><span/></span>
          : role === 'ai'
            ? <MarkdownBlock text={content} />
            : <p>{content}</p>
        }
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Scanner = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Images state
  const [images, setImages]           = useState([]);          // array of data-URL strings
  const [activeIdx, setActiveIdx]     = useState(0);
  const [lightbox, setLightbox]       = useState(false);

  // UI modes
  const [mode, setMode]               = useState('idle');      // idle | upload | camera
  const [facingMode, setFacingMode]   = useState('environment');
  const webcamRef                     = useRef(null);
  const fileInputRef                  = useRef(null);

  // AI state
  const [summary, setSummary]         = useState('');
  const [analyzing, setAnalyzing]     = useState(false);
  const [chatHistory, setChatHistory] = useState([]);          // [{role, content}]
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef                    = useRef(null);

  // ── helpers ──

  const addImages = useCallback((newSrcs) => {
    setImages(prev => {
      const updated = [...prev, ...newSrcs];
      setActiveIdx(updated.length - 1);
      return updated;
    });
    setMode('idle');
  }, []);

  const removeImage = (idx) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIdx(Math.min(idx, next.length - 1));
      return next;
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(srcs => addImages(srcs));
    e.target.value = '';
  };

  const captureWebcam = () => {
    const src = webcamRef.current?.getScreenshot();
    if (src) addImages([src]);
  };

  const analyzeAll = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    setSummary('');
    setChatHistory([]);
    try {
      const result = await callGeminiVision(images);
      setSummary(result);
      setChatHistory([{ role: 'ai', content: result }]);
      toast.success(`Analyzed ${images.length} image${images.length > 1 ? 's' : ''} successfully`);
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const sendQuestion = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading || !images.length) return;
    setChatInput('');
    const userMsg = { role: 'user', content: q };
    setChatHistory(prev => [...prev, userMsg, { role: 'ai', content: '', loading: true }]);
    setChatLoading(true);
    try {
      const answer = await callGeminiVision(images, q);
      setChatHistory(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'ai', content: answer };
        return next;
      });
    } catch (err) {
      setChatHistory(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'ai', content: `❌ ${err.message}` };
        return next;
      });
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const reset = () => {
    setImages([]);
    setMode('idle');
    setSummary('');
    setChatHistory([]);
    setChatInput('');
  };

  // ── auth guard ──
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  const hasImages    = images.length > 0;
  const hasSummary   = summary.length > 0;
  const currentImage = images[activeIdx] || null;

  return (
    <AppLayout>
      <Header title="Receipt Scanner" />

      <style>{`
        /* ── Layout ── */
        .scanner-root { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

        /* ── Drop Zone ── */
        .drop-zone {
          border: 2px dashed hsl(var(--border));
          border-radius: 1.25rem;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .drop-zone:hover { border-color: hsl(var(--primary)); background: hsl(var(--primary)/.04); }
        .drop-zone-icon { width: 64px; height: 64px; margin: 0 auto 1rem; color: hsl(var(--primary)); opacity:.7; }
        .drop-zone h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: .5rem; }
        .drop-zone p  { color: hsl(var(--muted-foreground)); font-size:.9rem; }
        .dz-btns { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; margin-top: 1.75rem; }

        /* ── Image Strip ── */
        .image-strip {
          display: flex; align-items: center; gap: .5rem;
          overflow-x: auto; padding: .5rem .25rem; scrollbar-width: thin;
        }
        .thumb-wrapper {
          position: relative; flex-shrink: 0; width: 72px; height: 72px;
          border-radius: .6rem; overflow: hidden; cursor: pointer;
          border: 2px solid transparent; transition: border-color .2s;
        }
        .thumb-wrapper.active { border-color: hsl(var(--primary)); }
        .thumb-img { width: 100%; height: 100%; object-fit: cover; }
        .thumb-remove {
          position: absolute; top: 3px; right: 3px;
          background: rgba(0,0,0,.6); border: none; border-radius: 50%;
          width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer; opacity: 0; transition: opacity .15s;
        }
        .thumb-wrapper:hover .thumb-remove { opacity: 1; }
        .thumb-num {
          position: absolute; bottom: 3px; left: 4px; font-size: .6rem;
          background: rgba(0,0,0,.55); color: #fff; border-radius: 3px; padding: 0 3px;
        }
        .thumb-add {
          flex-shrink: 0; width: 72px; height: 72px; border-radius: .6rem;
          border: 2px dashed hsl(var(--border)); background: transparent;
          color: hsl(var(--muted-foreground)); cursor: pointer; display: flex;
          align-items: center; justify-content: center; transition: border-color .2s, color .2s;
        }
        .thumb-add:hover { border-color: hsl(var(--primary)); color: hsl(var(--primary)); }

        /* ── Preview Card ── */
        .preview-area { position: relative; border-radius: 1rem; overflow: hidden; }
        .preview-img { width: 100%; max-height: 480px; object-fit: contain; background: hsl(var(--muted)/.3); }
        .preview-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: rgba(0,0,0,.5); border: none; border-radius: 50%;
          width: 32px; height: 32px; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity .2s;
        }
        .preview-area:hover .preview-nav { opacity: 1; }
        .preview-nav.left  { left: 8px; }
        .preview-nav.right { right: 8px; }
        .preview-zoom {
          position: absolute; bottom: 8px; right: 8px;
          background: rgba(0,0,0,.5); border: none; border-radius: .4rem;
          padding: 4px 8px; color: #fff; cursor: pointer; font-size: .75rem;
          display: flex; align-items: center; gap: 4px;
        }

        /* ── Lightbox ── */
        .lightbox {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(0,0,0,.92); display: flex; align-items: center; justify-content: center;
        }
        .lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: .5rem; }
        .lightbox-close {
          position: absolute; top: 1rem; right: 1rem;
          background: rgba(255,255,255,.15); border: none; border-radius: 50%;
          width: 36px; height: 36px; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Webcam ── */
        .webcam-wrap { border-radius: 1rem; overflow: hidden; position: relative; }
        .webcam-wrap video { width: 100%; display: block; }
        .webcam-flip {
          position: absolute; top: .75rem; right: .75rem;
          background: rgba(0,0,0,.5); border: none; border-radius: 50%;
          width: 38px; height: 38px; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .webcam-btns { display: flex; gap: .75rem; margin-top: .75rem; }

        /* ── Analyze banner ── */
        .analyze-bar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: .75rem;
          padding: 1rem 1.25rem;
          background: hsl(var(--primary)/.08);
          border: 1px solid hsl(var(--primary)/.2);
          border-radius: 1rem;
        }
        .analyze-bar-info { display: flex; align-items: center; gap: .6rem; }
        .badge-count {
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          border-radius: 99px; padding: 2px 10px; font-size: .8rem; font-weight: 600;
        }
        .hw-badge {
          display: flex; align-items: center; gap: 4px; font-size: .78rem;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted)); border-radius: 99px; padding: 2px 10px;
        }

        /* ── Chat ── */
        .chat-panel { display: flex; flex-direction: column; gap: 0; }
        .chat-header { padding: 1rem 1.25rem; border-bottom: 1px solid hsl(var(--border)); font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: .5rem; }
        .chat-messages { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; max-height: 540px; overflow-y: auto; scroll-behavior: smooth; }
        .chat-msg { display: flex; gap: .6rem; }
        .chat-msg.user { flex-direction: row-reverse; }
        .chat-avatar {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: .75rem;
          background: hsl(var(--primary)/.15); color: hsl(var(--primary));
        }
        .chat-msg.user .chat-avatar { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); }
        .chat-bubble {
          max-width: 85%; background: hsl(var(--muted)/.6);
          border-radius: .875rem; padding: .75rem 1rem; font-size: .88rem; line-height: 1.6;
        }
        .chat-msg.user .chat-bubble { background: hsl(var(--primary)/.12); }
        .chat-input-row {
          display: flex; gap: .5rem; padding: .875rem 1.25rem;
          border-top: 1px solid hsl(var(--border));
        }
        .chat-input {
          flex: 1; border: 1px solid hsl(var(--border)); border-radius: .6rem;
          padding: .5rem .875rem; font-size: .9rem; background: transparent;
          color: inherit; outline: none; transition: border-color .2s;
        }
        .chat-input:focus { border-color: hsl(var(--primary)); }
        .chat-send {
          width: 38px; height: 38px; border-radius: .6rem; border: none;
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: opacity .2s;
        }
        .chat-send:disabled { opacity: .45; cursor: default; }

        /* ── Markdown ── */
        .md-content p { margin-bottom: .5rem; }
        .md-content .md-h2 { font-size: 1rem; font-weight: 700; margin: 1rem 0 .4rem; padding-bottom: .25rem; border-bottom: 1px solid hsl(var(--border)); }
        .md-content .md-h3 { font-size: .92rem; font-weight: 600; margin: .75rem 0 .3rem; }
        .md-content .md-ul { padding-left: 1.2rem; margin: .3rem 0; }
        .md-content li { margin-bottom: .2rem; }

        /* ── Typing dots ── */
        .typing-dots { display: flex; gap: 4px; padding: .25rem 0; }
        .typing-dots span {
          width: 7px; height: 7px; border-radius: 50%; background: hsl(var(--muted-foreground));
          animation: blink 1.2s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: .2s; }
        .typing-dots span:nth-child(3) { animation-delay: .4s; }
        @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
      `}</style>

      <div className="scanner-root">

        {/* ── Step 1: No images yet — show drop zone or camera ── */}
        {!hasImages && (
          <Card className="glass" data-testid="scanner-mode-card">
            <CardContent className="p-0">

              {mode !== 'camera' ? (
                <div
                  className="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (!files.length) return;
                    Promise.all(files.map(f => new Promise(res => {
                      const r = new FileReader();
                      r.onload = ev => res(ev.target.result);
                      r.readAsDataURL(f);
                    }))).then(srcs => addImages(srcs));
                  }}
                >
                  <FileText className="drop-zone-icon" />
                  <h2>Scan Your Receipts</h2>
                  <p>
                    Powered by Gemini Vision — supports printed &amp; <strong>handwritten</strong> text.<br/>
                    Drag &amp; drop, upload multiple files, or use your camera.
                  </p>
                  <div className="dz-btns" onClick={e => e.stopPropagation()}>
                    <Button size="lg" onClick={() => setMode('camera')} data-testid="use-camera-button">
                      <Camera className="w-5 h-5 mr-2" /> Use Camera
                    </Button>
                    <Button size="lg" variant="outline" className="glass-strong"
                      onClick={() => fileInputRef.current?.click()} data-testid="upload-file-button">
                      <Upload className="w-5 h-5 mr-2" /> Upload Files
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="webcam-wrap">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode }}
                      className="w-full rounded-xl"
                      data-testid="webcam-view"
                    />
                    <button className="webcam-flip" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}
                      data-testid="flip-camera-button" title="Flip camera">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className="webcam-btns">
                    <Button onClick={captureWebcam} className="flex-1" size="lg" data-testid="capture-button">
                      <Camera className="w-5 h-5 mr-2" /> Capture
                    </Button>
                    <Button variant="outline" className="glass-strong" size="lg"
                      onClick={() => setMode('idle')} data-testid="cancel-camera-button">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={handleFileChange} className="hidden" data-testid="file-input" />
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Images loaded — preview + strip ── */}
        {hasImages && (
          <>
            {/* Image strip + preview */}
            <Card className="glass" data-testid="preview-card">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base">
                    {images.length} Receipt{images.length > 1 ? 's' : ''} Loaded
                  </span>
                  <Button variant="outline" size="sm" onClick={reset} data-testid="reset-button">
                    <Trash2 className="w-4 h-4 mr-1" /> Clear All
                  </Button>
                </div>

                {/* Thumbnail strip */}
                <ImageStrip
                  images={images}
                  activeIdx={activeIdx}
                  onSelect={setActiveIdx}
                  onRemove={removeImage}
                  onAdd={() => fileInputRef.current?.click()}
                />

                {/* Large preview */}
                {currentImage && (
                  <div className="preview-area">
                    <img src={currentImage} alt="Preview" className="preview-img" data-testid="scanned-image" />

                    {images.length > 1 && (
                      <>
                        <button className="preview-nav left" onClick={() => setActiveIdx(i => Math.max(0, i-1))}>
                          <ChevronLeft size={16} />
                        </button>
                        <button className="preview-nav right" onClick={() => setActiveIdx(i => Math.min(images.length-1, i+1))}>
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    <button className="preview-zoom" onClick={() => setLightbox(true)}>
                      <ZoomIn size={12} /> Zoom
                    </button>
                  </div>
                )}

                {/* Camera add more */}
                {mode === 'camera' && (
                  <div className="p-0 flex flex-col gap-3">
                    <div className="webcam-wrap">
                      <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode }} className="w-full rounded-xl" />
                      <button className="webcam-flip" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')}>
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <div className="webcam-btns">
                      <Button onClick={captureWebcam} className="flex-1">
                        <Camera className="w-4 h-4 mr-2" /> Capture
                      </Button>
                      <Button variant="outline" className="glass-strong" onClick={() => setMode('idle')}>Done</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analyze bar */}
            {!hasSummary && (
              <div className="analyze-bar">
                <div className="analyze-bar-info">
                  <span className="badge-count">{images.length} image{images.length > 1 ? 's' : ''}</span>
                  <span className="hw-badge"><PenLine size={12}/> Handwriting detected</span>
                  <span style={{ fontSize: '.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    ready for AI analysis
                  </span>
                </div>
                <Button onClick={analyzeAll} disabled={analyzing} data-testid="analyze-button">
                  {analyzing
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</>
                    : <><Sparkles className="w-4 h-4 mr-2" /> Analyze with Gemini</>
                  }
                </Button>
              </div>
            )}

            {/* Re-analyze bar (after summary) */}
            {hasSummary && (
              <div className="analyze-bar">
                <span style={{ fontSize: '.88rem', color: 'hsl(var(--muted-foreground))' }}>
                  Analysis complete · Ask follow-up questions below
                </span>
                <Button variant="outline" className="glass-strong" size="sm"
                  onClick={analyzeAll} disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Re-analyze
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Chat panel with summary + Q&A ── */}
        {(hasSummary || analyzing) && (
          <Card className="glass" data-testid="ai-chat-card">
            <div className="chat-panel">
              <div className="chat-header">
                <Sparkles size={16} style={{ color: 'hsl(var(--primary))' }} />
                AI Receipt Analysis &amp; Q&amp;A
              </div>

              <div className="chat-messages" data-testid="chat-messages">
                {chatHistory.map((msg, i) => (
                  <ChatMsg key={i} role={msg.role} content={msg.content} loading={msg.loading} />
                ))}
                {analyzing && chatHistory.length === 0 && (
                  <ChatMsg role="ai" content="" loading={true} />
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Ask a question about your receipts… e.g. 'Did I overspend on food?'"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuestion()}
                  data-testid="chat-input"
                  disabled={chatLoading || analyzing}
                />
                <button
                  className="chat-send"
                  onClick={sendQuestion}
                  disabled={!chatInput.trim() || chatLoading || analyzing}
                  data-testid="chat-send-button"
                >
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>

              {hasSummary && (
                <div style={{ padding: '0 1.25rem 1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  {[
                    "What's the grand total?",
                    'Any handwritten notes?',
                    'Biggest expense?',
                    'Add as transaction',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        if (q === 'Add as transaction') { navigate('/transactions'); return; }
                        setChatInput(q);
                      }}
                      style={{
                        fontSize: '.76rem', border: '1px solid hsl(var(--border))',
                        borderRadius: 99, padding: '3px 10px', background: 'transparent',
                        cursor: 'pointer', color: 'hsl(var(--foreground))', transition: 'background .15s',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Hidden file input (for "add more") */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          onChange={handleFileChange} className="hidden" data-testid="file-input-extra" />
      </div>

      {/* Lightbox */}
      {lightbox && currentImage && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button className="lightbox-close"><X size={18} /></button>
          <img src={currentImage} alt="Full preview" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </AppLayout>
  );
};

export default Scanner;
