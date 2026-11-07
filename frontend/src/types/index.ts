export interface DatasetMetadata {
  sensor_modality: string;
  crs_epsg: number;
  spatial_resolution_m: number;
  aoi_name: string;
  aoi_area_sq_km: number;
  acquisition_window: string;
  valid_pixel_coverage_pct: number;
}

export interface DistributionalMoments {
  mean: number;
  std_dev: number;
  median: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  quantiles: Record<string, number>;
  unit: string;
}

export interface SpatialStatistics {
  global_morans_i: number;
  morans_z_score: number;
  morans_p_value: number;
  variogram_nugget: number;
  variogram_sill: number;
  effective_spatial_range_m: number;
  hotspot_99pct_area_sq_km: number;
  coldspot_99pct_area_sq_km: number;
}

export interface TemporalDynamics {
  mann_kendall_tau: number;
  mann_kendall_p_value: number;
  sens_slope_per_year: number;
  peak_anomaly_timestamp: string;
}

export interface SubRegionComparison {
  sub_region: string;
  mean: number;
  p95_anomaly: number;
  cluster_type: string;
}

export interface VariogramPoint {
  lag_distance_m: number;
  semivariance: number;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  density: number;
}

export interface KdePoint {
  x: number;
  density: number;
}

export interface RasterSummary {
  dimensions: { ny: number; nx: number };
  downsampled_values: (number | null)[][];
  downsampled_gi_star?: (number | null)[][];
  min_val: number;
  max_val: number;
}

export interface ScientificEvidencePayload {
  dataset_metadata: DatasetMetadata;
  distributional_moments: DistributionalMoments;
  spatial_statistics: SpatialStatistics;
  temporal_dynamics: TemporalDynamics;
  regional_comparison: SubRegionComparison[];
  variogram_points?: VariogramPoint[];
  histogram_bins?: HistogramBin[];
  kde_curve?: KdePoint[];
  temporal_trajectory?: Array<Record<string, any>>;
  raster_summary?: RasterSummary;
}

export interface RegionalPreset {
  id: string;
  name: string;
  description: string;
  dataset_type: string;
  sensor: string;
  default_metric: string;
  coordinates: { lat: number; lon: number; zoom: number };
  bbox: number[];
}

export interface EditorialAudit {
  is_compliant: boolean;
  metrics_cited_count: number;
  banned_tokens_detected: string[];
  cliche_count: number;
  forbidden_emojis_detected: string[];
  total_emojis: number;
  burstiness_score_pct: number;
  sentence_count: number;
  audit_summary: string;
}

export interface FeedPost {
  text: string;
  paragraphs: string[];
  character_count: number;
  audit: EditorialAudit;
}

export interface LongFormArticle {
  title: string;
  content_markdown: string;
  word_count: number;
  audit: EditorialAudit;
}

export interface CarouselSlideScript {
  slide_index: number;
  title: string;
  subtitle: string;
  headline_metric: string;
  narrative: string;
  footer_callout: string;
}

export interface EditorialResponse {
  feed_post: FeedPost;
  long_form_article: LongFormArticle;
  carousel_script: CarouselSlideScript[];
  audit: EditorialAudit;
}
