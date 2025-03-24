import React from "react";
import { Link } from "react-router-dom";
import "./footer.css";

function Footer() {
    return (
        <footer className="footer">
            <div className="row">
                <a href="https://www.instagram.com/tryzest/"><i className="fa fa-instagram"></i></a>
                <a href="https://www.linkedin.com/company/zestlive/about/?viewAsMember=true"><i className="fa fa-linkedin"></i></a>
            </div>
            <div className="row">
                <ul>
                    <li><Link to="/about">About</Link></li>
                    <li><Link to="/contact">Contact</Link></li>
                </ul>
            </div>
            <div className="row">
                Zest Copyright © 2025 Zest - All rights reserved
            </div>
        </footer>
    );
}

export default Footer;