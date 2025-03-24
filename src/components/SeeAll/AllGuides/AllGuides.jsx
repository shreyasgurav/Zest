import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import GuideBox from '../../Sections/GuidesSection/GuideBox/GuidesBox';
import './AllGuides.css';

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

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const guidesCollectionRef = collection(db, 'guides');
        const q = query(guidesCollectionRef, orderBy('createdAt', 'desc'));
        const guideSnapshot = await getDocs(q);
        const guidesList = guideSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGuides(guidesList);
      } catch (error) {
        console.error("Error fetching guides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  if (loading) {
    return <AllGuidesSkeleton />;
  }

  return (
    <div className="all-guides-container">
      <div className="all-guides-content">
        <h1 className="all-guides-title">The Bombay Guide</h1>
        {guides.length === 0 ? (
          <div className="no-guides">
            <p>No guides found</p>
          </div>
        ) : (
          <div className="guides-grid">
            {guides.map(guide => (
              <div key={guide.id} className="guide-item">
                <GuideBox guide={guide} noBackground={true} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllGuides;
