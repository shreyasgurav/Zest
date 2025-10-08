import { Metadata } from 'next'
import About from './About'

export const metadata: Metadata = {
  title: 'About | Zest',
  description: 'Learn more about Zest - Your ultimate guide to discovering the best experiences in Mumbai.',
  openGraph: {
    title: 'About | Zest',
    description: 'Learn more about Zest - Your ultimate guide to discovering the best experiences in Mumbai.',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <main className="about-page">
      <About />
    </main>
  )
} 