import os
import math
import numpy as np
import pandas as pd
import xarray as xr
import rasterio
from rasterio.transform import from_origin
import pyarrow as pa
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "benchmarks")

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def generate_insar_dataset():
    """
    Generates a 2-band InSAR GeoTIFF (EPSG:32643 UTM 43N, Kaveri Delta Sub-Basin).
    Band 1: Line-Of-Sight (LOS) Surface Displacement Velocity in mm/year.
            Features an asymmetric aquifer-compaction subsidence bowl (-18.2 mm/yr core),
            a structural fault-line shear gradient, and spatially correlated atmospheric phase screen.
    Band 2: Interferometric Temporal Coherence gamma in [0.0, 1.0].
    """
    out_path = os.path.join(DATA_DIR, "insar_subsidence_velocity.tif")
    if os.path.exists(out_path):
        return out_path

    nx, ny = 300, 300
    res = 30.0  # 30 meters
    # Kaveri Delta Sub-Basin approximate UTM 43N coordinates
    x0, y0 = 745000.0, 1195000.0

    x = np.linspace(0, nx - 1, nx)
    y = np.linspace(0, ny - 1, ny)
    xx, yy = np.meshgrid(x, y)

    # 1. Primary elliptical subsidence bowl (agricultural / municipal groundwater over-extraction)
    cx1, cy1 = 130.0, 140.0
    dx1 = (xx - cx1) / 45.0
    dy1 = (yy - cy1) / 35.0
    r1_sq = dx1**2 + dy1**2 + 0.3 * dx1 * dy1
    subsidence_bowl_1 = -16.5 * np.exp(-r1_sq / 2.0)

    # 2. Secondary localized industrial wellfield depression
    cx2, cy2 = 210.0, 190.0
    dx2 = (xx - cx2) / 25.0
    dy2 = (yy - cy2) / 20.0
    subsidence_bowl_2 = -9.2 * np.exp(-(dx2**2 + dy2**2) / 2.0)

    # 3. Structural fault scarp / shear transect (steep step gradient across diagonal)
    fault_line = 0.6 * xx + 0.8 * yy - 170.0
    fault_shear = -2.8 * (1.0 / (1.0 + np.exp(-fault_line / 8.0)) - 0.5)

    # 4. Spatially correlated turbulent atmospheric phase screen (APS) noise
    np.random.seed(42)
    white_noise = np.random.normal(0, 1, (ny, nx))
    # Gaussian kernel filter for spatial autocorrelation
    from scipy.ndimage import gaussian_filter
    aps_noise = gaussian_filter(white_noise, sigma=7.5) * 2.2

    # Baseline tectonic background rate: -1.2 mm/yr
    velocity = -1.2 + subsidence_bowl_1 + subsidence_bowl_2 + fault_shear + aps_noise
    velocity = velocity.astype(np.float32)

    # Coherence band: high on persistent scatterers/built-up, lower in agricultural areas
    base_coherence = 0.82 - 0.45 * np.exp(-r1_sq / 3.0) + gaussian_filter(np.random.normal(0, 0.08, (ny, nx)), sigma=2.0)
    coherence = np.clip(base_coherence, 0.15, 0.98).astype(np.float32)

    transform = from_origin(x0, y0, res, res)
    with rasterio.open(
        out_path,
        'w',
        driver='GTiff',
        height=ny,
        width=nx,
        count=2,
        dtype=np.float32,
        crs='EPSG:32643',
        transform=transform,
        nodata=-9999.0
    ) as dst:
        dst.write(velocity, 1)
        dst.set_band_description(1, "LOS_Displacement_Velocity_mm_yr")
        dst.write(coherence, 2)
        dst.set_band_description(2, "Interferometric_Coherence_gamma")
        dst.update_tags(
            sensor="Sentinel-1 C-Band SAR / PS-InSAR",
            acquisition_window="2024-01-01 to 2026-03-31",
            units_band1="mm/year",
            units_band2="unitless_0_to_1",
            region="Kaveri Delta Sub-Basin AOI-04",
            spatial_resolution_m="30.0"
        )

    print(f"Generated InSAR COG dataset: {out_path}")
    return out_path

