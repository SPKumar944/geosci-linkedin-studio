import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Activity,
  BarChart3,
  TrendingDown,
  Layers,
  Info,
  Maximize2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { ScientificEvidencePayload } from '../types';

interface SpatialWorkbenchProps {
  payload: ScientificEvidencePayload | null;
  isLoading: boolean;
  colormap: string;
}

export const SpatialWorkbench: React.FC<SpatialWorkbenchProps> = ({
  payload,
  isLoading,
  colormap
}) => {
  const [activeTab, setActiveTab] = useState<'raster' | 'variogram' | 'kde' | 'regional' | 'temporal'>('raster');
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; val: number | null; gi: number | null } | null>(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render raster on canvas when payload or colormap changes
  useEffect(() => {
    if (!payload?.raster_summary || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = payload.raster_summary.downsampled_values;
    const gi = payload.raster_summary.downsampled_gi_star;
    const ny = data.length;
    const nx = data[0]?.length || 0;
    if (ny === 0 || nx === 0) return;

    canvas.width = nx;
    canvas.height = ny;
    const imgData = ctx.createImageData(nx, ny);

    const minV = payload.raster_summary.min_val;
    const maxV = payload.raster_summary.max_val;
    const range = maxV - minV || 1.0;

    for (let r = 0; r < ny; r++) {
      for (let c = 0; c < nx; c++) {
        const idx = (r * nx + c) * 4;
        const val = data[r][c];
        const giVal = gi ? gi[r]?.[c] : null;

        if (val === null || val === undefined) {
          imgData.data[idx] = 13;
          imgData.data[idx + 1] = 19;
          imgData.data[idx + 2] = 31;
          imgData.data[idx + 3] = 255;
          continue;
        }

        // Colormap normalization
        const norm = Math.max(0, Math.min(1, (val - minV) / range));

        let red = 0, green = 0, blue = 0;
        if (colormap === 'vik' || colormap === 'RdBu_r') {
          // Diverging Red-Blue
          red = Math.round(norm * 255);
          blue = Math.round((1 - norm) * 255);
          green = Math.round((1 - Math.abs(norm - 0.5) * 2) * 180 + 40);
        } else if (colormap === 'roma') {
          red = Math.round(norm * 240 + 15);
          green = Math.round(norm * 180 + 30);
          blue = Math.round((1 - norm) * 220 + 35);
        } else if (colormap === 'viridis') {
          red = Math.round(norm * 250);
          green = Math.round(norm * 220 + 30);
          blue = Math.round((1 - norm) * 160 + 50);
        } else {
          red = Math.round(norm * 255);
          green = Math.round(norm * 140);
          blue = Math.round((1 - norm) * 100);
        }

        // Highlight 99% Getis-Ord Gi* hotspots / coldspots if enabled
        if (showHotspots && giVal !== null && giVal !== undefined) {
          if (giVal >= 2.58) {
            // Hotspot halo (crimson red)
            red = Math.min(255, red + 90);
            green = Math.max(0, green - 60);
            blue = Math.max(0, blue - 60);
          } else if (giVal <= -2.58) {
            // Coldspot halo (cyan blue)
            blue = Math.min(255, blue + 110);
            red = Math.max(0, red - 70);
          }
        }

        imgData.data[idx] = red;
        imgData.data[idx + 1] = green;
        imgData.data[idx + 2] = blue;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [payload, colormap, showHotspots]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!payload?.raster_summary || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const data = payload.raster_summary.downsampled_values;
    const gi = payload.raster_summary.downsampled_gi_star;
    if (y >= 0 && y < data.length && x >= 0 && x < (data[0]?.length || 0)) {
      setHoverCoord({
        x,
        y,
        val: data[y][x],
        gi: gi ? gi[y]?.[x] ?? null : null
      });
    }
  };

  if (!payload) {
    return (
      <div className="flex-1 h-full bg-[#090D16] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-300">Awaiting Pipeline Execution</h3>
          <p className="text-xs text-slate-400 mt-1">
            Select a regional dataset preset in the sidebar and click "Execute Scientific Pipeline" to initiate windowed extraction and geostatistical tensor evaluation.
          </p>
        </div>
      </div>
    );
  }

  const meta = payload.dataset_metadata;
  const dist = payload.distributional_moments;
  const spat = payload.spatial_statistics;
  const temp = payload.temporal_dynamics;
  const regions = payload.regional_comparison;

  return (
    <div className="flex-1 h-full bg-[#090D16] flex flex-col overflow-hidden border-r border-[#1E293B]">
      {/* Live Statistical Telemetry Ribbon */}
      <div className="bg-[#0D131F] border-b border-[#1E293B] p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-slate-200">{meta.aoi_name}</span>
            <span className="text-[10px] font-mono text-slate-400 bg-[#162038] px-1.5 py-0.5 rounded border border-[#1E293B]">
              EPSG:{meta.crs_epsg} • {meta.spatial_resolution_m}m
            </span>
          </div>
          <span className="text-[11px] font-mono text-sky-400">
            Extent: {meta.aoi_area_sq_km} km² ({meta.valid_pixel_coverage_pct}% Valid)
          </span>
        </div>

        {/* 8-Metric Telemetry Bento Strip */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Mean</span>
            <span className="text-xs font-bold font-mono text-slate-100">{dist.mean}</span>
            <span className="block text-[8px] text-slate-400 truncate">{dist.unit}</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Median</span>
            <span className="text-xs font-bold font-mono text-sky-400">{dist.median}</span>
            <span className="block text-[8px] text-slate-400 truncate">{dist.unit}</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">IQR Spread</span>
            <span className="text-xs font-bold font-mono text-slate-200">{dist.iqr}</span>
            <span className="block text-[8px] text-slate-400 truncate">{dist.unit}</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Skewness</span>
            <span className="text-xs font-bold font-mono text-amber-400">{dist.skewness}</span>
            <span className="block text-[8px] text-slate-400 truncate">Asymmetry</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Moran's I</span>
            <span className="text-xs font-bold font-mono text-emerald-400">{spat.global_morans_i}</span>
            <span className="block text-[8px] text-slate-400 truncate">z = {spat.morans_z_score}</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Range (m)</span>
            <span className="text-xs font-bold font-mono text-purple-400">{Math.round(spat.effective_spatial_range_m)}m</span>
            <span className="block text-[8px] text-slate-400 truncate">Variogram a</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Sen's Slope</span>
            <span className="text-xs font-bold font-mono text-rose-400">{temp.sens_slope_per_year}</span>
            <span className="block text-[8px] text-slate-400 truncate">/year</span>
          </div>
          <div className="bg-[#111827] border border-[#1E293B] rounded p-1.5 text-center">
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">Hotspot Area</span>
            <span className="text-xs font-bold font-mono text-amber-300">{spat.hotspot_99pct_area_sq_km}</span>
            <span className="block text-[8px] text-slate-400 truncate">km² (99%)</span>
          </div>
        </div>
      </div>

      {/* Diagnostic Tab Switcher */}
      <div className="bg-[#0B0F17] border-b border-[#1E293B] px-3 flex items-center justify-between shrink-0">
        <div className="flex gap-1 py-1.5">
          <button
            onClick={() => setActiveTab('raster')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'raster'
                ? 'bg-[#1E293B] text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spatial Map & LISA Hotspots
          </button>
          <button
            onClick={() => setActiveTab('variogram')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'variogram'
                ? 'bg-[#1E293B] text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Variogram Decay
          </button>
          <button
            onClick={() => setActiveTab('kde')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'kde'
                ? 'bg-[#1E293B] text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Distribution (KDE & Quantiles)
          </button>
          <button
            onClick={() => setActiveTab('regional')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'regional'
                ? 'bg-[#1E293B] text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sub-Regional Partitioning
          </button>
          <button
            onClick={() => setActiveTab('temporal')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'temporal'
                ? 'bg-[#1E293B] text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Temporal Dynamics
          </button>
        </div>

        {activeTab === 'raster' && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="accent-rose-500 rounded"
            />
            <span>Highlight 99% Hotspots</span>
          </label>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'raster' && (
          <div className="h-full flex flex-col justify-between">
            <div className="relative flex-1 bg-[#06090F] rounded-lg border border-[#1E293B] overflow-hidden flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverCoord(null)}
                className="max-h-full max-w-full rounded shadow-xl cursor-crosshair object-contain"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Coordinate & Value Hover HUD */}
              {hoverCoord && (
                <div className="absolute top-3 left-3 bg-[#0D131F]/90 backdrop-blur border border-[#1E293B] p-2 rounded text-[11px] font-mono text-slate-200 shadow-lg">
                  <div>Grid Pixel: [{hoverCoord.x}, {hoverCoord.y}]</div>
                  <div className="text-sky-400 font-bold">Value: {hoverCoord.val !== null ? `${hoverCoord.val} ${dist.unit}` : 'NoData'}</div>
                  {hoverCoord.gi !== null && (
                    <div className={hoverCoord.gi >= 2.58 ? 'text-rose-400' : (hoverCoord.gi <= -2.58 ? 'text-sky-300' : 'text-slate-400')}>
                      Getis-Ord Gi* z: {hoverCoord.gi} {hoverCoord.gi >= 2.58 ? '(99% Hotspot)' : (hoverCoord.gi <= -2.58 ? '(99% Coldspot)' : '')}
                    </div>
                  )}
                </div>
              )}

              {/* Map Canvas Badges */}
              <div className="absolute bottom-3 right-3 bg-[#0D131F]/80 backdrop-blur px-2 py-1 rounded border border-[#1E293B] text-[10px] text-slate-400 font-mono">
                Scale: 5.0 km • Hillshade Az: 315°
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Perceptually Uniform Colormap: <strong className="text-slate-200">{colormap}</strong></span>
              <span>Min: <span className="font-mono text-slate-300">{payload.raster_summary?.min_val}</span> | Max: <span className="font-mono text-slate-300">{payload.raster_summary?.max_val} {dist.unit}</span></span>
            </div>
          </div>
        )}

        {activeTab === 'variogram' && (
          <div className="space-y-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Empirical Semivariogram & Spherical Model Fit
                </h4>
                <span className="text-xs font-mono text-purple-400">
                  Effective Range: {Math.round(spat.effective_spatial_range_m)} meters
                </span>
              </div>

              {/* Variogram plot visualization */}
              <div className="h-64 bg-[#090D16] rounded border border-[#1E293B] p-3 flex items-end gap-1 relative overflow-hidden">
                {payload.variogram_points && payload.variogram_points.map((pt, i) => {
                  const maxLag = payload.variogram_points![payload.variogram_points!.length - 1].lag_distance_m;
                  const maxSill = spat.variogram_sill * 1.3 || 1.0;
                  const leftPct = (pt.lag_distance_m / maxLag) * 92 + 4;
                  const bottomPct = (pt.semivariance / maxSill) * 85 + 5;

                  return (
                    <div
                      key={i}
                      className="absolute w-2.5 h-2.5 -ml-1 -mb-1 rounded-full bg-amber-400 border border-slate-900 shadow"
                      style={{ left: `${leftPct}%`, bottom: `${bottomPct}%` }}
                      title={`Lag: ${pt.lag_distance_m}m, Semivariance: ${pt.semivariance}`}
                    />
                  );
                })}

                {/* Range vertical marker */}
                <div
                  className="absolute top-0 bottom-0 border-r border-dashed border-purple-500/70"
                  style={{ left: '60%' }}
                >
                  <span className="absolute top-2 right-2 text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded">
                    Sill: {spat.variogram_sill}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded bg-[#090D16] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-400 block">Nugget (c₀)</span>
                  <span className="font-mono text-slate-200 font-bold">{spat.variogram_nugget}</span>
                </div>
                <div className="p-2 rounded bg-[#090D16] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-400 block">Sill (c₀ + c₁)</span>
                  <span className="font-mono text-slate-200 font-bold">{spat.variogram_sill}</span>
                </div>
                <div className="p-2 rounded bg-[#090D16] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-400 block">Effective Range (a)</span>
                  <span className="font-mono text-purple-400 font-bold">{Math.round(spat.effective_spatial_range_m)} meters</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kde' && (
          <div className="space-y-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                Probability Density Function & Quantile Markers
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Non-Gaussian deformation distribution exhibiting skewness of <span className="font-mono text-amber-400">{dist.skewness}</span> and kurtosis of <span className="font-mono text-slate-200">{dist.kurtosis}</span>.
              </p>

              {/* Histogram & KDE Bar visualization */}
              <div className="h-56 bg-[#090D16] rounded border border-[#1E293B] p-3 flex items-end gap-1 relative">
                {payload.histogram_bins && payload.histogram_bins.map((bin, i) => {
                  const maxDens = Math.max(...payload.histogram_bins!.map(b => b.density)) || 1.0;
                  const heightPct = (bin.density / maxDens) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-sky-500/30 hover:bg-sky-400/50 border-t border-sky-400 transition-all rounded-t-sm"
                      style={{ height: `${heightPct}%` }}
                      title={`Bin [${bin.bin_start}, ${bin.bin_end}]: ${bin.density}`}
                    />
                  );
                })}
              </div>

              {/* Quantiles Bar */}
              <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                {Object.entries(dist.quantiles).map(([qKey, qVal]) => (
                  <div key={qKey} className="p-2 rounded bg-[#090D16] border border-[#1E293B]">
                    <span className="text-[10px] uppercase text-slate-400 block">{qKey}</span>
                    <span className="font-mono font-bold text-sky-300">{qVal} {dist.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regional' && (
          <div className="space-y-3">
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
                Sub-Regional Comparative Partitioning
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Sub-Region Name</th>
                      <th className="py-2 px-3">Zonal Mean</th>
                      <th className="py-2 px-3">P95 Extreme Anomaly</th>
                      <th className="py-2 px-3">Spatial Cluster Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {regions.map((reg, idx) => (
                      <tr key={idx} className="hover:bg-[#162038]/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{reg.sub_region}</td>
                        <td className="py-2.5 px-3 font-mono text-sky-400">{reg.mean} {dist.unit}</td>
                        <td className="py-2.5 px-3 font-mono text-rose-400 font-bold">{reg.p95_anomaly} {dist.unit}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            reg.cluster_type.includes('Hotspot')
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : (reg.cluster_type.includes('Coldspot')
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                : 'bg-slate-700/30 text-slate-300 border border-slate-700')
                          }`}>
                            {reg.cluster_type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'temporal' && (
          <div className="space-y-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Mann-Kendall Monotonic Trend & Sen's Slope
                </h4>
                <span className="text-xs font-mono text-rose-400">
                  Sen's Slope: {temp.sens_slope_per_year} {dist.unit}/yr
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Statistical test results: Kendall's tau = <span className="font-mono text-sky-300">{temp.mann_kendall_tau}</span> (p = {temp.mann_kendall_p_value}).
                Peak anomaly detected at <span className="font-mono text-amber-300">{temp.peak_anomaly_timestamp}</span>.
              </p>

              {/* Time series trajectory */}
              {payload.temporal_trajectory && (
                <div className="h-56 bg-[#090D16] rounded border border-[#1E293B] p-4 flex items-end gap-3 justify-between">
                  {payload.temporal_trajectory.map((step, idx) => {
                    const keyVal = Object.keys(step).find(k => k !== 'timestamp' && k !== 'baseline') || 'val';
                    const val = Number(step[keyVal]);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <span className="text-[9px] font-mono text-slate-300 mb-1">{val}</span>
                        <div
                          className="w-full bg-rose-500/60 rounded-t hover:bg-rose-400 transition-all"
                          style={{ height: `${Math.min(100, Math.max(15, Math.abs(val) * 7))}%` }}
                        />
                        <span className="text-[9px] text-slate-400 mt-1 truncate">{step.timestamp}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
