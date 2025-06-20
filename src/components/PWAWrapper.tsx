'use client';

import React from 'react';
import { usePWA } from '@/hooks/usePWA';
import UpdateNotification from './UpdateNotification';

interface PWAWrapperProps {
  children: React.ReactNode;
}

const PWAWrapper: React.FC<PWAWrapperProps> = ({ children }) => {
  const {
    updateAvailable,
    newVersion,
    isInstalling,
    installUpdate,
    dismissUpdate
  } = usePWA();

  return (
    <>
      {children}
      <UpdateNotification
        isVisible={updateAvailable}
        onUpdate={installUpdate}
        onDismiss={dismissUpdate}
        version={newVersion || undefined}
      />
    </>
  );
};

export default PWAWrapper;
