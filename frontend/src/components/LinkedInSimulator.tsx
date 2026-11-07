import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  MoreHorizontal,
  Globe,
  FileCode,
  FileDown
} from 'lucide-react';
import {
  ScientificEvidencePayload,
  EditorialResponse
} from '../types';
import {
  fetchPosterBlob,
  fetchCarouselSlides,
  downloadCarouselPdf
} from '../services/api';

interface LinkedInSimulatorProps {
  payload: ScientificEvidencePayload | null;
  editorial: EditorialResponse | null;
  colormap: string;
}

export const LinkedInSimulator: React.FC<LinkedInSimulatorProps> = ({
  payload,
  editorial,
  colormap
}) => {
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'square' | 'banner' | 'carousel'>('portrait');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [carouselSlides, setCarouselSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Update poster or carousel when payload, aspect ratio, or colormap changes
  useEffect(() => {
    if (!payload) return;
    let isCancelled = false;
    setIsRendering(true);

    if (aspectRatio === 'carousel') {
      fetchCarouselSlides(payload)
        .then((slides) => {
          if (!isCancelled) {
            setCarouselSlides(slides);
            setCurrentSlide(0);
            setIsRendering(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (!isCancelled) setIsRendering(false);
        });
    } else {
      fetchPosterBlob(payload, aspectRatio, 'dark', colormap)
        .then((blob) => {
          if (!isCancelled) {
            const url = URL.createObjectURL(blob);
            setPosterUrl(url);
            setIsRendering(false);
          }
        })
        .catch((err) => {
          console.error(err);
          if (!isCancelled) setIsRendering(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [payload, aspectRatio, colormap]);

  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `geosci_${aspectRatio}_poster_300dpi.png`;
    a.click();
  };

  const handleDownloadCarouselPdf = async () => {
    if (!payload) return;
    try {
      const blob = await downloadCarouselPdf(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geosci_carousel_${payload.dataset_metadata.aoi_name.replace(/\s+/g, '_')}.pdf`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScientificEvidencePayload_${payload.dataset_metadata.aoi_name.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  if (!payload || !editorial) {
    return (
      <div className="flex-1 h-full bg-[#070A12] flex items-center justify-center p-8 text-center">
        <div className="max-w-xs text-slate-500">
          <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <h4 className="text-xs font-semibold text-slate-400">LinkedIn Feed & Poster Simulator</h4>
          <p className="text-[11px] mt-1">Simulates high-DPI aspect-ratio posters and LinkedIn feed mobile cards.</p>
        </div>
      </div>
    );
  }

  const postText = editorial.feed_post.text;
  const foldLength = 210;
  const isTruncated = postText.length > foldLength && !isExpanded;
  const displayedText = isTruncated ? postText.slice(0, foldLength) : postText;

  return (
    <div className="flex-1 h-full bg-[#070A12] flex flex-col justify-between overflow-hidden">
      {/* Top Controls: Aspect Ratio Switcher */}
      <div className="p-3 bg-[#0D131F] border-b border-[#1E293B] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Format:
          </span>
          <button
            onClick={() => setAspectRatio('portrait')}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              aspectRatio === 'portrait'
                ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            4:5 Portrait (Feed)
          </button>
          <button
            onClick={() => setAspectRatio('square')}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              aspectRatio === 'square'
                ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            1:1 Square (Card)
          </button>
          <button
            onClick={() => setAspectRatio('banner')}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              aspectRatio === 'banner'
                ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            1.91:1 Banner
          </button>
          <button
            onClick={() => setAspectRatio('carousel')}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              aspectRatio === 'carousel'
                ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                : 'bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            5-Slide PDF Carousel
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-400">
          300 DPI Export Ready
        </span>
      </div>

      {/* Main Preview: LinkedIn Feed Simulator Container */}
      <div className="flex-1 p-4 overflow-y-auto flex items-start justify-center">
        <div className="w-full max-w-[490px] bg-[#1B2230] rounded-xl border border-[#2A3447] shadow-2xl overflow-hidden font-sans">
          {/* LinkedIn Post Header */}
          <div className="p-3.5 flex items-start justify-between">
            <div className="flex gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 shrink-0">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-sky-400 text-xs">
                  AT
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  Dr. Aris Thorne
                  <span className="text-[10px] text-slate-400 font-normal">• 1st</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Principal Geospatial Data Scientist | SAR & Geostatistical R&D
                </p>
                <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
                  <span>1h • Edited •</span>
                  <Globe className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-200">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* LinkedIn Post Text Body */}
          <div className="px-3.5 pb-2.5 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
            {displayedText}
            {isTruncated && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-slate-400 hover:text-sky-400 font-semibold ml-1 cursor-pointer"
              >
                …see more
              </button>
            )}
            {!isTruncated && postText.length > foldLength && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-sky-400 font-semibold block mt-1 cursor-pointer"
              >
                show less
              </button>
            )}
          </div>

          {/* Media Canvas / Poster Image */}
          <div className="bg-[#090D16] border-y border-[#2A3447] flex items-center justify-center relative overflow-hidden min-h-[300px]">
            {isRendering ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400">Rendering 300 DPI Asset...</span>
              </div>
            ) : aspectRatio === 'carousel' ? (
              <div className="relative w-full flex flex-col items-center">
                {carouselSlides.length > 0 && (
                  <img
                    src={`data:image/png;base64,${carouselSlides[currentSlide]}`}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full object-contain"
                  />
                )}

                {/* Carousel Navigation Arrows */}
                <button
                  onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 transition-all shadow-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => Math.min(carouselSlides.length - 1, prev + 1))}
                  disabled={currentSlide === carouselSlides.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 transition-all shadow-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Page indicator pill */}
                <div className="absolute bottom-3 bg-slate-950/80 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300">
                  {currentSlide + 1} / {carouselSlides.length}
                </div>
              </div>
            ) : (
              posterUrl && (
                <img
                  src={posterUrl}
                  alt="Scientific Poster Preview"
                  className="w-full object-contain"
                />
              )
            )}
          </div>

          {/* Social Feedback Bar */}
          <div className="p-3 text-[11px] text-slate-400 flex items-center justify-between border-b border-[#2A3447]">
            <div className="flex items-center gap-1">
              <span className="flex -space-x-1">
                <span className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-[9px] text-white">👍</span>
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">💡</span>
              </span>
              <span className="ml-1">84 peer reactions</span>
            </div>
            <span>19 comments • 12 reposts</span>
          </div>

          {/* Social Action Buttons */}
          <div className="px-3 py-2 grid grid-cols-4 gap-1 text-slate-400 text-xs">
            <button className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-slate-800 rounded transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" /> Like
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-slate-800 rounded transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Comment
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-slate-800 rounded transition-colors">
              <Repeat2 className="w-3.5 h-3.5" /> Repost
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1.5 hover:bg-slate-800 rounded transition-colors">
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </div>
      </div>

      {/* Export & Publishing Action Bar */}
      <div className="p-3.5 bg-[#0D131F] border-t border-[#1E293B] shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleDownloadPoster}
            disabled={!posterUrl || aspectRatio === 'carousel'}
            className="flex-1 py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Download 300-DPI Poster (.PNG)
          </button>

          <button
            onClick={handleDownloadCarouselPdf}
            className="flex-1 py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Download 5-Slide Carousel (.PDF)
          </button>

          <button
            onClick={handleExportJson}
            className="py-2 px-3 rounded-lg bg-[#162038] hover:bg-[#1D2B4D] border border-[#1E293B] text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Export full reproducible evidence payload JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            Evidence JSON
          </button>
        </div>
      </div>
    </div>
  );
};
