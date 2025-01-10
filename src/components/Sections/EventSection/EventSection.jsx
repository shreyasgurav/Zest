import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { DotButton, useDotButton } from "./EmblaCarouselDotButton";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";
import Eventbox from "./EventBox/eventbox";
import "./EventSection.css";

const EventSection = ({ events = [] }) => {
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
    <div className="event-section">
      <div className="event-section-heading">
        <h1 className="upcoming-events-heading">Upcoming Events</h1>
        <a href="/all-events" className="see-all-link">
          See All
        </a>
      </div>
      {events.length === 0 ? (
        <div className="no-events-message">No events available.</div>
      ) : (
        <section className="embla">
          <div className="embla__viewport" ref={emblaRef}>
            <div className="embla__container">
             {events.map((event) => (
                <div className="embla__slide" key={event.id}>
                 <Eventbox event={event} />
                </div>
))}
            </div>
          </div>

          <div className="embla__controls">
            <div className="embla__buttons">
              <PrevButton
                onClick={onPrevButtonClick}
                disabled={prevBtnDisabled}
              />
              <NextButton
                onClick={onNextButtonClick}
                disabled={nextBtnDisabled}
              />
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

export default EventSection;