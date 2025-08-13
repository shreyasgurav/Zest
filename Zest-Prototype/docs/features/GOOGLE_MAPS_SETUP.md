# Google Maps API Setup

This application uses Google Maps API for the location picker feature in artist, venue, and organization profiles.

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key:
   - **Application restrictions**: HTTP referrers (web sites)
   - **API restrictions**: Select the APIs mentioned above

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Google Maps API key:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

### 3. Security Recommendations

- **Never commit your API key** to version control
- **Restrict your API key** to your domain only
- **Set usage quotas** to prevent unexpected charges
- **Monitor usage** in the Google Cloud Console

### 4. Features Provided

The LocationPicker component provides:
- ✅ Real-time location search
- ✅ Google Places autocomplete
- ✅ City/location suggestions
- ✅ Coordinate extraction for mapping
- ✅ Modern, accessible UI

### 5. Usage Limits

Google Maps API has usage limits and pricing:
- **First $200/month**: Free
- **Places API**: $17 per 1000 requests after free tier
- **Maps JavaScript API**: $7 per 1000 requests after free tier

For development and testing, the free tier should be sufficient.

## Troubleshooting

### Common Issues

1. **API Key not working**:
   - Check if APIs are enabled
   - Verify domain restrictions
   - Ensure key is properly set in environment

2. **Location search not working**:
   - Check browser console for errors
   - Verify Places API is enabled
   - Check API quotas in Google Cloud Console

3. **CORS errors**:
   - Add your domain to API key restrictions
   - For localhost, add `http://localhost:3000` 