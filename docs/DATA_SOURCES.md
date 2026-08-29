# ORCA Data Sources

| Data Source | What you get | How you connect | What you use in Python | Output you receive | API Key / Login |
| ----------- | ------------ | --------------- | ---------------------- | ------------------ | --------------- |
| **INCOIS – PFZ** | Potential Fishing Zones | **Need to use the specific PFZ access method provided by INCOIS**; validate endpoint/service before implementation | `requests` / `httpx` depending on confirmed endpoint | PFZ points/polygons + metadata | **Must verify for the chosen service** |
| **INCOIS – OSF** | Waves, wind, currents, SST, swell, etc. | **INCOIS services / ERDDAP where dataset is exposed**; validate exact OSF dataset access | `requests` / `httpx` / `xarray` depending on format | JSON/CSV/NetCDF or service-specific response | **Must verify for chosen endpoint** |
| **Copernicus Marine (CMEMS)** | SST, currents, waves, ocean physics, etc. | **Official Copernicus Marine Toolbox** | `copernicusmarine` Python package | NetCDF / Zarr / CSV / dataframe | **Yes — Copernicus Marine account credentials** |
| **NOAA ERDDAP** | Ocean/satellite/environmental datasets such as SST/chlorophyll/etc. | **ERDDAP REST URL** | `requests` / `httpx` / `erddapy` | JSON / CSV / NetCDF etc. | **Usually no; dataset-dependent** |
| **IMD** | Weather, fishermen warnings, coastal bulletins, cyclone track/warnings | **Official IMD REST API** | `requests` / `httpx` | JSON | **Use according to IMD API requirements** |
| **OBIS** | Marine species occurrence/biodiversity | **OBIS REST API** | `requests` / `httpx` / `pyobis` | JSON / GeoJSON | **No for public API endpoints** |
