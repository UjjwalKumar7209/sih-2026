/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  RefreshCw, 
  Filter,
  Download
} from 'lucide-react';

import MapComponent from '@/components/MapComponent';
import DetailPanel from '@/components/DetailPanel';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { getEcoData } from '@/utils/ecoData';

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
  // Weather and ecological parameters
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

export default function Dashboard() {
  // Telemetry state
  const [mode, setMode] = useState<'LIVE' | 'DEMO'>('DEMO');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveSimulated, setIsLiveSimulated] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Selected detection for detailed analysis
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  
  // Interactive Filters
  const [filterType, setFilterType] = useState<'all' | 'industrial' | 'other'>('all');
  const [minFRP, setMinFRP] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications state
  const [notifiedDetections, setNotifiedDetections] = useState<string[]>([]);

  const handleNotifyIndustry = (d: Detection) => {
    const locKey = `${d.latitude.toFixed(4)},${d.longitude.toFixed(4)}`;
    const confirmNotify = window.confirm(
      `ALERT DISPATCH REQUEST:\n\n` +
      `System classifies this location as a high-hazard industrial thermal anomaly.\n` +
      `FRP: ${d.frp.toFixed(1)} MW\n` +
      `Coordinates: ${locKey}\n` +
      `Landcover: ${d.land_cover_name}\n\n` +
      `Do you want to dispatch a critical fire danger warning notification to the facility?`
    );

    if (confirmNotify) {
      setNotifiedDetections((prev) => [...prev, locKey]);
      alert(
        `ALERT SENT SUCCESSFULLY!\n\n` +
        `Warning message sent to facility near ${locKey}:\n` +
        `"URGENT: Automated geospatial thermal monitors detected high-hazard emissions (${d.frp.toFixed(1)} MW) at your location. High risk of containment fire. Verify equipment and activate cooling systems immediately."`
      );
    }
  };

  // Register Service Worker and PWA Install Prompt handlers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.error('ServiceWorker registration failed:', err));
      }

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      const handleAppInstalled = () => {
        setDeferredPrompt(null);
        console.log('App was successfully installed');
      };
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  // Handle programmatic install or instruction fallback
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User prompt choice: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert(
        "PWA INSTALLATION GUIDE:\n\n" +
        "• Desktop (Chrome/Edge/Brave): Click the Install icon inside the address bar (right side of search bar).\n" +
        "• Mobile Android: Tap Chrome's menu (three dots) -> select 'Install app' or 'Add to Home screen'.\n" +
        "• Mobile Safari (iOS): Tap the Share button (bottom toolbar) -> scroll down and choose 'Add to Home Screen'."
      );
    }
  };

  // Fetch Telemetry Data
  const fetchTelemetry = async (targetMode: 'LIVE' | 'DEMO') => {
    setLoading(true);
    try {
      const endpoint = targetMode === 'LIVE' ? '/api/firms' : '/api/detections?limit=1500';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      const augmentDetections = (dList: any[]): Detection[] => {
        return dList.map((d) => {
          const eco = getEcoData(
            d.latitude,
            d.longitude,
            d.daynight,
            d.land_cover_class,
            d.land_cover_name,
            d.frp
          );
          return { ...d, ...eco };
        });
      };

      let fetchedDetections: Detection[] = [];
      
      if (targetMode === 'LIVE') {
        setMode(data.mode);
        setIsLiveSimulated(!!data.isSimulated);
        fetchedDetections = data.detections || [];
        
        // For live data, run dynamic inference via server route if they don't have predictions pre-filled
        const runLiveInference = async (dList: Detection[]) => {
          const promises = dList.map(async (d) => {
            if (d.prediction !== undefined) return d;
            try {
              const infRes = await fetch('/api/predict', {
                method: 'POST',
                body: JSON.stringify({
                  bright_ti4: d.bright_ti4,
                  bright_ti5: d.bright_ti5,
                  frp: d.frp,
                  confidence: d.confidence,
                  scan: d.scan,
                  track: d.track,
                  persistence_count: d.persistence_count,
                  land_cover_class: d.land_cover_class
                })
              });
              if (!infRes.ok) return { ...d, prediction: 0, probability: 0.1 };
              const infData = await infRes.json();
              return {
                ...d,
                prediction: infData.label,
                probability: infData.probability
              };
            } catch {
              return { ...d, prediction: 0, probability: 0.1 };
            }
          });
          return Promise.all(promises);
        };
        
        // Run live classifications
        const processed = await runLiveInference(fetchedDetections);
        setDetections(augmentDetections(processed));
      } else {
        setMode('DEMO');
        setIsLiveSimulated(false);
        fetchedDetections = data || [];
        setDetections(augmentDetections(fetchedDetections));
      }

      // Reset selection when loading new dataset
      setSelectedDetection(null);

    } catch (err: any) {
      console.error('Telemetry fetch error:', err);
      // Fallback silently to Demo mode
      setMode('DEMO');
      setIsLiveSimulated(false);
      try {
        const fallbackRes = await fetch('/api/detections?limit=1500');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          
          const augmentDetections = (dList: any[]): Detection[] => {
            return dList.map((d) => {
              const eco = getEcoData(
                d.latitude,
                d.longitude,
                d.daynight,
                d.land_cover_class,
                d.land_cover_name,
                d.frp
              );
              return { ...d, ...eco };
            });
          };

          setDetections(augmentDetections(fallbackData));
        }
      } catch (fallbackErr) {
        console.error('Failed to load fallback detections:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run initial load (Live Mode first, will fallback to DEMO if key fails or returns empty)
    const timer = setTimeout(() => {
      fetchTelemetry('LIVE');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Update a detection's OSM fields (called from DetailPanel after Overpass fetch completes)
  const handleUpdateDetectionOSM = (updated: Detection) => {
    setDetections((prev) =>
      prev.map((d) => {
        const matchesLat = Math.abs(d.latitude - updated.latitude) < 0.00001;
        const matchesLon = Math.abs(d.longitude - updated.longitude) < 0.00001;
        return matchesLat && matchesLon ? updated : d;
      })
    );
    setSelectedDetection(updated);
  };

  // Heuristic Priority Check helper for lists/counts
  const getDetectionPriority = (d: Detection) => {
    const isIndustrial = d.prediction === 1;
    if (isIndustrial && d.frp >= 15.0 && d.persistence_count >= 10) return 'HIGH';
    if (isIndustrial || d.persistence_count >= 5) return 'MEDIUM';
    return 'LOW';
  };

  // Filter logic for displays
  const filteredDetections = detections.filter((d) => {
    // 1. Prediction Type
    if (filterType === 'industrial' && d.prediction !== 1) return false;
    if (filterType === 'other' && d.prediction !== 0) return false;

    // 2. Minimum FRP
    if (d.frp < minFRP) return false;

    // 3. Coordinates search query (lat,lon)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const coords = `${d.latitude.toFixed(4)},${d.longitude.toFixed(4)}`;
      const landcover = d.land_cover_name?.toLowerCase() || '';
      const osmType = d.osm_type?.toLowerCase() || '';
      if (!coords.includes(q) && !landcover.includes(q) && !osmType.includes(q)) return false;
    }

    return true;
  });

  // Calculate Metrics from Visible Detections
  const activeCount = filteredDetections.length;
  const industrialCount = filteredDetections.filter((d) => d.prediction === 1).length;
  const persistentCount = filteredDetections.filter((d) => d.persistence_count >= 10).length;
  const highPriorityCount = filteredDetections.filter(
    (d) => getDetectionPriority(d) === 'HIGH'
  ).length;

  // In-app Alert Feed: Find up to 5 High-Priority or Medium-Priority alerts
  const highPriorityAlerts = filteredDetections
    .filter((d) => {
      const pri = getDetectionPriority(d);
      return pri === 'HIGH' || pri === 'MEDIUM';
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between select-none">
       {/* Header section (Brutalist Style, solid background, strong bottom border) */}
      <header className="brutalist-header p-2 sm:p-4 font-telemetry select-none flex flex-row items-center justify-between gap-1.5 sm:gap-4">
        {/* Left Side: Clean Monospace Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#e04300] w-2 h-4 sm:w-3 sm:h-6 border border-black"></div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold tracking-wider sm:tracking-widest text-zinc-950 uppercase font-mono">
              INDUSTRIAL FIRE AI
            </div>
            <div className="hidden md:block text-[9px] text-zinc-550 uppercase tracking-wider font-bold">
              Satellite Thermal Telemetry & Diagnostics
            </div>
          </div>
        </div>

        {/* Right Side: Integrated Status Panel */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Download App Button */}
          <button 
            onClick={handleInstallPWA}
            className="brutalist-button py-1 px-1.5 sm:px-2.5 flex items-center gap-1 text-[9px] font-bold text-black border border-black hover:bg-black hover:text-white font-mono transition-colors shrink-0"
            title="Install this application locally"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Download App</span>
          </button>

          <Link 
            href="/about"
            className="brutalist-button py-1 px-1.5 sm:px-2.5 flex items-center gap-1 text-[9px] font-bold text-black border border-black hover:bg-black hover:text-white font-mono transition-colors shrink-0"
          >
            About
          </Link>

          {/* Status Dot */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-[var(--surface)] border border-[var(--border)] p-1 px-1.5 sm:px-2.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
              mode === 'LIVE' 
                ? (isLiveSimulated ? 'bg-[#b56b00]' : 'bg-[#008f47] animate-pulse') 
                : 'bg-[#b56b00]'
            }`}></span>
            <span className="text-[9px] font-extrabold text-zinc-700 tracking-wider">
              <span className="hidden sm:inline">{mode}{isLiveSimulated ? ' (SIM)' : ''} FEED</span>
              <span className="inline sm:hidden">{mode}{isLiveSimulated ? ' (SIM)' : ''}</span>
            </span>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="flex border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[9px] font-bold shrink-0">
            <button 
              onClick={() => fetchTelemetry('LIVE')}
              className={`px-1.5 sm:px-2.5 py-0.5 uppercase transition-all ${
                mode === 'LIVE' ? 'bg-black text-white' : 'text-zinc-655 hover:text-black'
              }`}
              disabled={loading}
            >
              Live
            </button>
            <button 
              onClick={() => fetchTelemetry('DEMO')}
              className={`px-1.5 sm:px-2.5 py-0.5 uppercase transition-all ${
                mode === 'DEMO' ? 'bg-black text-white' : 'text-zinc-655 hover:text-black'
              }`}
              disabled={loading}
            >
              Demo
            </button>
          </div>

          {/* Clean Refresh Icon */}
          <button 
            onClick={() => fetchTelemetry(mode)}
            className="brutalist-button py-1 px-1.5 sm:px-2.5 flex items-center justify-center text-zinc-700 hover:text-black shrink-0"
            title="Reload telemetry data feed"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 p-4 space-y-4 max-w-[1600px] mx-auto w-full">
        {isLiveSimulated && (
          <div className="border border-[var(--border)] bg-[#fffbeb] text-[#854d0e] p-3 text-xs font-mono flex items-center justify-between gap-3 brutalist-card">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#b56b00] rounded-full inline-block animate-ping"></span>
              <span>
                <strong>NASA API KEY OFFLINE:</strong> Running in <strong>Live Simulation Mode</strong> (using preprocessed active coordinates). To stream live NASA MODAPS/VIIRS satellite signals, configure a valid <code>FIRMS_MAP_KEY</code>.
              </span>
            </div>
            <button 
              onClick={() => setIsLiveSimulated(false)}
              className="text-[10px] font-bold uppercase underline hover:text-[#b56b00] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Panel */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 font-telemetry">
          <div className="brutalist-card p-3 border border-[var(--border)]">
            <span className="text-[9px] text-zinc-550 uppercase block tracking-wider">Active Anomalies</span>
            <span className="text-xl font-bold text-[var(--foreground)] font-telemetry">{loading ? '...' : activeCount}</span>
          </div>
          <div className="brutalist-card p-3 border border-[var(--border)]">
            <span className="text-[9px] text-[#e04300] uppercase block tracking-wider">Industrial Candidates</span>
            <span className="text-xl font-bold text-[#e04300] font-telemetry">{loading ? '...' : industrialCount}</span>
          </div>
          <div className="brutalist-card p-3 border border-[var(--border)]">
            <span className="text-[9px] text-zinc-550 uppercase block tracking-wider">Persistent Sources</span>
            <span className="text-xl font-bold text-zinc-700 font-telemetry">{loading ? '...' : persistentCount}</span>
          </div>
          <div className="brutalist-card p-3 border border-[var(--border)] border-[#b56b00]/70">
            <span className="text-[9px] text-[#b56b00] uppercase block tracking-wider">High Threat Priority</span>
            <span className="text-xl font-bold text-[#b56b00] font-telemetry">{loading ? '...' : highPriorityCount}</span>
          </div>
          <div className="brutalist-card p-3 border border-[var(--border)] col-span-2 md:col-span-1">
            <span className="text-[9px] text-zinc-550 uppercase block tracking-wider">Last Feed Refresh</span>
            <span className="text-xs font-mono font-bold text-zinc-700 block mt-1 uppercase">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </section>

        {/* Filters and Inputs Toolbar */}
        <section className="bg-[var(--surface)] border border-[var(--border)] p-3 flex flex-wrap items-center justify-between gap-4 font-telemetry text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-550 uppercase text-[10px] font-bold flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters:
              </span>
              <div className="flex border border-[var(--border)] p-0.5 bg-[var(--surface-header)]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 font-bold text-[10px] uppercase transition-all ${
                    filterType === 'all' ? 'bg-[var(--border-strong)] text-[var(--surface)]' : 'text-zinc-650 hover:text-black'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('industrial')}
                  className={`px-2.5 py-1 font-bold text-[10px] uppercase transition-all ${
                    filterType === 'industrial' ? 'bg-[#e04300] text-white' : 'text-zinc-650 hover:text-[#e04300]'
                  }`}
                >
                  Industrial
                </button>
                <button
                  onClick={() => setFilterType('other')}
                  className={`px-2.5 py-1 font-bold text-[10px] uppercase transition-all ${
                    filterType === 'other' ? 'bg-[#0077b6] text-white' : 'text-zinc-650 hover:text-[#0077b6]'
                  }`}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Slider 1: FRP Slider */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-550 uppercase text-[10px] font-bold">Min FRP:</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={minFRP}
                onChange={(e) => setMinFRP(parseInt(e.target.value))}
                className="w-24 accent-[#e04300]"
              />
              <span className="font-mono text-zinc-800 bg-[var(--surface-header)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[10px]">
                {minFRP} MW
              </span>
            </div>
          </div>

          {/* Coordinate Search input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-zinc-550 uppercase text-[10px] font-bold shrink-0">Search Grid:</span>
            <input
              type="text"
              placeholder="Coordinates / Landcover / Facility"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] p-1.5 px-3 font-mono text-xs w-full sm:w-60 focus:outline-none focus:border-zinc-500 text-zinc-800 placeholder-zinc-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-zinc-650 hover:text-black font-mono text-[10px]"
              >
                [Clear]
              </button>
            )}
          </div>
        </section>

        {/* Geospatial and details view */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map display */}
          <div className="lg:col-span-2 h-[500px]">
            <MapComponent 
              detections={filteredDetections}
              selectedDetection={selectedDetection}
              onSelectDetection={(d) => setSelectedDetection(d)}
              filterType={filterType}
              minFRP={minFRP}
            />
          </div>

          {/* Details sidepanel */}
          <div className="h-[500px]">
            <DetailPanel 
              detection={selectedDetection}
              onUpdateDetectionOSM={handleUpdateDetectionOSM}
              notifiedDetections={notifiedDetections}
              onNotifyIndustry={handleNotifyIndustry}
            />
          </div>
        </section>

        {/* In-app Alerts & Alerts section */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Left panel: Real-time In-app Alerts */}
          <div className="lg:col-span-1 brutalist-card bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--warning)] border-b border-[var(--border)] pb-2 mb-3 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[var(--warning)]" />
                Threat Alerts Panel
              </h3>

              <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                {highPriorityAlerts.length > 0 ? (
                  highPriorityAlerts.map((d, index) => (
                    <div 
                      key={index} 
                      onClick={() => setSelectedDetection(d)}
                      className="border border-[#ff4500]/60 bg-[var(--background)] p-2 text-[10px] cursor-pointer hover:border-[#ff4500] transition-colors"
                    >
                      <div className="flex justify-between font-bold text-[#e04300]">
                        <span>INDUSTRIAL THREAT</span>
                        <span>FRP: {d.frp.toFixed(1)} MW</span>
                      </div>
                      <div className="text-zinc-650 mt-1">
                        LOC: <span className="font-mono text-[var(--foreground)] font-bold">{d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-550 mt-0.5">
                        <span>PERSISTENCE: {d.persistence_count}</span>
                        <span>LC: {d.land_cover_name}</span>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-zinc-200/50 flex justify-end">
                        {notifiedDetections.includes(`${d.latitude.toFixed(4)},${d.longitude.toFixed(4)}`) ? (
                          <span className="text-green-600 font-bold uppercase tracking-wider text-[8px] flex items-center gap-0.5">
                            Notified ✓
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotifyIndustry(d);
                            }}
                            className="bg-[#e04300] hover:bg-[#b83500] text-white px-2 py-0.5 font-bold font-mono text-[8px] uppercase tracking-wider transition-colors border border-zinc-950 cursor-pointer"
                          >
                            Notify Industry
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-[10px] italic">
                    NO HIGH PRIORITY THREATS REGISTERED
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 text-[9px] text-zinc-500 leading-tight uppercase tracking-wider border-t border-[var(--border)] mt-3 text-center">
              Alerts trigger when target model estimates 1 (Industrial) with high FRP & persistence.
            </div>
          </div>

          {/* Right panel: SVG Charts Analytics */}
          <div className="lg:col-span-3 h-full">
            <AnalyticsPanel detections={filteredDetections} />
          </div>

        </section>

        {/* Bottom table of detections */}
        <section className="brutalist-card bg-[var(--surface)] p-4 border border-[var(--border)]">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-700">
              Telemetry Registry Feed ({filteredDetections.length} matched points)
            </h3>
            <span className="text-[10px] text-zinc-550 font-mono">
              CLICK ANY ROW TO DIAGNOSE
            </span>
          </div>

          <div className="overflow-x-auto max-h-[300px]">
            <table className="brutalist-table">
              <thead>
                <tr>
                  <th>Coordinates</th>
                  <th>FRP</th>
                  <th>Land Cover / Vegetation</th>
                  <th>Weather (T / H / R)</th>
                  <th>Inference</th>
                  <th>Fire Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetections.slice(0, 100).map((d, index) => {
                  const isInd = d.prediction === 1;
                  const isSel = selectedDetection && 
                    Math.abs(selectedDetection.latitude - d.latitude) < 0.00001 &&
                    Math.abs(selectedDetection.longitude - d.longitude) < 0.00001;

                  return (
                    <tr 
                      key={index} 
                      onClick={() => setSelectedDetection(d)}
                      className={`cursor-pointer ${isSel ? 'bg-[var(--surface-header)] font-bold' : ''}`}
                    >
                      <td className="font-mono text-zinc-800 text-xs">
                        {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                      </td>
                      <td className="text-zinc-850 font-mono font-bold text-xs">
                        {d.frp.toFixed(2)} MW
                      </td>
                      <td className="text-zinc-650 text-xs truncate max-w-[160px]">
                        <div className="font-bold text-zinc-800">{d.land_cover_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{d.vegetationType || 'Unknown'}</div>
                      </td>
                      <td className="font-mono text-zinc-850 text-xs">
                        <div>{d.temperature?.toFixed(1)}°C / {d.humidity}%</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">Rain: {d.rainProbability}%</div>
                      </td>
                      <td className="text-xs">
                        <span className={`font-bold uppercase ${isInd ? 'text-[#e04300]' : 'text-[#0077b6]'}`}>
                          {isInd ? 'Industrial' : 'Other'}
                        </span>
                        <span className="text-zinc-500 font-mono text-[9px] ml-1">
                          ({(d.probability * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="text-xs font-bold">
                        <span className={`px-1.5 py-0.5 font-mono border text-[9px] ${
                          d.fireRiskRating === 'EXTREME' ? 'bg-red-50 text-red-700 border-red-400' :
                          d.fireRiskRating === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-400' :
                          d.fireRiskRating === 'MODERATE' ? 'bg-amber-50 text-amber-700 border-amber-400' :
                          'bg-zinc-50 text-zinc-600 border-zinc-300'
                        }`}>
                          {d.fireRiskRating} ({d.fireRiskScore})
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredDetections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-zinc-550 text-xs font-mono py-12 italic">
                      NO RECORDS MATCHING TARGET CONTEXT FILTERS FOUND
                    </td>
                  </tr>
                )}
                {filteredDetections.length > 100 && (
                  <tr>
                    <td colSpan={6} className="text-center text-zinc-550 text-[10px] font-mono py-2 bg-[var(--surface-header)]/35 uppercase tracking-widest">
                      * Truncated feed to first 100 entries for browser render performance (Use sliders to filter coordinates)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Footer system status */}
      <footer className="bg-[var(--surface-header)] border-t border-[var(--border)] p-3 text-[10px] text-zinc-600 text-center font-telemetry uppercase tracking-wider mt-6">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            SIH Industrial Fire AI Prototype v1.0.0 &copy; {new Date().getFullYear()}
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 bg-[#008f47] rounded-full inline-block animate-pulse"></span>
            Operational Diagnostics: ACTIVE | CPU Node Engine: ONLINE
          </span>
        </div>
      </footer>

    </div>
  );
}
