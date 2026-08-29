/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Parse CSV manually helper
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];
  
  const headers = lines[0].trim().split(',');
  const results: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple split by comma. Since NASA FIRMS CSVs don't contain quotes or escaped commas, this is safe.
    const values = line.split(',');
    const item: any = {};
    headers.forEach((header, index) => {
      item[header] = values[index];
    });
    results.push(item);
  }
  return results;
}

export async function GET() {
  try {
    // 1. Load backup/demo data from detections.json
    const detectionsPath = path.join(process.cwd(), 'src', 'data', 'detections.json');
    if (!fs.existsSync(detectionsPath)) {
      throw new Error('Detections database detections.json not found');
    }
    const demoData = JSON.parse(fs.readFileSync(detectionsPath, 'utf8'));

    // 2. Read map key from env or files
    let mapKey = process.env.FIRMS_MAP_KEY;
    if (!mapKey) {
      const envPaths = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.example')
      ];
      for (const envPath of envPaths) {
        if (fs.existsSync(/*turbopackIgnore: true*/ envPath)) {
          const content = fs.readFileSync(/*turbopackIgnore: true*/ envPath, 'utf8');
          const match = content.match(/FIRMS_MAP_KEY\s*=\s*([a-zA-Z0-9_]+)/);
          if (match && match[1]) {
            const val = match[1].trim();
            if (val && val !== 'your_key_here') {
              mapKey = val;
              break;
            }
          }
        }
      }
    }
    if (!mapKey) {
      mapKey = 'bd2a5f40f6a4eeae38cf5fb85953cb5a';
    }
    
    // Bounding box for India
    const area = '68,6,98,36';
    const source = 'VIIRS_SNPP_NRT';
    const dayRange = 1;

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${area}/${dayRange}`;
    
    console.log('Fetching live FIRMS data from:', url.replace(mapKey, '***'));
    
    const response = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 mins
    
    if (!response.ok) {
      console.warn(`NASA FIRMS API returned status ${response.status}. Falling back to live simulation.`);
      const simulated = demoData.slice(0, 80).map((d: any, idx: number) => ({
        ...d,
        id: `sim-live-${idx}`,
        acq_date: new Date().toISOString().split('T')[0]
      }));
      return NextResponse.json({
        mode: 'LIVE',
        isSimulated: true,
        detections: simulated,
        source: 'NASA FIRMS API error (Live Simulation)'
      });
    }

    const csvText = await response.text();
    
    // Check if the response is actually an error message (like "invalid key", "key is required", etc.)
    const lowerCsv = csvText.toLowerCase();
    if (
      lowerCsv.includes('key') || 
      lowerCsv.includes('error') || 
      lowerCsv.includes('invalid') || 
      lowerCsv.includes('required') || 
      lowerCsv.includes('unauthorized') ||
      (lowerCsv.trim().split('\n').length === 1 && !lowerCsv.includes(','))
    ) {
      console.warn(`NASA FIRMS API returned error or non-CSV message: "${csvText.trim()}". Falling back to live simulation.`);
      const simulated = demoData.slice(0, 80).map((d: any, idx: number) => ({
        ...d,
        id: `sim-live-${idx}`,
        acq_date: new Date().toISOString().split('T')[0]
      }));
      return NextResponse.json({
        mode: 'LIVE',
        isSimulated: true,
        detections: simulated,
        source: `NASA FIRMS API Warning: ${csvText.trim()} (Live Simulation)`
      });
    }

    const parsedData = parseCSV(csvText);

    if (parsedData.length === 0) {
      console.log('No live detections found. Returning live simulation.');
      const simulated = demoData.slice(0, 80).map((d: any, idx: number) => ({
        ...d,
        id: `sim-live-${idx}`,
        acq_date: new Date().toISOString().split('T')[0]
      }));
      return NextResponse.json({
        mode: 'LIVE',
        isSimulated: true,
        detections: simulated,
        source: 'NASA FIRMS API returned empty (Live Simulation)'
      });
    }

    // 3. For live data, compute persistence and map landcover from our database
    
    // Load persistence lookup map
    let persistenceMap: Record<string, number> = {};
    try {
      const lookupPath = path.join(process.cwd(), 'src', 'data', 'persistence_lookup.json');
      if (fs.existsSync(lookupPath)) {
        persistenceMap = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading persistence lookup map:', e);
    }

    // Simple nearest-neighbor lookup for land cover mapping using demoData
    const findNearestLandCover = (lat: number, lon: number) => {
      let bestDist = Infinity;
      let bestClass = 0;
      let bestName = 'Unavailable';

      // Sample a subset or search all (3000 is small, so searching all is very fast)
      for (const d of demoData) {
        // Simple squared distance
        const dLat = d.latitude - lat;
        const dLon = d.longitude - lon;
        const distSq = dLat * dLat + dLon * dLon;
        if (distSq < bestDist) {
          bestDist = distSq;
          bestClass = d.land_cover_class;
          bestName = d.land_cover_name;
        }
      }

      // Only map if distance is within ~0.2 degrees (~22 km)
      if (bestDist < 0.04) {
        return { class: bestClass, name: bestName };
      }
      return { class: 0, name: 'Unavailable' };
    };

    // Construct features list
    const liveDetections = parsedData.map((item: any, index: number) => {
      const lat = parseFloat(item.latitude);
      const lon = parseFloat(item.longitude);
      
      const latGrid = Math.round(lat * 100) / 100;
      const lonGrid = Math.round(lon * 100) / 100;
      const gridKey = `${latGrid},${lonGrid}`;
      
      // Lookup persistence
      const persistence_count = persistenceMap[gridKey] || 1;
      
      // Lookup landcover
      const lc = findNearestLandCover(lat, lon);
      
      // Confidence mapping: NASA returns 'l' (low), 'n' (nominal), 'h' (high)
      const confidence = item.confidence || 'n';

      return {
        id: `live-${index}`,
        latitude: lat,
        longitude: lon,
        bright_ti4: parseFloat(item.bright_ti4) || 0.0,
        bright_ti5: parseFloat(item.bright_ti5) || 0.0,
        frp: parseFloat(item.frp) || 0.0,
        confidence: confidence,
        scan: parseFloat(item.scan) || 0.5,
        track: parseFloat(item.track) || 0.5,
        acq_date: item.acq_date || new Date().toISOString().split('T')[0],
        acq_time: parseInt(item.acq_time) || 0,
        satellite: item.satellite || 'N',
        instrument: item.instrument || 'VIIRS',
        daynight: item.daynight || 'D',
        persistence_count: persistence_count,
        land_cover_class: lc.class,
        land_cover_name: lc.name,
        
        // OSM context starts empty for live data (fetched on-demand when clicked)
        osm_industrial_nearby: null,
        osm_distance_km: null,
        osm_type: null,
        
        true_label: null
      };
    });

    return NextResponse.json({
      mode: 'LIVE',
      detections: liveDetections,
      source: 'NASA FIRMS API'
    });

  } catch (err: any) {
    console.error('FIRMS API Route Error:', err);
    // Dynamic fallback to demo data if anything crashes
    try {
      const detectionsPath = path.join(process.cwd(), 'src', 'data', 'detections.json');
      const demoData = JSON.parse(fs.readFileSync(detectionsPath, 'utf8'));
      const simulated = demoData.slice(0, 80).map((d: any, idx: number) => ({
        ...d,
        id: `sim-live-${idx}`,
        acq_date: new Date().toISOString().split('T')[0]
      }));
      return NextResponse.json({
        mode: 'LIVE',
        isSimulated: true,
        detections: simulated,
        error: err.message,
        source: 'Error fallback (Live Simulation)'
      });
    } catch {
      return NextResponse.json({ error: 'Failed to load any data' }, { status: 500 });
    }
  }
}
