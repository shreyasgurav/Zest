'use client'

import { useState, useEffect } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import GuideBox from '@/components/GuidesSection/GuideBox/GuideBox'
import { getAllGuides, Guide } from '@/lib/guides'
import styles from './AllGuides.module.css'

interface AllGuidesProps {
  initialGuides: Guide[]
  error?: string | null
}

export default function AllGuides({ initialGuides, error: initialError }: AllGuidesProps) {
  const [guides, setGuides] = useState(initialGuides)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        setLoading(true);
        const fetchedGuides = await getAllGuides();
        if (fetchedGuides.length > 0) {
          setGuides(fetchedGuides);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching guides:', err);
        setError('Failed to load guides. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't have guides from server-side
    if (initialGuides.length === 0 && !initialError) {
      fetchGuides();
    }
  }, [initialGuides.length, initialError]);

  const filteredGuides = guides.filter(guide =>
    guide.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  if (error) {
    return (
      <div className={styles.allGuidesPage}>
        <div className={styles.allGuidesContainer}>
          <div className={styles.allGuidesContent}>
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.allGuidesPage}>
        <div className={styles.allGuidesContainer}>
          <div className={styles.allGuidesContent}>
            <div className={styles.loadingMessage}>
              <p>Loading guides...</p>
            </div>
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