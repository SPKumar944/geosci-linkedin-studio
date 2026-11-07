import os
import math
import numpy as np
import rasterio
from rasterio.windows import from_bounds
import pyproj
from pyproj import CRS
from typing import Dict, Any, Tuple, Optional

def get_optimal_utm_epsg(lon: float, lat: float) -> int:
    """
    Computes the optimal UTM EPSG code for a given longitude and latitude centroid.
    """
    zone = int(math.floor((lon + 180.0) / 6.0)) + 1
    if lat >= 0:
        return 32600 + zone
    else:
        return 32700 + zone

def ingest_raster_aoi(file_path: str, bbox: Optional[Tuple[float, float, float, float]] = None) -> Dict[str, Any]:
    """
    Ingests raster file with windowed reading if bbox is provided.
    Computes hygiene metrics, resolution, CRS, and raw data bands.
    bbox format: (minx, miny, maxx, maxy) in dataset CRS or EPSG:4326.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    with rasterio.open(file_path) as src:
        profile = src.profile
        crs = src.crs
        epsg = crs.to_epsg() if crs else 32643
        bounds = src.bounds
        res_x, res_y = abs(src.res[0]), abs(src.res[1])
        tags = src.tags()
        count = src.count

        if bbox is not None:
            minx, miny, maxx, maxy = bbox
            window = from_bounds(minx, miny, maxx, maxy, transform=src.transform)
            # Clip window to dataset extent
            window = window.intersection(rasterio.windows.Window(0, 0, src.width, src.height))
            data = src.read(window=window)
            win_transform = rasterio.windows.transform(window, src.transform)
        else:
            data = src.read()
            win_transform = src.transform

    bands = data.astype(np.float32)
    # Handle nodata
    nodata_val = profile.get("nodata", -9999.0)
    if nodata_val is not None:
        bands[bands == nodata_val] = np.nan

    ny, nx = bands.shape[1], bands.shape[2]
    total_pixels = ny * nx
    primary_band = bands[0]
    valid_pixels = int(np.sum(np.isfinite(primary_band)))
    valid_pct = round((valid_pixels / total_pixels) * 100.0, 1) if total_pixels > 0 else 0.0

    # Calculate AOI Area in sq km
    area_sq_km = round((total_pixels * res_x * res_y) / 1e6, 2)

    return {
        "bands": bands,
        "primary_band": primary_band,
        "transform": win_transform,
        "crs_epsg": epsg,
        "res_m": round(float(res_x), 1),
        "total_pixels": total_pixels,
        "valid_pct": valid_pct,
        "area_sq_km": area_sq_km,
        "tags": tags,
        "bounds": bounds,
        "count": count
    }
