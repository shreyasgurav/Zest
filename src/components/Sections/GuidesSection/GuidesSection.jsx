// GuidesSection.jsx modifications
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import GuideBox from "./GuideBox/GuidesBox";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'; // Import icons
import "./GuidesSection.css";
import { Link } from 'react-router-dom';

const GuideBoxSkeleton = () => {
  return (
    <div className="guides-box-wrapper skeleton-loading">
      <div className="guides-box-card">
        <div className="guides-box-image-placeholder skeleton-background"></div>
        <div className="guides-box-info">
          <div className="skeleton-line skeleton-title"></div>
        </div>
      </div>
    </div>
  );
};

const GuidesSection = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    draggable: true,
    slidesToScroll: 1,
    loop: false,
    spacing: 5,
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

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
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const guidesCollectionRef = collection(db, "guides");
        const q = query(guidesCollectionRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        
        const guidesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setGuides(guidesData);
      } catch (error) {
        console.error("Error fetching guides:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuides();
  }, []);

  if (loading) {
    return (
      <div className="experiences-section skeleton-section">
        <div className="experiences-section-heading">
          <div className="skeleton-line skeleton-heading"></div>
        </div>
        <section className="embla">
          <div className="embla__viewport">
            <div className="embla__container">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="embla__slide" style={{ opacity: 1 - (index * 0.2) }}>
                  <GuideBoxSkeleton />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="experiences-section">
      <div className="experiences-section-heading">
        <h1 className="upcoming-experiences-heading">The Bombay Guide</h1>
        <Link to="/guides" className="see-all-link">
          See All
        </Link>
      </div>
      {guides.length === 0 ? (
        <div className="no-experiences-message">No guides available.</div>
      ) : (
        <div className="embla-container">
          <button 
            className={`embla-button embla-button-prev ${!prevBtnEnabled ? 'embla-button-disabled' : ''}`}
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
          >
            <FiChevronLeft />
          </button>

          <section className="embla">
            <div className="embla__viewport" ref={emblaRef}>
              <div className="embla__container">
                {guides.map((guide) => (
                  <div className="embla__slide" key={guide.id}>
                    <GuideBox guide={guide} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <button 
            className={`embla-button embla-button-next ${!nextBtnEnabled ? 'embla-button-disabled' : ''}`}
            onClick={scrollNext}
            disabled={!nextBtnEnabled}
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default GuidesSection;