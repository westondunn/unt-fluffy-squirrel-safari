import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Hotspot } from '@shared/types';

const UNT_LAT = 33.2100;
const UNT_LON = -97.1525;

const NUT_SPECIES = new Set([
  'Live Oak', 'Post Oak', 'Red Oak', 'Bur Oak', 'Oak',
  'Pecan', 'Hackberry', 'Cedar Elm', 'Sweetgum', 'Mesquite',
]);

interface PopupInfo {
  hotspot: Hotspot;
  x: number;
  y: number;
}

interface MapViewProps {
  hotspots: Hotspot[];
  onDiscoverZone: (hotspotId: number) => void;
}

export function MapView({ hotspots, onDiscoverZone }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Load trees for current viewport
  const loadTrees = useCallback(async (map: maplibregl.Map) => {
    const bounds = map.getBounds();
    try {
      const trees = await window.api.queryTrees({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLon: bounds.getWest(),
        maxLon: bounds.getEast(),
      });

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: trees.map(tree => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [tree.lon, tree.lat] },
          properties: {
            id: tree.id,
            species: tree.species,
            isNut: NUT_SPECIES.has(tree.species),
          },
        })),
      };

      const source = map.getSource('trees') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      }
    } catch (err) {
      console.error('Failed to load trees:', err);
    }
  }, []);

  // Update hotspot layer data
  const updateHotspots = useCallback((map: maplibregl.Map, spots: Hotspot[]) => {
    const source = map.getSource('hotspots') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: spots.map(h => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        properties: {
          id: h.id,
          name: h.name,
          score: h.score,
          tree_count: h.tree_count,
          nut_count: h.nut_count,
          radius_m: h.radius_m,
          notes: h.notes,
          discovered: h.discovered,
        },
      })),
    };
    source.setData(geojson);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
        }],
      },
      center: [UNT_LON, UNT_LAT],
      zoom: 15,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('load', () => {
      // Add tree source
      map.addSource('trees', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'trees-layer',
        type: 'circle',
        source: 'trees',
        paint: {
          'circle-radius': 4,
          'circle-color': [
            'case',
            ['get', 'isNut'],
            '#e94560',
            '#fdcb6e',
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.3)',
        },
      });

      // Add hotspot source
      map.addSource('hotspots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'hotspots-circle',
        type: 'circle',
        source: 'hotspots',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            13, 20,
            16, 40,
          ],
          'circle-color': [
            'case',
            ['get', 'discovered'],
            '#fdcb6e',
            '#e94560',
          ],
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case',
            ['get', 'discovered'],
            '#fdcb6e',
            '#e94560',
          ],
          'circle-stroke-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'hotspots-labels',
        type: 'symbol',
        source: 'hotspots',
        layout: {
          'text-field': ['case', ['get', 'discovered'], ['get', 'name'], '???'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
        },
        paint: {
          'text-color': '#fdcb6e',
          'text-halo-color': '#1a1a2e',
          'text-halo-width': 2,
        },
      });

      // Load initial trees
      loadTrees(map);
    });

    map.on('moveend', () => loadTrees(map));

    // Click on hotspot
    map.on('click', 'hotspots-circle', e => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;
      const point = map.project([coords[0], coords[1]]);

      const hotspot: Hotspot = {
        id: props.id,
        name: props.name,
        lat: coords[1],
        lon: coords[0],
        radius_m: props.radius_m,
        tree_count: props.tree_count,
        nut_count: props.nut_count,
        score: props.score,
        species: '',
        notes: props.notes,
      };
      setPopup({ hotspot, x: point.x, y: point.y });
    });

    map.on('click', e => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['hotspots-circle'] });
      if (features.length === 0) setPopup(null);
    });

    map.on('mouseenter', 'hotspots-circle', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'hotspots-circle', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update hotspots when they change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateHotspots(map, hotspots);
  }, [hotspots, updateHotspots]);

  const handleDiscover = () => {
    if (!popup) return;
    onDiscoverZone(popup.hotspot.id);
    setPopup(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Hotspot popup */}
      {popup && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(22, 33, 62, 0.97)',
          border: '2px solid #fdcb6e',
          borderRadius: '6px',
          padding: '14px 18px',
          minWidth: '240px',
          maxWidth: '300px',
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          <button
            onClick={() => setPopup(null)}
            style={{
              position: 'absolute',
              top: '6px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontFamily: '"Courier New", monospace',
              fontSize: '14px',
            }}
          >
            ✕
          </button>

          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            color: '#fdcb6e',
            marginBottom: '8px',
          }}>
            {popup.hotspot.discovered ? popup.hotspot.name : '??? UNKNOWN ZONE'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            <Row label="SCORE" value={popup.hotspot.discovered ? `${'🌰'.repeat(popup.hotspot.score || 0)}` : '?????'} />
            <Row label="TREES" value={popup.hotspot.discovered ? String(popup.hotspot.tree_count) : '?'} />
            <Row label="NUT TREES" value={popup.hotspot.discovered ? String(popup.hotspot.nut_count) : '?'} />
          </div>

          {!popup.hotspot.discovered && (
            <button
              onClick={handleDiscover}
              style={{
                width: '100%',
                background: '#e94560',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                fontFamily: '"Courier New", monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                padding: '10px',
                cursor: 'pointer',
              }}
            >
              I'M HERE — DISCOVER ZONE
            </button>
          )}
          {popup.hotspot.discovered && (
            <div style={{
              textAlign: 'center',
              fontFamily: '"Courier New", monospace',
              fontSize: '10px',
              color: '#fdcb6e',
              letterSpacing: '2px',
              fontWeight: 'bold',
            }}>
              DISCOVERED
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#888', letterSpacing: '1px' }}>
        {label}
      </span>
      <span style={{ fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#eee' }}>
        {value}
      </span>
    </div>
  );
}
