# Create Event Page Environment Setup

## Required Environment Variables

The create event page requires the following environment variables to be set in your `.env.local` file:

### Google Maps API Key

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Setup Instructions:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
4. Create API credentials (API Key)
5. Restrict the API key to your domain for security
6. Add the key to your `.env.local` file

### Security Considerations

- **API Key Restrictions**: Restrict your Google Maps API key to your domain only
- **API Permissions**: Only enable Maps JavaScript API and Places API
- **Rate Limiting**: Set up appropriate quotas and billing alerts

## Environment File Example

Create a `.env.local` file in your project root:

```env
# Google Maps API Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDjDazO71t0Deh_h6fMe_VHoKmVNEKygSM

# Note: Replace with your actual API key and restrict it properly
```

## Troubleshooting

### Common Issues:

1. **Maps not loading**: Check that your API key is correct and has the right permissions
2. **CORS errors**: Ensure your domain is added to the API key restrictions
3. **Places autocomplete not working**: Verify Places API is enabled for your key

### Testing:

You can test if your API key works by checking the browser console for any Google Maps related errors when accessing the create event page. 