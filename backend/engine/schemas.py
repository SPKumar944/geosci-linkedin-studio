from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class DatasetMetadata(BaseModel):
    sensor_modality: str
    crs_epsg: int
    spatial_resolution_m: float
    aoi_name: str
    aoi_area_sq_km: float
    acquisition_window: str
    valid_pixel_coverage_pct: float

class DistributionalMoments(BaseModel):
    mean: float
    std_dev: float
    median: float
    iqr: float
    skewness: float
    kurtosis: float
    quantiles: Dict[str, float]
    unit: str

class SpatialStatistics(BaseModel):
    global_morans_i: float
    morans_z_score: float
    morans_p_value: float
    variogram_nugget: float
    variogram_sill: float
    effective_spatial_range_m: float
    hotspot_99pct_area_sq_km: float
    coldspot_99pct_area_sq_km: float

class TemporalDynamics(BaseModel):
    mann_kendall_tau: float
    mann_kendall_p_value: float
    sens_slope_per_year: float
    peak_anomaly_timestamp: str

class SubRegionComparison(BaseModel):
    sub_region: str
    mean: float
    p95_anomaly: float
    cluster_type: str

class ScientificEvidencePayload(BaseModel):
    dataset_metadata: DatasetMetadata
    distributional_moments: DistributionalMoments
    spatial_statistics: SpatialStatistics
    temporal_dynamics: TemporalDynamics
    regional_comparison: List[SubRegionComparison]

    # Additional analytical details for visualizer and frontend charts
    variogram_points: Optional[List[Dict[str, float]]] = None
    histogram_bins: Optional[List[Dict[str, float]]] = None
    kde_curve: Optional[List[Dict[str, float]]] = None
    temporal_trajectory: Optional[List[Dict[str, Any]]] = None
    raster_summary: Optional[Dict[str, Any]] = None

class AnalysisRequest(BaseModel):
    dataset_id: str
    aoi_name: Optional[str] = "Selected AOI"
    aoi_polygon: Optional[Dict[str, Any]] = None  # GeoJSON geometry or bbox
    pipeline_type: Optional[str] = "auto"  # "insar", "optical", "geostatistical", "auto"
    significance_alpha: Optional[float] = 0.05
    colormap: Optional[str] = "vik"
