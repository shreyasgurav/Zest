# 🚀 Unified EventCard Migration Guide

## 🎯 **Problem Solved**

✅ **No More Component Duplication** - Single EventCard for all use cases  
✅ **Consistent Data Handling** - Centralized error handling & caching  
✅ **Smart Tag System** - E-commerce inspired filtering capability  
✅ **Performance Optimized** - Built-in caching & prefetching  
✅ **Accessibility Ready** - Keyboard navigation & screen readers  

---

## 📋 **Migration Examples**

### **1. Organization Profile (Current EventBox)**

**❌ BEFORE:**
```tsx
// src/app/(public)/organisation/[username]/page.tsx
{eventIds.map((eventId) => (
  <EventBox 
    key={eventId} 
    eventId={eventId} 
    isCollaboration={collaboratedEventIds.includes(eventId)}
    collaboratorPageName={collaboratedEventIds.includes(eventId) ? orgDetails?.name : undefined}
  />
))}
```

**✅ AFTER:**
```tsx
import { EventCard } from '@/components/ui/EventCard';

{eventIds.map((eventId) => {
  const isCollab = collaboratedEventIds.includes(eventId);
  
  return (
    <EventCard
      key={eventId}
      eventId={eventId}
      variant="default"
      context="profile"
      tags={isCollab ? [{
        type: 'collaboration',
        label: 'COLLAB',
        metadata: { collaboratorName: orgDetails?.name }
      }] : []}
    />
  );
})}
```

### **2. Dashboard (Current DashboardBox)**

**❌ BEFORE:**
```tsx
// Multiple DashboardBox implementations with different props
<DashboardBox 
  item={item}
  onClick={handleClick}
  isCollaboratedEvent={item.accessLevel === 'collaboration'}
/>
```

**✅ AFTER:**
```tsx
import { EventCard } from '@/components/ui/EventCard';

<EventCard
  eventId={item.id}
  variant="dashboard"
  context="dashboard"
  tags={item.accessLevel === 'collaboration' ? [{
    type: 'collaboration',
    metadata: { sharedBy: item.sharedBy }
  }] : []}
  onClick={handleClick}
/>
```

### **3. Collaborated Events List (Complete Replacement)**

**❌ BEFORE:**
```tsx
// src/domains/events/components/CollaboratedEventsList/CollaboratedEventsList.tsx
// Custom implementation with separate data fetching
{collaboratedEvents.map((event) => (
  <div key={event.id} className={styles.eventCard}>
    {/* Custom card implementation */}
  </div>
))}
```

**✅ AFTER:**
```tsx
import { EventCard } from '@/components/ui/EventCard';

{collaboratedEventIds.map((eventId) => (
  <EventCard
    key={eventId}
    eventId={eventId}
    variant="default"
    context="collaboration"
    tags={[{
      type: 'collaboration',
      label: 'COLLAB'
    }]}
  />
))}
```

---

## 🎨 **Tag System Examples**

### **Smart Filtering (E-commerce Style)**
```tsx
// Featured events
<EventCard
  eventId={eventId}
  tags={[
    { type: 'featured', label: 'FEATURED' },
    { type: 'popular', label: 'TRENDING' }
  ]}
/>

// Sold out events
<EventCard
  eventId={eventId}
  tags={[
    { type: 'soldout', label: 'SOLD OUT' }
  ]}
/>

// New events with collaboration
<EventCard
  eventId={eventId}
  tags={[
    { type: 'new', label: 'NEW' },
    { type: 'collaboration', metadata: { partner: 'Artist Name' } }
  ]}
/>
```

### **Context-Aware Rendering**
```tsx
// Search results page
<EventCard
  eventId={eventId}
  variant="wide"
  context="search"
  tags={searchResultTags}
  priority={isFirstResult}
/>

// Mobile compact view
<EventCard
  eventId={eventId}
  variant="compact"
  context="profile"
/>
```

---

## ⚡ **Performance Optimizations**

### **Data Prefetching**
```tsx
import { prefetchEvent, EventCard } from '@/components/ui/EventCard';

// Prefetch on hover for instant loading
const handleMouseEnter = (eventId: string) => {
  prefetchEvent(eventId);
};

// Pre-populate cache with already fetched data
const eventData = await fetchEventData(eventId);

<EventCard
  eventId={eventId}
  eventData={eventData} // Skip data fetching
/>
```

### **Cache Management**
```tsx
import { invalidateEventCache } from '@/components/ui/EventCard';

// Invalidate cache when event is updated
const handleEventUpdate = (eventId: string) => {
  invalidateEventCache(eventId);
  // Component will refetch fresh data
};

// Clear all cached events
const handleSignOut = () => {
  invalidateEventCache(); // Clear all cache
};
```

