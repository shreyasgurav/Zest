import React, { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { DotButton, useDotButton } from "../EventSection/EmblaCarouselDotButton";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "../EventSection/EmblaCarouselArrowButtons";
import ExpBox from "./ExpBox/ExpBox";
import "./ExperiencesSection.css";

const ExperiencesSection = ({ experiences = [] }) => {
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
    <div className="experieces-section">
      <div className="event-section-heading">
        <h1 className="upcoming-experiences-heading">Experiences & Adventures</h1>
        <a href="/all-experiences" className="see-all-link">See All</a>
      </div>
      {experiences.length === 0 ? (
        <div className="no-experiences-message">No experiences available.</div>
      ) : (
        <section className="embla">
          <div className="embla__viewport" ref={emblaRef}>
            <div className="embla__container">
              {experiences.map((experiences) => (
                <div className="embla__slide" key={experiences.id}>
                  <ExpBox experiences={experiences} />
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

export default ExperiencesSection;