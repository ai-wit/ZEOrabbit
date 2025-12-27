"use client";

import { createContext, ReactNode } from "react";

export const AdminContext = createContext<{
  user: any;
  managedAdvertisers: any[];
} | null>(null);

interface AdminProviderProps {
  children: ReactNode;
  adminData: {
    user: any;
    managedAdvertisers: any[];
  };
}

export function AdminProvider({ children, adminData }: AdminProviderProps) {
  return (
    <AdminContext.Provider value={adminData}>
      {children}
    </AdminContext.Provider>
  );
}
