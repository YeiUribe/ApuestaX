import { createContext, useContext, useState } from 'react';
import { logoutSession } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const loginUser = (userData) => {
    setCurrentUser(userData);
  };

  const logoutUser = () => {
    logoutSession();
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.nombre_rol === 'Administrador';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

