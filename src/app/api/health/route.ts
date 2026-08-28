/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const modelPath = path.join(process.cwd(), 'src', 'model', 'industrial_fire_model_final.onnx');
    const modelExists = fs.existsSync(modelPath);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      model: {
        name: 'industrial_fire_model_final.onnx',
        status: modelExists ? 'loaded' : 'missing',
        format: 'ONNX (ZipMap disabled)'
      },
      services: {
        overpass: 'ready',
        firms: 'ready'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'unhealthy', error: err.message }, { status: 500 });
  }
}
