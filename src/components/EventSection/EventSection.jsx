// src/components/EventSection/EventSection.jsx
import React from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import Eventbox from "./EventBox/eventbox";
import "./EventSection.css";

const EventSection = ({ events = [], onSelectEvent }) => {
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
    <div className="event-section">
      <div className="event-section-heading">
        <h1 className="upcoming-events-heading">Upcoming Events</h1>
        <a href="/all-events" className="see-all-link">See All</a>
      </div>
      {events.length === 0 ? (
        <div className="no-events-message">No events available.</div>
      ) : (
        <div ref={sliderRef} className="keen-slider">
          {events.map((event, index) => (
            <div key={index} className="keen-slider__slide number-slide1">
              <Eventbox event={event} onSelect={onSelectEvent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventSection;
