'use client';

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
}

interface AnalyticsPanelProps {
  detections: Detection[];
}

export default function AnalyticsPanel({ detections }: AnalyticsPanelProps) {
  // If no data, render empty state
  if (detections.length === 0) {
    return (
      <div className="brutalist-card h-full flex items-center justify-center font-mono text-zinc-500 text-xs min-h-[300px]">
        NO DATA TO PROCESS STATISTICAL TELEMETRY
      </div>
    );
  }

  // 1. Classification Counts
  const industrialCount = detections.filter((d) => d.prediction === 1).length;
  const otherCount = detections.filter((d) => d.prediction === 0).length;
  const totalCount = detections.length;
  const indPercent = Math.round((industrialCount / totalCount) * 100) || 0;
  const othPercent = 100 - indPercent;

  // 2. FRP Histogram Groups (0-10, 10-25, 25-50, 50-100, 100+)
  const frpGroups = [
    { label: '0-10', count: 0 },
    { label: '10-25', count: 0 },
    { label: '25-50', count: 0 },
    { label: '50-100', count: 0 },
    { label: '100+', count: 0 },
  ];
  detections.forEach((d) => {
    if (d.frp < 10) frpGroups[0].count++;
    else if (d.frp < 25) frpGroups[1].count++;
    else if (d.frp < 50) frpGroups[2].count++;
    else if (d.frp < 100) frpGroups[3].count++;
    else frpGroups[4].count++;
  });
  const maxFrpCount = Math.max(...frpGroups.map((g) => g.count), 1);

  // 3. Persistence Groups (1, 2-5, 6-15, 16-40, 40+)
  const persistGroups = [
    { label: '1', count: 0 },
    { label: '2-5', count: 0 },
    { label: '6-15', count: 0 },
    { label: '16-40', count: 0 },
    { label: '40+', count: 0 },
  ];
  detections.forEach((d) => {
    const p = d.persistence_count;
    if (p <= 1) persistGroups[0].count++;
    else if (p <= 5) persistGroups[1].count++;
    else if (p <= 15) persistGroups[2].count++;
    else if (p <= 40) persistGroups[3].count++;
    else persistGroups[4].count++;
  });
  const maxPersistCount = Math.max(...persistGroups.map((g) => g.count), 1);

  // 4. Land Cover stats (for industrial points only)
  const lcCounts: Record<string, number> = {};
  detections.filter(d => d.prediction === 1).forEach((d) => {
    const name = d.land_cover_name || 'Unknown';
    lcCounts[name] = (lcCounts[name] || 0) + 1;
  });
  
  const topLcs = Object.entries(lcCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const maxLcCount = Math.max(...topLcs.map((l) => l.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-telemetry">
      
      {/* Block 1: AI Classification Ratio */}
      <div className="brutalist-card p-4 border border-[var(--border)] flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-[10px] text-zinc-650 uppercase tracking-wider mb-2">Classification Distribution</h4>
          <span className="text-2xl font-bold font-telemetry tracking-tight text-zinc-900">{totalCount}</span>
          <span className="text-[10px] text-zinc-500 uppercase ml-2">Total Points</span>
        </div>
        
        {/* Horizontal split bar */}
        <div className="my-4">
          <div className="flex justify-between text-[10px] mb-1 font-mono">
            <span className="text-[#e04300] font-bold">IND ({indPercent}%)</span>
            <span className="text-[#0077b6] font-bold">OTH ({othPercent}%)</span>
          </div>
          <div className="w-full h-5 border border-[var(--border)] flex bg-zinc-100 overflow-hidden">
            {indPercent > 0 && (
              <div 
                className="h-full bg-[#e04300] border-r border-[#000]" 
                style={{ width: `${indPercent}%` }} 
              />
            )}
            {othPercent > 0 && (
              <div 
                className="h-full bg-[#0077b6]" 
                style={{ width: `${othPercent}%` }} 
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[var(--border)] pt-3 text-zinc-600">
          <div>
            <span className="text-zinc-500 block uppercase text-[8px]">Industrial Sources</span>
            <span className="font-bold text-zinc-800">{industrialCount} points</span>
          </div>
          <div>
            <span className="text-zinc-500 block uppercase text-[8px]">Other Anomalies</span>
            <span className="font-bold text-zinc-800">{otherCount} points</span>
          </div>
        </div>
      </div>

      {/* Block 2: FRP Distribution Chart */}
      <div className="brutalist-card p-4 border border-[var(--border)] flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-[10px] text-zinc-650 uppercase tracking-wider mb-3">FRP Profile (MW)</h4>
        </div>
        
        {/* Custom SVG Bar Chart */}
        <div className="h-28 w-full flex items-end justify-between px-1 mb-2">
          {frpGroups.map((group, idx) => {
            const barHeight = (group.count / maxFrpCount) * 100;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group relative">
                {/* Tooltip on hover */}
                <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-white border border-zinc-950 text-black font-mono text-[9px] px-1 py-0.5 z-10 transition-opacity pointer-events-none">
                  {group.count} pts
                </span>
                <div className="w-8 bg-[var(--background)] border border-[var(--border)] flex items-end h-20">
                  {group.count > 0 && (
                    <div 
                      className="w-full bg-[#e04300] border-t border-white/20" 
                      style={{ height: `${barHeight}%` }} 
                    />
                  )}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono mt-1">{group.label}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--border)] pt-2 text-[9px] text-zinc-550 text-center uppercase tracking-wider">
          Total thermal output spread (MW)
        </div>
      </div>

      {/* Block 3: Persistence Counts Histogram */}
      <div className="brutalist-card p-4 border border-[var(--border)] flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-[10px] text-zinc-655 uppercase tracking-wider mb-3">Site Persistence Scale</h4>
        </div>
        
        {/* Custom SVG Bar Chart */}
        <div className="h-28 w-full flex items-end justify-between px-1 mb-2">
          {persistGroups.map((group, idx) => {
            const barHeight = (group.count / maxPersistCount) * 100;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 group relative">
                {/* Tooltip */}
                <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-white border border-zinc-950 text-black font-mono text-[9px] px-1 py-0.5 z-10 transition-opacity pointer-events-none">
                  {group.count} pts
                </span>
                <div className="w-8 bg-[var(--background)] border border-[var(--border)] flex items-end h-20">
                  {group.count > 0 && (
                    <div 
                      className="w-full bg-zinc-400 border-t border-black/10" 
                      style={{ height: `${barHeight}%` }} 
                    />
                  )}
                </div>
                <span className="text-[9px] text-zinc-500 font-mono mt-1">{group.label}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--border)] pt-2 text-[9px] text-zinc-550 text-center uppercase tracking-wider">
          Repeated grid observations count
        </div>
      </div>

      {/* Block 4: Land Cover Association (Industrial Only) */}
      <div className="brutalist-card p-4 border border-[var(--border)] flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-[10px] text-zinc-650 uppercase tracking-wider mb-3">Top Land Cover Associations</h4>
        </div>
        
        <div className="space-y-2 mb-2">
          {topLcs.length > 0 ? (
            topLcs.map((lc, idx) => {
              const widthPct = (lc.count / maxLcCount) * 100;
              return (
                <div key={idx} className="text-[10px]">
                  <div className="flex justify-between font-mono text-[9px] text-zinc-600 mb-0.5">
                    <span className="truncate max-w-[80%]">{lc.name}</span>
                    <span className="font-bold text-zinc-800">{lc.count}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 border border-[var(--border)] overflow-hidden">
                    <div 
                      className="h-full bg-[#e04300]" 
                      style={{ width: `${widthPct}%` }} 
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-[10px] text-zinc-500 italic text-center py-6">
              No industrial sources mapped
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] pt-2 text-[9px] text-zinc-550 text-center uppercase tracking-wider">
          Industrial anomalies by land class
        </div>
      </div>

    </div>
  );
}
