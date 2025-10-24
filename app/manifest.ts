import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 's2',
    short_name: 's2',
    description: 'a successor to fuze by reimagining video sharing',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c2037',
    theme_color: '#0c2037',
    icons: [
      {
        src: '/logo.jpeg',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.jpeg',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}