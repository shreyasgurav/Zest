import React from "react";
import { useNavigate } from "react-router-dom";
import "./ServicesBox.css";

function ServicesBox({ service }) {
    const navigate = useNavigate();
    console.log("Service data in ServiceBox:", service);

    const handleSelect = () => {
        navigate(`/service-profile/${service.id}`);
    };

    const LocationIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
    );

    return (
        <div className="service-box-container" onClick={handleSelect}>
            <div className="service-box">
                {service.service_image ? (
                    <img 
                        src={service.service_image} 
                        alt={service.serviceTitle}
                        className="service-image"
                    />
                ) : (
                    <div className="service-image-placeholder">
                        No Image Available
                    </div>
                )}
                <div className="service-info">
                    <p className="service-provider">By {service.provider}</p>
                    <h3>{service.serviceTitle}</h3>
                    <div className="service-type">{service.serviceType}</div>
                    <div className="location-container">
                        <LocationIcon />
                        <p>{service.serviceLocation}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ServicesBox;
