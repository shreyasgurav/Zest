import React from "react";
import { Link } from "react-router-dom";
import "./footer.css";

function Footer() {
    return (
        <footer>
            <div className="footer">
                <div className="row">
                    <a href="https://www.instagram.com/zestlivein/"><i className="fa fa-instagram"></i></a>
                    <a href="#"><i className="fa fa-linkedin"></i></a>
                </div>
                <div className="row">
                    <ul>
                        <li><Link to="/contact-us">Contact us</Link></li>
                        <li><Link to="/our-services">Our Services</Link></li>
                        <li><Link to="/about-us">About Us</Link></li>
                    </ul>
                </div>
                <div className="row">
                    Zest Copyright © 2024 Zest - All rights reserved
                </div>
            </div>
        </footer>
    );
}

export default Footer;
