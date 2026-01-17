"use client";

import { createContext, ReactNode, useState } from "react";

export const AdminContext = createContext<{
  user: any;
  managedAdvertisers: any[];
  updateUser: (user: any) => void;
  refreshUser: () => Promise<void>;
} | null>(null);

interface AdminProviderProps {
  children: ReactNode;
  adminData: {
    user: any;
    managedAdvertisers: any[];
  };
}

export function AdminProvider({ children, adminData }: AdminProviderProps) {
  const [user, setUser] = useState(adminData.user);

  const updateUser = (updatedUser: any) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
    }
  };

  const contextValue = {
    user,
    managedAdvertisers: adminData.managedAdvertisers,
    updateUser,
    refreshUser
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
