/**
 * City boundaries and coordinates for location-based filtering
 * Similar to how BookMyShow, Airbnb, and other platforms handle city boundaries
 */

export interface CityBoundary {
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in kilometers
  aliases: string[];
  state: string;
  country: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Major Indian cities with precise coordinates and boundaries
 * Coordinates are based on city centers, radius covers metropolitan areas
 */
export const CITY_BOUNDARIES: Record<string, CityBoundary> = {
  'Mumbai': {
    name: 'Mumbai',
    center: { lat: 19.0760, lng: 72.8777 },
    radius: 25, // Covers Greater Mumbai
    aliases: ['bombay', 'mumbai', 'greater mumbai'],
    state: 'Maharashtra',
    country: 'India',
    bounds: {
      north: 19.2500,
      south: 18.8900,
      east: 73.0300,
      west: 72.7500
    }
  },
  'Delhi': {
    name: 'Delhi',
    center: { lat: 28.7041, lng: 77.1025 },
    radius: 30, // Covers NCR region
    aliases: ['new delhi', 'delhi ncr', 'ncr', 'national capital region'],
    state: 'Delhi',
    country: 'India',
    bounds: {
      north: 28.8800,
      south: 28.4200,
      east: 77.3500,
      west: 76.8500
    }
  },
  'Bangalore': {
    name: 'Bangalore',
    center: { lat: 12.9716, lng: 77.5946 },
    radius: 20,
    aliases: ['bengaluru', 'bangalore', 'silicon city'],
    state: 'Karnataka',
    country: 'India',
    bounds: {
      north: 13.1400,
      south: 12.8000,
      east: 77.8000,
      west: 77.3500
    }
  },
  'Hyderabad': {
    name: 'Hyderabad',
    center: { lat: 17.3850, lng: 78.4867 },
    radius: 25,
    aliases: ['hyderabad', 'secunderabad', 'cyberabad'],
    state: 'Telangana',
    country: 'India',
    bounds: {
      north: 17.5500,
      south: 17.2000,
      east: 78.7000,
      west: 78.2500
    }
  },
  'Chennai': {
    name: 'Chennai',
    center: { lat: 13.0827, lng: 80.2707 },
    radius: 20,
    aliases: ['madras', 'chennai'],
    state: 'Tamil Nadu',
    country: 'India',
    bounds: {
      north: 13.2500,
      south: 12.9000,
      east: 80.5000,
      west: 80.0000
    }
  },
  'Kolkata': {
    name: 'Kolkata',
    center: { lat: 22.5726, lng: 88.3639 },
    radius: 18,
    aliases: ['calcutta', 'kolkata'],
    state: 'West Bengal',
    country: 'India',
    bounds: {
      north: 22.7000,
      south: 22.4000,
      east: 88.5000,
      west: 88.2000
    }
  },
  'Pune': {
    name: 'Pune',
    center: { lat: 18.5204, lng: 73.8567 },
    radius: 20,
    aliases: ['pune', 'poona'],
    state: 'Maharashtra',
    country: 'India',
    bounds: {
      north: 18.7000,
      south: 18.3500,
      east: 74.0000,
      west: 73.7000
    }
  },
  'Jaipur': {
    name: 'Jaipur',
    center: { lat: 26.9124, lng: 75.7873 },
    radius: 15,
    aliases: ['jaipur', 'pink city'],
    state: 'Rajasthan',
    country: 'India',
    bounds: {
      north: 27.0500,
      south: 26.7500,
      east: 76.0000,
      west: 75.5500
    }
  },
  'Ahmedabad': {
    name: 'Ahmedabad',
    center: { lat: 23.0225, lng: 72.5714 },
    radius: 18,
    aliases: ['ahmedabad', 'amdavad'],
    state: 'Gujarat',
    country: 'India',
    bounds: {
      north: 23.1500,
      south: 22.9000,
      east: 72.7500,
      west: 72.4000
    }
  },
  'Gurgaon': {
    name: 'Gurgaon',
    center: { lat: 28.4595, lng: 77.0266 },
    radius: 12,
    aliases: ['gurgaon', 'gurugram'],
    state: 'Haryana',
    country: 'India',
    bounds: {
      north: 28.5500,
      south: 28.3500,
      east: 77.1500,
      west: 76.9000
    }
  },
  'Noida': {
    name: 'Noida',
    center: { lat: 28.5355, lng: 77.3910 },
    radius: 10,
    aliases: ['noida', 'greater noida'],
    state: 'Uttar Pradesh',
    country: 'India',
    bounds: {
      north: 28.6500,
      south: 28.4500,
      east: 77.5000,
      west: 77.2500
    }
  },
  'Kochi': {
    name: 'Kochi',
    center: { lat: 9.9312, lng: 76.2673 },
    radius: 15,
    aliases: ['cochin', 'kochi', 'ernakulam'],
    state: 'Kerala',
    country: 'India',
    bounds: {
      north: 10.0500,
      south: 9.8000,
      east: 76.4000,
      west: 76.1000
    }
  },
  'Indore': {
    name: 'Indore',
    center: { lat: 22.7196, lng: 75.8577 },
    radius: 12,
    aliases: ['indore'],
    state: 'Madhya Pradesh',
    country: 'India',
    bounds: {
      north: 22.8000,
      south: 22.6000,
      east: 76.0000,
      west: 75.7000
    }
  },
  'Bhopal': {
    name: 'Bhopal',
    center: { lat: 23.2599, lng: 77.4126 },
    radius: 12,
    aliases: ['bhopal'],
    state: 'Madhya Pradesh',
    country: 'India',
    bounds: {
      north: 23.3500,
      south: 23.1500,
      east: 77.5500,
      west: 77.2500
    }
  },
  'Visakhapatnam': {
    name: 'Visakhapatnam',
    center: { lat: 17.6868, lng: 83.2185 },
    radius: 15,
    aliases: ['vizag', 'visakhapatnam', 'vishakhapatnam'],
    state: 'Andhra Pradesh',
    country: 'India',
    bounds: {
      north: 17.8000,
      south: 17.5500,
      east: 83.4000,
      west: 83.0000
    }
  },
  'Lucknow': {
    name: 'Lucknow',
    center: { lat: 26.8467, lng: 80.9462 },
    radius: 15,
    aliases: ['lucknow'],
    state: 'Uttar Pradesh',
    country: 'India',
    bounds: {
      north: 26.9500,
      south: 26.7500,
      east: 81.1000,
      west: 80.8000
    }
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if coordinates are within a city's boundaries
 */
export function isWithinCityBounds(
  venueCoords: { lat: number; lng: number },
  cityName: string
): boolean {
  const city = CITY_BOUNDARIES[cityName];
  if (!city) return false;

  const distance = calculateDistance(
    venueCoords.lat,
    venueCoords.lng,
    city.center.lat,
    city.center.lng
  );

  return distance <= city.radius;
}

/**
 * Find city for given coordinates
 */
export function findCityForCoordinates(
  coords: { lat: number; lng: number }
): string | null {
  for (const [cityName, city] of Object.entries(CITY_BOUNDARIES)) {
    if (isWithinCityBounds(coords, cityName)) {
      return cityName;
    }
  }
  return null;
}

/**
 * Get nearby cities within a larger radius
 */
export function getNearbyCity(
  coords: { lat: number; lng: number },
  maxDistance: number = 50
): string | null {
  let closestCity: string | null = null;
  let minDistance = Infinity;

  for (const [cityName, city] of Object.entries(CITY_BOUNDARIES)) {
    const distance = calculateDistance(
      coords.lat,
      coords.lng,
      city.center.lat,
      city.center.lng
    );

    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      closestCity = cityName;
    }
  }

  return closestCity;
}

/**
 * Check if venue belongs to city using coordinates or aliases
 */
export function matchVenueToCity(
  venueCoords: { lat: number; lng: number } | null,
  venueText: string,
  targetCity: string
): boolean {
  // First try coordinate-based matching (most accurate)
  if (venueCoords) {
    if (isWithinCityBounds(venueCoords, targetCity)) {
      return true;
    }
    
    // Check if it's in a nearby area
    const nearbyCity = getNearbyCity(venueCoords, 30);
    if (nearbyCity === targetCity) {
      return true;
    }
  }

  // Fallback to text-based matching with aliases
  const city = CITY_BOUNDARIES[targetCity];
  if (!city) return false;

  const venueTextLower = venueText.toLowerCase();
  
  // Check main city name
  if (venueTextLower.includes(targetCity.toLowerCase())) {
    return true;
  }

  // Check aliases
  for (const alias of city.aliases) {
    if (venueTextLower.includes(alias.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Get all cities as array for dropdown/selection
 */
export function getAllCities(): string[] {
  return Object.keys(CITY_BOUNDARIES);
}

/**
 * Get city info by name
 */
export function getCityInfo(cityName: string): CityBoundary | null {
  return CITY_BOUNDARIES[cityName] || null;
}

/**
 * Get cities by state
 */
export function getCitiesByState(state: string): string[] {
  return Object.entries(CITY_BOUNDARIES)
    .filter(([_, city]) => city.state === state)
    .map(([name, _]) => name);
} 