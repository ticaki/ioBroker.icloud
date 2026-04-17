import fs from 'node:fs';
import path from 'node:path';

interface GeoFeatureProperties {
    GEN: string;
    BEZ: string;
}

interface GeoFeature {
    geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
    };
    properties: GeoFeatureProperties;
}

interface GeoJSON {
    type: string;
    features: GeoFeature[];
}

interface BBox {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

interface IndexedFeature {
    bbox: BBox;
    feature: GeoFeature;
}

/** Grid-cell size in degrees (~7 km at 50°N latitude). */
const GRID_STEP = 0.1;

function gridKey(lat: number, lon: number): string {
    return `${Math.floor(lat / GRID_STEP)}_${Math.floor(lon / GRID_STEP)}`;
}

function computeBBox(geometry: GeoFeature['geometry']): BBox {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    const rings: number[][][] =
        geometry.type === 'Polygon'
            ? (geometry.coordinates as number[][][])
            : (geometry.coordinates as number[][][][]).map(p => p[0]);

    for (const ring of rings) {
        for (const coord of ring) {
            const lon = coord[0];
            const lat = coord[1];
            if (lat < minLat) {
                minLat = lat;
            }
            if (lat > maxLat) {
                maxLat = lat;
            }
            if (lon < minLon) {
                minLon = lon;
            }
            if (lon > maxLon) {
                maxLon = lon;
            }
        }
    }

    return { minLat, maxLat, minLon, maxLon };
}

function pointInRing(lat: number, lon: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][1];
        const yi = ring[i][0]; // GeoJSON: [lon, lat]
        const xj = ring[j][1];
        const yj = ring[j][0];
        if (yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function pointInGeometry(lat: number, lon: number, geometry: GeoFeature['geometry']): boolean {
    if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates as number[][][];
        return pointInRing(lat, lon, coords[0]);
    }
    if (geometry.type === 'MultiPolygon') {
        for (const poly of geometry.coordinates as number[][][][]) {
            if (pointInRing(lat, lon, poly[0])) {
                return true;
            }
        }
    }
    return false;
}

export class GeoLookup {
    private grid: Map<string, IndexedFeature[]> = new Map();
    private loaded = false;

    load(adapterDir: string, log?: (msg: string) => void): boolean {
        const geoPath = path.join(adapterDir, 'data', 'Gemeindegrenzen_2025_-40062518277155425.geojson');
        if (!fs.existsSync(geoPath)) {
            log?.(`GeoJSON not found at ${geoPath}`);
            return false;
        }

        const raw: GeoJSON = JSON.parse(fs.readFileSync(geoPath, 'utf-8'));
        log?.(`GeoJSON loaded: ${raw.features.length} features, building spatial index…`);

        for (const feature of raw.features) {
            const bbox = computeBBox(feature.geometry);
            const entry: IndexedFeature = { bbox, feature };

            const latStart = Math.floor(bbox.minLat / GRID_STEP);
            const latEnd = Math.floor(bbox.maxLat / GRID_STEP);
            const lonStart = Math.floor(bbox.minLon / GRID_STEP);
            const lonEnd = Math.floor(bbox.maxLon / GRID_STEP);

            for (let gLat = latStart; gLat <= latEnd; gLat++) {
                for (let gLon = lonStart; gLon <= lonEnd; gLon++) {
                    const key = `${gLat}_${gLon}`;
                    let bucket = this.grid.get(key);
                    if (!bucket) {
                        bucket = [];
                        this.grid.set(key, bucket);
                    }
                    bucket.push(entry);
                }
            }
        }

        this.loaded = true;
        log?.(`Spatial index built: ${this.grid.size} grid cells`);
        return true;
    }

    resolve(lat: number, lon: number): string {
        if (!this.loaded) {
            return 'unknown';
        }

        const key = gridKey(lat, lon);
        const candidates = this.grid.get(key);
        if (!candidates) {
            return 'unknown';
        }

        for (const c of candidates) {
            if (lat < c.bbox.minLat || lat > c.bbox.maxLat || lon < c.bbox.minLon || lon > c.bbox.maxLon) {
                continue;
            }
            if (pointInGeometry(lat, lon, c.feature.geometry)) {
                const props = c.feature.properties;
                return props.BEZ === 'Stadt' ? `${props.GEN} (Stadt)` : props.GEN;
            }
        }

        return 'unknown';
    }
}
