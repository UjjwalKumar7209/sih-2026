'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponentInner'), {
  ssr: false,
  loading: () => (
    <div 
      className="h-full w-full bg-[#12141c] brutalist-border flex flex-col items-center justify-center font-mono text-gray-500 gap-2" 
      style={{ minHeight: '400px', height: '100%' }}
    >
      <div className="animate-pulse tracking-widest font-bold">INITIALIZING GEOSPATIAL MONITORING GRID...</div>
      <div className="text-[10px] text-zinc-600">LOADING LEAFLET ENGINE & SPATIAL DATA</div>
    </div>
  ),
});

export default MapComponent;
