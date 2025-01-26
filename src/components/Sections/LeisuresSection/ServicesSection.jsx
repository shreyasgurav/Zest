import React, { useState, useEffect } from "react";
import { db } from "../../Header/PersonLogo/components/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import ServiceBox from "./ServicesBox/ServicesBox";
import "./ServicesSection.css";

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollectionRef = collection(db, "services");
        const q = query(servicesCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const servicesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          serviceTitle: doc.data().title,
          serviceType: doc.data().service_type,
          provider: doc.data().provider,
          serviceDescription: doc.data().description,
          serviceLocation: doc.data().location,
          contactInfo: doc.data().contact_info,
          service_image: doc.data().service_image,
        }));

        console.log("Fetched services:", servicesData);
        setServices(servicesData);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    draggable: true,
    slidesToScroll: 1,
    loop: false,
  });

  if (loading) {
    return <div className="loading-message">Loading services...</div>;
  }

  return (
    <div className="services-section">
      <div className="services-section-heading">
        <h1 className="available-services-heading">Available Services</h1>
        <a href="/all-services" className="see-all-link">
          See All
        </a>
      </div>
      {services.length === 0 ? (
        <div className="no-services-message">No services available.</div>
      ) : (
        <section className="embla">
          <div className="embla__viewport" ref={emblaRef}>
            <div className="embla__container">
              {services.map((service) => (
                <div className="embla__slide" key={service.id}>
                  <ServiceBox service={service} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ServicesSection;
