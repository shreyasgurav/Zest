'use client';

import logo from '../header-images/zest-logo.png';
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import PersonLogo from "../PersonLogo/PersonLogo";
import styles from "./header.module.css";
import Link from 'next/link';

const Header = () => {
    const [isSearchVisible, setSearchVisible] = useState(false);
    const [isNavActive, setNavActive] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            if (user && user.providerData[0].providerId === 'google.com') {
                setUserEmail(user.email);
            } else {
                setUserEmail(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const toggleSearch = () => {
        setSearchVisible(!isSearchVisible);
        if (!isSearchVisible) {
            setNavActive(false);
        }
    };

    const toggleNav = () => {
        setNavActive(!isNavActive);
        if (isNavActive) {
            setSearchVisible(false);
        }
    };

    const isAuthorizedUser = () => {
        return userEmail === "shrreyasgurav@gmail.com";
    };

    const handleNavItemClick = () => {
        setNavActive(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement search functionality here
    };

    return (
        <div className={styles.globalStyles}>
            <div className={`${styles['nav-container']} ${isNavActive ? styles.active : ''}`}>
                <nav>
                    <ul className={styles['mobile-nav']}>
                        <li>
                            <div className={styles['menu-icon-container']} onClick={toggleNav}>
                                <div className={styles['menu-icon']}>
                                    <span className={styles['line-1']}></span>
                                    <span className={styles['line-2']}></span>
                                </div>
                            </div>
                        </li>
                        <li>
                            <Link href="/" className={styles['link-logo']}>
                                <img src={logo.src} alt="Zest Logo" />
                            </Link>
                        </li>
                        <li>
                            <a className={styles['link-Profile-logo']}><PersonLogo /></a>
                        </li>
                    </ul>

                    <ul className={`${styles['desktop-nav']} ${isNavActive ? styles.show : ''}`}>
                        <li>
                            <Link href="/" className={styles['link-logo']} onClick={handleNavItemClick}>
                                <img src={logo.src} alt="Zest Logo" />
                            </Link>
                        </li>
                        <li><Link href="/about" onClick={handleNavItemClick}>About</Link></li>
                        <li><Link href="/guides" onClick={handleNavItemClick}>Guides</Link></li>
                        {isAuthorizedUser() && (
                            <li>
                                <Link href="/create" onClick={handleNavItemClick}>Create</Link>
                            </li>
                        )}
                        <li>
                            <a className={styles['link-search']} onClick={toggleSearch}></a>
                        </li>
                        <li>
                            <a className={styles['link-Profile-logo']} onClick={handleNavItemClick}><PersonLogo /></a>
                        </li>
                    </ul>
                </nav>

                <div className={`${styles['search-container']} ${!isSearchVisible ? styles.hide : ''}`}>
                    <form onSubmit={handleSearchSubmit}>
                        <a className={styles['link-search']}></a>
                        <input 
                            type="text"
                            placeholder="Search zest.com"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <a className={styles['link-close']} onClick={toggleSearch}></a>
                    </form>

                    <div className={styles['quick-links']}>
                        <h2>Quick Links</h2>
                        <ul>
                            <li><Link href="/guides">Guides</Link></li>
                            <li><Link href="/about">About</Link></li>
                            <li><Link href="/contact">Contact</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className={`${styles.overlay} ${isSearchVisible ? styles.show : ''}`}></div>
        </div>
    );
};

export default Header; 