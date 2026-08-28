/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitStr = searchParams.get('limit');
    const minFRPStr = searchParams.get('minFRP');
    const minPersistenceStr = searchParams.get('minPersistence');
    const predictionStr = searchParams.get('prediction'); // 'Industrial' or 'Other'

    const filepath = path.join(process.cwd(), 'src', 'data', 'detections.json');
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Detections file not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filepath, 'utf8');
    let detections = JSON.parse(fileContent);

    // Apply basic server-side filters if requested
    if (minFRPStr) {
      const minFRP = parseFloat(minFRPStr);
      if (!isNaN(minFRP)) {
        detections = detections.filter((d: any) => d.frp >= minFRP);
      }
    }

    if (minPersistenceStr) {
      const minPersistence = parseInt(minPersistenceStr);
      if (!isNaN(minPersistence)) {
        detections = detections.filter((d: any) => d.persistence_count >= minPersistence);
      }
    }

    if (predictionStr) {
      const pred = predictionStr.toLowerCase();
      if (pred === 'industrial') {
        detections = detections.filter((d: any) => d.prediction === 1);
      } else if (pred === 'other') {
        detections = detections.filter((d: any) => d.prediction === 0);
      }
    }

    if (limitStr) {
      const limit = parseInt(limitStr);
      if (!isNaN(limit) && limit > 0) {
        detections = detections.slice(0, limit);
      }
    }

    return NextResponse.json(detections);
  } catch (err: any) {
    console.error('Detections API Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
