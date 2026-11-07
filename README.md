# GeoSci-LinkedIn Autonomous Intelligence & Publishing Studio

> Full-stack geospatial data science and LinkedIn publishing platform. Ingests raw remote sensing datasets (Zarr, COG, GeoParquet), executes spatial-temporal data science pipelines (Moran's I, Getis-Ord Gi*, Empirical Variogram, Mann-Kendall / Sen's slope), and automatically synthesizes high-impact LinkedIn articles, short-form technical posts, and publication-grade 300-DPI visual posters / PDF carousels.

---

## 🌟 Live Web Studio & Multi-Device Access

Access the studio directly from any laptop, tablet, or mobile phone via GitHub Pages:
**[https://spkumar944.github.io/geosci-linkedin-studio/](https://spkumar944.github.io/geosci-linkedin-studio/)**

---

## 🏛️ Architecture & System Modules

```
├── backend/
│   ├── main.py                     # FastAPI server with analysis, editorial & render endpoints
│   ├── seed_datasets.py            # Generates synthetic benchmark InSAR COG, S2 Zarr, GeoParquet
│   ├── data/benchmarks/            # Benchmark datasets on disk
│   ├── engine/
│   │   ├── schemas.py              # ScientificEvidencePayload strict Pydantic contract
│   │   ├── ingestor.py             # Windowed raster/vector ingestion & UTM projection
│   │   ├── spatial_stats.py        # Distributional moments, Moran's I, Getis-Ord Gi*, Variogram
│   │   ├── temporal.py             # Mann-Kendall monotonic trend & Sen's slope
│   │   └── pipelines.py            # InSAR, S2 Optical & Geotechnical analytical pipelines
│   ├── editorial/
│   │   ├── guardrails.py           # Anti-AI lexical filter (banned tokens, burstiness, metrics audit)
│   │   └── writer.py               # Feed post, long-form article & carousel script generator
│   └── visualizer/
│       ├── poster_builder.py       # 300-DPI 4:5, 1:1, 1.91:1 scientific poster rendering
│       └── carousel_builder.py     # 5-Slide PDF carousel compiler
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Zone 1: Dataset catalog & multi-region preset selector
│   │   │   ├── SpatialWorkbench.tsx # Zone 2: Canvas raster, live telemetry & diagnostic tabs
│   │   │   ├── EditorialStudio.tsx  # Zone 3: Editorial switcher, anti-AI audit & section refine
│   │   │   └── LinkedInSimulator.tsx# Zone 4: Realistic feed preview & 300-DPI PNG/PDF export
│   │   ├── services/api.ts          # API client with seamless standalone fallback
│   │   └── App.tsx                  # 4-Zone Studio workspace
│   ├── package.json
│   └── vite.config.ts
└── .github/workflows/deploy.yml     # Automated GitHub Pages CI/CD
```

---

## 🚀 Local Development (Optional Full-Stack Mode)

### 1. Backend Setup
```bash
# Create Python 3.11 virtual environment
uv venv --python 3.11 backend/.venv
source backend/.venv/bin/activate

# Install dependencies
uv pip install fastapi "uvicorn[standard]" pydantic numpy scipy pandas shapely pyproj rasterio xarray zarr pyarrow matplotlib pillow reportlab python-multipart

# Generate benchmark datasets
python backend/seed_datasets.py

# Launch FastAPI server (port 8000)
python backend/main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔬 Core Scientific Capabilities

1. **Deterministic Scientific Evidence Contract:** Mathematical tensors are computed directly from pixel arrays before narrative synthesis.
2. **Anti-AI Editorial Engine:** Enforces zero clichés, strict burstiness cadence, and high empirical citation density.
3. **LinkedIn Aspect-Ratio Posters & Carousels:** Pixel-perfect 300-DPI renders for `1080x1350` (4:5), `1080x1080` (1:1), and `1200x627` (1.91:1) with analytical hillshades and perceptually uniform colormaps.
