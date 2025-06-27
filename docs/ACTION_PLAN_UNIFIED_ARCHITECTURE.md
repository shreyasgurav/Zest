# Action Plan: Unified Event Architecture

## 🎯 **Executive Summary**

The current event dashboard has a critical issue: **attendees aren't showing when sessions are selected** because of complex filtering logic and inconsistent data structure between simple and session-centric events.

**Root Cause**: Mixed sessionId vs time/date matching with complex fallback logic that often fails.

**Solution**: Unified architecture where ALL events (simple & session-centric) use the same internal structure with guaranteed sessionId for every attendee.

**Impact**: 10x faster dashboard queries, zero filtering errors, production-ready scalability.

---

## 🔍 **Current Architecture Analysis**

### **Problem 1: Dual Architecture Complexity**
```typescript
// ❌ CURRENT: Two different structures
// Legacy events
{
  architecture: "legacy",
  time_slots: [{date, start_time, end_time}],
  tickets: [{name, capacity, price}]
}

// Session-centric events  
{
  architecture: "session-centric",
  sessions: [{id, date, tickets: [...]}]
}
```

### **Problem 2: Complex Attendee Filtering**
```typescript
// ❌ CURRENT: Complex filtering with multiple fallbacks
const getSessionAttendees = (session) => {
  return attendees.filter(attendee => {
    // Try sessionId first
    if (attendee.sessionId && session.id) {
      return attendee.sessionId === session.id;
    }
    // Fallback to time/date matching (often fails)
    if (attendee.selectedTimeSlot && attendee.selectedDate) {
      return attendee.selectedTimeSlot.start_time === session.start_time &&
             attendee.selectedDate === session.date;
    }
    return false; // 🚨 This is where attendees get lost!
  });
};
```

### **Problem 3: Inconsistent Data**
- Some attendees have `sessionId`, others don't
- Time/date string matching is fragile  
- Legacy and session-centric events handled differently

---

## ✅ **Unified Architecture Solution**

### **1. Single Event Structure (Always)**
```typescript
// ✅ NEW: All events use unified structure
interface UnifiedEvent {
  architecture: "unified";
  mode: "simple" | "session-centric"; // Original creation mode
  
  // Sessions are ALWAYS present (even for simple events)
  sessions: EventSession[];
  
  // Venue configuration
  venue_type: "global" | "per_session";
  global_venue?: string; // For simple mode
  
  // Performance aggregates
  total_sessions: number;
  total_capacity: number;
  earliest_date: string;
  latest_date: string;
  price_range: {min: number; max: number};
}
```

### **2. Guaranteed SessionId for All Attendees**
```typescript
// ✅ NEW: Every attendee ALWAYS has sessionId
interface UnifiedAttendee {
  eventId: string;
  sessionId: string;        // ALWAYS set, even for simple events
  ticketId: string;         // References session.tickets[].id
  
  // Denormalized for performance (no joins needed)
  eventTitle: string;
  sessionName: string;
  sessionDate: string;
  venue: string;
}
```

### **3. Simple, Fast Dashboard Queries**
```typescript
// ✅ NEW: Single, fast query - no complex filtering!
const getSessionAttendees = async (eventId: string, sessionId: string) => {
  const q = query(
    collection(db, "attendees"),
    where("eventId", "==", eventId),
    where("sessionId", "==", sessionId), // Direct match!
    where("status", "==", "confirmed")
  );
  return await getDocs(q);
};
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Update Event Creation (Week 1)**

**Goal**: All new events use unified structure

**Tasks**:
1. ✅ Create `createUnifiedEvent()` function
2. ✅ Update create event page to use unified structure  
3. ✅ Simple mode → single session internally
4. ✅ Session-centric mode → unified sessions with hierarchical ticket IDs

**Code Changes**:
- `src/app/create/event/utils/createUnifiedEvent.ts` - New unified creation logic
- `src/app/create/event/page.tsx` - Update handleSubmit to use unified function
- `src/lib/types/events.ts` - Add unified type definitions

**Testing**:
- Create simple mode event → verify single session created
- Create session-centric event → verify multiple sessions with proper IDs
- Check dashboard shows both event types correctly

### **Phase 2: Update Booking Flow (Week 2)**

**Goal**: All new attendees get proper sessionId and denormalized data

**Tasks**:
1. ✅ Create `createUnifiedBooking()` function
2. ✅ Always set sessionId for every attendee
3. ✅ Add denormalized data for dashboard performance
4. ✅ Update capacity counters in real-time

**Code Changes**:
- `src/utils/booking/createUnifiedBooking.ts` - New booking logic
- Update existing booking pages to use unified booking
- Add proper error handling and rollback logic

**Testing**:
- Book tickets for simple mode event → verify sessionId set
- Book tickets for session-centric event → verify correct session linkage
- Check dashboard immediately shows new attendees

### **Phase 3: Update Dashboard Queries (Week 3)**

**Goal**: Replace complex filtering with simple sessionId queries

**Tasks**:
1. ✅ Create `getDashboardData()` functions
2. ✅ Update dashboard to use direct sessionId filtering
3. ✅ Remove complex time/date matching logic
4. ✅ Add performance monitoring

**Code Changes**:
- `src/utils/dashboard/getDashboardData.ts` - New query functions
- `src/app/event-dashboard/[id]/hooks/useDashboardData.ts` - Updated hook
- `src/app/event-dashboard/[id]/page.tsx` - Remove complex filtering logic

**Testing**:
- Dashboard loads in <2 seconds
- Session selection works instantly
- All attendees show correctly
- No more "attendees missing" issues

### **Phase 4: Deploy Infrastructure (Week 1)**

**Goal**: Set up Firestore indexes and security rules

**Tasks**:
1. ✅ Update `firestore.indexes.json`
2. ✅ Update `firestore.rules`
3. ✅ Deploy and wait for index building
4. ✅ Verify performance improvements

**Code Changes**:
- `firestore.indexes.json` - Add indexes for sessionId queries
- `firestore.rules` - Update security rules for new collections

### **Phase 5: Migration Script (Week 4)**

**Goal**: Migrate existing events and attendees

**Tasks**:
1. ✅ Create event migration script
2. ✅ Create attendee migration script  
3. ✅ Test on staging environment
4. ✅ Run production migration

**Code Changes**:
- `scripts/migrate-to-unified-architecture.js`
- `scripts/migrate-attendees.js`

---

## 📁 **File Structure**

```
docs/
├── HYBRID_EVENT_ARCHITECTURE.md          # 📋 Architecture overview
├── features/UNIFIED_EVENT_IMPLEMENTATION.md  # 💻 Code implementation
├── setup/UNIFIED_ARCHITECTURE_SETUP.md   # 🔧 Deployment guide
└── ACTION_PLAN_UNIFIED_ARCHITECTURE.md   # 🎯 This action plan

