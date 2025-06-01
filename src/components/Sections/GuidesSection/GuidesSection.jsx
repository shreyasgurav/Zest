// GuidesSection.jsx modifications
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import GuideBox from "./GuideBox/GuidesBox";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'; // Import icons
import "./GuidesSection.css";
import { Link } from 'react-router-dom';
import GuidesSectionSkeleton from './GuidesSectionSkeleton';

const GuidesSection = () => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    draggable: true,
    slidesToScroll: 1,
    loop: false
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

  // Preload images to prevent layout shift
  const preloadImages = async (guidesData) => {
    const imagePromises = guidesData
      .filter(guide => guide.cover_image)
      .map(guide => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error to not block
          img.src = guide.cover_image;
        });
      });

    await Promise.all(imagePromises);
  };

  useEffect(() => {
    const fetchGuides = async () => {
      try {
        console.log("Fetching guides...");
        const guidesCollectionRef = collection(db, "guides");
        const q = query(guidesCollectionRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        
        const guidesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Guides fetched:", guidesData.length);
        
        // Preload all images before showing guides
        await preloadImages(guidesData);
        
        // Set guides data
        setGuides(guidesData);
        setImagesLoaded(true);
        
        // Small delay for smooth transition
        setTimeout(() => {
          setLoading(false);
        }, 100);
        
      } catch (error) {
        console.error("Error fetching guides:", error);
        setGuides([]);
        setImagesLoaded(true);
        setTimeout(() => {
          setLoading(false);
        }, 100);
      }
    };

    fetchGuides();
  }, []);

  // Show skeleton while loading or images aren't ready
  if (loading || !imagesLoaded) {
    return <GuidesSectionSkeleton />;
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
        <div className="embla-container" style={{ minHeight: '280px' }}>
          <button 
            className={`embla-button embla-button-prev ${!prevBtnEnabled ? 'embla-button-disabled' : ''}`}
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
            style={{ opacity: imagesLoaded ? 1 : 0 }}
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
            style={{ opacity: imagesLoaded ? 1 : 0 }}
          >
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default GuidesSection;