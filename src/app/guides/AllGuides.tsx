'use client'

import { useState, useEffect } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import GuideBox from '@/components/GuidesSection/GuideBox/GuideBox'
import styles from './AllGuides.module.css'
import { getAllGuides } from '@/lib/guides'

interface Guide {
  id: string
  name: string
  cover_image?: string
  slug?: string
  createdBy?: string
}

export default function AllGuides() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const fetchedGuides = await getAllGuides()
        setGuides(fetchedGuides)
      } catch (err) {
        setError('Failed to load guides. Please try again later.')
        console.error('Error fetching guides:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGuides()
  }, [])

  const filteredGuides = guides.filter(guide =>
    guide.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className={styles.allGuidesPage}>
        <div className={styles.allGuidesContainer}>
          <div className={styles.allGuidesContent}>
            <div className={styles.loading}>Loading guides...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.allGuidesPage}>
        <div className={styles.allGuidesContainer}>
          <div className={styles.allGuidesContent}>
            <div className={styles.error}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.allGuidesPage}>
      <div className={styles.allGuidesContainer}>
        <div className={styles.allGuidesContent}>
          <div className={styles.allGuidesHeader}>
            <h1 className={styles.allGuidesTitle}>The Bombay Guide</h1>
            <span className={styles.guidesCount}>
              {guides.length} {guides.length === 1 ? 'Guide' : 'Guides'}
            </span>
          </div>

          <div className={styles.allGuidesSearchContainer}>
            <div className={styles.searchInputWrapper}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.allGuidesSearch}
                placeholder="Search guides..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button className={styles.clearSearch} onClick={clearSearch}>
                  <FiX />
                </button>
              )}
            </div>
          </div>

          {filteredGuides.length === 0 ? (
            <div className={styles.noResults}>
              <p>No guides found matching your search.</p>
              {searchQuery && (
                <button className={styles.clearFiltersBtn} onClick={clearSearch}>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className={styles.guidesGrid}>
              {filteredGuides.map((guide) => (
                <div key={guide.id} className={styles.guideItem}>
                  <GuideBox guide={guide} onDelete={() => {}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 