src/
├── lib/types/
│   └── events.ts                          # 🆕 Unified type definitions
├── app/create/event/
│   └── utils/createUnifiedEvent.ts        # 🆕 Unified event creation
├── utils/
│   ├── booking/createUnifiedBooking.ts    # 🆕 Unified booking system
│   └── dashboard/getDashboardData.ts      # 🆕 Fast dashboard queries
├── app/event-dashboard/[id]/
│   └── hooks/useDashboardData.ts          # 🔄 Updated dashboard hook
└── scripts/
    ├── migrate-to-unified-architecture.js # 🆕 Event migration
    └── migrate-attendees.js               # 🆕 Attendee migration

config/
├── firestore.indexes.json                # 🔄 Updated indexes
└── firestore.rules                       # 🔄 Updated security rules
```

---

## 🎯 **Success Metrics**

### **Before (Current Issues)**
- ❌ Dashboard load time: 5-10 seconds
- ❌ Session filtering: Often fails, attendees disappear
- ❌ Complex debugging: Multiple fallback methods  
- ❌ Inconsistent data: Mixed sessionId assignment

### **After (Target Goals)**
- ✅ Dashboard load time: <2 seconds
- ✅ Session filtering: Instant, always works
- ✅ Simple debugging: Single query path
- ✅ Consistent data: All attendees have sessionId

### **Key Performance Indicators**
1. **Query Performance**: sessionId filtering <500ms
2. **Data Consistency**: 100% attendees have sessionId  
3. **User Experience**: Zero "missing attendees" reports
4. **Developer Experience**: Single code path for both event types

---

## 🚨 **Critical Success Factors**

### **1. Firestore Indexes MUST be deployed first**
```bash
# Deploy indexes before any code changes
firebase deploy --only firestore:indexes
# Wait for completion (5-10 minutes)
```

### **2. Migration MUST be tested on staging**
```bash
# Test migration on copy of production data
node scripts/migrate-to-unified-architecture.js
# Verify dashboard works correctly
```

### **3. Rollback plan MUST be ready**
- Keep old filtering logic as fallback initially
- Test rollback procedures on staging
- Have database backup before migration

### **4. Monitor performance after deployment**
- Track dashboard load times
- Monitor Firestore query costs
- Watch for any "missing attendees" issues

---

## 🎉 **Expected Outcomes**

### **Immediate Benefits (Week 1-3)**
- ✅ All new events use unified structure
- ✅ New attendees always have sessionId
- ✅ Dashboard performance improves for new data

### **Full Benefits (After Migration)**
- ✅ 10x faster dashboard queries
- ✅ Zero attendee filtering errors
- ✅ Unified codebase (easier maintenance)
- ✅ Production-ready scalability

### **Long-term Benefits**
- ✅ Easy to add new features (waitlists, transfers, etc.)
- ✅ Better analytics and reporting capabilities
- ✅ Consistent developer experience
- ✅ Future-proof architecture

---

## 🚀 **Next Steps**

### **Immediate (Today)**
1. Review the architecture documents
2. Set up staging environment for testing
3. Deploy Firestore indexes to staging

### **This Week**
1. Implement Phase 1 (Event Creation)
2. Test unified event creation on staging
3. Begin Phase 2 (Booking Flow)

### **Next Week** 
1. Complete Phase 2 and 3 (Booking + Dashboard)
2. Test end-to-end flow on staging
3. Prepare migration scripts

### **Week 3-4**
1. Run migration on staging
2. Performance testing and optimization
3. Production deployment and migration

---

**This unified architecture will solve the current session filtering issues while providing a rock-solid foundation for scaling the platform. The approach eliminates complexity while maintaining full flexibility for both simple and complex events.** 🎯

**Ready to implement? Let's start with Phase 1!** 🚀 