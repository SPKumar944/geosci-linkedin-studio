import os
import io
import base64
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from backend.engine.schemas import ScientificEvidencePayload, AnalysisRequest
from backend.engine.pipelines import execute_pipeline, DATA_BENCHMARKS_DIR
from backend.editorial.writer import (
    generate_feed_post,
    generate_long_form_article,
    generate_carousel_script,
    regenerate_section
)
from backend.editorial.guardrails import audit_editorial_content
from backend.visualizer.poster_builder import generate_poster
from backend.visualizer.carousel_builder import generate_carousel_slides, compile_carousel_pdf

app = FastAPI(
    title="GeoSci-LinkedIn Autonomous Intelligence & Publishing Studio API",
    version="1.0.0",
    description="Full-stack scientific data science and LinkedIn publication studio"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REGIONAL_PRESETS = [
    {
        "id": "region-kaveri-insar",
        "name": "Kaveri Delta Sub-Basin AOI-04",
        "description": "Sentinel-1 PS-InSAR Surface Displacement & Aquifer Compaction",
        "dataset_type": "insar",
        "sensor": "Sentinel-1 C-Band SAR",
        "default_metric": "LOS Velocity (mm/yr)",
        "coordinates": {"lat": 10.78, "lon": 79.13, "zoom": 10.5},
        "bbox": [745000.0, 1180000.0, 754000.0, 1189000.0]
    },
    {
        "id": "region-cauvery-optical",
        "name": "Cauvery Agro-Ecological Corridor",
        "description": "Sentinel-2 Multi-temporal Spectral Vigor & Drought Stress Z-Score",
        "dataset_type": "sentinel2",
        "sensor": "Sentinel-2 L2A MSI Optical",
        "default_metric": "NDVI / NDWI",
        "coordinates": {"lat": 10.85, "lon": 79.20, "zoom": 10.0},
        "bbox": [79.05, 10.70, 79.35, 11.00]
    },
    {
        "id": "region-piezometer-survey",
        "name": "Cauvery Basin Piezometer & Geotechnical Survey",
        "description": "1,500 Geotechnical Borehole Piezometer Network & Salinity Intrusion",
        "dataset_type": "geoparquet",
        "sensor": "CGWB Observation Network",
        "default_metric": "Groundwater Electrical Conductivity (µS/cm)",
        "coordinates": {"lat": 10.82, "lon": 79.25, "zoom": 9.8},
        "bbox": [79.05, 10.65, 79.45, 11.05]
    }
]

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "system": "GeoSci-LinkedIn Autonomous Intelligence & Publishing Studio",
        "benchmarks_dir_exists": os.path.exists(DATA_BENCHMARKS_DIR)
    }

@app.get("/api/v1/datasets")
def list_datasets():
    datasets = []
    if os.path.exists(DATA_BENCHMARKS_DIR):
        for f in os.listdir(DATA_BENCHMARKS_DIR):
            if f.endswith((".tif", ".zarr", ".parquet")):
                datasets.append({
                    "filename": f,
                    "path": os.path.join(DATA_BENCHMARKS_DIR, f),
                    "size_bytes": os.path.getsize(os.path.join(DATA_BENCHMARKS_DIR, f)) if not os.path.isdir(os.path.join(DATA_BENCHMARKS_DIR, f)) else 0
                })
    return {
        "datasets": datasets,
        "presets": REGIONAL_PRESETS
    }

@app.post("/api/v1/analyze", response_model=ScientificEvidencePayload)
def analyze_dataset(request: AnalysisRequest):
    try:
        payload = execute_pipeline(
            dataset_id=request.dataset_id,
            aoi_name=request.aoi_name or "Selected AOI",
            aoi_polygon=request.aoi_polygon,
            pipeline_type=request.pipeline_type or "auto"
        )
        return payload
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class EditorialRequest(BaseModel):
    payload: ScientificEvidencePayload
    tone_preset: Optional[str] = "Principal Data Scientist"

@app.post("/api/v1/editorial/generate")
def generate_editorial(req: EditorialRequest):
    try:
        feed_post = generate_feed_post(req.payload, tone_preset=req.tone_preset)
        long_article = generate_long_form_article(req.payload)
        carousel_script = generate_carousel_script(req.payload)

        return {
            "feed_post": feed_post,
            "long_form_article": long_article,
            "carousel_script": carousel_script,
            "audit": feed_post["audit"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SectionRegenRequest(BaseModel):
    payload: ScientificEvidencePayload
    section_type: str # "tighten_physics" | "emphasize_uncertainty" | "compare_subregions"

@app.post("/api/v1/editorial/regenerate-section")
def refine_editorial_section(req: SectionRegenRequest):
    try:
        res = regenerate_section(req.payload, req.section_type)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RenderRequest(BaseModel):
    payload: ScientificEvidencePayload
    aspect_ratio: Optional[str] = "portrait" # "portrait" | "square" | "banner"
    theme: Optional[str] = "dark" # "dark" | "light"
    colormap: Optional[str] = "vik"

@app.post("/api/v1/render/poster")
def render_poster_endpoint(req: RenderRequest):
    try:
        png_bytes = generate_poster(
            req.payload,
            aspect_ratio=req.aspect_ratio or "portrait",
            theme=req.theme or "dark",
            colormap_name=req.colormap or "vik"
        )
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/render/carousel")
def render_carousel_pdf_endpoint(req: RenderRequest):
    try:
        slides_bytes = generate_carousel_slides(req.payload)
        pdf_bytes = compile_carousel_pdf(slides_bytes)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=geosci_scientific_carousel.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/render/carousel-slides")
def render_carousel_slides_endpoint(req: RenderRequest):
    try:
        slides_bytes = generate_carousel_slides(req.payload)
        slides_base64 = [base64.b64encode(b).decode("utf-8") for b in slides_bytes]
        return {
            "slide_count": len(slides_base64),
            "slides": slides_base64
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/upload")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        os.makedirs(DATA_BENCHMARKS_DIR, exist_ok=True)
        file_path = os.path.join(DATA_BENCHMARKS_DIR, file.filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        return {
            "filename": file.filename,
            "path": file_path,
            "size_bytes": len(content),
            "status": "uploaded"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
