import React, { useState, useEffect } from "react";
import { db } from "../../Header/PersonLogo/components/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import { DotButton, useDotButton } from "./EmblaCarouselDotButton";
import {
  PrevButton,
  NextButton,
  usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";
import Eventbox from "./EventBox/eventbox";
import "./EventSection.css";

const EventSection = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollectionRef = collection(db, "events");
        const q = query(eventsCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          eventTitle: doc.data().title,
          eventType: doc.data().event_type,
          hostingClub: doc.data().hosting_club,
          eventDateTime: doc.data().event_date_time,
          eventVenue: doc.data().event_venue,
          eventRegistrationLink: doc.data().event_registration_link,
          aboutEvent: doc.data().about_event,
          event_image: doc.data().event_image,
          organizationId: doc.data().organizationId,
        }));

        console.log("Fetched events with org IDs:", eventsData);
        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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

  if (loading) {
    return <div className="loading-message">Loading events...</div>;
  }

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