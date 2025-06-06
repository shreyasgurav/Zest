'use client';

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaDollarSign, FaExternalLinkAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import styles from './GuideProfile.module.css';
import { getFirebaseDb } from "@/lib/firebase";

interface GuideItem {
  name: string;
  price: string;
  contactInfo: string;
  website: string;
  address: string;
  addressLink: string;
  pricingUrl: string;
  photos: string[];
}

interface Guide {
  id: string;
  name: string;
  slug: string;
  items: GuideItem[];
}

// This function will be used to generate static paths at build time
export async function generateStaticParams() {
  try {
    const db = getFirebaseDb();
    const guidesSnapshot = await getDocs(collection(db, "guides"));
    const guides: Guide[] = [];

    guidesSnapshot.forEach((doc) => {
      const guideData = doc.data() as Guide;
      guides.push({
        ...guideData,
        id: doc.id,
      });
    });

    // Generate all possible combinations of slug and index
    const paths = guides.flatMap((guide) => 
      guide.items.map((_, index) => ({
        slug: guide.slug,
        index: index.toString(),
      }))
    );

    return paths;
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

const GuideProfileSkeleton = () => {
  return (
    <div className={styles['guide-profile-container']}>
      <div className={styles['guide-content']}>
        <div className={`${styles['guide-profile-image']} ${styles['skeleton-loading']}`}>
          <div className={styles['skeleton-background']}></div>
        </div>
        
        <div className={`${styles['guide-info-box']} ${styles['skeleton-loading']}`}>
          <div className={styles['guide-info']}>
            <div className={`${styles['skeleton-line']} ${styles['skeleton-title']}`}></div>
            
            <div className={styles['guide-detail']}>
              <FaDollarSign />
              <div className={`${styles['skeleton-line']} ${styles['skeleton-price']}`}></div>
            </div>
            
            <div className={styles['guide-detail']}>
              <FaMapMarkerAlt />
              <div className={`${styles['skeleton-line']} ${styles['skeleton-address']}`}></div>
            </div>

            <div className={styles['guide-detail']}>
              <FaPhone />
              <div className={`${styles['skeleton-line']} ${styles['skeleton-contact']}`}></div>
            </div>

            <div className={styles['guide-detail']}>
              <FaGlobe />
              <div className={`${styles['skeleton-line']} ${styles['skeleton-website']}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GuideProfile = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const itemIndex = parseInt(params?.index as string);
  
  const [guideItem, setGuideItem] = useState<GuideItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Touch/swipe handling refs
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const fetchGuideItem = async () => {
      try {
        if (!db) {
          throw new Error("Firebase is not initialized. Please try again later.");
        }

        let guideData;
        
        if (slug) {
          // Get the guide by slug
          const guidesRef = collection(db, "guides");
          const q = query(guidesRef, where("slug", "==", slug));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            guideData = doc.data();
          }
        }
        
        if (guideData && guideData.items && guideData.items[itemIndex]) {
          setGuideItem(guideData.items[itemIndex]);
        } else {
          setError("Guide item not found");
        }
      } catch (err) {
        console.error("Error fetching guide item:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchGuideItem();
  }, [slug, itemIndex]);

  const nextImage = () => {
    if (guideItem && guideItem.photos) {
      setCurrentImageIndex((prev) => (prev + 1) % guideItem.photos.length);
    }
  };

  const prevImage = () => {
    if (guideItem && guideItem.photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? guideItem.photos.length - 1 : prev - 1
      );
    }
  };

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50; // Minimum distance for a swipe

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        nextImage(); // Swipe left
      } else {
        prevImage(); // Swipe right
      }
    }
    
    isDragging.current = false;
  };

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!guideItem) return;
    
    try {
      await navigator.clipboard.writeText(guideItem.contactInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading... - Zest</title>
        </Helmet>
        <GuideProfileSkeleton />
      </>
    );
  }

  if (error || !guideItem) {
    return (
      <>
        <Helmet>
          <title>Item Not Found - Zest</title>
          <meta name="description" content="The requested item could not be found." />
        </Helmet>
        <div className={styles['guide-profile-container']} style={{ textAlign: 'center', color: 'white', padding: '30px' }}>
          <h2>Error</h2>
          <p>{error || "Guide item not found"}</p>
        </div>
      </>
    );
  }

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": guideItem.name,
    "address": guideItem.address,
    "telephone": guideItem.contactInfo,
    "url": guideItem.website,
  };

  return (
    <>
      <Helmet>
        <title>{guideItem.name} - Zest</title>
        <meta name="description" content={`Visit ${guideItem.name} in Mumbai. ${guideItem.address}`} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className={styles['guide-profile-container']}>
        <div className={styles['guide-content']}>
          {/* Image Carousel */}
          <div 
            className={styles['guide-profile-image']}
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {guideItem.photos && guideItem.photos.length > 0 ? (
              <>
                <img 
                  src={guideItem.photos[currentImageIndex]} 
                  alt={guideItem.name}
                  className={styles['guide-image']}
                />
                {guideItem.photos.length > 1 && (
                  <>
                    <button 
                      className={`${styles['carousel-button']} ${styles['prev-button']}`}
                      onClick={prevImage}
                    >
                      <FiChevronLeft />
                    </button>
                    <button 
                      className={`${styles['carousel-button']} ${styles['next-button']}`}
                      onClick={nextImage}
                    >
                      <FiChevronRight />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className={styles['no-image']}>
                <span>No image available</span>
              </div>
            )}
          </div>

          {/* Guide Info Box */}
          <div className={styles['guide-info-box']}>
            <div className={styles['guide-info']}>
              <h1 className={styles['guide-name']}>{guideItem.name}</h1>
              
              {guideItem.price && (
                <div className={styles['guide-detail']}>
                  <FaDollarSign />
                  <span>{guideItem.price}</span>
                </div>
              )}
              
              {guideItem.address && (
                <div className={styles['guide-detail']}>
                  <FaMapMarkerAlt />
                  <a 
                    href={guideItem.addressLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles['address-link']}
                  >
                    {guideItem.address}
                  </a>
                </div>
              )}

              {guideItem.contactInfo && (
                <div className={styles['guide-detail']}>
                  <FaPhone />
                  <button 
                    onClick={handleCopyPhone}
                    className={styles['copy-button']}
                  >
                    {guideItem.contactInfo}
                    {copied ? <FaCheck className={styles['copy-icon']} /> : <FaCopy className={styles['copy-icon']} />}
                  </button>
                </div>
              )}

              {guideItem.website && (
                <div className={styles['guide-detail']}>
                  <FaGlobe />
                  <a 
                    href={guideItem.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles['website-link']}
                  >
                    Visit Website
                    <FaExternalLinkAlt className={styles['external-link-icon']} />
                  </a>
                </div>
              )}

              {guideItem.pricingUrl && (
                <div className={styles['guide-detail']}>
                  <a 
                    href={guideItem.pricingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles['pricing-link']}
                  >
                    View Pricing
                    <FaExternalLinkAlt className={styles['external-link-icon']} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuideProfile; 