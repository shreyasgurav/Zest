import { getAllGuides, Guide } from '@/lib/guides'
import AllGuides from './AllGuides'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Guides | Zest',
  description: 'Explore all guides on Zest - Your ultimate resource for learning and discovery.',
  openGraph: {
    title: 'All Guides | Zest',
    description: 'Explore all guides on Zest - Your ultimate resource for learning and discovery.',
    type: 'website',
  },
}

export default async function GuidesPage() {
  let guides: Guide[] = [];
  let error: string | null = null;

  try {
    // Fetch guides on the server
    guides = await getAllGuides();
  } catch (err) {
    console.error('Error fetching guides:', err);
    error = 'Failed to load guides. Please try again later.';
  }
  
  return (
    <main className="guides-page">
      <AllGuides initialGuides={guides} error={error} />
    </main>
  )
} 