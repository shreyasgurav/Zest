'use client';

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import AddGuideItem from "@/components/GuidesSection/AddGuideItems/AddGuideItems";
import EditGuideItem from "@/components/GuidesSection/EditGuideItem/EditGuideItem";
import { FaEdit } from 'react-icons/fa';
import { Helmet } from 'react-helmet-async';
import styles from './GuidesPage.module.css';

interface GuideItem {
  name: string;
  price: string;
  contactInfo: string;
  website: string;
  address: string;
  addressLink: string;
  pricingUrl: string;
  photos: string[];
  slug: string;
}

interface Guide {
  id: string;
  actualId?: string;
  name: string;
  slug?: string;
  cover_image?: string;
  items: GuideItem[];
}

// Helper function to generate slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const GuideItemSkeleton = () => {
  return (
    <div className={`${styles['guide-item-card']} ${styles['skeleton-loading']}`}>
      <div className={`${styles['item-image']} ${styles['skeleton-background']}`}></div>
      <div className={styles['item-details']}>
        <div className={`${styles['skeleton-line']} ${styles['skeleton-name']}`}></div>
        <div className={`${styles['skeleton-line']} ${styles['skeleton-price']}`}></div>
      </div>
    </div>
  );
};

const GuidePage = () => {
  const params = useParams();
  const slug = params?.slug as string;
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Set up auth listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const isAuthorized = currentUser?.email === 'shrreyasgurav@gmail.com';

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        setLoading(true);
        let guideData: Guide | null = null;
        
        if (slug) {
          // First try to fetch by slug
          const guidesRef = collection(db, "guides");
          const q = query(guidesRef, where("slug", "==", slug));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            guideData = {
              id: doc.id,
              ...doc.data()
            } as Guide;
          }
        }
        
        if (guideData) {
          setGuide({ ...guideData, actualId: guideData.id });
        } else {
          setError("Guide not found");
        }
      } catch (error) {
        console.error("Error fetching guide:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchGuide();
    }
  }, [slug]);

  const handleItemClick = (index: number) => {
    if (!guide) return;
    if (guide.slug) {
      window.location.href = `/guide-profile/${guide.slug}/${index}`;
    } else {
      window.location.href = `/guide-profile/${guide.id}/${index}`;
    }
  };

  const handleDeleteItem = async (index: number) => {
    if (!guide) return;
    try {
      const actualId = guide.actualId || guide.id;
      const guideDocRef = doc(db, "guides", actualId);
      const guideSnapshot = await getDoc(guideDocRef);
      
      if (guideSnapshot.exists()) {
        const currentItems = guideSnapshot.data().items || [];
        const updatedItems = currentItems.filter((_: any, idx: number) => idx !== index);
        
        await updateDoc(guideDocRef, {
          items: updatedItems
        });
        
        // Refresh the guide data after deletion
        const updatedSnapshot = await getDoc(guideDocRef);
        if (updatedSnapshot.exists()) {
          setGuide({
            ...guide,
            ...updatedSnapshot.data(),
            id: updatedSnapshot.id,
            actualId: actualId
          } as Guide);
        }
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item. Please try again.");
    }
  };

  if (loading || authLoading) {
    return (
      <>
        <Helmet>
          <title>Loading... - Zest</title>
        </Helmet>
        <div className={styles['guide-page']}>
          <div className={styles['guide-container']}>
            <div className={styles['guide-header']}>
              <div className={`${styles['skeleton-line']} ${styles['skeleton-guide-title']}`}></div>
            </div>

            <div className={styles['guide-items-container']}>
              <div className={styles['guide-items-grid']}>
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <GuideItemSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !guide) {
    return (
      <>
        <Helmet>
          <title>Guide Not Found - Zest</title>
          <meta name="description" content="The requested guide could not be found." />
        </Helmet>
        <div className={styles['guide-page']}>
          <div className={styles['guide-container']}>
            <div className={styles['error-message']}>{error || "Guide not found"}</div>
          </div>
        </div>
      </>
    );
  }

  const actualGuideId = guide.actualId || guide.id;
  
  // Generate SEO-friendly title based on guide name
  const generateSEOTitle = (guideName: string): string => {
    const titleMap: Record<string, string> = {
      'Go Karting': 'Best Go-Karting Tracks in Mumbai',
      'Bowling': 'Best Bowling Alleys in Mumbai',
      'Paintball': 'Best Paintball Arenas in Mumbai',
      'Laser Tag': 'Best Laser Tag Arenas in Mumbai',
      'Trampoline Parks': 'Best Trampoline Parks in Mumbai',
      'Escape Rooms': 'Best Escape Rooms in Mumbai'
    };
    
    return titleMap[guideName] || `Best ${guideName} in Mumbai`;
  };
  
  // Generate rich meta description with keywords
  const generateMetaDescription = (): string => {
    if (guide.items && guide.items.length > 0) {
      const topItems = guide.items.slice(0, 3).map(item => item.name).join(', ');
      const priceRange = guide.items.reduce((acc: { min: number; max: number }, item: GuideItem) => {
        const price = parseInt(item.price);
        return {
          min: Math.min(acc.min, price),
          max: Math.max(acc.max, price)
        };
      }, { min: Infinity, max: 0 });
      
      return `Find the best ${guide.name.toLowerCase()} in Mumbai with Zest. Compare ${guide.items.length} top-rated venues including ${topItems}. Prices from ₹${priceRange.min} to ₹${priceRange.max}. Book now!`;
    }
    return `Discover the best ${guide.name.toLowerCase()} in Mumbai with Zest. Compare prices, locations, and book your experience today!`;
  };
  
  // Generate keywords based on guide type
  const generateKeywords = (): string => {
    const baseKeywords = `${guide.name.toLowerCase()} mumbai, best ${guide.name.toLowerCase()} mumbai, ${guide.name.toLowerCase()} near me, zest ${guide.name.toLowerCase()}`;
    const locationKeywords = guide.items ? guide.items.map(item => {
      const location = item.address?.split(',')[0] || '';
      return `${guide.name.toLowerCase()} ${location.toLowerCase()}`;
    }).join(', ') : '';
    
    return `${baseKeywords}, ${locationKeywords}`;
  };
  
  const seoTitle = generateSEOTitle(guide.name);
  const metaDescription = generateMetaDescription();
  const keywords = generateKeywords();

  return (
    <>
      <Helmet>
        <title>{seoTitle} (2025) - Zest | Book Now</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Zest Mumbai" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content={`${seoTitle} - Zest Mumbai`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://zestlive.in/guides/${guide.slug || guide.id}`} />
        {guide.cover_image && <meta property="og:image" content={guide.cover_image} />}
        <meta property="og:site_name" content="Zest Mumbai" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${seoTitle} - Zest`} />
        <meta name="twitter:description" content={metaDescription} />
        {guide.cover_image && <meta name="twitter:image" content={guide.cover_image} />}
        <meta name="twitter:site" content="@zestmumbai" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://zestlive.in/guides/${guide.slug || guide.id}`} />
        
        {/* Structured Data for Local Business */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": seoTitle,
            "description": metaDescription,
            "numberOfItems": guide.items?.length || 0,
            "itemListElement": guide.items?.map((item: GuideItem, index: number) => ({
              "@type": "LocalBusiness",
              "position": index + 1,
              "name": item.name,
              "address": item.address,
              "priceRange": `₹${item.price}`,
              "telephone": item.contactInfo,
              "url": item.website
            })) || []
          })}
        </script>
      </Helmet>
      <div className={styles['guide-page']}>
        <div className={styles['guide-container']}>
          <div className={styles['guide-header']}>
            <h1 className={styles['guide-title']}>{seoTitle}</h1>
            {isAuthorized && (
              <div className={styles['header-actions']}>
                <button className={styles['add-item-button']} onClick={() => setShowAddItem(true)}>
                  Add New
                </button>
              </div>
            )}
          </div>

          <div className={styles['guide-items-container']}>
            {guide.items && guide.items.length > 0 ? (
              <div className={styles['guide-items-grid']}>
                {guide.items.map((item: GuideItem, index: number) => (
                  <div 
                    key={index} 
                    className={styles['guide-item-card']} 
                    onClick={() => handleItemClick(index)}
                  >
                    {isAuthorized && (
                      <div className={styles['item-actions']}>
                        <button 
                          className={styles['edit-item-button']}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItemIndex(index);
                            setShowEditItem(true);
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className={styles['delete-item-button']}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this item?')) {
                              handleDeleteItem(index);
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className={styles['item-image']}>
                      {item.photos && item.photos.length > 0 ? (
                        <img src={item.photos[0]} alt={item.name} />
                      ) : (
                        <div className={styles['item-image-placeholder']}>No Image</div>
                      )}
                    </div>
                    <div className={styles['item-details']}>
                      <h3 className={styles['item-name']}>{item.name}</h3>
                      <p className={styles['item-price']}>₹{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles['no-items-message']}>No items in this guide</div>
            )}
          </div>

          {showAddItem && (
            <AddGuideItem
              guideId={actualGuideId}
              slug={guide.slug || ''}
              onClose={() => setShowAddItem(false)}
              onItemAdded={() => {
                const fetchGuide = async () => {
                  const guideDocRef = doc(db, "guides", actualGuideId);
                  const guideSnapshot = await getDoc(guideDocRef);
                  if (guideSnapshot.exists()) {
                    setGuide({
                      ...guide,
                      ...guideSnapshot.data(),
                      id: guideSnapshot.id,
                      actualId: actualGuideId
                    } as Guide);
                  }
                };
                fetchGuide();
              }}
            />
          )}

          {showEditItem && editingItemIndex !== null && (
            <EditGuideItem
              guideId={actualGuideId}
              item={guide.items[editingItemIndex]}
              onClose={() => {
                setShowEditItem(false);
                setEditingItemIndex(null);
              }}
              onItemUpdated={() => {
                const fetchGuide = async () => {
                  const guideDocRef = doc(db, "guides", actualGuideId);
                  const guideSnapshot = await getDoc(guideDocRef);
                  if (guideSnapshot.exists()) {
                    setGuide({
                      ...guide,
                      ...guideSnapshot.data(),
                      id: guideSnapshot.id,
                      actualId: actualGuideId
                    } as Guide);
                  }
                };
                fetchGuide();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default GuidePage; 