import math
import numpy as np
from scipy import stats
from scipy.optimize import curve_fit
from typing import Dict, Any, Tuple, List, Optional

def compute_distributional_moments(data: np.ndarray, unit: str = "mm/yr") -> Dict[str, Any]:
    """
    Computes rigorous distributional moments and quantiles for valid data points.
    Filters out NaNs and infs.
    """
    valid = data[np.isfinite(data)]
    if len(valid) == 0:
        return {
            "mean": 0.0, "std_dev": 0.0, "median": 0.0, "iqr": 0.0,
            "skewness": 0.0, "kurtosis": 0.0,
            "quantiles": {"p05": 0.0, "p25": 0.0, "p50": 0.0, "p75": 0.0, "p95": 0.0},
            "unit": unit
        }

    mean_val = float(np.mean(valid))
    std_val = float(np.std(valid, ddof=1)) if len(valid) > 1 else 0.0
    median_val = float(np.median(valid))
    p05, p25, p50, p75, p95 = np.percentile(valid, [5, 25, 50, 75, 95])
    iqr_val = float(p75 - p25)

    skew_val = float(stats.skew(valid)) if len(valid) > 2 else 0.0
    kurt_val = float(stats.kurtosis(valid)) if len(valid) > 3 else 0.0

    return {
        "mean": round(mean_val, 3),
        "std_dev": round(std_val, 3),
        "median": round(median_val, 3),
        "iqr": round(iqr_val, 3),
        "skewness": round(skew_val, 3),
        "kurtosis": round(kurt_val, 3),
        "quantiles": {
            "p05": round(float(p05), 3),
            "p25": round(float(p25), 3),
            "p50": round(float(p50), 3),
            "p75": round(float(p75), 3),
            "p95": round(float(p95), 3),
        },
        "unit": unit
    }

def compute_histogram_and_kde(data: np.ndarray, num_bins: int = 25, num_kde_points: int = 50) -> Tuple[List[Dict[str, float]], List[Dict[str, float]]]:
    """
    Computes histogram bins and smooth KDE curve for visualization.
    """
    valid = data[np.isfinite(data)]
    if len(valid) < 5:
        return [], []

    counts, bin_edges = np.histogram(valid, bins=num_bins, density=True)
    hist_bins = []
    for i in range(len(counts)):
        hist_bins.append({
            "bin_start": round(float(bin_edges[i]), 3),
            "bin_end": round(float(bin_edges[i+1]), 3),
            "density": round(float(counts[i]), 5)
        })

    # KDE curve
    try:
        kde = stats.gaussian_kde(valid)
        kde_x = np.linspace(float(bin_edges[0]), float(bin_edges[-1]), num_kde_points)
        kde_y = kde(kde_x)
        kde_curve = [{"x": round(float(x), 3), "density": round(float(y), 5)} for x, y in zip(kde_x, kde_y)]
    except Exception:
        kde_curve = []

    return hist_bins, kde_curve

