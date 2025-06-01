import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import GuideBox from '../../Sections/GuidesSection/GuideBox/GuidesBox';
import './AllGuides.css';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const GuideBoxSkeleton = () => {
  return (
    <div className="guides-box-wrapper skeleton-loading">
      <div className="guides-box-card">
        <div className="guides-box-image skeleton-background"></div>
        <div className="guides-box-info">
          <div className="skeleton-line"></div>
        </div>
      </div>
    </div>
  );
};

const AllGuidesSkeleton = () => {
  return (
    <div className="all-guides-container">
      <div className="all-guides-content">
        <div className="all-guides-title skeleton-title-loading"></div>
        <div className="guides-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <div key={index} className="guide-item">
              <GuideBoxSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AllGuides = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const guidesCollection = collection(db, "guides");
        const guidesSnapshot = await getDocs(guidesCollection);
        const guidesList = [];

        guidesSnapshot.forEach((doc) => {
          const guideData = doc.data();
          guidesList.push({
            id: doc.id,
            name: guideData.name,
            cover_image: guideData.cover_image,
            slug: guideData.slug || doc.id
          });
        });

        setGuides(guidesList);
      } catch (error) {
        console.error("Error fetching guides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  const handleGuideClick = (guide) => {
    navigate(`/guides/${guide.slug}`);
  };

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Adventure Activities & Entertainment in Mumbai - Zest",
    "description": "Explore Mumbai's best adventure activities and entertainment venues. Find go-karting tracks, bowling alleys, paintball arenas, laser tag, and more with prices and locations.",
    "url": "https://zestlive.in/guides",
    "hasPart": guides.map(guide => ({
      "@type": "WebPage",
      "name": `Best ${guide.name} in Mumbai`,
      "url": `https://zestlive.in/guides/${guide.slug}`,
      "description": `Find the best ${guide.name.toLowerCase()} venues in Mumbai with prices and locations.`
    }))
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>All Adventure Activities in Mumbai - Zest</title>
        </Helmet>
        <div className="all-guides-page">
          <div className="all-guides-container">
            <h1 className="all-guides-title">All Guides</h1>
            <div className="all-guides-grid">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="guide-card skeleton">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-title"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Adventure Activities & Entertainment in Mumbai - Zest | Book Now</title>
        <meta name="description" content="Explore Mumbai's best adventure activities and entertainment venues. Find go-karting tracks, bowling alleys, paintball arenas, laser tag, trampoline parks with prices and locations." />
        <meta name="keywords" content="adventure activities mumbai, entertainment mumbai, go-karting mumbai, bowling mumbai, paintball mumbai, laser tag mumbai, trampoline parks mumbai, zest mumbai" />
        <meta name="author" content="Zest Mumbai" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Adventure Activities & Entertainment in Mumbai - Zest" />
        <meta property="og:description" content="Explore Mumbai's best adventure activities. Find go-karting, bowling, paintball, and more with prices." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zestlive.in/guides" />
        <meta property="og:site_name" content="Zest Mumbai" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Adventure Activities in Mumbai - Zest" />
        <meta name="twitter:description" content="Find the best adventure activities in Mumbai with Zest." />
        
        <link rel="canonical" href="https://zestlive.in/guides" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      <div className="all-guides-page">
        <div className="all-guides-container">
          <h1 className="all-guides-title">Explore Mumbai's Best Adventure Activities</h1>
          <p className="all-guides-subtitle">
            Discover exciting entertainment venues across Mumbai. Compare prices, locations, and book your next adventure!
          </p>
          <div className="all-guides-grid">
            {guides.map(guide => (
              <div key={guide.id} className="guide-item">
                <GuideBox guide={guide} noBackground={true} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllGuides;
