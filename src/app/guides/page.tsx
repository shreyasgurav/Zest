import { getAllGuides } from '@/lib/guides'
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
  // Fetch guides on the server
  const guides = await getAllGuides()
  
  return (
    <main className="guides-page">
      <AllGuides initialGuides={guides} />
    </main>
  )
} 