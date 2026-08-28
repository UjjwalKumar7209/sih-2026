/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (!latStr || !lonStr) {
      return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    // Search around 5000m radius for industrial and 10000m for settlements
    const query = `
      [out:json][timeout:30];
      (
        nwr["industrial"](around:5000,${lat},${lon});
        nwr["landuse"="industrial"](around:5000,${lat},${lon});
        nwr["man_made"="works"](around:5000,${lat},${lon});
        nwr["power"="plant"](around:5000,${lat},${lon});
        nwr["man_made"="storage_tank"](around:5000,${lat},${lon});
      );
      out center tags;
      (
        nwr["place"~"city|town|village|hamlet"](around:10000,${lat},${lon});
        nwr["landuse"="residential"](around:10000,${lat},${lon});
      );
      out center tags;
    `;

    console.log(`Querying OSM Overpass API for industrial context around ${lat}, ${lon}`);

    const res = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SIH-Industrial-Fire-AI/1.0',
      },
      // Timeout behavior
      signal: AbortSignal.timeout(40000)
    });

    if (!res.ok) {
      console.warn(`OSM Overpass API returned status ${res.status}`);
      return NextResponse.json({
        osm_status: 'failed',
        osm_industrial_nearby: 0,
        osm_distance_km: null,
        osm_type: 'Overpass server error',
        osm_name: 'Industrial context unavailable'
      });
    }

    const data = await res.json();
    const elements = data.elements || [];

    let nearestDistance = Infinity;
    let nearestType = 'unknown';
    let nearestName = 'Unnamed industrial site';

    let nearestSettlementDistance = Infinity;
    let nearestSettlementName = 'Unknown settlement';
    let nearestSettlementType = 'unknown';

    for (const element of elements) {
      let fLat = 0;
      let fLon = 0;

      if (element.type === 'node') {
        fLat = element.lat;
        fLon = element.lon;
      } else if (element.center) {
        fLat = element.center.lat;
        fLon = element.center.lon;
      } else {
        continue;
      }

      const dist = distanceKm(lat, lon, fLat, fLon);
      const tags = element.tags || {};
      
      const isSettlement = tags.place || tags.landuse === 'residential';

      if (isSettlement) {
        if (dist <= 10 && dist < nearestSettlementDistance) {
          nearestSettlementDistance = dist;
          nearestSettlementType = tags.place || 'residential';
          nearestSettlementName = tags['name:en'] || tags.name || (tags.place ? `Local ${tags.place}` : 'Residential Area');
        }
      } else {
        if (dist <= 5 && dist < nearestDistance) {
          nearestDistance = dist;
          nearestType =
            tags.power ||
            tags.industrial ||
            tags.landuse ||
            tags.man_made ||
            'industrial_area';
          nearestName =
            tags['name:en'] ||
            tags.name ||
            (tags.power === 'plant' ? 'Power Plant' : 'Industrial Facility');
        }
      }
    }

    const responseData: any = {
      osm_status: 'success',
      osm_industrial_nearby: nearestDistance !== Infinity ? 1 : 0,
      osm_distance_km: nearestDistance !== Infinity ? Math.round(nearestDistance * 1000) / 1000 : null,
      osm_type: nearestDistance !== Infinity ? nearestType : null,
      osm_name: nearestDistance !== Infinity ? nearestName : 'No industrial facilities found within 5km'
    };

    if (nearestSettlementDistance !== Infinity) {
      responseData.osm_settlement_name = nearestSettlementName;
      responseData.osm_settlement_distance = Math.round(nearestSettlementDistance * 1000) / 1000;
      responseData.osm_settlement_type = nearestSettlementType;
    }

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error('OSM context API Route Error:', err);
    return NextResponse.json({
      osm_status: 'failed',
      osm_industrial_nearby: 0,
      osm_distance_km: null,
      osm_type: 'Timeout or network failure',
      osm_name: 'Industrial context unavailable'
    });
  }
}