---

## 🔧 **Error Handling Excellence**

### **Smart Error Recovery**
```tsx
// The EventCard automatically handles:
// ✅ Network failures with retry button
// ✅ Event not found (when collaborations are deleted)
// ✅ Loading states with beautiful skeletons
// ✅ Graceful degradation

// No more "Event not found" showing in profiles!
```

### **Custom Error Handling**
```tsx
<EventCard
  eventId={eventId}
  onClick={(eventId) => {
    // Custom click handling
    analytics.track('event_card_click', { eventId });
    router.push(`/event-profile/${eventId}`);
  }}
  onTagClick={(tag) => {
    // Handle tag clicks for filtering
    if (tag.type === 'collaboration') {
      showCollaborationDetails(tag.metadata);
    }
  }}
/>
```

---

## 🎯 **Advanced Use Cases**

### **Dynamic Filtering (Future-Ready)**
```tsx
const EventGrid = ({ events, filters }) => {
  return (
    <div className="grid">
      {events.map(event => {
        const tags = [];
        
        // Dynamic tag generation based on filters
        if (event.isCollaboration) tags.push({ type: 'collaboration' });
        if (event.isFeatured) tags.push({ type: 'featured' });
        if (event.isNew) tags.push({ type: 'new' });
        if (event.soldOut) tags.push({ type: 'soldout' });
        
        return (
          <EventCard
            key={event.id}
            eventId={event.id}
            variant={filters.viewMode} // 'default' | 'compact' | 'wide'
            tags={tags}
          />
        );
      })}
    </div>
  );
};
```

### **Batch Operations (Admin)**
```tsx
const AdminEventGrid = ({ eventIds }) => {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  
  return (
    <>
      {eventIds.map(eventId => (
        <EventCard
          key={eventId}
          eventId={eventId}
          variant="dashboard"
          context="dashboard"
          onClick={(id) => {
            setSelectedEvents(prev => 
              prev.has(id) 
                ? new Set([...prev].filter(x => x !== id))
                : new Set([...prev, id])
            );
          }}
          tags={selectedEvents.has(eventId) ? [{ type: 'featured', label: 'SELECTED' }] : []}
        />
      ))}
    </>
  );
};
```

---

## 🚀 **Implementation Checklist**

### **Phase 1: Core Migration**
- [ ] Replace `EventBox` in organization profiles
- [ ] Replace `EventBox` in venue profiles  
- [ ] Replace `EventBox` in artist profiles
- [ ] Replace `DashboardBox` in dashboards

### **Phase 2: Advanced Features**
- [ ] Remove `CollaboratedEventsList` component entirely
- [ ] Update event dashboard to use unified cards
- [ ] Add tag-based filtering system
- [ ] Implement performance optimizations

### **Phase 3: Enhancement**
- [ ] Add custom tag types for business needs
- [ ] Implement tag-based analytics
- [ ] Add A/B testing for different variants
- [ ] Create admin tools for tag management

---

## 🎨 **Styling Customization**

### **Custom Themes**
```tsx
// Add custom CSS classes for brand-specific styling
<EventCard
  eventId={eventId}
  className="brand-primary-card"
  variant="default"
/>
```

### **Context-Specific Styling**
```tsx
// The component automatically applies context classes:
// .eventCard.profile - For profile pages
// .eventCard.dashboard - For dashboard layouts
// .eventCard.search - For search results
// .eventCard.collaboration - For collaboration contexts
```

---

## 📈 **Expected Benefits**

### **Developer Experience**
- **90% Less Code** - One component vs multiple implementations
- **100% Consistent** - Same behavior everywhere
- **Type-Safe** - Full TypeScript support
- **Self-Documenting** - Clear props interface

### **User Experience**
- **Faster Loading** - Built-in caching & prefetching
- **Consistent UI** - Same design patterns everywhere
- **Better Accessibility** - Keyboard navigation & screen readers
- **Error Recovery** - Smart retry mechanisms

### **Business Value**
- **Easier A/B Testing** - One component to test
- **Future-Proof** - Easy to add new features
- **Analytics Ready** - Built-in event tracking hooks
- **SEO Optimized** - Proper semantic markup

---

## 🛠️ **Next Steps**

1. **Start with one profile page** (organization/venue/artist)
2. **Test the migration thoroughly**
3. **Replace dashboard implementations**
4. **Remove old components gradually**
5. **Add advanced features (tags, filtering)**

This unified solution eliminates all the issues you mentioned while providing a scalable foundation for future growth! 🚀 