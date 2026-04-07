import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Hotspot, Tree } from '@shared/types';

const UNT_LAT = 33.2100;
const UNT_LON = -97.1525;

const NUT_SPECIES = new Set([
  'Live Oak', 'Post Oak', 'Red Oak', 'Bur Oak', 'Oak',
  'Pecan', 'Hackberry', 'Cedar Elm', 'Sweetgum', 'Mesquite',
]);

type PopupInfo =
  | { kind: 'hotspot'; hotspot: Hotspot }
  | { kind: 'tree'; tree: { id: number; species: string; elevation: number; memorial: string; isNut: boolean; lat: number; lon: number } };

interface MapViewProps {
  hotspots: Hotspot[];
  onDiscoverZone: (hotspotId: number) => void;
}

export function MapView({ hotspots, onDiscoverZone }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hotspotsRef = useRef<Hotspot[]>(hotspots);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Keep ref in sync so the load handler can use latest hotspots
  hotspotsRef.current = hotspots;

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
            elevation: tree.elevation,
            memorial: tree.memorial,
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
            tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
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
      // ── Tree layer ──────────────────────────────────────
      map.addSource('trees', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'trees-layer',
        type: 'circle',
        source: 'trees',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2, 16, 5, 18, 8],
          'circle-color': [
            'case',
            ['get', 'isNut'],
            '#E40058',
            '#00A800',
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.3)',
        },
      });

      // ── Hotspot layer ───────────────────────────────────
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
            '#F8D830',
            '#E40058',
          ],
          'circle-opacity': 0.35,
          'circle-stroke-width': 3,
          'circle-stroke-color': [
            'case',
            ['get', 'discovered'],
            '#A87820',
            '#A80040',
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
          'text-color': '#38180C',
          'text-halo-color': '#F8D830',
          'text-halo-width': 2,
        },
      });

      // Load initial trees
      loadTrees(map);

      // Load initial hotspots (fixes: hotspots not showing on first render)
      updateHotspots(map, hotspotsRef.current);
    });

    map.on('moveend', () => loadTrees(map));

    // ── Click on hotspot ────────────────────────────────
    map.on('click', 'hotspots-circle', e => {
      if (!e.features || e.features.length === 0) return;
      e.originalEvent.stopPropagation();
      const feature = e.features[0];
      const props = feature.properties!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;

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
        discovered: Boolean(props.discovered),
      };
      setPopup({ kind: 'hotspot', hotspot });
    });

    // ── Click on tree ───────────────────────────────────
    map.on('click', 'trees-layer', e => {
      if (!e.features || e.features.length === 0) return;
      // Don't fire if hotspot was also clicked
      const hotspotFeatures = map.queryRenderedFeatures(e.point, { layers: ['hotspots-circle'] });
      if (hotspotFeatures.length > 0) return;

      const feature = e.features[0];
      const props = feature.properties!;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;

      setPopup({
        kind: 'tree',
        tree: {
          id: props.id,
          species: props.species || 'Unknown',
          elevation: props.elevation || 0,
          memorial: props.memorial || 'N',
          isNut: Boolean(props.isNut),
          lat: coords[1],
          lon: coords[0],
        },
      });
    });

    // Click empty area to close popup
    map.on('click', e => {
      const hotspotHits = map.queryRenderedFeatures(e.point, { layers: ['hotspots-circle'] });
      const treeHits = map.queryRenderedFeatures(e.point, { layers: ['trees-layer'] });
      if (hotspotHits.length === 0 && treeHits.length === 0) setPopup(null);
    });

    // Cursor changes
    map.on('mouseenter', 'hotspots-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'hotspots-circle', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'trees-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'trees-layer', () => { map.getCanvas().style.cursor = ''; });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update hotspots when prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    updateHotspots(map, hotspots);
  }, [hotspots, updateHotspots]);

  const handleDiscover = () => {
    if (!popup || popup.kind !== 'hotspot') return;
    onDiscoverZone(popup.hotspot.id);
    setPopup(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Hotspot popup ── */}
      {popup?.kind === 'hotspot' && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#F8B800',
          border: '4px solid #A87820',
          borderRadius: '2px',
          padding: '14px 18px',
          minWidth: '240px',
          maxWidth: '300px',
          zIndex: 10,
          boxShadow: '4px 4px 0px #A87820, inset 2px 2px 0px rgba(255,255,255,0.3)',
        }}>
          <button onClick={() => setPopup(null)} style={closeBtn}>✕</button>

          <div style={{ ...labelStyle, fontSize: '13px', color: '#38180C', marginBottom: '8px' }}>
            {popup.hotspot.discovered ? popup.hotspot.name : '??? UNKNOWN ZONE'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            <Row label="SCORE" value={popup.hotspot.discovered ? `${'🌰'.repeat(popup.hotspot.score || 0)}` : '?????'} />
            <Row label="TREES" value={popup.hotspot.discovered ? String(popup.hotspot.tree_count) : '?'} />
            <Row label="NUT TREES" value={popup.hotspot.discovered ? String(popup.hotspot.nut_count) : '?'} />
          </div>

          {!popup.hotspot.discovered && (
            <button onClick={handleDiscover} style={discoverBtn}>
              I'M HERE — DISCOVER ZONE
            </button>
          )}
          {popup.hotspot.discovered && (
            <div style={{ ...labelStyle, textAlign: 'center', fontSize: '10px', color: '#00A800' }}>
              ⭐ DISCOVERED ⭐
            </div>
          )}
        </div>
      )}

      {/* ── Tree popup ── */}
      {popup?.kind === 'tree' && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: popup.tree.isNut ? '#F8B800' : '#88E888',
          border: `4px solid ${popup.tree.isNut ? '#A87820' : '#005800'}`,
          borderRadius: '2px',
          padding: '14px 18px',
          minWidth: '220px',
          maxWidth: '280px',
          zIndex: 10,
          boxShadow: `4px 4px 0px ${popup.tree.isNut ? '#A87820' : '#005800'}, inset 2px 2px 0px rgba(255,255,255,0.3)`,
        }}>
          <button onClick={() => setPopup(null)} style={closeBtn}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px' }}>{popup.tree.isNut ? '🌰' : '🌳'}</span>
            <div>
              <div style={{ ...labelStyle, fontSize: '14px', color: '#38180C' }}>
                {popup.tree.species}
              </div>
              <div style={{ ...labelStyle, fontSize: '9px', color: '#666', letterSpacing: '1px' }}>
                TREE #{popup.tree.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Row label="TYPE" value={popup.tree.isNut ? '🐿️ NUT TREE — SQUIRREL FOOD!' : '🌿 NON-NUT TREE'} />
            <Row label="ELEVATION" value={popup.tree.elevation > 0 ? `${popup.tree.elevation.toFixed(0)} ft` : 'N/A'} />
            <Row label="MEMORIAL" value={popup.tree.memorial === 'Y' ? '⭐ YES' : 'No'} />
            <Row label="COORDS" value={`${popup.tree.lat.toFixed(4)}, ${popup.tree.lon.toFixed(4)}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontFamily: '"Courier New", monospace',
  fontWeight: 'bold',
  letterSpacing: '2px',
};

const closeBtn: React.CSSProperties = {
  position: 'absolute',
  top: '6px',
  right: '8px',
  background: 'transparent',
  border: 'none',
  color: '#38180C',
  cursor: 'pointer',
  fontFamily: '"Courier New", monospace',
  fontSize: '14px',
};

const discoverBtn: React.CSSProperties = {
  width: '100%',
  background: '#E40058',
  border: '3px solid #A80040',
  borderRadius: '2px',
  color: '#FCF8FC',
  boxShadow: '2px 2px 0px #A80040',
  fontFamily: '"Courier New", monospace',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  padding: '10px',
  cursor: 'pointer',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#666', letterSpacing: '1px', fontWeight: 'bold' }}>
        {label}
      </span>
      <span style={{ fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#38180C', fontWeight: 'bold' }}>
        {value}
      </span>
    </div>
  );
}
