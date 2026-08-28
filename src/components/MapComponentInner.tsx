'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import indiaBoundary from '../data/india_boundary.json';

interface Detection {
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
  temperature?: number;
  humidity?: number;
  rainProbability?: number;
  vegetationType?: string;
  fireRiskScore?: number;
  fireRiskRating?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  settlementName?: string;
  settlementDistanceKm?: number;
  settlementType?: string;
}

interface MapProps {
  detections: Detection[];
  selectedDetection: Detection | null;
  onSelectDetection: (d: Detection) => void;
  filterType: 'all' | 'industrial' | 'other';
  minFRP: number;
}

export default function MapComponentInner({
  detections,
  selectedDetection,
  onSelectDetection,
  filterType,
  minFRP,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dark brutalist styled map: CartoDB Dark Matter (free, zero gradients)
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 79.0], // Centered on central India
      zoom: 5,
      minZoom: 4,
      maxZoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add official India boundary overlay to highlight J&K as an integral part of India
    L.geoJSON(indiaBoundary as any, {
      style: {
        color: '#18181b', // Solid dark zinc outline
        weight: 2.5,
        fillColor: 'transparent',
        opacity: 0.85
      }
    }).addTo(map);

    const markersLayer = L.featureGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when filters or data change
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    // Filter detections
    const filtered = detections.filter((d) => {
      // 1. Prediction Type Filter
      if (filterType === 'industrial' && d.prediction !== 1) return false;
      if (filterType === 'other' && d.prediction !== 0) return false;

      // 2. Min FRP
      if (d.frp < minFRP) return false;

      return true;
    });

    // Plot markers
    filtered.forEach((d) => {
      const isIndustrial = d.prediction === 1;
      
      // Heuristic Priority Check
      const isHighPriority = isIndustrial && d.frp >= 15.0 && d.persistence_count >= 10;
      
      const radius = Math.min(14, Math.max(5, 5 + d.frp / 25));
      const color = isIndustrial ? '#ff4500' : '#0088cc';
      
      // Main marker
      const marker = L.circleMarker([d.latitude, d.longitude], {
        radius: radius,
        fillColor: color,
        color: isHighPriority ? '#ffbf00' : '#1a1b20', // Dark border on normal markers for light map
        weight: isHighPriority ? 2.5 : 1,
        opacity: 1,
        fillOpacity: isIndustrial ? 0.85 : 0.65,
      });

      // Bind click handler
      marker.on('click', () => {
        onSelectDetection(d);
      });

      // Bind basic tooltip on hover
      marker.bindTooltip(
        `<div class="font-mono text-xs p-1 bg-white border border-zinc-950 text-black">
          <strong>${isIndustrial ? 'INDUSTRIAL' : 'OTHER'}</strong><br/>
          FRP: ${d.frp.toFixed(1)}<br/>
          Persist: ${d.persistence_count}<br/>
          LC: ${d.land_cover_name}
        </div>`,
        { direction: 'top', opacity: 0.95, offset: [0, -5], className: 'brutalist-tooltip' }
      );

      marker.addTo(markersLayer);

      // If high priority, draw an outer tracking ring
      if (isHighPriority) {
        const trackingRing = L.circleMarker([d.latitude, d.longitude], {
          radius: radius + 6,
          fillColor: 'transparent',
          color: '#ffbf00',
          weight: 1,
          dashArray: '4, 4',
          opacity: 0.8,
        });
        trackingRing.addTo(markersLayer);
      }
    });

  }, [detections, filterType, minFRP, onSelectDetection]);

  // Center map on selected detection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDetection) return;

    map.setView([selectedDetection.latitude, selectedDetection.longitude], 10, {
      animate: true,
      duration: 1.0,
    });
  }, [selectedDetection]);

  return (
    <div className="relative w-full h-full brutalist-border" style={{ minHeight: '400px' }}>
      <div ref={mapContainerRef} className="w-full h-full" style={{ height: '100%', width: '100%' }} />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 brutalist-border p-3 font-telemetry text-xs select-none text-zinc-800">
        <h4 className="font-bold text-zinc-600 mb-2 border-b border-zinc-200 pb-1 text-[10px] uppercase tracking-wider">Telemetry Legend</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-zinc-950 bg-[#ff4500] inline-block"></span>
            <span>Industrial Thermal Source</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-zinc-950 bg-[#0088cc] inline-block"></span>
            <span>Other Thermal Anomaly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border border-[#ffbf00] border-dashed flex items-center justify-center inline-block">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff4500] inline-block"></span>
            </span>
            <span className="text-[var(--warning)] font-bold">High Priority Threat</span>
          </div>
          <div className="pt-1.5 border-t border-zinc-200 text-[10px] text-zinc-500">
            * Marker size scales with FRP (Fire Radiative Power)
          </div>
        </div>
      </div>
    </div>
  );
}
