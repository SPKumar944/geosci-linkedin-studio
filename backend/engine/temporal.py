import math
import numpy as np
from scipy import stats
from typing import Dict, Any, List

def compute_mann_kendall_and_sens_slope(time_series: np.ndarray, timestamps: List[str]) -> Dict[str, Any]:
    """
    Computes non-parametric Mann-Kendall monotonic trend test and Theil-Sen estimator (Sen's Slope).
    Returns tau, p-value, sens_slope_per_year, and peak_anomaly_timestamp.
    """
    valid_idx = np.isfinite(time_series)
    y = time_series[valid_idx]
    if len(y) < 3:
        return {
            "mann_kendall_tau": 0.0,
            "mann_kendall_p_value": 1.0,
            "sens_slope_per_year": 0.0,
            "peak_anomaly_timestamp": timestamps[0] if timestamps else "N/A"
        }

    n = len(y)
    # 1. Mann-Kendall S statistic
    s = 0
    slopes = []
    for k in range(n - 1):
        for j in range(k + 1, n):
            diff = y[j] - y[k]
            s += int(np.sign(diff))
            dx = (j - k)
            if dx > 0:
                slopes.append(diff / dx)

    # Kendall tau
    denom = 0.5 * n * (n - 1)
    tau = s / denom if denom > 0 else 0.0

    # Variance of S (accounting for ties if any)
    unique, counts = np.unique(y, return_counts=True)
    tie_term = np.sum(counts * (counts - 1) * (2 * counts + 5))
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    if s > 0:
        z = (s - 1) / math.sqrt(var_s) if var_s > 0 else 0.0
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s) if var_s > 0 else 0.0
    else:
        z = 0.0

    p_value = float(2.0 * stats.norm.sf(abs(z)))

    # Sen's Slope: median of all pairwise slopes
    # Multiply by 12 if monthly steps to express per year
    monthly_slope = float(np.median(slopes)) if slopes else 0.0
    slope_per_year = monthly_slope * 12.0

    # Peak anomaly timestamp (maximum absolute deviation from median)
    median_val = np.median(y)
    abs_anomalies = np.abs(y - median_val)
    max_idx = int(np.argmax(abs_anomalies))
    peak_timestamp = timestamps[max_idx] if max_idx < len(timestamps) else "2025-06-01"

    return {
        "mann_kendall_tau": round(float(tau), 3),
        "mann_kendall_p_value": round(float(p_value), 5),
        "sens_slope_per_year": round(float(slope_per_year), 3),
        "peak_anomaly_timestamp": str(peak_timestamp)
    }
