'use client';

const logo = '/zest-logo.png';
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/infrastructure/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import PersonLogo from "@/domains/profiles/components/PersonLogo/PersonLogo";
import styles from "./header.module.css";
import Link from 'next/link';
import { Calendar, PartyPopper, Search, X, Building2, MapPin, Clock, ArrowRight, Ticket, Sparkles, Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import LocationSelector from '@/components/forms/LocationSelector/LocationSelector';
// import { getPopularCities, searchCities, type CityData } from '@/infrastructure/maps/location';

interface SearchResult {
    id: string;
    type: 'event' | 'organization';
    title: string;
    description?: string;
    image?: string;
    location?: string;
    date?: string;
    organizationName?: string;
    username?: string; // For organization username
}

// Create a context for location
export const LocationContext = React.createContext<{
    selectedCity: string;
    setSelectedCity: (city: string) => void;
}>({
    selectedCity: 'Mumbai',
    setSelectedCity: () => {}
});

const Header = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [isSearchVisible, setSearchVisible] = useState(false);
    const [isLocationVisible, setLocationVisible] = useState(false);
    const [isNavActive, setNavActive] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isOrganization, setIsOrganization] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const locationContainerRef = useRef<HTMLDivElement>(null);
    const [selectedCity, setSelectedCity] = useState('Mumbai');
    const [popularCities, setPopularCities] = useState<any[]>([
        { name: 'Mumbai', count: 0, eventIds: [] },
        { name: 'Delhi', count: 0, eventIds: [] },
        { name: 'Bangalore', count: 0, eventIds: [] },
        { name: 'Hyderabad', count: 0, eventIds: [] },
        { name: 'Chennai', count: 0, eventIds: [] },
        { name: 'Kolkata', count: 0, eventIds: [] },
        { name: 'Pune', count: 0, eventIds: [] },
        { name: 'Jaipur', count: 0, eventIds: [] }
    ]);
    const [citySearchResults, setCitySearchResults] = useState<any[]>([]);

    // Check if we're on organization-specific routes
    const isOrganizationRoute = pathname?.startsWith('/organisation') || 
                               pathname?.startsWith('/organization') || 
                               pathname?.startsWith('/login/organisation') ||
                               pathname?.startsWith('/create/') ||
                               pathname?.startsWith('/edit-') ||
                               pathname?.includes('dashboard');

    // Check if user is an organization - only when on organization routes
    const checkIfOrganization = async (user: User) => {
        try {
            // Only check organization status if on organization routes
            if (isOrganizationRoute) {
                const orgDoc = await getDoc(doc(db(), "Organisations", user.uid));
                setIsOrganization(orgDoc.exists());
            } else {
                // For regular user routes, default to false
                setIsOrganization(false);
            }
        } catch (error) {
            console.error("Error checking organization status:", error);
            setIsOrganization(false);
        }
    };

    // Store location in localStorage and broadcast changes
    useEffect(() => {
        const storedCity = localStorage.getItem('selectedCity');
        if (storedCity) {
            setSelectedCity(storedCity);
        }
    }, []);

    const handleCitySelect = (city: string) => {
        setSelectedCity(city);
        localStorage.setItem('selectedCity', city);
        setLocationVisible(false);
        setLocationQuery('');
        
        // Broadcast location change to other components
        window.dispatchEvent(new CustomEvent('locationChanged', { detail: { city } }));
        console.log("Selected city:", city);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth(), async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await checkIfOrganization(currentUser);
            } else {
                setIsOrganization(false);
            }
        });

        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setSearchVisible(false);
            }
            if (locationContainerRef.current && !locationContainerRef.current.contains(event.target as Node)) {
                setLocationVisible(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSearchVisible(false);
                setLocationVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOrganizationRoute]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            setIsLoading(true);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                performSearch();
            }, 300);
        } else {
            setSearchResults([]);
        }
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery]);

    // Optimized search function with correct field names
    const performSearch = async () => {
        try {
            const results: SearchResult[] = [];
            const searchLower = searchQuery.toLowerCase().trim();
            
            // Early return if search query is too short
            if (searchLower.length < 2) {
                setSearchResults([]);
                setIsLoading(false);
                return;
            }

            console.log('Searching for:', searchLower);

            // Search Events with correct field names
            try {
                const eventsQuery = query(collection(db(), "events"), limit(15));
                const eventsSnapshot = await getDocs(eventsQuery);
                
                eventsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const eventTitle = (data.title || data.eventTitle || '').toLowerCase();
                    const eventVenue = (data.event_venue || data.eventVenue || '').toLowerCase();
                    const hostingClub = (data.hosting_club || data.hostingClub || '').toLowerCase();
                    const aboutEvent = (data.about_event || data.aboutEvent || '').toLowerCase();
                    
                    if (eventTitle.includes(searchLower) ||
                        eventVenue.includes(searchLower) ||
                        hostingClub.includes(searchLower) ||
                        aboutEvent.includes(searchLower)) {
                        
                        results.push({ 
                            id: doc.id, 
                            type: 'event', 
                            title: data.title || data.eventTitle || 'Untitled Event',
                            description: data.about_event || data.aboutEvent || '',
                            location: data.event_venue || data.eventVenue || '',
                            organizationName: data.hosting_club || data.hostingClub || '',
                            image: data.event_image || '',
                            date: data.time_slots?.[0]?.date || ''
                        });
                    }
                });
                console.log('Found', results.filter(r => r.type === 'event').length, 'events');
            } catch (error) {
                console.error('Error searching events:', error);
            }

            // Search Organizations in both collections with correct field names
            try {
                // Search in Organisations collection (main one being used)
                const orgsQuery = query(collection(db(), "Organisations"), limit(15));
                const orgsSnapshot = await getDocs(orgsQuery);
                
                orgsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const orgName = (data.name || '').toLowerCase();
                    const orgUsername = (data.username || '').toLowerCase();
                    const orgBio = (data.bio || data.description || '').toLowerCase();
                    
                    if (orgName.includes(searchLower) ||
                        orgUsername.includes(searchLower) ||
                        orgBio.includes(searchLower)) {
                        
                        results.push({ 
                            id: doc.id, 
                            type: 'organization', 
                            title: data.name || 'Unknown Organization',
                            description: data.bio || data.description || '',
                            image: data.photoURL || data.logo || data.profile_image || '',
                            username: data.username || '' // Store username for routing
                        });
                    }
                });

                // Also search in organizations collection (if it exists)
                try {
                    const orgsQuery2 = query(collection(db(), "organizations"), limit(10));
                    const orgsSnapshot2 = await getDocs(orgsQuery2);
                    
                    orgsSnapshot2.forEach(doc => {
                        const data = doc.data();
                        const orgName = (data.organizationName || data.name || '').toLowerCase();
                        const orgUsername = (data.username || '').toLowerCase();
                        const orgDescription = (data.description || data.about || '').toLowerCase();
                        
                        if (orgName.includes(searchLower) ||
                            orgUsername.includes(searchLower) ||
                            orgDescription.includes(searchLower)) {
                            
                            results.push({ 
                                id: doc.id, 
                                type: 'organization', 
                                title: data.organizationName || data.name || 'Unknown Organization',
                                description: data.description || data.about || '',
                                image: data.logo || data.profile_image || '',
                                username: data.username || ''
                            });
                        }
                    });
                } catch (error) {
                    // organizations collection might not exist, ignore error
                    console.log('organizations collection not found or empty');
                }

                console.log('Found', results.filter(r => r.type === 'organization').length, 'organizations');
            } catch (error) {
                console.error('Error searching organizations:', error);
            }

            // Remove duplicates and limit results
            const uniqueResults = results.filter((result, index, self) => 
                index === self.findIndex((r) => r.type === result.type && r.id === result.id)
            );

            // Sort results: prioritize exact matches, then partial matches
            const sortedResults = uniqueResults.sort((a, b) => {
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();
                
                // Exact match priority
                if (aTitle === searchLower && bTitle !== searchLower) return -1;
                if (bTitle === searchLower && aTitle !== searchLower) return 1;
                
                // Starts with search query priority
                if (aTitle.startsWith(searchLower) && !bTitle.startsWith(searchLower)) return -1;
                if (bTitle.startsWith(searchLower) && !aTitle.startsWith(searchLower)) return 1;
                
                // Alphabetical order for same priority
                return aTitle.localeCompare(bTitle);
            });

            setSearchResults(sortedResults.slice(0, 10)); // Limit to top 10 results
            console.log('Final search results:', sortedResults.slice(0, 10));
        } catch (error) {
            console.error('Error in performSearch:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSearch = () => {
        setSearchVisible(!isSearchVisible);
        setLocationVisible(false); // Close location popup if open
        if (!isSearchVisible) {
            setNavActive(false);
            setTimeout(() => {
                const searchInput = document.querySelector(`.${styles.searchInput}`) as HTMLInputElement;
                if (searchInput) searchInput.focus();
            }, 100);
        }
    };

    const toggleLocation = () => {
        setLocationVisible(!isLocationVisible);
        setSearchVisible(false); // Close search popup if open
        if (!isLocationVisible) {
            setNavActive(false);
            setTimeout(() => {
                const locationInput = document.querySelector(`.${styles.locationInput}`) as HTMLInputElement;
                if (locationInput) locationInput.focus();
            }, 100);
        }
    };

    // Improved result click handler with proper routing
    const handleResultClick = (result: SearchResult) => {
        setSearchVisible(false);
        setSearchQuery('');
        
        console.log('Clicked result:', result);
        
        switch (result.type) {
            case 'event': 
                router.push(`/event-profile/${result.id}`); 
                break;
            case 'organization': 
                // Route to organization profile using username if available, otherwise use ID
                if (result.username) {
                    router.push(`/organisation/${result.username}`);
                } else {
                    // Fallback to ID if username is not available
                    router.push(`/organisation/${result.id}`);
                }
                break;
            default:
                console.warn('Unknown result type:', result.type);
        }
    };

    const getResultIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'event': return <Calendar className={styles.resultIcon} />;
            case 'organization': return <Building2 className={styles.resultIcon} />;
        }
    };

    // Load popular cities on component mount
    useEffect(() => {
        const loadPopularCities = async () => {
            try {
                console.log('Loading popular cities from database...');
                
                // Set a timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout loading cities')), 5000)
                );
                
                // Using fallback cities during reorganization
                const cities = popularCities; // Use the already initialized cities
                
                console.log('Loaded cities from database:', cities);
                
                if (cities && cities.length > 0) {
                    setPopularCities(cities);
                } else {
                    console.log('No cities returned from database, keeping fallback cities');
                }
            } catch (error) {
                console.error('Error loading popular cities:', error);
                console.log('Using fallback cities instead');
                // Fallback cities are already set in initial state, no need to set again
            }
        };
        loadPopularCities();
    }, []);

    // Search cities when location query changes
    useEffect(() => {
        const searchForCities = async () => {
            if (locationQuery.trim().length >= 2) {
                try {
                    console.log('Searching for cities:', locationQuery);
                    
                    // Try database search first, but fallback to local search
                    let results;
                    // Using fallback local search during reorganization
                    const searchLower = locationQuery.toLowerCase();
                    results = popularCities.filter(city => 
                        city.name.toLowerCase().includes(searchLower)
                    );
                    
                    setCitySearchResults(results);
                } catch (error) {
                    console.error('Error searching cities:', error);
                    setCitySearchResults([]);
                }
            } else {
                setCitySearchResults([]);
            }
        };
        
        const timeoutId = setTimeout(searchForCities, 300);
        return () => clearTimeout(timeoutId);
    }, [locationQuery, popularCities]);

    const handleNavItemClick = () => setNavActive(false);
    const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); if (searchQuery.trim()) performSearch(); };

    return (
        <LocationContext.Provider value={{ selectedCity, setSelectedCity: handleCitySelect }}>
            <div className={`${styles['nav-container']} ${isNavActive ? styles.active : ''}`}>
                <nav>
                    {/* --- Mobile Nav --- */}
                    <ul className={styles['mobile-nav']}>
                        <li>
                           <LocationSelector selectedCity={selectedCity} onLocationClick={toggleLocation} />
                        </li>
                        <li>
                            <Link href="/" className={styles['link-logo']}>
                                <img src={logo} alt="Zest Logo" />
                            </Link>
                        </li>
                        <li className={styles.mobileNavActions}>
                            <button className={styles.mobileSearchButton} onClick={toggleSearch} aria-label="Search">
                                <Search className={styles.mobileSearchIcon} />
                            </button>
                            <a className={styles['link-Profile-logo']}><PersonLogo /></a>
                        </li>
                    </ul>

                    {/* --- Desktop Nav --- */}
                    <ul className={`${styles['desktop-nav']} ${isNavActive ? styles.show : ''}`}>
                        <li><Link href="/" className={styles['link-logo']} onClick={handleNavItemClick}><img src={logo} alt="Zest Logo" /></Link></li>
                        <li><LocationSelector selectedCity={selectedCity} onLocationClick={toggleLocation} /></li>
                        <li className={styles.navItemWithIcon}><Link href="/events" onClick={handleNavItemClick} className={styles.navLinkWithIcon}><Ticket className={styles.navIcon} /><span>Events</span></Link></li>
                        {isOrganization && (<li><Link href="/create" onClick={handleNavItemClick}>Create</Link></li>)}
                        <li className={styles.desktopNavSpacer}></li>
                        <li><button className={styles.searchNavButton} onClick={toggleSearch} aria-label="Search"><Search className={styles.searchNavIcon} /></button></li>
                        <li><a className={styles['link-Profile-logo']} onClick={handleNavItemClick}><PersonLogo /></a></li>
                    </ul>
                </nav>
            </div>

            {/* Search Popup */}
            {isSearchVisible && (
                <>
                    <div className={styles.searchBackground} onClick={() => setSearchVisible(false)} />
                    <div ref={searchContainerRef} className={styles['search-container']}>
                        <form onSubmit={handleSearchSubmit}>
                            <Search className={styles.searchIcon} />
                            <input type="text" className={styles.searchInput} placeholder="Search events, activities, and organizations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus/>
                            {searchQuery && (<>
                                <button type="button" className={styles.clearButton} onClick={() => setSearchQuery('')}><X className={styles.clearIcon} /></button>
                                <button type="submit" className={styles.searchButton} disabled={!searchQuery.trim()}><ArrowRight className={styles.searchButtonIcon} /></button>
                            </>)}
                        </form>
                        {searchQuery.length >= 2 ? (
                            <div className={styles.searchResults}>
                                {isLoading ? (<div className={styles.loadingResults}><div className={styles.loadingSpinner}></div><span>Searching...</span></div>)
                                : searchResults.length > 0 ? (searchResults.map((result) => (
                                    <div key={`${result.type}-${result.id}`} className={styles.searchResult} onClick={() => handleResultClick(result)}>
                                        <div className={styles.resultIconContainer}>{getResultIcon(result.type)}</div>
                                        <div className={styles.resultContent}>
                                            <h3>{result.title}</h3>
                                            {result.description && <p className={styles.resultDescription}>{truncateText(result.description, 50)}</p>}
                                            <div className={styles.resultMeta}>
                                                {result.location && <span className={styles.resultMetaItem}><MapPin className={styles.metaIcon} />{result.location}</span>}
                                                {result.date && <span className={styles.resultMetaItem}><Clock className={styles.metaIcon} />{formatDate(result.date)}</span>}
                                                {result.organizationName && <span className={styles.resultMetaItem}><Building2 className={styles.metaIcon} />{result.organizationName}</span>}
                                                {result.type === 'organization' && result.username && <span className={styles.resultMetaItem}>@{result.username}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )))
                                : (<div className={styles.noResults}><p>No results found for "{searchQuery}"</p></div>)}
                            </div>
                        ) : (
                             <div className={styles.quickLinks}>
                                <h2>Quick Links</h2>
                                <div className={styles.quickLinksGrid}>
                                    <Link href="/" className={styles.quickLink} onClick={() => setSearchVisible(false)}><Home className={styles.quickLinkIcon} /><span>Home</span></Link>
                                    <Link href="/events" className={styles.quickLink} onClick={() => setSearchVisible(false)}><Calendar className={styles.quickLinkIcon} /><span>Events</span></Link>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Location Popup */}
            {isLocationVisible && (
                <>
                    <div className={styles.locationBackground} onClick={() => setLocationVisible(false)} />
                    <div ref={locationContainerRef} className={styles['location-container']}>
                        <div className={styles.locationHeader}>
                            <h2>Choose Your City</h2>
                            <button 
                                className={styles.locationCloseButton} 
                                onClick={() => setLocationVisible(false)}
                                aria-label="Close location selector"
                            >
                                <X className={styles.locationCloseIcon} />
                            </button>
                        </div>
                        <div className={styles.locationSearchWrapper}>
                            <Search className={styles.locationSearchIcon} />
                            <input 
                                type="text" 
                                className={styles.locationInput} 
                                placeholder="        Search for your city..." 
                                value={locationQuery} 
                                onChange={(e) => setLocationQuery(e.target.value)} 
                                autoFocus
                            />
                            {locationQuery && (
                                <button type="button" className={styles.locationClearButton} onClick={() => setLocationQuery('')}>
                                    <X className={styles.locationClearIcon} />
                                </button>
                            )}
                        </div>
                        
                        {locationQuery.trim() === '' ? (
                            <div className={styles.popularCitiesContainer}>
                                <h3 className={styles.locationSectionTitle}>Popular Cities</h3>
                                {/* Debug info - remove in production */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div style={{ color: 'white', fontSize: '12px', marginBottom: '10px' }}>
                                        Cities loaded: {popularCities.length}
                                    </div>
                                )}
                                <div className={styles.locationCityGrid}>
                                    {popularCities.length > 0 ? popularCities.map(city => (
                                        <button 
                                            key={city.name} 
                                            className={styles.locationCityButton} 
                                            onClick={() => handleCitySelect(city.name)}
                                            aria-label={`Select ${city.name}`}
                                        >
                                            <MapPin className={styles.locationCityIcon} />
                                            <span>{city.name}</span>
                                            {city.count > 0 && (
                                                <span className={styles.cityEventCount}>({city.count})</span>
                                            )}
                                        </button>
                                    )) : (
                                        <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
                                            Loading cities...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.locationSearchResults}>
                                <h3 className={styles.locationSectionTitle}>Search Results</h3>
                                {citySearchResults.length > 0 ? (
                                    citySearchResults.map(city => (
                                        <button 
                                            key={city.name} 
                                            className={styles.locationResultItem} 
                                            onClick={() => handleCitySelect(city.name)}
                                            aria-label={`Select ${city.name}`}
                                        >
                                            <MapPin className={styles.locationResultIcon} />
                                            <span>{city.name}</span>
                                            {city.count > 0 && (
                                                <span className={styles.cityEventCount}>({city.count} events)</span>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className={styles.locationNoResults}>
                                        <p>No cities found for "{locationQuery}"</p>
                                        <p className={styles.locationNoResultsSubtext}>Try searching for a different city</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </LocationContext.Provider>
    );
};

const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    return text.length <= maxLength ? text : text.slice(0, maxLength) + '...';
};

const formatDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return "Invalid Date";
    }
};

export default Header;
