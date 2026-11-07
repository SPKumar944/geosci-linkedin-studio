import {
  ScientificEvidencePayload,
  RegionalPreset,
  EditorialResponse,
  EditorialAudit
} from '../types';

const BASE_URL = '/api/v1';

export async function fetchDatasets(): Promise<{ datasets: any[]; presets: RegionalPreset[] }> {
  const res = await fetch(`${BASE_URL}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function runAnalysis(
  datasetId: string,
  aoiName: string = 'Selected AOI',
  pipelineType: string = 'auto',
  colormap: string = 'vik'
): Promise<ScientificEvidencePayload> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      aoi_name: aoiName,
      pipeline_type: pipelineType,
      colormap
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }
  return res.json();
}

export async function generateEditorial(
  payload: ScientificEvidencePayload,
  tonePreset: string = 'Principal Data Scientist'
): Promise<EditorialResponse> {
  const res = await fetch(`${BASE_URL}/editorial/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, tone_preset: tonePreset })
  });
  if (!res.ok) throw new Error('Failed to generate editorial content');
  return res.json();
}

export async function regenerateSection(
  payload: ScientificEvidencePayload,
  sectionType: string
): Promise<{ refined_text: string; audit: EditorialAudit }> {
  const res = await fetch(`${BASE_URL}/editorial/regenerate-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, section_type: sectionType })
  });
  if (!res.ok) throw new Error('Failed to refine section');
  return res.json();
}

export async function fetchPosterBlob(
  payload: ScientificEvidencePayload,
  aspectRatio: string = 'portrait',
  theme: string = 'dark',
  colormap: string = 'vik'
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/render/poster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload,
      aspect_ratio: aspectRatio,
      theme,
      colormap
    })
  });
  if (!res.ok) throw new Error('Failed to render poster');
  return res.blob();
}

export async function fetchCarouselSlides(
  payload: ScientificEvidencePayload
): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/render/carousel-slides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });
  if (!res.ok) throw new Error('Failed to render carousel slides');
  const data = await res.json();
  return data.slides;
}

export async function downloadCarouselPdf(
  payload: ScientificEvidencePayload
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/render/carousel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });
  if (!res.ok) throw new Error('Failed to download carousel PDF');
  return res.blob();
}
