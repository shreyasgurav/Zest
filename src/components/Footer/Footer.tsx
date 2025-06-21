import React from "react";
import Link from "next/link";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import styles from "./footer.module.css";

function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={`${styles.row} ${styles.iconRow}`}>
                <a href="https://www.instagram.com/tryzest/" target="_blank" rel="noopener noreferrer">
                    <span className={styles.iconWrapper}><FaInstagram className={styles.icon} /></span>
                </a>
                <a href="https://www.linkedin.com/company/zestlive/about/?viewAsMember=true" target="_blank" rel="noopener noreferrer">
                    <span className={styles.iconWrapper}><FaLinkedinIn className={styles.icon} /></span>
                </a>
                <a href="https://x.com/zestlivein" className={styles["x-link"]} target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={styles["x-icon"]}>
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                </a>
            </div>
            <div className={styles.linksContainer}>
                <div className={styles.linksColumn}>
                    <ul>
                        <li><Link href="/termsandconditions">Terms & Conditions</Link></li>
                        <li><Link href="/privacypolicy">Privacy Policy</Link></li>
                        <li><Link href="/refundpolicy">Refund Policy</Link></li>
                    </ul>
                </div>
                <div className={styles.linksColumn}>
                    <ul>
                        <li><Link href="/about">About</Link></li>
                        <li><Link href="/contact">Contact</Link></li>
                        <li><Link href="/listevents">List Events</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}

export default Footer; 