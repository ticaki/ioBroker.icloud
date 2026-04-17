"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var geo_exports = {};
__export(geo_exports, {
  GeoLookup: () => GeoLookup
});
module.exports = __toCommonJS(geo_exports);
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
const GRID_STEP = 0.1;
function gridKey(lat, lon) {
  return `${Math.floor(lat / GRID_STEP)}_${Math.floor(lon / GRID_STEP)}`;
}
function computeBBox(geometry) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.map((p) => p[0]);
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
function pointInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1];
    const yi = ring[i][0];
    const xj = ring[j][1];
    const yj = ring[j][0];
    if (yi > lon !== yj > lon && lat < (xj - xi) * (lon - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
function pointInGeometry(lat, lon, geometry) {
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates;
    return pointInRing(lat, lon, coords[0]);
  }
  if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      if (pointInRing(lat, lon, poly[0])) {
        return true;
      }
    }
  }
  return false;
}
class GeoLookup {
  grid = /* @__PURE__ */ new Map();
  loaded = false;
  load(adapterDir, log) {
    const geoPath = import_node_path.default.join(adapterDir, "data", "Gemeindegrenzen_2025_-40062518277155425.geojson");
    if (!import_node_fs.default.existsSync(geoPath)) {
      log == null ? void 0 : log(`GeoJSON not found at ${geoPath}`);
      return false;
    }
    const raw = JSON.parse(import_node_fs.default.readFileSync(geoPath, "utf-8"));
    log == null ? void 0 : log(`GeoJSON loaded: ${raw.features.length} features, building spatial index\u2026`);
    for (const feature of raw.features) {
      const bbox = computeBBox(feature.geometry);
      const entry = { bbox, feature };
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
    log == null ? void 0 : log(`Spatial index built: ${this.grid.size} grid cells`);
    return true;
  }
  resolve(lat, lon) {
    if (!this.loaded) {
      return "unknown";
    }
    const key = gridKey(lat, lon);
    const candidates = this.grid.get(key);
    if (!candidates) {
      return "unknown";
    }
    for (const c of candidates) {
      if (lat < c.bbox.minLat || lat > c.bbox.maxLat || lon < c.bbox.minLon || lon > c.bbox.maxLon) {
        continue;
      }
      if (pointInGeometry(lat, lon, c.feature.geometry)) {
        const props = c.feature.properties;
        return props.BEZ === "Stadt" ? `${props.GEN} (Stadt)` : props.GEN;
      }
    }
    return "unknown";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GeoLookup
});
//# sourceMappingURL=geo.js.map
