"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import GuideBox from "./GuideBox/GuideBox";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from "./GuidesSection.module.css";
import Link from 'next/link';
import GuidesSectionSkeleton from './GuidesSectionSkeleton';

interface Guide {
  id: string;
  name: string;
  title: string;
  cover_image: string;
  createdAt: any;
  slug?: string;
  createdBy?: string;
  items?: Array<{
    name: string;
    price: string;
    address: string;
    photos: string[];
  }>;
}

const GuidesSection = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Preload images
  const preloadImages = async (guidesData: Guide[]) => {
    try {
      const imagePromises = guidesData
        .filter(guide => guide.cover_image)
        .map(guide => {
          return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = guide.cover_image;
          });
        });

      await Promise.all(imagePromises);
      setImagesLoaded(true);
    } catch (err) {
      console.error('Error preloading images:', err);
      setImagesLoaded(true); // Continue even if preloading fails
    }
  };

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        if (!db) throw new Error('Firebase is not initialized');

        const guidesCollectionRef = collection(db, "guides");
        const q = query(guidesCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const guidesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Guide[];
        
        setGuides(guidesData);
        preloadImages(guidesData);
        setError(null);
      } catch (error) {
        console.error('Error fetching guides:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch guides');
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  if (error) {
    return (
      <div className={styles['error-container']}>
        <p className={styles['error-message']}>{error}</p>
      </div>
    );
  }

  if (loading || !imagesLoaded) {
    return <GuidesSectionSkeleton />;
  }

  if (!guides.length) {
    return (
      <div className={styles['experiences-section']}>
        <div className={styles['experiences-section-heading']}>
          <h1 className={styles['upcoming-experiences-heading'] }>The Bombay Guide</h1>
          <Link href="/guides" className={styles['see-all-link']}>See All</Link>
        </div>
        <div className={styles['no-experiences-message']}>No guides available.</div>
      </div>
    );
  }

  return (
    <div className={styles['experiences-section']}>
      <div className={styles['experiences-section-heading']}>
        <h1 className={styles['upcoming-experiences-heading']}>The Bombay Guide</h1>
        <Link href="/guides" className={styles['see-all-link']}>See All</Link>
      </div>

      <div className={styles['embla-container']}>
        <button 
          className={`${styles['embla-button']} ${styles['embla-button-prev']} ${!prevBtnEnabled ? styles['embla-button-disabled'] : ''}`}
          onClick={scrollPrev}
          disabled={!prevBtnEnabled}
        >
          <FiChevronLeft />
        </button>

        <div className={styles.embla}>
          <div className={styles.embla__viewport} ref={emblaRef}>
            <div className={styles.embla__container}>
              {guides.map((guide) => (
                <div className={styles.embla__slide} key={guide.id}>
                  <GuideBox guide={guide} onDelete={() => {}} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          className={`${styles['embla-button']} ${styles['embla-button-next']} ${!nextBtnEnabled ? styles['embla-button-disabled'] : ''}`}
          onClick={scrollNext}
          disabled={!nextBtnEnabled}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default GuidesSection; 