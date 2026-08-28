'use client';

import { useState, useEffect } from 'react';
import { Shield, Flame, MapPin, TreePine, Factory, Activity, Clock } from 'lucide-react';

interface Detection {
  id?: string;
  latitude: number;
  longitude: number;
  bright_ti4: number;
  bright_ti5: number;
  frp: number;
  confidence: string;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: number;
  satellite: string;
  instrument: string;
  daynight: string;
  persistence_count: number;
  land_cover_class: number;
  land_cover_name: string;
  osm_industrial_nearby: number | null;
  osm_distance_km: number | null;
  osm_type: string | null;
  true_label: number | null;
  prediction: number;
  probability: number;
}

interface DetailPanelProps {
  detection: Detection | null;
  onUpdateDetectionOSM: (updatedDetection: Detection) => void;
}

export default function DetailPanel({ detection, onUpdateDetectionOSM }: DetailPanelProps) {
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState<string | null>(null);

  // Compute Priority Heuristic
  const getPriority = (d: Detection) => {
    const isIndustrial = d.prediction === 1;
    if (isIndustrial && d.frp >= 15.0 && d.persistence_count >= 10) {
      return { label: 'HIGH', color: 'bg-[#ff4500] text-white border-white' };
    }
    if (isIndustrial || d.persistence_count >= 5) {
      return { label: 'MEDIUM', color: 'bg-[#ffbf00] text-black border-black' };
    }
    return { label: 'LOW', color: 'bg-zinc-200 text-zinc-700 border-zinc-450' };
  };

  // Fetch OSM Context dynamically if it's missing (null) when the detection is selected
  useEffect(() => {
    if (!detection) return;

    // Check if OSM context needs to be loaded
    if (detection.osm_industrial_nearby === null) {
      const stateTimer = setTimeout(() => {
        setOsmLoading(true);
        setOsmError(null);
      }, 0);

      const url = `/api/osm-context?lat=${detection.latitude}&lon=${detection.longitude}`;
      console.log('Fetching live OSM context for:', detection.latitude, detection.longitude);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      fetch(url, { signal: controller.signal })
        .then((res) => {
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setOsmLoading(false);
          if (data.osm_status === 'failed') {
            setOsmError('OSM query failed');
            return;
          }
          // Callback to parent to update this detection in state so the map and table reflect it
          onUpdateDetectionOSM({
            ...detection,
            osm_industrial_nearby: data.osm_industrial_nearby,
            osm_distance_km: data.osm_distance_km,
            osm_type: data.osm_name // Map name to type for rendering
          });
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error('Error fetching OSM context:', err);
          setOsmLoading(false);
          setOsmError(err.name === 'AbortError' ? 'Request timed out' : 'OSM context unavailable');
        });

      return () => {
        clearTimeout(stateTimer);
        clearTimeout(timeoutId);
        controller.abort();
      };
    }
  }, [detection, onUpdateDetectionOSM]);

  if (!detection) {
    return (
      <div className="h-full brutalist-card flex flex-col items-center justify-center font-mono text-zinc-500 text-center p-6 min-h-[350px]">
        <Activity className="w-10 h-10 stroke-1 stroke-zinc-600 mb-4 animate-pulse" />
        <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Telemetry Status: IDLE</p>
        <p className="text-xs mt-2 text-zinc-600">Select a thermal anomaly marker on the map or from the detections feed to initialize detailed diagnostics.</p>
      </div>
    );
  }

  const priority = getPriority(detection);
  const isIndustrial = detection.prediction === 1;

  // Format acq_time: e.g. 829 -> 08:29 UTC
  const formatTime = (timeNum: number) => {
    const timeStr = timeNum.toString().padStart(4, '0');
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)} UTC`;
  };

  return (
    <div className="brutalist-card h-full flex flex-col justify-between min-h-[350px] font-telemetry">
      <div>
        {/* Header telemetry readings */}
        <div className="flex justify-between items-start border-b border-zinc-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-sm tracking-wider uppercase text-zinc-400">Sensor Diagnostics</h3>
            <p className="text-[10px] text-zinc-500 font-telemetry uppercase">
              ID: {detection.id || `pt-${detection.latitude.toFixed(4)}-${detection.longitude.toFixed(4)}`}
            </p>
          </div>
          <span className={`brutalist-badge border-2 px-2.5 py-0.5 text-xs font-bold ${priority.color}`}>
            PRIORITY: {priority.label}
          </span>
        </div>

        {/* Diagnostic sections */}
        <div className="space-y-4 text-xs">
          
          {/* Section 1: Classification */}
          <div className="bg-[var(--background)] p-3 border border-[var(--border)]">
            <h4 className="font-bold text-zinc-600 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-600" />
              AI Inference Results
            </h4>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">Classification</span>
                <span className={`font-bold text-sm uppercase ${isIndustrial ? 'text-[#ff4500]' : 'text-[#0088cc]'}`}>
                  {isIndustrial ? 'Industrial Source' : 'Other Thermal'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">AI Confidence</span>
                <span className="font-bold text-sm">
                  {(detection.probability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            {detection.true_label !== null && (
              <div className="mt-2.5 pt-2 border-t border-[var(--border)] text-[10px] flex items-center justify-between">
                <span className="text-zinc-500 uppercase">OSM Verified Label:</span>
                <span className={`font-bold uppercase ${detection.true_label === 1 ? 'text-[#ff4500]' : 'text-zinc-550'}`}>
                  {detection.true_label === 1 ? 'Confirmed Industrial' : 'Confirmed Other'}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Coordinates and Sensor details */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Location block */}
            <div className="border border-[var(--border)] p-2.5 bg-[var(--background)]">
              <h4 className="font-bold text-zinc-650 uppercase text-[9px] tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-500" />
                Spatials
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[9px] uppercase">LAT</span>
                  <span className="font-mono text-zinc-800 font-bold">{detection.latitude.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[9px] uppercase">LON</span>
                  <span className="font-mono text-zinc-800 font-bold">{detection.longitude.toFixed(5)}</span>
                </div>
              </div>
            </div>

            {/* Thermal block */}
            <div className="border border-[var(--border)] p-2.5 bg-[var(--background)]">
              <h4 className="font-bold text-zinc-650 uppercase text-[9px] tracking-wider mb-1.5 flex items-center gap-1">
                <Flame className="w-3 h-3 text-zinc-500" />
                Radiometrics
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[9px] uppercase">FRP</span>
                  <span className="text-[#ff4500] font-bold">{detection.frp.toFixed(2)} MW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-[9px] uppercase">TI4 / TI5</span>
                  <span className="text-zinc-800">{Math.round(detection.bright_ti4)}K / {Math.round(detection.bright_ti5)}K</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Temporal, Land Cover, OSM Context */}
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            
            {/* Temporal Persistence */}
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Persistence Score
              </span>
              <span className="font-bold text-zinc-800 bg-[var(--surface-header)] border border-[var(--border)] px-2 py-0.5 text-xs">
                {detection.persistence_count} detections
              </span>
            </div>

            {/* Land Cover Class */}
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <TreePine className="w-3.5 h-3.5 text-zinc-500" />
                ESA Land Cover
              </span>
              <span className="font-bold text-zinc-800 text-right">
                {detection.land_cover_name} <span className="text-zinc-500 text-[10px] font-normal font-mono">({detection.land_cover_class})</span>
              </span>
            </div>

            {/* OSM Context */}
            <div className="flex justify-between items-start py-1">
              <span className="text-zinc-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5 mt-0.5">
                <Factory className="w-3.5 h-3.5 text-zinc-500" />
                OSM Context
              </span>
              <div className="text-right max-w-[65%]">
                {osmLoading ? (
                  <span className="text-zinc-500 text-[10px] animate-pulse">QUERYING OVERPASS API...</span>
                ) : osmError ? (
                  <span className="text-zinc-500 text-[10px] italic">{osmError}</span>
                ) : detection.osm_industrial_nearby === 1 ? (
                  <div>
                    <span className="font-bold text-[var(--warning)] block text-xs truncate">
                      {detection.osm_type || 'Industrial Area'}
                    </span>
                    <span className="text-[10px] text-zinc-600 block font-mono">
                      Distance: {detection.osm_distance_km?.toFixed(2)} km
                    </span>
                  </div>
                ) : detection.osm_industrial_nearby === 0 ? (
                  <span className="text-zinc-700 font-bold text-xs block">
                    No facility within 5km
                  </span>
                ) : (
                  <span className="text-zinc-500 text-[10px] italic">Not analyzed</span>
                )}
              </div>
            </div>

          </div>

          {/* Section 4: Telemetry Meta */}
          <div className="border-t border-[var(--border)] pt-3 text-[10px] text-zinc-500 grid grid-cols-2 gap-2">
            <div>
              <span className="uppercase text-[8px] text-zinc-650 block">Acquisition Date / Time</span>
              <span className="font-mono text-zinc-700 block mt-0.5">
                {detection.acq_date} @ {formatTime(detection.acq_time)}
              </span>
            </div>
            <div>
              <span className="uppercase text-[8px] text-zinc-650 block">Sensor Platform</span>
              <span className="font-mono text-zinc-700 block mt-0.5">
                {detection.instrument} ({detection.satellite}) - {detection.daynight === 'D' ? 'DAY' : 'NIGHT'}
              </span>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border)] text-[9px] text-zinc-500 leading-normal">
        * Priority thresholds are calculated based on a heuristic combining Random Forest classification outputs, Fire Radiative Power values (FRP), and 1 km grid temporal persistence scores.
      </div>
    </div>
  );
}
