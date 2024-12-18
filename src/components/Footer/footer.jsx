import React from "react";
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
                        <li><a href="#">Contact us</a></li>
                        <li><a href="#">Our Services</a></li>
                        <li><a href="#">About Us</a></li>
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
