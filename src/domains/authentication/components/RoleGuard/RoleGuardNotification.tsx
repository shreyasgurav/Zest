'use client';

import { useEffect } from 'react';
import { toast } from 'react-toastify';

interface RoleGuardNotificationProps {
  currentRole: string;
  attemptedRole: string;
}

const RoleGuardNotification: React.FC<RoleGuardNotificationProps> = ({ 
  currentRole, 
  attemptedRole 
}) => {
  useEffect(() => {
    const roleNames = {
      user: 'User',
      organization: 'Organization',
      artist: 'Artist',
      venue: 'Venue'
    };

    const currentRoleName = roleNames[currentRole as keyof typeof roleNames] || currentRole;
    const attemptedRoleName = roleNames[attemptedRole as keyof typeof roleNames] || attemptedRole;

    toast.warning(
      `You're logged in as ${currentRoleName}. To switch to ${attemptedRoleName}, please log out and log back in.`,
      {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  }, [currentRole, attemptedRole]);

  return null;
};

export default RoleGuardNotification; 