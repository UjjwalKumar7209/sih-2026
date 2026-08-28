import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Industrial Fire AI',
    short_name: 'Fire AI',
    description: 'Satellite-based industrial thermal source detection and hazard monitoring platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f5f7',
    theme_color: '#1a1b20',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
