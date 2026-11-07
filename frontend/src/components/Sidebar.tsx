import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  Play,
  RotateCw,
  Sliders,
  Database,
  CheckCircle2,
  Cpu,
  Palette,
  Sparkles
} from 'lucide-react';
import { RegionalPreset } from '../types';

interface SidebarProps {
  presets: RegionalPreset[];
  selectedPreset: RegionalPreset | null;
  onSelectPreset: (preset: RegionalPreset) => void;
  pipelineRecipe: string;
  onSelectRecipe: (recipe: string) => void;
  colormap: string;
  onSelectColormap: (cmap: string) => void;
  significanceAlpha: number;
  onSelectAlpha: (alpha: number) => void;
  onRunPipeline: () => void;
  onBatchRun: () => void;
  isLoading: boolean;
  isBatchRunning: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  presets,
  selectedPreset,
  onSelectPreset,
  pipelineRecipe,
  onSelectRecipe,
  colormap,
  onSelectColormap,
  significanceAlpha,
  onSelectAlpha,
  onRunPipeline,
  onBatchRun,
  isLoading,
  isBatchRunning
}) => {
  const colormaps = [
    { id: 'vik', label: 'Cmcrameri Vik (Diverging)', preview: 'from-blue-600 via-slate-200 to-rose-600' },
    { id: 'roma', label: 'Roma (Bipolar Thermal)', preview: 'from-purple-600 via-amber-200 to-teal-500' },
    { id: 'viridis', label: 'Viridis (Perceptually Uniform)', preview: 'from-purple-900 via-teal-500 to-yellow-400' },
    { id: 'magma', label: 'Magma (Solar Energy)', preview: 'from-slate-950 via-rose-600 to-amber-300' },
    { id: 'cividis', label: 'Cividis (Colorblind Safe)', preview: 'from-blue-900 via-emerald-600 to-yellow-200' }
  ];

  const recipes = [
    { id: 'insar', label: 'SAR / InSAR Deformation', desc: 'Phase unwrapping, Lee speckle filter & Gi* subsidence' },
    { id: 'optical', label: 'Optical Agro-Ecological', desc: 'Z-score NDVI/NDWI anomaly & phenology decomposition' },
    { id: 'geostatistical', label: 'Spatial Point Survey', desc: 'Ordinary Kriging, variogram fitting & LISA clusters' }
  ];

  return (
    <aside className="w-80 h-full bg-[#0D131F] border-r border-[#1E293B] flex flex-col justify-between shrink-0 overflow-y-auto">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-[#1E293B] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              GeoSci-LinkedIn
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">STUDIO</span>
            </h1>
            <p className="text-[11px] text-slate-400">Autonomous Geospatial Intelligence</p>
          </div>
        </div>

        {/* Region & Benchmark Presets */}
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-sky-400" /> Regional AOI Presets
            </span>
            <span className="text-[10px] font-mono text-slate-400">{presets.length} active</span>
          </div>

          <div className="space-y-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/50 text-sky-200 shadow-sm shadow-sky-500/10'
                      : 'bg-[#131B2E] border-[#1E293B] text-slate-300 hover:border-slate-600 hover:bg-[#162038]'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="truncate pr-1">{preset.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span className="truncate">{preset.sensor}</span>
                    <span className="font-mono text-slate-400">{preset.default_metric.split(' ')[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={onBatchRun}
            disabled={isBatchRunning || isLoading}
            className="w-full mt-2.5 py-1.5 px-2 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {isBatchRunning ? 'Running Batch Across All Regions...' : 'Batch-Evaluate All 3 Regions'}
          </button>
        </div>

        {/* Pipeline Domain Recipe */}
        <div className="p-4 border-b border-[#1E293B]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Cpu className="w-3 h-3 text-emerald-400" /> Domain Pipeline Recipe
          </span>

          <div className="space-y-1.5">
            {recipes.map((rcp) => (
              <label
                key={rcp.id}
                onClick={() => onSelectRecipe(rcp.id)}
                className={`flex flex-col p-2 rounded border cursor-pointer transition-all ${
                  pipelineRecipe === rcp.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{rcp.label}</span>
                  <input
                    type="radio"
                    name="pipelineRecipe"
                    checked={pipelineRecipe === rcp.id}
                    onChange={() => onSelectRecipe(rcp.id)}
                    className="accent-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">{rcp.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Analytical Controls */}
        <div className="p-4 space-y-3.5">
          {/* Significance Alpha */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Significance α
              </span>
              <span className="font-mono text-sky-400 text-[11px]">α = {significanceAlpha} ({significanceAlpha === 0.01 ? '99% Conf' : '95% Conf'})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectAlpha(0.01)}
                className={`py-1 text-xs rounded border text-center ${
                  significanceAlpha === 0.01
                    ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                    : 'bg-[#131B2E] border-[#1E293B] text-slate-400'
                }`}
              >
                α = 0.01 (99%)
              </button>
              <button
                onClick={() => onSelectAlpha(0.05)}
                className={`py-1 text-xs rounded border text-center ${
                  significanceAlpha === 0.05
                    ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                    : 'bg-[#131B2E] border-[#1E293B] text-slate-400'
                }`}
              >
                α = 0.05 (95%)
              </button>
            </div>
          </div>

          {/* Colormap Selector */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Palette className="w-3 h-3 text-amber-400" /> Scientific Colormap
            </span>
            <div className="space-y-1">
              {colormaps.map((cm) => (
                <button
                  key={cm.id}
                  onClick={() => onSelectColormap(cm.id)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-xs border ${
                    colormap === cm.id
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate pr-1 text-[11px]">{cm.label}</span>
                  <div className={`w-12 h-2.5 rounded-full bg-gradient-to-r ${cm.preview} shrink-0`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0A0F1A]">
        <button
          onClick={onRunPipeline}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              Executing Spatial Pipeline...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Execute Scientific Pipeline
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
