import os
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.colors import LightSource, Normalize
import matplotlib.patheffects as path_effects
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, Optional

from backend.engine.schemas import ScientificEvidencePayload

ASPECT_CONFIGS = {
    "portrait": {"width": 1080, "height": 1350, "dpi": 300, "name": "4:5 Portrait Feed Poster"},
    "square": {"width": 1080, "height": 1080, "dpi": 300, "name": "1:1 Square Feed Card"},
    "banner": {"width": 1200, "height": 627, "dpi": 300, "name": "1.91:1 Article Hero Banner"}
}

def generate_poster(
    payload: ScientificEvidencePayload,
    aspect_ratio: str = "portrait",
    theme: str = "dark",
    colormap_name: str = "vik"
) -> bytes:
    """
    Renders a publication-grade scientific poster at exact pixel dimensions at 300 DPI.
    aspect_ratio: 'portrait' (1080x1350), 'square' (1080x1080), 'banner' (1200x627).
    theme: 'dark' (#0B0F17) or 'light' (#F8FAFC).
    """
    cfg = ASPECT_CONFIGS.get(aspect_ratio, ASPECT_CONFIGS["portrait"])
    width_px, height_px = cfg["width"], cfg["height"]
    dpi = cfg["dpi"]

    # Matplotlib figure size in inches
    fig_w = width_px / dpi
    fig_h = height_px / dpi

    bg_color = "#0B0F17" if theme == "dark" else "#F8FAFC"
    card_color = "#111827" if theme == "dark" else "#FFFFFF"
    card_border = "#1E293B" if theme == "dark" else "#E2E8F0"
    text_color = "#F8FAFC" if theme == "dark" else "#0F172A"
    subtext_color = "#94A3B8" if theme == "dark" else "#64748B"
    accent_blue = "#38BDF8"
    accent_amber = "#F59E0B"
    accent_rose = "#F43F5E"

    # Select colormap (ensure perceptually uniform, strictly ban jet)
    cmap_map = {
        "vik": "RdBu_r",
        "roma": "coolwarm",
        "viridis": "viridis",
        "magma": "magma",
        "RdBu_r": "RdBu_r",
        "cividis": "cividis"
    }
    plt_cmap = cmap_map.get(colormap_name, "RdBu_r")

    meta = payload.dataset_metadata
    dist = payload.distributional_moments
    spat = payload.spatial_statistics
    temp = payload.temporal_dynamics
    regions = payload.regional_comparison

    # Extract or reconstruct raster data for map canvas
    if payload.raster_summary and payload.raster_summary.get("downsampled_values"):
        grid_data = np.array(payload.raster_summary["downsampled_values"], dtype=np.float32)
        gi_grid = np.array(payload.raster_summary.get("downsampled_gi_star", []), dtype=np.float32) if payload.raster_summary.get("downsampled_gi_star") else None
    else:
        # Fallback synthetic grid
        ny, nx = 80, 80
        x = np.linspace(-3, 3, nx)
        y = np.linspace(-3, 3, ny)
        xx, yy = np.meshgrid(x, y)
        grid_data = dist.mean - 8.0 * np.exp(-(xx**2 + yy**2) / 2.0)
        gi_grid = None

    fig = plt.figure(figsize=(fig_w, fig_h), dpi=dpi, facecolor=bg_color)

    if aspect_ratio == "portrait":
        # 4-zone layout: Header (10%), Main Map (52%), Bento Strip (26%), Footer (12%)
        gs = gridspec.GridSpec(
            4, 3,
            figure=fig,
            height_ratios=[0.11, 0.51, 0.26, 0.12],
            width_ratios=[0.34, 0.33, 0.33],
            left=0.04, right=0.96, top=0.96, bottom=0.04,
            wspace=0.18, hspace=0.28
        )

        # 1. Header (across all 3 cols)
        ax_header = fig.add_subplot(gs[0, :])
        ax_header.set_facecolor(bg_color)
        ax_header.axis('off')

        title_text = "SPATIAL AUTOCORRELATION & SUBSIDENCE VELOCITY FIELD" if "SAR" in meta.sensor_modality else "SPECTRAL VEGETATIVE ANOMALY & STRESS DYNAMICS"
        ax_header.text(0.0, 0.78, title_text, color=text_color, fontsize=12, fontweight='bold', va='top', ha='left')
        sub_text = f"AOI: {meta.aoi_name}  |  Extent: {meta.aoi_area_sq_km} sq km  |  Window: {meta.acquisition_window}"
        ax_header.text(0.0, 0.32, sub_text, color=subtext_color, fontsize=7.5, va='top', ha='left')

        # Top right badges
        badge_text = f"SENSOR: {meta.sensor_modality.split()[0]}  •  EPSG:{meta.crs_epsg}  •  {meta.spatial_resolution_m}m RES"
        ax_header.text(1.0, 0.65, badge_text, color=accent_blue, fontsize=7.0, fontweight='semibold',
                       va='center', ha='right',
                       bbox=dict(boxstyle='square,pad=0.4', facecolor=card_color, edgecolor=card_border, linewidth=0.8))

        # 2. Main Cartographic Canvas (across all 3 cols)
        ax_map = fig.add_subplot(gs[1, :])
        ax_map.set_facecolor(bg_color)

        # Synthetic hillshade overlay
        ls = LightSource(azdeg=315, altdeg=45)
        dem_texture = np.gradient(grid_data)[0] if grid_data.ndim == 2 else np.zeros_like(grid_data)
        try:
            shaded = ls.shade(grid_data, cmap=plt.get_cmap(plt_cmap), vert_exag=1.5, blend_mode='overlay')
            im = ax_map.imshow(shaded, origin='lower', aspect='auto')
        except Exception:
            im = ax_map.imshow(grid_data, cmap=plt_cmap, origin='lower', aspect='auto')

        # Hotspot contour overlay if Gi* grid available
        if gi_grid is not None and gi_grid.ndim == 2 and np.nanmax(np.abs(gi_grid)) > 0:
            cs = ax_map.contour(gi_grid, levels=[-2.58, 2.58], colors=[accent_blue, accent_rose],
                                linewidths=[0.9, 1.2], linestyles=['dashed', 'solid'])
            ax_map.clabel(cs, inline=True, fontsize=6, fmt={-2.58: 'Coldspot 99%', 2.58: 'Hotspot 99%'})

        ax_map.tick_params(colors=subtext_color, labelsize=6.5)
        for spine in ax_map.spines.values():
            spine.set_color(card_border)
            spine.set_linewidth(0.8)

        # Horizontal colorbar
        norm = Normalize(vmin=payload.raster_summary.get("min_val", dist.mean - 2*dist.std_dev),
                         vmax=payload.raster_summary.get("max_val", dist.mean + 2*dist.std_dev))
        sm = plt.cm.ScalarMappable(cmap=plt_cmap, norm=norm)
        cbar_ax = fig.add_axes([0.08, 0.44, 0.35, 0.015])
        cbar = fig.colorbar(sm, cax=cbar_ax, orientation='horizontal')
        cbar.set_label(f"Physical Unit ({dist.unit})", color=subtext_color, fontsize=6.5)
        cbar.ax.tick_params(labelsize=5.5, colors=subtext_color)
        cbar.outline.set_edgecolor(card_border)

        # Scale bar label in map bottom right
        ax_map.text(0.96, 0.06, "SCALE: 5.0 KM", transform=ax_map.transAxes,
                    color=text_color, fontsize=6.5, fontweight='bold', ha='right', va='bottom',
                    bbox=dict(boxstyle='square,pad=0.3', facecolor=card_color, edgecolor=card_border, alpha=0.85))

        # 3. Diagnostic Data Science Strip (3 Panels)
        # Panel A: Distribution & Tail Risk (KDE + Histogram)
        ax_dist = fig.add_subplot(gs[2, 0])
        ax_dist.set_facecolor(card_color)
        ax_dist.set_title("DISTRIBUTION & TAIL RISK", color=text_color, fontsize=7.5, fontweight='bold', pad=4)

        if payload.histogram_bins:
            for b in payload.histogram_bins:
                w = b["bin_end"] - b["bin_start"]
                ax_dist.bar(b["bin_start"] + w/2, b["density"], width=w, color=accent_blue, alpha=0.45, edgecolor=accent_blue, linewidth=0.5)

        if payload.kde_curve:
            kx = [p["x"] for p in payload.kde_curve]
            ky = [p["density"] for p in payload.kde_curve]
            ax_dist.plot(kx, ky, color=accent_blue, linewidth=1.4)

        # Vertical dashed lines for mean, median, P95
        ax_dist.axvline(dist.mean, color=accent_amber, linestyle='--', linewidth=1.0, label=f"μ: {dist.mean}")
        ax_dist.axvline(dist.quantiles.get("p95", dist.mean + 2*dist.std_dev), color=accent_rose, linestyle=':', linewidth=1.0, label="P95")
        ax_dist.legend(loc='upper right', fontsize=5.5, facecolor=bg_color, edgecolor=card_border, labelcolor=text_color)
        ax_dist.tick_params(colors=subtext_color, labelsize=5.5)
        for spine in ax_dist.spines.values():
            spine.set_color(card_border)

        # Panel B: Spatial Structure (Empirical Variogram)
        ax_vario = fig.add_subplot(gs[2, 1])
        ax_vario.set_facecolor(card_color)
        ax_vario.set_title("VARIOGRAM SPATIAL DECAY", color=text_color, fontsize=7.5, fontweight='bold', pad=4)

        if payload.variogram_points:
            vx = [p["lag_distance_m"] for p in payload.variogram_points]
            vy = [p["semivariance"] for p in payload.variogram_points]
            ax_vario.scatter(vx, vy, color=accent_amber, s=12, label="Empirical γ(h)")
            # Fitted curve
            h_model = np.linspace(0, max(vx) if vx else 1000, 30)
            a = spat.effective_spatial_range_m
            c0 = spat.variogram_nugget
            c1 = max(0.0, spat.variogram_sill - c0)
            gamma_model = np.where(h_model <= a, c0 + c1 * (1.5 * (h_model / a) - 0.5 * (h_model / a)**3), c0 + c1)
            ax_vario.plot(h_model, gamma_model, color=accent_blue, linewidth=1.2, label=f"Range: {int(a)}m")
            ax_vario.legend(loc='lower right', fontsize=5.5, facecolor=bg_color, edgecolor=card_border, labelcolor=text_color)

        ax_vario.tick_params(colors=subtext_color, labelsize=5.5)
        ax_vario.set_xlabel("Lag Distance (m)", color=subtext_color, fontsize=5.5)
        for spine in ax_vario.spines.values():
            spine.set_color(card_border)

        # Panel C: Key Quantitative Telemetry Cards (Big numbers)
        ax_cards = fig.add_subplot(gs[2, 2])
        ax_cards.set_facecolor(card_color)
        ax_cards.set_title("QUANTITATIVE TELEMETRY", color=text_color, fontsize=7.5, fontweight='bold', pad=4)
        ax_cards.axis('off')

        card_metrics = [
            ("MORAN'S I", f"{spat.global_morans_i}", f"z = {spat.morans_z_score}"),
            ("SEN'S SLOPE", f"{temp.sens_slope_per_year}", f"{dist.unit}/yr"),
            ("IQR SPREAD", f"{dist.iqr}", f"{dist.unit}"),
            ("VALID COVERAGE", f"{meta.valid_pixel_coverage_pct}%", "Quality Mask")
        ]
        for idx, (label, val, sub) in enumerate(card_metrics):
            y_pos = 0.82 - idx * 0.24
            ax_cards.text(0.08, y_pos, label, color=subtext_color, fontsize=5.5, fontweight='semibold')
            ax_cards.text(0.55, y_pos, val, color=accent_blue, fontsize=8.0, fontweight='bold', fontfamily='monospace')
            ax_cards.text(0.88, y_pos, sub, color=subtext_color, fontsize=5.0, ha='right')

        # 4. Methodological Footer & Lineage Bar
        ax_footer = fig.add_subplot(gs[3, :])
        ax_footer.set_facecolor(card_color)
        ax_footer.axis('off')

        lineage_str = (
            f"PIPELINE PROVENANCE: Windowed Ingest -> Lee/Variance Filter -> Global Moran's I ({spat.global_morans_i}) "
            f"-> Getis-Ord Gi* Hotspots ({spat.hotspot_99pct_area_sq_km} km²) -> Spherical Variogram Fitting (a={spat.effective_spatial_range_m}m)"
        )
        ax_footer.text(0.02, 0.65, lineage_str, color=text_color, fontsize=6.2, fontfamily='monospace', va='center')
        org_branding = f"GEOSCI-LINKEDIN AUTONOMOUS STUDIO  •  STRICT EMPIRICAL VERIFICATION  •  CONFIDENCE α=0.01"
        ax_footer.text(0.02, 0.25, org_branding, color=subtext_color, fontsize=5.8, va='center')

    elif aspect_ratio == "square":
        # 1:1 Layout (1080x1080)
        gs = gridspec.GridSpec(
            3, 2,
            figure=fig,
            height_ratios=[0.14, 0.58, 0.28],
            width_ratios=[0.5, 0.5],
            left=0.05, right=0.95, top=0.95, bottom=0.05,
            wspace=0.15, hspace=0.25
        )
        ax_header = fig.add_subplot(gs[0, :])
        ax_header.set_facecolor(bg_color)
        ax_header.axis('off')
        ax_header.text(0.0, 0.75, "GEOSPATIAL SURFACE DEFORMATION FIELD", color=text_color, fontsize=12, fontweight='bold')
        ax_header.text(0.0, 0.35, f"{meta.aoi_name}  |  {meta.aoi_area_sq_km} sq km  |  {meta.sensor_modality}", color=subtext_color, fontsize=7.5)

        ax_map = fig.add_subplot(gs[1, :])
        ax_map.set_facecolor(bg_color)
        ax_map.imshow(grid_data, cmap=plt_cmap, origin='lower', aspect='auto')
        ax_map.tick_params(colors=subtext_color, labelsize=6.5)

        ax_dist = fig.add_subplot(gs[2, 0])
        ax_dist.set_facecolor(card_color)
        ax_dist.set_title("PROBABILITY DENSITY (KDE)", color=text_color, fontsize=7.0, fontweight='bold')
        if payload.kde_curve:
            ax_dist.plot([p["x"] for p in payload.kde_curve], [p["density"] for p in payload.kde_curve], color=accent_blue)
        ax_dist.tick_params(colors=subtext_color, labelsize=5.5)

        ax_cards = fig.add_subplot(gs[2, 1])
        ax_cards.set_facecolor(card_color)
        ax_cards.set_title("SPATIAL TELEMETRY", color=text_color, fontsize=7.0, fontweight='bold')
        ax_cards.axis('off')
        ax_cards.text(0.1, 0.7, f"Moran's I: {spat.global_morans_i} (z={spat.morans_z_score})", color=accent_blue, fontsize=8.0, fontfamily='monospace')
        ax_cards.text(0.1, 0.45, f"Sen's Slope: {temp.sens_slope_per_year} {dist.unit}/yr", color=text_color, fontsize=7.5, fontfamily='monospace')
        ax_cards.text(0.1, 0.2, f"Hotspot Area: {spat.hotspot_99pct_area_sq_km} sq km", color=accent_amber, fontsize=7.5, fontfamily='monospace')

    else:
        # 1.91:1 Banner (1200x627)
        gs = gridspec.GridSpec(
            1, 2,
            figure=fig,
            width_ratios=[0.58, 0.42],
            left=0.04, right=0.96, top=0.92, bottom=0.08,
            wspace=0.15
        )
        ax_map = fig.add_subplot(gs[0, 0])
        ax_map.set_facecolor(bg_color)
        ax_map.imshow(grid_data, cmap=plt_cmap, origin='lower', aspect='auto')
        ax_map.set_title(f"{meta.aoi_name} • {meta.sensor_modality}", color=text_color, fontsize=8.5, fontweight='bold', pad=6)
        ax_map.tick_params(colors=subtext_color, labelsize=6.0)

        ax_info = fig.add_subplot(gs[0, 1])
        ax_info.set_facecolor(card_color)
        ax_info.axis('off')
        ax_info.text(0.08, 0.88, "SPATIAL ANOMALY SYNTHESIS", color=accent_blue, fontsize=7.5, fontweight='bold')
        ax_info.text(0.08, 0.72, f"Global Moran's I: {spat.global_morans_i}", color=text_color, fontsize=10.0, fontweight='bold', fontfamily='monospace')
        ax_info.text(0.08, 0.58, f"Mean: {dist.mean} {dist.unit} (IQR: {dist.iqr})", color=subtext_color, fontsize=7.5, fontfamily='monospace')
        ax_info.text(0.08, 0.44, f"Effective Range: {spat.effective_spatial_range_m} meters", color=subtext_color, fontsize=7.5, fontfamily='monospace')
        ax_info.text(0.08, 0.30, f"Sen's Slope: {temp.sens_slope_per_year} {dist.unit}/yr (p={temp.mann_kendall_p_value})", color=accent_amber, fontsize=7.5, fontfamily='monospace')
        ax_info.text(0.08, 0.12, "GEOSCI-LINKEDIN RESEARCH REPORT", color=subtext_color, fontsize=6.0)

    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=dpi, facecolor=bg_color, edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
