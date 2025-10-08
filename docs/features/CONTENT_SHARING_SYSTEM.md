# 🤝 Content Sharing System - User Access Management

A comprehensive content access management system that allows users to share their created pages (Artist, Organization, Venue pages, Events, Activities) with other users, enabling collaboration and delegated management.

## 🎯 **Overview**

The Content Sharing System provides a secure, role-based approach to sharing page access with other users. Whether you want to collaborate on content management, delegate responsibilities, or simply give others access to view your pages, this system handles it all.

## ✨ **Key Features**

### **📋 Content Types Supported**
- ✅ **Artist Pages** - Share your artist profile management
- ✅ **Organization Pages** - Collaborate on organization content  
- ✅ **Venue Pages** - Share venue management responsibilities
- ✅ **Events** - Delegate event management and check-in duties
- ✅ **Activities** - Share activity coordination tasks

### **🔐 Permission Levels**
- **👁️ Viewer** - View-only access to content
- **✏️ Editor** - Can view and edit content
- **👨‍💼 Admin** - Full management access including inviting others

### **💌 Invitation System**
- **Phone Number Invitations** - Invite users by phone number
- **Automatic Detection** - System detects if user has account
- **Guest Invitations** - Send invites to non-users  
- **Expiration Control** - Set time-limited access (hours/days)

## 🚀 **How to Use**

### **1. Share Access to Your Content**

#### **From Artist/Organization/Venue Profile:**
1. Navigate to your profile page (`/artist`, `/organisation`, or `/venue`)
2. Click the **"Share Access"** button next to "Edit Profile"
3. The Content Sharing Manager modal will open

### **2. Add New Collaborators**

#### **Step-by-Step Process:**
1. **Click "Share Access"** button in the modal
2. **Enter User Details:**
   - **Phone Number** (required) - The person you want to share with
   - **Name** (optional) - Their display name
3. **Choose Access Level:**
   - **Viewer** - View only
   - **Editor** - Can edit content  
   - **Admin** - Full management access
4. **Set Expiration** (optional) - Hours until access expires
5. **Add Personal Message** (optional) - Invitation note
6. **Click "Share Access"** to send

### **3. Manage Existing Collaborators**

#### **View Current Access:**
- See all users who have access to your content
- View their permission levels and status
- Check expiration dates for temporary access

#### **Remove Access:**
- Click **"Remove"** button next to any collaborator
- Confirm the removal
- Access is immediately revoked

## 🎭 **Permission System Breakdown**

### **👁️ Viewer Access**
```typescript
✅ Can View Content
❌ Cannot Edit
❌ Cannot Manage Collaborators
❌ Cannot View Analytics
❌ Cannot Delete Content
```

### **✏️ Editor Access**
```typescript  
✅ Can View Content
✅ Can Edit Content
✅ Can View Analytics
❌ Cannot Manage Collaborators
❌ Cannot Delete Content
```

### **👨‍💼 Admin Access**
```typescript
✅ Can View Content
✅ Can Edit Content  
✅ Can Manage Collaborators
✅ Can Invite Others
✅ Can View Analytics
❌ Cannot Delete Content (Owner only)
```

### **👑 Owner (You)**
```typescript
✅ Full Access to Everything
✅ Can Delete Content
✅ Can Remove Any Collaborator
✅ Cannot Be Removed by Others
```

## 📧 **Invitation Flow**

### **For Existing Users:**
1. **Immediate Access** - If phone number matches existing account
2. **Real-time Assignment** - Permissions applied instantly
3. **Notification** - User sees shared content in their PersonLogo dropdown

### **For New Users:**
1. **Phone Invitation** - Invitation stored in system
2. **Account Creation** - User creates account with invited phone number
3. **Automatic Access** - Permissions activated upon signup
4. **7-Day Expiry** - Invitations expire after 7 days

## 🛡️ **Security Features**

### **📋 Access Control**
- **Ownership Verification** - Only owners can share content
- **Permission Hierarchy** - Can't assign higher permissions than you have
- **Session Validation** - All actions require valid authentication
- **Audit Logging** - All sharing activities are logged

### **🔒 Data Protection**
- **Firestore Security Rules** - Database-level access control
- **User Isolation** - Users only see their own sharing data
- **Secure Updates** - All permission changes validated server-side

### **⏰ Expiration Management**
- **Automatic Cleanup** - Expired permissions automatically disabled
- **Grace Period** - Clear indication when access expires
- **Renewal Options** - Easy to extend expiring access

## 📊 **Usage Examples**

### **🎭 Artist Collaboration**
```
Scenario: Band with multiple members
- Add band members as "Editors" 
- Manager gets "Admin" access
- Publicist gets "Viewer" access
- Tour photographer gets temporary "Editor" access (24 hours)
```

### **🏢 Organization Management**
```
Scenario: Event organization company
- CEO maintains "Owner" status
- Event coordinators get "Admin" access
- Marketing team gets "Editor" access  
- Volunteers get "Viewer" access during events
```

## 🔧 **Integration Guide**

### **Adding Sharing to Your Page**

#### **1. Import Components**
```typescript
import ContentSharingManager from '@/components/ContentSharingManager/ContentSharingManager';
import { FaShare } from 'react-icons/fa';
```

#### **2. Add State Management**
```typescript
const [showSharingModal, setShowSharingModal] = useState(false);
```

#### **3. Add Share Button**
```typescript
<button 
  onClick={() => setShowSharingModal(true)}
  className={styles.shareButton}
>
  <FaShare className={styles.shareIcon} />
  Share Access
</button>
```

#### **4. Add Sharing Modal**
```typescript
{showSharingModal && currentPageId && (
  <ContentSharingManager
    contentType="artist" // or "organization", "venue", "event", "activity"
    contentId={currentPageId}
    contentName={pageName}
    onClose={() => setShowSharingModal(false)}
  />
)}
```

## 🚀 **Benefits**

### **👥 For Teams**
- **Streamlined Collaboration** - Multiple people can work on same content
- **Clear Responsibilities** - Role-based access prevents confusion
- **Flexible Management** - Easily add/remove team members
- **Secure Delegation** - Maintain control while sharing responsibilities

### **🎯 For Content Creators**
- **Professional Workflow** - Industry-standard permission system
- **Time-Saving** - Delegate routine tasks to team members
- **Quality Control** - Maintain oversight while enabling collaboration
- **Growth Support** - Scale your operation with team management

### **🔒 For Security**
- **Zero Trust Model** - Every action requires verification
- **Audit Trail** - Complete log of all sharing activities
- **Granular Control** - Precise permission assignment
- **Automatic Cleanup** - Expired permissions auto-revoked

## 🎉 **Getting Started**

### **Quick Start Checklist**
- ✅ **Navigate** to your Artist/Organization/Venue profile
- ✅ **Click** the "Share Access" button
- ✅ **Enter** collaborator's phone number
- ✅ **Choose** appropriate permission level
- ✅ **Send** invitation
- ✅ **Monitor** access in the collaborators list

### **Best Practices**
1. **🎯 Start Small** - Begin with one or two trusted collaborators
2. **⏰ Use Expiration** - Set time limits for temporary access
3. **📝 Add Messages** - Include context in invitation messages
4. **🔄 Regular Review** - Periodically audit who has access
5. **📊 Monitor Activity** - Keep track of how shared access is used

---

**🎊 Ready to collaborate? Start sharing access to your content today!** 