def generate_sentinel2_zarr():
    """
    Generates a 3D multi-temporal Sentinel-2 optical cube in Zarr format:
    Dims: (time: 12 months, band: 2 ['NDVI', 'NDWI'], y: 160, x: 160)
    Includes realistic seasonal phenology, agricultural drying cycles, and drought anomalies.
    """
    out_path = os.path.join(DATA_DIR, "sentinel2_timeseries_cube.zarr")
    if os.path.exists(out_path):
        return out_path

    times = pd.date_range("2025-01-01", periods=12, freq="MS")
    nt = len(times)
    ny, nx = 160, 160
    bands = ["NDVI", "NDWI"]

    x = np.linspace(79.05, 79.35, nx)
    y = np.linspace(10.70, 11.00, ny)
    xx, yy = np.meshgrid(x, y)

    # Base spatial vegetation gradient: river delta canal network has high greenness
    canal_feature = np.sin((xx - 79.05) * 25.0) * np.cos((yy - 10.70) * 18.0)
    base_veg = 0.45 + 0.25 * canal_feature

    data = np.zeros((nt, len(bands), ny, nx), dtype=np.float32)
    np.random.seed(101)

    for t_idx, t in enumerate(times):
        # Seasonal cycle: post-monsoon peak (Jan-Feb), severe summer dry-down (May-July), monsoon recovery (Oct-Dec)
        month = t.month
        # Peak at month 1 (Jan), trough at month 6 (June)
        seasonal_factor = 0.22 * np.cos(2 * np.pi * (month - 1) / 12.0)
        # Monotonic stress decline (soil salinity / drought trend)
        trend = -0.015 * (t_idx / 12.0)

        noise = np.random.normal(0, 0.03, (ny, nx))

        # NDVI: 0.1 to 0.85
        ndvi = base_veg + seasonal_factor + trend + noise
        ndvi = np.clip(ndvi, 0.08, 0.88)

        # NDWI (Normalized Difference Water Index): highly correlated with surface moisture
        ndwi = (ndvi - 0.38) * 0.75 + np.random.normal(0, 0.04, (ny, nx))
        ndwi = np.clip(ndwi, -0.45, 0.65)

        data[t_idx, 0, :, :] = ndvi.astype(np.float32)
        data[t_idx, 1, :, :] = ndwi.astype(np.float32)

    ds = xr.Dataset(
        data_vars=dict(
            reflectance_indices=(["time", "band", "y", "x"], data),
        ),
        coords=dict(
            time=times,
            band=bands,
            x=x,
            y=y,
        ),
        attrs=dict(
            sensor="Sentinel-2 L2A MSI Optical",
            description="Multi-temporal spectral indices across Kaveri Agro-Ecological Corridor",
            spatial_resolution_m=20.0,
            crs="EPSG:4326",
            acquisition_window="2025-01-01 to 2025-12-01"
        )
    )

    ds.to_zarr(out_path, mode="w")
    print(f"Generated Sentinel-2 Zarr Cube: {out_path}")
    return out_path

def generate_geoparquet_survey():
    """
    Generates a high-density GeoParquet survey dataset containing 1,500 geotechnical /
    groundwater monitoring stations with spatial coordinates and physical covariates.
    """
    out_path = os.path.join(DATA_DIR, "cauvery_geochemical_survey.parquet")
    if os.path.exists(out_path):
        return out_path

    np.random.seed(88)
    n_points = 1500

    # Kaveri Delta bounding box (Lon 79.0 - 79.5, Lat 10.6 - 11.1)
    lon = np.random.uniform(79.05, 79.45, n_points)
    lat = np.random.uniform(10.65, 11.05, n_points)

    # UTM coordinates (Zone 43N)
    x_utm = 735000.0 + (lon - 79.05) * 109000.0
    y_utm = 1180000.0 + (lat - 10.65) * 110500.0

    # Elevation covariate (sloping from West 45m down to East coast 2m)
    elevation_m = 42.0 - 35.0 * (lon - 79.05) / 0.40 + np.random.normal(0, 2.5, n_points)
    elevation_m = np.clip(elevation_m, 1.2, 55.0)

    # Sub-region clustering:
    # Zone 1: North Alluvial Sector
    # Zone 2: Central Irrigation Basin
    # Zone 3: Coastal Marine Aquifer
    sub_regions = []
    groundwater_ec = []
    subsidence_rate = []

    for i in range(n_points):
        lx, ly = lon[i], lat[i]
        dist_to_coast = 79.45 - lx

        if ly > 10.90:
            zone = "North Alluvial Sector"
            base_sub = -8.2 + np.random.normal(0, 2.4)
            ec = 950.0 + np.random.normal(0, 180.0)
        elif dist_to_coast < 0.12:
            zone = "Coastal Marine Aquifer"
            base_sub = -5.4 + np.random.normal(0, 1.8)
            ec = 3200.0 + np.random.normal(0, 520.0) # Saline intrusion
        else:
            zone = "Central Irrigation Basin"
            base_sub = -3.1 + np.random.normal(0, 1.5)
            ec = 1420.0 + np.random.normal(0, 290.0)

        sub_regions.append(zone)
        subsidence_rate.append(round(base_sub, 2))
        groundwater_ec.append(round(max(200.0, ec), 1))

    df = pd.DataFrame({
        "station_id": [f"KVR-GW-{i:04d}" for i in range(n_points)],
        "longitude": np.round(lon, 6),
        "latitude": np.round(lat, 6),
        "x_utm_m": np.round(x_utm, 1),
        "y_utm_m": np.round(y_utm, 1),
        "elevation_m": np.round(elevation_m, 1),
        "subsidence_rate_mm_yr": subsidence_rate,
        "groundwater_ec_us_cm": groundwater_ec,
        "sub_region": sub_regions,
        "sensor_network": "CGWB Piezometer & InSAR Cal/Val"
    })

    table = pa.Table.from_pandas(df)
    pq.write_table(table, out_path)
    print(f"Generated GeoParquet survey dataset: {out_path}")
    return out_path

def seed_all():
    ensure_data_dir()
    p1 = generate_insar_dataset()
    p2 = generate_sentinel2_zarr()
    p3 = generate_geoparquet_survey()
    return {"insar": p1, "sentinel2": p2, "geoparquet": p3}

if __name__ == "__main__":
    seed_all()
