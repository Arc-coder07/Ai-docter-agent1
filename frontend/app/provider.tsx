"use client";
import React, { useEffect, useState } from 'react'
import { useApiClient } from "@/lib/api";
import { useUser } from '@clerk/nextjs';
import { UserDetailContext } from '@/context/UserDetail';

export type UseDetail = {
  name: string,
  email: string,
  credit: number,
}

function Provider({ children }: { children: React.ReactNode }) {
  const [userDetail, setUserDetail] = useState<UseDetail | undefined>(undefined);

  const { user } = useUser();
  const apiClient = useApiClient();
  useEffect(() => {
    if (user) {
      createNewUser();
    }
  }, [user]);

  const createNewUser = async () => {
    try {
      const response = await apiClient("/users", {
        method: "POST",
        data: {
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName
        }
      });
      console.log(response.data);
      setUserDetail(response.data);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  return (
    <div>
      <UserDetailContext.Provider value={userDetail}>
        {children}
      </UserDetailContext.Provider>
    </div>
  )
}

export default Provider
