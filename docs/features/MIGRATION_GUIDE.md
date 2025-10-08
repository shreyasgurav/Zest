# 🔄 **MIGRATION GUIDE: Updating Existing Files to New Structure**

This guide provides step-by-step instructions for migrating existing files to use the new ideal project structure.

## 📋 **Migration Checklist**

### **1. Update Import Statements**

#### **Before (Old Imports)**
```typescript
import { db, storage, auth } from "@/lib/firebase";
import { formatDate } from "../../../utils/helpers";
import { Event } from "../../../../types/event";
```

#### **After (New Imports)**
```typescript
import { formatDate, Event } from '@/lib';
import { firestoreService, storageService, authService } from '@/services';
```

### **2. Firebase Service Migration**

#### **Old Pattern**
```typescript
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Usage
const docRef = await addDoc(collection(db, "events"), eventData);
const storageRef = ref(storage, fileName);
```

#### **New Pattern (Option 1: Direct Service)**
```typescript
import { firestoreService, storageService } from '@/services';

// Usage
const docRef = await firestoreService.createDocument("events", eventData);
const { url } = await storageService.uploadImage(file, "events");
```

#### **New Pattern (Option 2: Backward Compatibility)**
```typescript
import { db, storage } from '@/services';
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Usage (note: db() and storage() are functions)
const docRef = await addDoc(collection(db(), "events"), eventData);
const storageRef = ref(storage(), fileName);
```

### **3. Constants and Configuration**

#### **Old Pattern**
```typescript
const EVENT_CATEGORIES = [
  { id: 'music', label: 'Music' },
  { id: 'comedy', label: 'Comedy' },
  // ...
];

const ALL_CITIES = ['Mumbai', 'Delhi', 'Bangalore', /* ... */];

const GUIDE_OPTIONS = [
  { id: 'duration', label: 'Duration' },
  // ...
];
```

#### **New Pattern**
```typescript
import { EVENT_CONFIG, CITIES, GUIDE_OPTIONS } from '@/lib';

// Usage
const categories = EVENT_CONFIG.categories;
const cities = CITIES;
const guideOptions = GUIDE_OPTIONS;
```

### **4. Utility Functions**

#### **Old Pattern**
```typescript
// Custom formatting functions scattered across components
const formatDate = (date) => /* ... */;
const formatPrice = (price) => /* ... */;
const validateEmail = (email) => /* ... */;
```

#### **New Pattern**
```typescript
import { formatDate, formatPrice, isValidEmail } from '@/lib';
```

### **5. Type Definitions**

#### **Old Pattern**
```typescript
interface Event {
  id: string;
  title: string;
  // ... inline definitions
}

interface User {
  uid: string;
  name: string;
  // ... scattered definitions
}
```

#### **New Pattern**
```typescript
import { Event, UserData, EventSession } from '@/lib';
```

## 🔧 **Step-by-Step Migration Process**

### **Step 1: Identify File Type**

#### **Component Files** (`*.tsx`, `*.jsx`)
1. Update imports to use new structure
2. Replace constants with imports from config
3. Replace utility functions with imports from lib
4. Update Firebase usage patterns

#### **Utility Files** (`src/utils/*.ts`)
1. Check if functionality exists in new structure
2. If exists: Delete file and update imports
3. If unique: Move to appropriate location in new structure

#### **Type Files** (`*.d.ts`, inline interfaces)
1. Check if types exist in new structure
2. Move unique types to appropriate location
3. Update imports across codebase

### **Step 2: Update Firebase Usage**

#### **Direct Firebase Calls**
```typescript
// Old
import { db } from "@/lib/firebase";
const docRef = await addDoc(collection(db, "events"), data);

// New (Service Pattern)
import { firestoreService } from '@/services';
const docId = await firestoreService.createDocument("events", data);

// New (Backward Compatible)
import { db } from '@/services';
const docRef = await addDoc(collection(db(), "events"), data);
```

#### **Authentication**
```typescript
// Old
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// New (Service Pattern)
import { authService } from '@/services';
const unsubscribe = authService.onAuthStateChanged(callback);

// New (Backward Compatible)
import { auth } from '@/services';
const unsubscribe = onAuthStateChanged(auth(), callback);
```

### **Step 3: Update Constants and Configuration**

#### **Replace Hardcoded Arrays**
```typescript
// Old
const cities = ['Mumbai', 'Delhi', 'Bangalore'];

// New
import { CITIES } from '@/lib';
```

#### **Replace Inline Configurations**
```typescript
// Old
const categories = [
  { id: 'music', label: 'Music' },
  { id: 'comedy', label: 'Comedy' }
];

// New
import { EVENT_CONFIG } from '@/lib';
const categories = EVENT_CONFIG.categories;
```

### **Step 4: Update Utility Function Calls**

#### **Date and Time Formatting**
```typescript
// Old
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

// New
import { formatDate, formatTime, formatDateTime } from '@/lib';
```

#### **Validation Functions**
```typescript
// Old
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// New
import { isValidEmail, isValidPhone, validateField } from '@/lib';
```

## 📁 **File-by-File Migration Priority**

### **Phase 1: High Priority**
1. `src/app/create/event/page.tsx` ✅ In Progress
2. `src/app/event-profile/[id]/page.tsx`
3. `src/app/book-event/[id]/page.tsx`
4. `src/components/Header/header.tsx`
5. `src/utils/authHelpers.ts`

### **Phase 2: Medium Priority**
1. All dashboard pages
2. Profile components
3. Form components
4. Utility files

### **Phase 3: Low Priority**
1. Static pages
2. Styling files
3. Configuration files

## ⚠️ **Common Migration Issues**

### **1. Function vs Instance**
```typescript
// Wrong
import { db } from '@/services';
collection(db, "events") // Error: db is a function

// Correct
import { db } from '@/services';
collection(db(), "events") // db() returns Firestore instance
```

### **2. Type Conflicts**
```typescript
// Issue: EventSession type conflict
// Component has: { startTime, endTime }
// Lib has: { start_time, end_time }

// Solution: Use local types for now
interface LocalEventSession {
  startTime: string;
  endTime: string;
}
```

### **3. Missing Dependencies**
```typescript
// Issue: Missing Firebase functions
import { uploadBytes } from 'firebase/storage'; // Add missing imports
```

## 🚀 **Benefits After Migration**

### **1. Cleaner Imports**
- Single source for types and utilities
- Consistent import patterns
- Reduced relative path complexity

### **2. Better Type Safety**
- Centralized type definitions
- Auto-completion across project
- Compile-time error detection

### **3. Improved Maintainability**
- Service abstraction allows easy provider switching
- Centralized configuration management
- Reusable utility functions

### **4. Enhanced Developer Experience**
- Faster development with utilities
- Consistent coding patterns
- Better IDE support

## 🎯 **Next Steps**

1. **Complete Current Migration**: Finish updating create event page
2. **Update Key Components**: Focus on frequently used components
3. **Remove Deprecated Files**: Clean up old utility files
4. **Add Tests**: Test new service integrations
5. **Documentation**: Update component documentation

This migration approach ensures a smooth transition while maintaining application functionality throughout the process. 