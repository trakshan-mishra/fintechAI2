import React, { createContext, useContext } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-expo";

const AuthContext = createContext();

export const ClerkAuthProvider = ({ children }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: !isLoaded,
        isAuthenticated: isSignedIn,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);