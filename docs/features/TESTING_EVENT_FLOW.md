# 🧪 Testing Guide: Create Event Flow

A comprehensive testing guide to verify the new multi-page event creation system.

## ✅ **Test Cases**

### **Test 1: Artist Event Creation**
1. **Login** to your account
2. **Navigate** to `/artist` page
3. **Verify**: "Create Event" button appears next to "Edit Profile"
4. **Click**: "Create Event" button
5. **Expected**: 
   - Redirects to `/create/event`
   - Page title shows "Create Event as [Artist Name] (artist)"
   - Creator info badge appears below title
6. **Create** a test event
7. **Verify**: Event is created successfully

### **Test 2: Organization Event Creation**
1. **Login** to your account
2. **Navigate** to `/organisation` page
3. **Verify**: "Create Event" button appears next to "Edit Profile"
4. **Click**: "Create Event" button
5. **Expected**:
   - Redirects to `/create/event`
   - Page title shows "Create Event as [Org Name] (organisation)"
   - Creator info badge appears below title
6. **Create** a test event
7. **Verify**: Event is created successfully

### **Test 3: Venue Event Creation**
1. **Login** to your account
2. **Navigate** to `/venue` page
3. **Verify**: "Create Event" button appears next to "Edit Profile"
4. **Click**: "Create Event" button
5. **Expected**:
   - Redirects to `/create/event`
   - Page title shows "Create Event as [Venue Name] (venue)"
   - Creator info badge appears below title
6. **Create** a test event
7. **Verify**: Event is created successfully

### **Test 4: Direct Navigation (Legacy)**
1. **Navigate** directly to `/create/event`
2. **Expected**:
   - Page loads normally
   - No creator info badge (fallback to organization)
   - Normal "Create Event" title
3. **Create** a test event
4. **Verify**: Event is created successfully

### **Test 5: Mobile Responsiveness**
1. **Open** on mobile device or use browser dev tools
2. **Navigate** to each profile page (`/artist`, `/organisation`, `/venue`)
3. **Verify**:
   - Buttons stack vertically on mobile
   - Both buttons are full width
   - Buttons remain accessible and functional
4. **Test** event creation flow on mobile
5. **Verify**:
   - Creator info badge scales properly
   - All forms remain usable

## 🔍 **Data Verification**

### **Check Event Data Structure**
After creating events from different pages, verify in Firestore:

```javascript
// Expected event document structure
{
  // ... existing fields ...
  
  // NEW: Creator information
  creator: {
    type: "artist", // or "organisation" or "venue"
    pageId: "artist_123_1234567890", // Actual page ID
    name: "Artist Name",
    username: "artistusername",
    userId: "user123" // User who owns the page
  }
  
  // Legacy fields (should still exist)
  organizationId: "user123",
  hosting_club: "Artist Name", // or Org/Venue name
  organization_username: "artistusername"
}
```

### **Session Storage Behavior**
1. **Before** clicking "Create Event":
   - Session storage should be clean
2. **After** clicking "Create Event":
   - Should redirect immediately to `/create/event`
   - Session storage items should be cleared
3. **Creator info** should be displayed correctly

## 🐛 **Common Issues & Solutions**

### **Issue: "Create Event" button not visible**
- **Solution**: Ensure user is logged in and has created pages
- **Check**: User permissions and page ownership

### **Issue: Creator info not showing**
- **Solution**: Check session storage is working
- **Debug**: Console log creator info state
- **Verify**: Session storage is cleared after reading

### **Issue: Events not attributed correctly**
- **Solution**: Check creator object in event data
- **Verify**: Page IDs match between profiles and events
- **Debug**: Console log event data before submission

### **Issue: Mobile layout broken**
- **Solution**: Check responsive CSS is applied
- **Verify**: Button container stacks properly
- **Test**: All button interactions work on mobile

## 📊 **Performance Testing**

### **Load Time**
- **Profile pages** should load quickly with new buttons
- **Event creation** page should load creator info instantly
- **Session storage** operations should be imperceptible

### **Memory Usage**
- **Session storage** should be cleaned up properly
- **No memory leaks** from event listeners
- **Proper cleanup** on navigation

## 🎯 **Success Criteria**

### **Functional Requirements**
- ✅ All three page types can create events
- ✅ Creator attribution works correctly
- ✅ UI shows appropriate creator context
- ✅ Events are stored with proper creator data
- ✅ Backward compatibility maintained

### **Non-Functional Requirements**
- ✅ Mobile responsive design
- ✅ Fast load times
- ✅ Clean session management
- ✅ Professional UI/UX
- ✅ No breaking changes to existing features

## 🚀 **Ready for Production**

Once all tests pass:
- ✅ **Feature is complete** and ready for users
- ✅ **All page types** can create events professionally  
- ✅ **Clear attribution** for analytics and management
- ✅ **Scalable foundation** for future enhancements

This testing guide ensures the event creation flow works perfectly across all supported page types! 🎪✨ 