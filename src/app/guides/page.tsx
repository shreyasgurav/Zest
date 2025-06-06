import { Metadata } from 'next'
import AllGuides from './AllGuides'

export const metadata: Metadata = {
  title: 'All Guides | Zest',
  description: 'Explore all guides on Zest - Your ultimate resource for learning and discovery.',
  openGraph: {
    title: 'All Guides | Zest',
    description: 'Explore all guides on Zest - Your ultimate resource for learning and discovery.',
    type: 'website',
  },
}

export default function GuidesPage() {
  return (
    <main className="guides-page">
      <AllGuides />
    </main>
  )
} 