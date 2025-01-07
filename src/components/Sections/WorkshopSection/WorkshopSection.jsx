import React, { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { DotButton, useDotButton } from "../EventSection/EmblaCarouselDotButton";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "../EventSection/EmblaCarouselArrowButtons";
import WorkshopBox from "./WorkshopBox/workshopbox";
import "./WorkshopSection.css";

const WorkshopSection = ({ workshops = [] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    draggable: true,
    slidesToScroll: 1,
    loop: false,
  });

  const { selectedIndex, scrollSnaps, onDotButtonClick } = useDotButton(emblaApi);
  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  return (
    <div className="workshop-section">
      <div className="event-section-heading">
        <h1 className="upcoming-workshops-heading">Fun Workshops</h1>
        <a href="/all-workshops" className="see-all-link">See All</a>
      </div>
      {workshops.length === 0 ? (
        <div className="no-events-message">No workshops available.</div>
      ) : (
        <section className="embla">
          <div className="embla__viewport" ref={emblaRef}>
            <div className="embla__container">
              {workshops.map((workshop) => (
                <div className="embla__slide" key={workshop.id}>
                  <WorkshopBox workshop={workshop} />
                </div>
              ))}
            </div>
          </div>
          <div className="embla__controls">
            <div className="embla__buttons">
              <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
              <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
            </div>
            <div className="embla__dots">
              {scrollSnaps.map((_, index) => (
                <DotButton
                  key={index}
                  onClick={() => onDotButtonClick(index)}
                  className={"embla__dot".concat(
                    index === selectedIndex ? " embla__dot--selected" : ""
                  )}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default WorkshopSection;