/**
 * Location utilities for extracting and working with city data from event venues
 */

// Major Indian cities for reference
export const MAJOR_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 
    'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 
    'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 
    'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 
    'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 
    'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 
    'Chandigarh', 'Solapur', 'Hubli-Dharwad', 'Mysore', 'Tiruchirappalli', 
    'Bareilly', 'Aligarh', 'Tiruppur', 'Gurgaon', 'Moradabad', 'Jalandhar', 
    'Bhubaneswar', 'Salem', 'Warangal', 'Guntur', 'Noida', 'Dehradun', 'Kochi'
];

// City aliases and variations
export const CITY_ALIASES: Record<string, string> = {
    'bombay': 'Mumbai',
    'bangalore': 'Bangalore',
    'bengaluru': 'Bangalore',
    'calcutta': 'Kolkata',
    'new delhi': 'Delhi',
    'gurgaon': 'Gurugram',
    'gurugram': 'Gurgaon',
    'trivandrum': 'Thiruvananthapuram',
    'cochin': 'Kochi',
    'ernakulam': 'Kochi',
    'madras': 'Chennai',
    'vizag': 'Visakhapatnam',
    'vishakapatnam': 'Visakhapatnam',
    'prayagraj': 'Allahabad'
};

// Location patterns for better extraction
export const LOCATION_PATTERNS = [
    // City, State pattern
    /^([^,]+),\s*([^,]+),?\s*(\d{6})?/,
    // Venue Name, Area, City pattern
    /^[^,]+,\s*[^,]+,\s*([^,]+)/,
    // Just city name at the end
    /,\s*([^,]+)$/,
    // City name at the beginning
    /^([^,]+)/
];

/**
 * Extract city name from a venue string
 */
export function extractCityFromVenue(venue: string): string | null {
    if (!venue || typeof venue !== 'string') return null;
    
    const cleanVenue = venue.trim();
    
    // First, check if any major city is mentioned in the venue
    for (const city of MAJOR_CITIES) {
        const regex = new RegExp(`\\b${city}\\b`, 'i');
        if (regex.test(cleanVenue)) {
            return city;
        }
    }
    
    // Check city aliases
    for (const [alias, city] of Object.entries(CITY_ALIASES)) {
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        if (regex.test(cleanVenue)) {
            return city;
        }
    }
    
    // Try pattern matching to extract potential city names
    for (const pattern of LOCATION_PATTERNS) {
        const match = cleanVenue.match(pattern);
        if (match && match[1]) {
            const potentialCity = match[1].trim();
            
            // Check if extracted text matches a known city
            const normalizedCity = normalizeCityName(potentialCity);
            if (MAJOR_CITIES.some(city => city.toLowerCase() === normalizedCity.toLowerCase())) {
                return MAJOR_CITIES.find(city => city.toLowerCase() === normalizedCity.toLowerCase()) || normalizedCity;
            }
        }
    }
    
    return null;
}

/**
 * Normalize city name for consistent comparison
 */
export function normalizeCityName(city: string): string {
    if (!city) return '';
    
    // Remove common prefixes/suffixes and normalize
    return city
        .trim()
        .replace(/^(the\s+)?/i, '') // Remove "the" prefix
        .replace(/\s+(city|town|district)$/i, '') // Remove common suffixes
        .replace(/\s+/g, ' ') // Normalize spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Check if a venue belongs to a specific city
 */
export function isVenueInCity(venue: string, city: string): boolean {
    if (!venue || !city) return false;
    
    const extractedCity = extractCityFromVenue(venue);
    if (!extractedCity) return false;
    
    const normalizedExtracted = normalizeCityName(extractedCity);
    const normalizedTarget = normalizeCityName(city);
    
    return normalizedExtracted.toLowerCase() === normalizedTarget.toLowerCase();
}

/**
 * Get standardized city name (handles variations)
 */
export function getStandardCityName(city: string): string {
    if (!city) return '';
    
    const normalized = normalizeCityName(city);
    
    // Check aliases
    for (const [alias, standardName] of Object.entries(CITY_ALIASES)) {
        if (alias.toLowerCase() === normalized.toLowerCase()) {
            return standardName;
        }
    }
    
    // Check major cities for exact match
    const found = MAJOR_CITIES.find(majorCity => 
        majorCity.toLowerCase() === normalized.toLowerCase()
    );
    
    return found || normalized;
}

/**
 * Extract all possible cities mentioned in a venue string
 */
export function extractAllCitiesFromVenue(venue: string): string[] {
    if (!venue) return [];
    
    const cities: string[] = [];
    const cleanVenue = venue.toLowerCase();
    
    // Check for all major cities mentioned
    for (const city of MAJOR_CITIES) {
        if (new RegExp(`\\b${city.toLowerCase()}\\b`).test(cleanVenue)) {
            cities.push(city);
        }
    }
    
    // Check aliases
    for (const [alias, city] of Object.entries(CITY_ALIASES)) {
        if (new RegExp(`\\b${alias.toLowerCase()}\\b`).test(cleanVenue)) {
            if (!cities.includes(city)) {
                cities.push(city);
            }
        }
    }
    
    return cities;
}

/**
 * Format location display text
 */
export function formatLocationDisplay(venue: string, maxLength: number = 50): string {
    if (!venue) return '';
    
    if (venue.length <= maxLength) return venue;
    
    // Try to show the most important part (usually venue name and city)
    const city = extractCityFromVenue(venue);
    if (city) {
        const withoutCity = venue.replace(new RegExp(`,?\\s*${city}.*$`, 'i'), '');
        const truncated = withoutCity.length > maxLength - city.length - 3 
            ? withoutCity.substring(0, maxLength - city.length - 6) + '...'
            : withoutCity;
        return `${truncated}, ${city}`;
    }
    
    return venue.substring(0, maxLength - 3) + '...';
}

/**
 * Validate if a string contains a valid city
 */
export function isValidCity(city: string): boolean {
    if (!city) return false;
    
    const normalized = normalizeCityName(city);
    return MAJOR_CITIES.some(majorCity => 
        majorCity.toLowerCase() === normalized.toLowerCase()
    ) || Object.values(CITY_ALIASES).some(aliasCity =>
        aliasCity.toLowerCase() === normalized.toLowerCase()
    );
} 