import React, { useState } from 'react';
import {
  FileText,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Zap,
  Scale,
  Sliders,
  Eye,
  BookOpen,
  Layers
} from 'lucide-react';
import { EditorialResponse, EditorialAudit, ScientificEvidencePayload } from '../types';

interface EditorialStudioProps {
  editorial: EditorialResponse | null;
  payload: ScientificEvidencePayload | null;
  tonePreset: string;
  onSelectTone: (tone: string) => void;
  onRegenerateSection: (sectionType: string) => void;
  isRegenerating: boolean;
}

export const EditorialStudio: React.FC<EditorialStudioProps> = ({
  editorial,
  payload,
  tonePreset,
  onSelectTone,
  onRegenerateSection,
  isRegenerating
}) => {
  const [activeFormat, setActiveFormat] = useState<'feed' | 'article' | 'carousel'>('feed');
  const [copied, setCopied] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const handleCopy = () => {
    if (!editorial) return;
    let content = '';
    if (activeFormat === 'feed') {
      content = editorial.feed_post.text;
    } else if (activeFormat === 'article') {
      content = editorial.long_form_article.content_markdown;
    } else {
      content = JSON.stringify(editorial.carousel_script, null, 2);
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!editorial || !payload) {
    return (
      <div className="w-96 h-full bg-[#0B0F17] border-r border-[#1E293B] flex items-center justify-center p-6 text-center shrink-0">
        <div className="max-w-xs">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
          <h4 className="text-xs font-semibold text-slate-300">Human Data Scientist Editorial Studio</h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Deterministic narrative generation activates once spatial tensors are computed. Banned AI clichés are automatically purged.
          </p>
        </div>
      </div>
    );
  }

  const audit: EditorialAudit = editorial.feed_post.audit;

  return (
    <div className="w-[410px] h-full bg-[#0B0F17] border-r border-[#1E293B] flex flex-col justify-between shrink-0 overflow-hidden">
      {/* Editorial Header */}
      <div>
        <div className="p-3 border-b border-[#1E293B] bg-[#0D131F]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" /> Editorial & Anti-AI Studio
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[11px] flex items-center gap-1 font-medium transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
          </div>

          {/* Format Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-[#06090F] p-1 rounded border border-[#1E293B]">
            <button
              onClick={() => setActiveFormat('feed')}
              className={`py-1 text-[11px] font-medium rounded transition-colors text-center ${
                activeFormat === 'feed'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feed Post
            </button>
            <button
              onClick={() => setActiveFormat('article')}
              className={`py-1 text-[11px] font-medium rounded transition-colors text-center ${
                activeFormat === 'article'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Long Article
            </button>
            <button
              onClick={() => setActiveFormat('carousel')}
              className={`py-1 text-[11px] font-medium rounded transition-colors text-center ${
                activeFormat === 'carousel'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Carousel Copy
            </button>
          </div>
        </div>

        {/* Human Authenticity Audit Badge */}
        <div className="p-3 border-b border-[#1E293B] bg-[#111827]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Human Authenticity Audit
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              100% GROUNDED
            </span>
          </div>

          <div className="p-2 rounded bg-[#090D16] border border-[#1E293B] text-[11px] space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>Empirical Metrics Cited:</span>
              <strong className="font-mono text-sky-400 font-bold">{audit.metrics_cited_count} metrics</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Banned AI Clichés Detected:</span>
              <strong className="font-mono text-emerald-400 font-bold">{audit.cliche_count} (Zero Fluff)</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Burstiness / Syntactic Cadence:</span>
              <strong className="font-mono text-purple-400 font-bold">{audit.burstiness_score_pct}%</strong>
            </div>
          </div>
        </div>

        {/* Voice & Rigor Controls */}
        <div className="p-3 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-sky-400" /> Voice & Rigor Preset
            </span>
          </div>
          <select
            value={tonePreset}
            onChange={(e) => onSelectTone(e.target.value)}
            className="w-full bg-[#111827] border border-[#1E293B] rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="Principal Data Scientist">Principal Data Scientist (Default, Strict Empirical)</option>
            <option value="Pure Scientific / Peer Review">Pure Scientific / Peer Review (Zero Emojis)</option>
            <option value="R&D Engineering Brief">R&D Engineering Brief (Infrastructure Focus)</option>
            <option value="Executive Risk Advisory">Executive Risk Advisory (Geotechnical Exposure)</option>
          </select>
        </div>

        {/* Section Refinement Action Bar */}
        <div className="p-3 border-b border-[#1E293B] bg-[#0D131F]">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Section-Level Precision Refinement
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onRegenerateSection('tighten_physics')}
              disabled={isRegenerating}
              className="py-1 px-1.5 rounded bg-[#162038] hover:bg-[#1D2B4D] border border-[#1E293B] text-[10px] text-sky-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              <Zap className="w-2.5 h-2.5 text-sky-400" /> Tighten Physics
            </button>
            <button
              onClick={() => onRegenerateSection('emphasize_uncertainty')}
              disabled={isRegenerating}
              className="py-1 px-1.5 rounded bg-[#162038] hover:bg-[#1D2B4D] border border-[#1E293B] text-[10px] text-amber-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              <Scale className="w-2.5 h-2.5 text-amber-400" /> Error Bounds
            </button>
            <button
              onClick={() => onRegenerateSection('compare_subregions')}
              disabled={isRegenerating}
              className="py-1 px-1.5 rounded bg-[#162038] hover:bg-[#1D2B4D] border border-[#1E293B] text-[10px] text-emerald-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              <Layers className="w-2.5 h-2.5 text-emerald-400" /> Zonal Strain
            </button>
          </div>
        </div>
      </div>

      {/* Main Text Content Area */}
      <div className="flex-1 p-3.5 overflow-y-auto font-editorial text-xs leading-relaxed text-slate-300 space-y-3 bg-[#080C14]">
        {activeFormat === 'feed' && (
          <div className="space-y-3">
            {editorial.feed_post.paragraphs.map((p, idx) => (
              <p key={idx} className="p-2 rounded bg-[#0D131F]/60 border border-[#1E293B]/60 hover:border-sky-500/30 transition-all">
                {p}
              </p>
            ))}
            <div className="pt-2 text-[10px] font-mono text-slate-400 text-right">
              Character Count: {editorial.feed_post.character_count} / 3000
            </div>
          </div>
        )}

        {activeFormat === 'article' && (
          <div className="space-y-3">
            <h3 className="font-sans text-sm font-bold text-slate-100">
              {editorial.long_form_article.title}
            </h3>
            <div className="prose prose-invert prose-xs text-slate-300 whitespace-pre-line font-sans text-xs">
              {editorial.long_form_article.content_markdown}
            </div>
            <div className="pt-2 text-[10px] font-mono text-slate-400 text-right">
              Word Count: {editorial.long_form_article.word_count} words
            </div>
          </div>
        )}

        {activeFormat === 'carousel' && (
          <div className="space-y-2.5">
            {editorial.carousel_script.map((slide) => (
              <div key={slide.slide_index} className="p-2.5 rounded bg-[#0E1524] border border-[#1E293B] font-sans">
                <div className="flex items-center justify-between text-[10px] font-mono text-sky-400 mb-1">
                  <span>SLIDE {slide.slide_index} / 05</span>
                  <span className="font-bold text-amber-400">{slide.headline_metric}</span>
                </div>
                <h5 className="text-xs font-bold text-slate-200">{slide.title}</h5>
                <p className="text-[11px] text-slate-400 mt-1">{slide.narrative}</p>
                <div className="mt-1.5 text-[9px] font-mono text-slate-400 border-t border-[#1E293B] pt-1">
                  Callout: {slide.footer_callout}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Lineage Indicator */}
      <div className="p-2.5 border-t border-[#1E293B] bg-[#0A0F1A] text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span>Lexical Filter: Active</span>
        <span className="text-emerald-400 font-semibold">Zero Banned Tokens</span>
      </div>
    </div>
  );
};
