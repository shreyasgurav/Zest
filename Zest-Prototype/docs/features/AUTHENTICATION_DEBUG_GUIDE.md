# Authentication Debug Guide

## 🔍 Quick Debug Commands

Open browser console and use:

```javascript
// Complete authentication state
window.debugAuth.logState()

// Check profile completion  
window.debugAuth.checkProfile()

// Check role access
window.debugAuth.checkRole("artist")

// Check booking requirements
window.debugAuth.checkBooking()
```

## 🚫 Common Issues

### User Can't Access Booking Page
```javascript
window.debugAuth.checkProfile()
```
**Look for**: Missing profile fields
**Solution**: Complete profile at `/login`

### User Can't Access Artist/Organization Pages  
```javascript
window.debugAuth.checkRole("artist")
```
**Look for**: No owned pages
**Solution**: Create pages first

### Email Not Showing in Booking
```javascript
window.debugAuth.checkBooking()
```
**Look for**: Missing `email` field
**Solution**: Profile needs both `contactEmail` and `email`

## 🔧 Manual Session Cleanup

```javascript
sessionStorage.clear()
location.reload()
```

**Required Profile Fields**: name, username, phone, contactEmail, email 