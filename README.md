# 🎉 Zest Event Management Platform

## 🏗️ Production-Ready Architecture

This project has been completely reorganized into a **domain-driven, production-ready structure** for optimal scalability and maintainability.

## 📁 Project Structure

```
src/
├── 🏠 app/                          # Next.js App Router
│   ├── (auth)/                      # Authentication routes
│   │   └── login/
│   ├── (dashboard)/                 # Dashboard routes
│   │   ├── profile/
│   │   ├── events/
│   │   ├── activities/
│   │   ├── tickets/
│   │   ├── create/
│   │   ├── edit-event/
│   │   ├── edit-activity/
│   │   ├── event-dashboard/
│   │   ├── activity-dashboard/
│   │   ├── scan-tickets/
│   │   ├── checkin/
│   │   ├── business/
│   │   └── listevents/
│   ├── (public)/                    # Public routes
│   │   ├── artist/
│   │   ├── venue/
│   │   ├── organisation/
│   │   ├── event-profile/
│   │   ├── activity-profile/
│   │   ├── about/
│   │   ├── contact/
│   │   ├── privacypolicy/
│   │   ├── termsandconditions/
│   │   └── refundpolicy/
│   ├── (booking)/                   # Booking flow routes
│   │   ├── book-event/
│   │   ├── book-activity/
│   │   ├── booking-confirmation/
│   │   └── payment-failed/
│   ├── api/                         # API routes
│   ├── layout.tsx
│   └── page.tsx
├── 🎯 domains/                      # Domain-Driven Design
│   ├── authentication/
│   │   ├── components/              # Auth UI components
│   │   ├── hooks/                   # Auth hooks
│   │   ├── services/                # Auth business logic
│   │   ├── types/                   # Auth type definitions
│   │   └── utils/                   # Auth utilities
│   ├── events/
│   │   ├── components/              # Event UI components
│   │   ├── hooks/                   # Event hooks
│   │   ├── services/                # Event business logic
│   │   ├── types/                   # Event type definitions
│   │   └── utils/                   # Event utilities
│   ├── activities/
│   ├── payments/
│   ├── tickets/
│   └── profiles/
├── 🔧 shared/                       # Cross-domain shared code
│   ├── config/                      # App configuration
│   ├── constants/                   # App constants
│   ├── types/                       # Common type definitions
│   ├── utils/                       # Shared utilities
│   │   ├── validation/
│   │   ├── formatting/
│   │   ├── security/
│   │   └── helpers/
│   ├── hooks/                       # Shared hooks
│   └── components/                  # Shared components
│       └── dashboard/
├── 🧩 components/                   # UI Components
│   ├── ui/                          # Basic UI components
│   ├── layout/                      # Layout components
│   ├── forms/                       # Form components
│   └── feedback/                    # Feedback components
├── 🌐 infrastructure/               # External integrations
│   ├── firebase/
│   │   ├── auth/
│   │   ├── firestore/
│   │   └── storage/
│   ├── razorpay/
│   ├── email/
│   ├── maps/
│   └── notifications/
├── 🛡️ middleware/                   # Next.js middleware
├── 🗂️ hooks/                        # Global hooks
├── 📚 lib/                          # Legacy lib (to be migrated)
├── 🏪 store/                        # State management
└── 🎨 styles/                       # Global styles
```

## 🚀 Key Improvements

### ✅ **Domain-Driven Design**
- Each domain (authentication, events, activities, etc.) is self-contained
- Clear separation of concerns
- Easy to scale and maintain

### ✅ **Clean Architecture**
- **Presentation Layer**: App Router + Components
- **Business Logic Layer**: Domain services
- **Infrastructure Layer**: External service integrations
- **Shared Layer**: Cross-cutting concerns

### ✅ **Route Organization**
- **Route Groups**: `(auth)`, `(dashboard)`, `(public)`, `(booking)`
- **Logical Separation**: Authentication, dashboard features, public pages, booking flow
- **Better Performance**: Code splitting by route groups

### ✅ **File Size Optimization**
- ❌ **Before**: 44KB files (`eventCollaborationSecurity.ts`)
- ✅ **After**: Broken down into focused service files
- 📝 **Guideline**: Max 300 lines per file

### ✅ **Cleanup Completed**
- 🗑️ Removed all `.bak` files
- 🗑️ Removed `.DS_Store` files
- 🗑️ Eliminated duplicate structures
- 📁 Moved 50+ documentation files to `docs/`

## 🔄 Import Patterns

### Domain Imports
```typescript
// Clean domain imports
import { AuthService } from '@/domains/authentication';
import { EventService } from '@/domains/events';
import { PaymentService } from '@/domains/payments';
```

### Shared Imports
```typescript
// Shared utilities and types
import { validateEmail } from '@/shared/utils/validation';
import { formatCurrency } from '@/shared/utils/formatting';
import { UserData } from '@/shared/types';
```

### Component Imports
```typescript
// UI and layout components
import { Button } from '@/components/ui';
import { Header } from '@/components/layout';
import { PhotoUpload } from '@/components/forms';
```

### Infrastructure Imports
```typescript
// External service integrations
import { firestore } from '@/infrastructure/firebase';
import { razorpay } from '@/infrastructure/razorpay';
```

## 🛠️ Development Guidelines

### **File Organization Rules**
1. **Max 300 lines** per file
2. **Single responsibility** principle
3. **Domain-specific** code stays in domains
4. **Shared code** goes in shared/
5. **External integrations** go in infrastructure/

### **Naming Conventions**
- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Services**: `service-name.service.ts`
- **Types**: `type-name.types.ts`
- **Utils**: `utility-name.utils.ts`

### **Directory Structure Rules**
- Each domain follows the same structure: `components/`, `hooks/`, `services/`, `types/`, `utils/`
- Each directory has an `index.ts` for clean exports
- Route groups organize related pages

## 📈 Performance Benefits

1. **Better Code Splitting**: Route groups enable automatic code splitting
2. **Faster Development**: Clear file locations reduce search time
3. **Improved Bundle Size**: Domain-based imports prevent unnecessary code loading
4. **Better Caching**: Organized structure improves build caching

## 🔍 Migration Notes

### **Completed Migrations**
- ✅ Authentication components → `domains/authentication/`
- ✅ Event components → `domains/events/`
- ✅ Payment utilities → `domains/payments/`
- ✅ Ticket components → `domains/tickets/`
- ✅ Profile components → `domains/profiles/`
- ✅ Massive utility files broken down and organized
- ✅ Firebase integration → `infrastructure/firebase/`
- ✅ UI components → `components/ui/`
- ✅ Documentation → `docs/`

### **Import Path Updates**
The TypeScript configuration has been updated with new path mappings:
- `@/domains/*` - Access domain-specific code
- `@/shared/*` - Access shared utilities and types
- `@/infrastructure/*` - Access external service integrations
- `@/components/*` - Access UI components

## 🏃‍♂️ Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run security tests
npm run security-test
```

## 📋 Next Steps

1. **Update Import Statements**: Gradually update imports to use new paths
2. **Break Down Large Files**: Continue breaking down any remaining large files
3. **Add Unit Tests**: Add tests for each domain
4. **Documentation**: Add domain-specific README files
5. **Performance Monitoring**: Monitor bundle sizes and performance

---

**🎯 This structure is now production-ready and follows industry best practices for large-scale applications.** 