# 🎉 Create Event Flow - Multi-Page Support

A comprehensive event creation system where Artists, Organizations, and Venues can create events with proper attribution and tracking.

## 🎭 **Features**

### **Multi-Page Creator Support**
- ✅ **Artists** can create events from their artist profiles
- ✅ **Organizations** can create events from their organization profiles  
- ✅ **Venues** can create events from their venue profiles
- ✅ **Full creator attribution** in event data

### **Smart Creator Detection**
- ✅ **Session-based navigation** from page profiles
- ✅ **Automatic creator info** detection and storage
- ✅ **Fallback to organization** for legacy support
- ✅ **Dynamic page titles** showing creator context

## 🔄 **Flow Overview**

### **1. Page Profile → Create Event**
```
User Profile Page → [Create Event Button] → Event Creation Page
```

**Supported Pages:**
- `/artist` → Artist Profile with Create Event button
- `/organisation` → Organization Profile with Create Event button  
- `/venue` → Venue Profile with Create Event button

### **2. Creator Information Flow**
```typescript
// When clicking "Create Event" from a page profile:
1. Store creator info in sessionStorage:
   - eventCreatorType: 'artist' | 'organisation' | 'venue'
   - eventCreatorPageId: string (page UID)
   - eventCreatorName: string
   - eventCreatorUsername: string

2. Navigate to /create/event

3. Event creation page reads creator info:
   - Shows "Create Event as [Name] ([Type])"
   - Uses creator info in event data
   - Clears session after use
```

### **3. Event Data Structure**
```typescript
interface EventData {
  // ... existing fields ...
  
  // NEW: Creator attribution
  creator: {
    type: 'artist' | 'organisation' | 'venue';
    pageId: string;        // Page UID that created the event
    name: string;          // Page display name
    username: string;      // Page username
    userId: string;        // User who owns the page
  }
  
  // Legacy fields (maintained for compatibility)
  organizationId: string;
  hosting_club: string;
  organization_username: string;
}
```

## 🎨 **UI Components**

### **Profile Buttons Container**
Each profile now has a button container with:
- **Edit Profile** button (existing)
- **Create Event** button (new)

```css
.profileButtonsContainer {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
```

### **Create Event Button Styling**
```css
.createEventButton {
  background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
  /* Beautiful green gradient with hover effects */
}
```

### **Dynamic Page Title**
```jsx
<h1 className={styles.pageTitle}>
  Create Event
  {creatorInfo && (
    <span className={styles.creatorInfo}>
      as {creatorInfo.name} ({creatorInfo.type})
    </span>
  )}
</h1>
```

## 🔧 **Technical Implementation**

### **1. Profile Components Modified**
- `src/components/ArtistProfile/ArtistProfile.tsx`
- `src/components/OrganisationProfile/OrganisationProfile.tsx`
- `src/components/VenueProfile/VenueProfile.tsx`

### **2. Event Creation Enhanced**
- `src/app/create/event/page.tsx`
- Added creator detection logic
- Enhanced event data with creator info
- Dynamic UI based on creator type

### **3. Session Storage Management**
```typescript
// Storing creator info (from profile)
sessionStorage.setItem('eventCreatorType', 'artist');
sessionStorage.setItem('eventCreatorPageId', pageId);
sessionStorage.setItem('eventCreatorName', name);
sessionStorage.setItem('eventCreatorUsername', username);

// Reading creator info (in create event)
const creatorType = sessionStorage.getItem('eventCreatorType');
// ... use and clear after reading
```

## 🚀 **Usage**

### **For Artists**
1. Navigate to `/artist` (your artist profile)
2. Click "Create Event" button
3. Create event page opens with "Create Event as [Artist Name] (artist)"
4. Event will be attributed to your artist page

### **For Organizations**
1. Navigate to `/organisation` (your organization profile)
2. Click "Create Event" button  
3. Create event page opens with "Create Event as [Org Name] (organisation)"
4. Event will be attributed to your organization page

### **For Venues**
1. Navigate to `/venue` (your venue profile)
2. Click "Create Event" button
3. Create event page opens with "Create Event as [Venue Name] (venue)"
4. Event will be attributed to your venue page

## 📊 **Event Attribution Benefits**

### **Clear Ownership**
- Events are properly attributed to the creating page
- Full creator information stored in event data
- Easy filtering and querying by creator type

### **Analytics & Insights**
- Track which page types create the most events
- Analyze event success by creator type
- Generate page-specific event reports

### **User Experience**
- Clear indication of which page is creating the event
- Consistent branding and attribution
- Professional event management workflow

## 🔄 **Backward Compatibility**

The system maintains full backward compatibility:

- **Legacy events** continue to work normally
- **Direct navigation** to `/create/event` falls back to organization lookup
- **Existing event data** structure is preserved
- **No breaking changes** to existing functionality

## 🎯 **Future Enhancements**

### **Potential Features**
- **Event templates** per page type
- **Page-specific event categories**
- **Creator analytics dashboard**
- **Bulk event management** by page
- **Cross-page event collaboration**

This creates a professional, scalable event creation system that properly attributes events to their creators while maintaining a clean, intuitive user experience! 🎪✨ 