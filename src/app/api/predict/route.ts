/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as ort from 'onnxruntime-node';

let session: ort.InferenceSession | null = null;

async function getSession() {
  if (!session) {
    const modelPath = path.join(process.cwd(), 'src', 'model', 'industrial_fire_model_final.onnx');
    if (!fs.existsSync(modelPath)) {
      throw new Error(`ONNX model file not found at ${modelPath}`);
    }
    session = await ort.InferenceSession.create(modelPath);
  }
  return session;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extract features
    const bright_ti4 = parseFloat(body.bright_ti4);
    const bright_ti5 = parseFloat(body.bright_ti5);
    const frp = parseFloat(body.frp);
    const confidenceInput = body.confidence || 'n';
    const scan = parseFloat(body.scan);
    const track = parseFloat(body.track);
    const persistence_count = parseInt(body.persistence_count) || 0;
    const land_cover_class = parseInt(body.land_cover_class) || 0;
    
    // Confidence preprocessing
    // l -> 0, n -> 1, h -> 2
    let confidenceVal = 1; // default 'n'
    if (confidenceInput === 'l' || confidenceInput === 0) confidenceVal = 0;
    else if (confidenceInput === 'n' || confidenceInput === 1) confidenceVal = 1;
    else if (confidenceInput === 'h' || confidenceInput === 2) confidenceVal = 2;
    else if (!isNaN(parseFloat(confidenceInput))) confidenceVal = parseFloat(confidenceInput);
    
    // Feature order: bright_ti4, bright_ti5, frp, confidence, scan, track, persistence_count, land_cover_class
    const inputData = Float32Array.from([
      bright_ti4 || 0,
      bright_ti5 || 0,
      frp || 0,
      confidenceVal,
      scan || 0.5,
      track || 0.5,
      persistence_count || 0,
      land_cover_class || 0
    ]);
    
    const s = await getSession();
    const tensor = new ort.Tensor('float32', inputData, [1, 8]);
    const feeds: Record<string, ort.Tensor> = {};
    feeds[s.inputNames[0]] = tensor;
    
    const results = await s.run(feeds);
    
    // Extract outputs
    const labelOutput = results.label; // int64 or similar
    const probsOutput = results.probabilities; // float32 tensor of shape [1, 2]
    
    const labelVal = Number(labelOutput.data[0]); // 0 or 1
    const probVal = probsOutput.data as Float32Array; // [prob_other, prob_industrial]
    
    const predictionName = labelVal === 1 ? 'Industrial' : 'Other';
    
    return NextResponse.json({
      prediction: predictionName,
      label: labelVal,
      probability: probVal[1] // Probability of class 1 (Industrial)
    });
  } catch (err: any) {
    console.error('Prediction API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