def compute_global_morans_i_grid(grid: np.ndarray) -> Dict[str, float]:
    """
    Computes Global Moran's I on a 2D regular grid using Queen's spatial contiguity weights (8-neighborhood).
    Includes theoretical expected value, variance under randomization, z-score, and analytical p-value.
    """
    ny, nx = grid.shape
    # If grid is very large, downsample for spatial lag computation
    max_dim = 120
    if ny > max_dim or nx > max_dim:
        sy = max(1, ny // max_dim)
        sx = max(1, nx // max_dim)
        sub_grid = grid[::sy, ::sx]
    else:
        sub_grid = grid

    valid_mask = np.isfinite(sub_grid)
    n = int(np.sum(valid_mask))
    if n < 10:
        return {"global_morans_i": 0.0, "morans_z_score": 0.0, "morans_p_value": 1.0}

    z = sub_grid - np.mean(sub_grid[valid_mask])
    z[~valid_mask] = 0.0

    # Spatial lag using 8-connectivity kernel
    # [1, 1, 1]
    # [1, 0, 1]
    # [1, 1, 1]
    kernel = np.array([
        [1.0, 1.0, 1.0],
        [1.0, 0.0, 1.0],
        [1.0, 1.0, 1.0]
    ], dtype=np.float32)

    from scipy.signal import convolve2d
    w_sum = convolve2d(valid_mask.astype(np.float32), kernel, mode='same', boundary='fill', fillvalue=0)
    # Mask out non-valid pixels
    w_sum[~valid_mask] = 0.0
    s0 = float(np.sum(w_sum))

    if s0 == 0:
        return {"global_morans_i": 0.0, "morans_z_score": 0.0, "morans_p_value": 1.0}

    # Convolve values
    lag = convolve2d(z, kernel, mode='same', boundary='fill', fillvalue=0)
    lag[~valid_mask] = 0.0

    numerator = np.sum(z * lag)
    denominator = np.sum(z**2)

    if denominator == 0:
        return {"global_morans_i": 0.0, "morans_z_score": 0.0, "morans_p_value": 1.0}

    morans_i = float((n / s0) * (numerator / denominator))
    expected_i = -1.0 / (n - 1)

    # Variance under randomization approximation
    s1 = 8.0 * s0 / 8.0 # approximate symmetric connections
    s2 = 4.0 * np.sum(w_sum**2)
    b2 = (np.sum(z**4) / n) / ((denominator / n)**2) if denominator > 0 else 3.0

    a = n * ((n**2 - 3*n + 3) * s1 - n * s2 + 3 * (s0**2))
    b = b2 * ((n**2 - n) * s1 - 2 * n * s2 + 6 * (s0**2))
    c = (n - 1) * (n - 2) * (n - 3) * (s0**2)
    var_i = (a - b) / c - (expected_i**2) if c > 0 else 1.0
    var_i = max(var_i, 1e-7)

    z_score = float((morans_i - expected_i) / math.sqrt(var_i))
    # Two-tailed p-value
    p_value = float(2.0 * stats.norm.sf(abs(z_score)))

    return {
        "global_morans_i": round(morans_i, 3),
        "morans_z_score": round(z_score, 2),
        "morans_p_value": round(p_value, 6)
    }

def compute_getis_ord_gi_star(grid: np.ndarray, cell_size_m: float) -> Tuple[np.ndarray, float, float]:
    """
    Computes Local Getis-Ord Gi* hot-spot statistics on 2D raster grid.
    Returns:
    - z_scores: 2D array of Gi* z-scores
    - hotspot_99_area_km2: Area of 99% hot spots (z >= +2.58)
    - coldspot_99_area_km2: Area of 99% cold spots (z <= -2.58)
    """
    valid = grid[np.isfinite(grid)]
    if len(valid) < 10:
        return np.zeros_like(grid), 0.0, 0.0

    n = len(valid)
    x_bar = np.mean(valid)
    s = np.std(valid, ddof=0)
    if s == 0:
        return np.zeros_like(grid), 0.0, 0.0

    # Moving window kernel for spatial neighborhood (5x5 circular)
    k_size = 5
    kernel = np.ones((k_size, k_size), dtype=np.float32)
    from scipy.signal import convolve2d
    # Replace non-finite with 0 for convolution
    filled_grid = np.nan_to_num(grid, nan=0.0)
    valid_mask = np.isfinite(grid).astype(np.float32)

    sum_w = convolve2d(valid_mask, kernel, mode='same', boundary='symm')
    sum_w_sq = sum_w # binary weights 0/1 squared is itself

    sum_wx = convolve2d(filled_grid, kernel, mode='same', boundary='symm')

    # Denominator factor: S * sqrt((n * sum_w_sq - sum_w^2) / (n - 1))
    var_factor = (n * sum_w_sq - sum_w**2) / max(n - 1, 1)
    var_factor = np.maximum(var_factor, 0.0)
    denom = s * np.sqrt(var_factor)
    denom[denom == 0] = np.nan

    gi_star = (sum_wx - x_bar * sum_w) / denom
    gi_star[~np.isfinite(grid)] = np.nan

    pixel_area_km2 = (cell_size_m * cell_size_m) / 1e6

    hotspot_99_count = int(np.sum(gi_star >= 2.58))
    coldspot_99_count = int(np.sum(gi_star <= -2.58))

    hotspot_99_area = round(float(hotspot_99_count * pixel_area_km2), 2)
    coldspot_99_area = round(float(coldspot_99_count * pixel_area_km2), 2)

    return gi_star, hotspot_99_area, coldspot_99_area

def spherical_variogram(h, nugget, sill, range_a):
    """Spherical variogram model function."""
    gamma = np.zeros_like(h)
    mask = h <= range_a
    gamma[mask] = nugget + (sill - nugget) * (1.5 * (h[mask] / range_a) - 0.5 * (h[mask] / range_a)**3)
    gamma[~mask] = sill
    return gamma

def compute_empirical_variogram(grid: np.ndarray, cell_size_m: float, max_lags: int = 15) -> Tuple[Dict[str, float], List[Dict[str, float]]]:
    """
    Computes empirical semivariogram from grid samples and fits a spherical geostatistical model
    to extract:
    - Nugget (c0)
    - Sill (c0 + c1)
    - Effective Spatial Range (meters)
    """
    ny, nx = grid.shape
    # Subsample point coordinates to keep pairwise matrix computational cost bounded
    sample_rate = max(1, int(math.sqrt((ny * nx) / 600)))
    y_idx, x_idx = np.mgrid[0:ny:sample_rate, 0:nx:sample_rate]
    pts_y = y_idx.flatten()
    pts_x = x_idx.flatten()
    vals = grid[pts_y, pts_x]

    valid = np.isfinite(vals)
    pts_y = pts_y[valid] * cell_size_m
    pts_x = pts_x[valid] * cell_size_m
    vals = vals[valid]

    n_pts = len(vals)
    if n_pts < 20:
        return {
            "variogram_nugget": 0.1,
            "variogram_sill": 1.0,
            "effective_spatial_range_m": cell_size_m * 10
        }, []

    # Randomly select up to 400 points for pairwise distance computation
    if n_pts > 400:
        idx = np.random.choice(n_pts, 400, replace=False)
        pts_x = pts_x[idx]
        pts_y = pts_y[idx]
        vals = vals[idx]
        n_pts = 400

    dx = pts_x[:, None] - pts_x[None, :]
    dy = pts_y[:, None] - pts_y[None, :]
    dist = np.sqrt(dx**2 + dy**2)

    dv = 0.5 * (vals[:, None] - vals[None, :])**2

    # Extract upper triangular pairs
    tri_idx = np.triu_indices(n_pts, k=1)
    dists = dist[tri_idx]
    sq_diffs = dv[tri_idx]

    max_dist = np.percentile(dists, 75)
    lag_edges = np.linspace(0, max_dist, max_lags + 1)
    bin_centers = 0.5 * (lag_edges[:-1] + lag_edges[1:])

    empirical_gamma = []
    points_curve = []

    for i in range(max_lags):
        in_bin = (dists >= lag_edges[i]) & (dists < lag_edges[i+1])
        if np.sum(in_bin) >= 5:
            mean_gamma = float(np.mean(sq_diffs[in_bin]))
            empirical_gamma.append((bin_centers[i], mean_gamma))
            points_curve.append({
                "lag_distance_m": round(float(bin_centers[i]), 1),
                "semivariance": round(mean_gamma, 3)
            })

    if len(empirical_gamma) < 4:
        sample_var = float(np.var(vals)) if len(vals) > 1 else 1.0
        return {
            "variogram_nugget": round(0.15 * sample_var, 3),
            "variogram_sill": round(sample_var, 3),
            "effective_spatial_range_m": round(max_dist * 0.45, 1)
        }, points_curve

    h_arr = np.array([p[0] for p in empirical_gamma])
    gamma_arr = np.array([p[1] for p in empirical_gamma])

    sample_var = float(np.var(vals))
    init_nugget = float(gamma_arr[0] * 0.5)
    init_sill = sample_var
    init_range = float(h_arr[-1] * 0.5)

    try:
        popt, _ = curve_fit(
            spherical_variogram,
            h_arr,
            gamma_arr,
            p0=[init_nugget, init_sill, init_range],
            bounds=([0.0, 0.001, h_arr[0]], [sample_var * 2.0, sample_var * 5.0, h_arr[-1] * 2.5]),
            maxfev=1500
        )
        nugget, sill, range_a = popt
    except Exception:
        nugget = init_nugget
        sill = init_sill
        range_a = init_range

    return {
        "variogram_nugget": round(float(nugget), 3),
        "variogram_sill": round(float(sill), 3),
        "effective_spatial_range_m": round(float(range_a), 1)
    }, points_curve
