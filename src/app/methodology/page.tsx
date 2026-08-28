import Link from 'next/link';
import { ArrowLeft, BookOpen, AlertOctagon, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Methodology & Limitations | SIH Industrial Fire AI',
  description: 'Detailed technical pipeline, model architecture, features, and prototype limitations.'
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-200 p-6 md:p-12 font-telemetry">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#ff4500]" />
            <h1 className="text-xl font-bold uppercase tracking-wider text-zinc-150">Technical Documentation</h1>
          </div>
          <Link 
            href="/" 
            className="brutalist-button flex items-center gap-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* BANNED GRADIENTS WARNING / CRITICAL LIMITATIONS ALERT */}
        <div className="border-2 border-[#ff4500] bg-zinc-950 p-6 brutalist-card">
          <div className="flex items-start gap-4">
            <AlertOctagon className="w-8 h-8 text-[#ff4500] shrink-0 mt-1" />
            <div className="space-y-2">
              <h2 className="font-bold text-sm uppercase tracking-widest text-[#ff4500]">System Warning & Operational Scope</h2>
              <p className="text-xs leading-relaxed text-zinc-300 font-bold uppercase">
                &quot;The current model is a prototype trained using OSM-assisted labels and has not been validated against a large independent ground-truth incident dataset. Predictions should therefore be treated as decision-support signals rather than confirmed fires.&quot;
              </p>
              <div className="text-[10px] text-zinc-500 leading-normal space-y-1 mt-3">
                <p>• **Thermal Observations:** NASA FIRMS reports thermal anomalies (pixels hotter than surroundings), not automatically confirmed industrial fires.</p>
                <p>• **OSM Incompleteness:** OpenStreetMap coverage of industrial areas and facilities can be incomplete or lack precise geographic shape information in remote areas.</p>
                <p>• **Satellite Constraints:** Earth observation satellites have physical resolutions and orbit schedules, introducing potential false positives (e.g. solar glint, highly reflective roofs) or false negatives (e.g. thick cloud cover, fires under roofs).</p>
                <p>• **Validation Limits:** The training dataset contains 200 high-confidence samples mapped with verification labels. Real-world validation metrics may vary from our held-out test performance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Geospatial Pipeline */}
        <section className="space-y-4">
          <h2 className="text-md font-bold uppercase text-zinc-400 border-l-4 border-zinc-500 pl-3">Geospatial Processing Pipeline</h2>
          
          <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-4">
            {/* Mermaid-like visualization */}
            <div className="font-mono text-[10px] bg-zinc-900 p-4 border border-zinc-800 space-y-2 text-zinc-400 overflow-x-auto whitespace-pre">
{`NASA FIRMS Thermal Detection (VIIRS/MODIS)
      │
      ▼
Grid-based Spatial Clustering (0.01° grid) ──► Compute Persistence Count
      │
      ▼
ESA WorldCover Overlay (10m Resolution)  ──► Extract Land Cover Class
      │
      ▼
OpenStreetMap Buffer Check (5km Radius) ──► Extract Industrial Context (Node/Way/Relation)
      │
      ▼
Model Feature Vector Assembly (8 Columns)
      │
      ▼
Random Forest AI Classifier (ONNX Engine) ──► Classification Output (Industrial / Other)`}
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              The application processes thermal observations from NASA’s Fire Information for Resource Management System (FIRMS). 
              A spatial grid is used to group detections locally, matching coordinates against historical thermal records. 
              The system merges ESA WorldCover land use classes and OSM tags (e.g., factories, power plants, mines) within a 5 km buffer. 
              An optimized Random Forest classifier evaluates features on the fly, outputting prediction status and probability.
            </p>
          </div>
        </section>

        {/* 2. Feature Definitions */}
        <section className="space-y-4">
          <h2 className="text-md font-bold uppercase text-zinc-400 border-l-4 border-zinc-500 pl-3">Feature Schema & Training Configuration</h2>
          
          <div className="bg-zinc-950 border border-zinc-900 overflow-x-auto">
            <table className="brutalist-table">
              <thead>
                <tr>
                  <th>Feature Name</th>
                  <th>Source</th>
                  <th>Format</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono text-[#ff4500]">bright_ti4</td>
                  <td>VIIRS I-4 Channel</td>
                  <td className="font-mono">Float (K)</td>
                  <td>Brightness temperature of the thermal anomaly pixel (375 m resolution).</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">bright_ti5</td>
                  <td>VIIRS I-5 Channel</td>
                  <td className="font-mono">Float (K)</td>
                  <td>Brightness temperature of the thermal anomaly pixel (11.45 µm wavelength).</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">frp</td>
                  <td>NASA FIRMS</td>
                  <td className="font-mono">Float (MW)</td>
                  <td>Fire Radiative Power. Indicates the rate of radiative heat energy released.</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">confidence</td>
                  <td>NASA FIRMS</td>
                  <td className="font-mono">Int (0 / 1 / 2)</td>
                  <td>Anomaly detection confidence. Mapped as: <code className="bg-zinc-900 px-1 py-0.5 border border-zinc-800">l → 0</code>, <code className="bg-zinc-900 px-1 py-0.5 border border-zinc-800">n → 1</code>, <code className="bg-zinc-900 px-1 py-0.5 border border-zinc-800">h → 2</code>.</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">scan</td>
                  <td>NASA FIRMS</td>
                  <td className="font-mono">Float (km)</td>
                  <td>Pixel scan dimension perpendicular to satellite trajectory track.</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">track</td>
                  <td>NASA FIRMS</td>
                  <td className="font-mono">Float (km)</td>
                  <td>Pixel scan dimension along the satellite trajectory track.</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">persistence_count</td>
                  <td>Historical Data</td>
                  <td className="font-mono">Integer</td>
                  <td>Detections count in the corresponding 0.01° grid cell (approx 1 km) over 3 months.</td>
                </tr>
                <tr>
                  <td className="font-mono text-[#ff4500]">land_cover_class</td>
                  <td>ESA WorldCover</td>
                  <td className="font-mono">Integer</td>
                  <td>Global land cover class code (e.g. 50 = Built-up, 40 = Cropland, 10 = Trees).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Model Accuracy and Metrics */}
        <section className="space-y-4">
          <h2 className="text-md font-bold uppercase text-zinc-400 border-l-4 border-zinc-500 pl-3">Model Training & Validation Performance</h2>
          
          <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-4">
            <p className="text-xs leading-relaxed text-zinc-400">
              The underlying Random Forest Classifier model has been trained on historical observations covering India from Q1 2025. 
              Ground-truth labels were generated by cross-matching recurrent thermal grid points against high-fidelity OSM industrial geometries and verifying manually.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-telemetry">
              <div className="bg-zinc-900 p-3 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Accuracy</span>
                <span className="text-xl font-bold text-[#00cc66]">~ 84%</span>
              </div>
              <div className="bg-zinc-900 p-3 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Industrial Recall</span>
                <span className="text-xl font-bold text-zinc-200">~ 72%</span>
              </div>
              <div className="bg-zinc-900 p-3 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Industrial F1</span>
                <span className="text-xl font-bold text-zinc-200">~ 0.76</span>
              </div>
              <div className="bg-zinc-900 p-3 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Other Recall</span>
                <span className="text-xl font-bold text-zinc-200">~ 91%</span>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-4 text-xs space-y-2 text-zinc-400">
              <p>
                <strong>Evaluation Notes:</strong> On the current OSM-assisted held-out validation dataset, the model achieved approximately 84% accuracy. 
                A previous version reported ~100% accuracy, but was rejected because labels were generated using features correlated with model predictors, which inflated metric outputs. 
                The current results are a realistic baseline for a decision-support helper.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Methodology Backing */}
        <section className="space-y-4">
          <h2 className="text-md font-bold uppercase text-zinc-400 border-l-4 border-zinc-500 pl-3">Data Dictionary & Reference Sources</h2>
          
          <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-4 text-xs text-zinc-400">
            <div className="flex gap-2">
              <HelpCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-300">ESA WorldCover 2021 V200 Mapping Classes</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  10: Tree cover | 20: Shrubland | 30: Grassland | 40: Cropland | 50: Built-up | 60: Bare/sparse vegetation | 70: Snow/ice | 80: Permanent water | 90: Herbaceous wetland | 95: Mangroves | 100: Moss/lichen.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-900">
              <HelpCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-300">OpenStreetMap Overpass Buffer Tagging</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  OSM contextual analysis checks a bounding radius of 5,000 meters around the coordinates of a thermal pixel for the following key-value criteria: <code className="text-zinc-400 font-mono">industrial=*</code>, <code className="text-zinc-400 font-mono">landuse=industrial</code>, <code className="text-zinc-400 font-mono">man_made=works</code>, <code className="text-zinc-400 font-mono">power=plant</code>, and <code className="text-zinc-400 font-mono">man_made=storage_tank</code>.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
