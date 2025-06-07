'use client';

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaDollarSign, FaExternalLinkAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import styles from './GuideProfile.module.css';

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
    "priceRange": `₹${guideItem.price}`,
    "image": guideItem.photos && guideItem.photos.length > 0 ? guideItem.photos[0] : null
  };

  return (
    <>
      <Helmet>
        <title>{guideItem.name} - ₹{guideItem.price} | Zest Mumbai Guide</title>
        <meta name="description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}. Contact: ${guideItem.contactInfo}`} />
        <meta property="og:title" content={`${guideItem.name} - ₹${guideItem.price} | Zest Mumbai Guide`} />
        <meta property="og:description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}`} />
        <meta property="og:type" content="place" />
        {guideItem.photos && guideItem.photos[0] && <meta property="og:image" content={guideItem.photos[0]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${guideItem.name} - ₹${guideItem.price} | Zest`} />
        <meta name="twitter:description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}`} />
        {guideItem.photos && guideItem.photos[0] && <meta name="twitter:image" content={guideItem.photos[0]} />}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      <div className={styles['guide-profile-container']}>
        <div className={styles['guide-content']}>
          <div className={styles['guide-profile-image']}>
            {guideItem.photos && guideItem.photos.length > 0 ? (
              <div 
                className={styles['image-carousel']}
                ref={carouselRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className={styles['carousel-track']} style={{ 
                  transform: `translateX(-${currentImageIndex * 100}%)`
                }}>
                  {guideItem.photos.map((photo, index) => (
                    <div key={index} className={styles['carousel-slide']}>
                      <img 
                        src={photo} 
                        alt={`${guideItem.name} - ${index + 1}`}
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>
                
                {guideItem.photos.length > 1 && (
                  <>
                    <button 
                      className={`${styles['carousel-btn']} ${styles['prev']}`}
                      onClick={prevImage}
                      style={{ opacity: currentImageIndex > 0 ? 1 : 0.5 }}
                    >
                      <FiChevronLeft />
                    </button>
                    <button 
                      className={`${styles['carousel-btn']} ${styles['next']}`}
                      onClick={nextImage}
                      style={{ opacity: currentImageIndex < guideItem.photos.length - 1 ? 1 : 0.5 }}
                    >
                      <FiChevronRight />
                    </button>
                    
                    <div className={styles['carousel-dots']}>
                      {guideItem.photos.map((_, index) => (
                        <span
                          key={index}
                          className={`${styles['dot']} ${index === currentImageIndex ? styles['active'] : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        >
                          {index + 1}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className={styles['no-image']}>No Image Available</div>
            )}
          </div>
          
          <div className={styles['guide-info-box']}>
            <div className={styles['guide-info']}>
              <h2 className={styles['guide-item-title']}>{guideItem.name}</h2>
              
              <div className={`${styles['guide-detail']} ${styles['price-detail']}`}>
                <span className={styles['price-amount']}>₹{guideItem.price}</span>
                {guideItem.pricingUrl && (
                  <a
                    href={guideItem.pricingUrl.startsWith('http') ? guideItem.pricingUrl : `https://${guideItem.pricingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['pricing-link']}
                  >
                    <FaExternalLinkAlt />
                    Check Pricing
                  </a>
                )}
              </div>
              
              <div className={`${styles['guide-detail']} ${styles['location-detail']}`}>
                <FaMapMarkerAlt className={styles['icon']} />
                <a 
                  href={guideItem.addressLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['address-link']}
                >
                  {guideItem.address}
                </a>
              </div>

              <div className={`${styles['guide-detail']} ${styles['contact-detail']}`}>
                <FaPhone />
                <span>{guideItem.contactInfo}</span>
                <button className={styles['copy-button']} onClick={handleCopyPhone}>
                  {copied ? <FaCheck className={styles['icon']} /> : <FaCopy className={styles['icon']} />}
                </button>
              </div>

              {guideItem.website && (
                <div className={`${styles['guide-detail']} ${styles['website-detail']}`}>
                  <FaGlobe className={styles['icon']} />
                  <a 
                    href={guideItem.website.startsWith('http') ? guideItem.website : `https://${guideItem.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['website-link']}
                  >
                    {guideItem.website
                      .replace(/^https?:\/\//i, '')
                      .replace(/^www\./i, '')
                      .split('/')[0]}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button 
            className={styles['back-button']}
            onClick={() => {
              if (slug) {
                router.push(`/guides/${slug}`);
              } else {
                router.push('/guides');
              }
            }}
          >
            Back to Guide
          </button>
        </div>
      </div>
    </>
  );
};

export default GuideProfile; 