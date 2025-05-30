import React from "react";
import { Link } from "react-router-dom";
import "./footer.css";

function Footer() {
    return (
        <footer className="footer">
            <div className="row">
                <a href="https://www.instagram.com/tryzest/"><i className="fa fa-instagram"></i></a>
                <a href="https://www.linkedin.com/company/zestlive/about/?viewAsMember=true"><i className="fa fa-linkedin"></i></a>
                <a href="https://x.com/zestlivein" className="x-link">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="x-icon">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                </a>
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