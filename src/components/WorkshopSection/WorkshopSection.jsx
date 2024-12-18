import React from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import WorkshopBox from "./WorkshopBox/workshopbox"; // Updated casing for the component import
import "./WorkshopSection.css";

const WorkshopSection = ({ workshops = [] }) => {
  const [sliderRef] = useKeenSlider({
    breakpoints: {
      "(min-width: 250px)": {
        slides: { perView: 2, spacing: 5 },
      },
      "(min-width: 690px)": {
        slides: { perView: 3, spacing: 5 },
      },
      "(min-width: 1000px)": {
        slides: { perView: 4, spacing: 10 },
      },
    },
    slides: { perView: 1 },
    mode: "free",
  });

  return (
    <div className="workshop-section">
      <div className="event-section-heading">
        <h1 className="upcoming-events-heading">Fun Workshops</h1>
        <a href="/all-workshops" className="see-all-link">See All</a>
      </div>
      {workshops.length === 0 ? (
        <div className="no-events-message">No workshops available.</div>
      ) : (
        <div ref={sliderRef} className="keen-slider">
          {workshops.map((workshop, index) => (
            <div key={index} className="keen-slider__slide number-slide1">
              <WorkshopBox workshop={workshop} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkshopSection;
