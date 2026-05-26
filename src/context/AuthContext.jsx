import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [studentToken, setStudentToken] = useState(() => localStorage.getItem("studentToken") || "");

  useEffect(() => {
    if (adminToken) localStorage.setItem("adminToken", adminToken);
    else localStorage.removeItem("adminToken");
  }, [adminToken]);

  useEffect(() => {
    if (studentToken) localStorage.setItem("studentToken", studentToken);
    else localStorage.removeItem("studentToken");
  }, [studentToken]);

  const loginAdmin = (token) => setAdminToken(token);
  const logoutAdmin = () => setAdminToken("");

  const loginStudent = (token) => setStudentToken(token);
  const logoutStudent = () => setStudentToken("");

  return (
    <AuthContext.Provider value={{ 
      adminToken, loginAdmin, logoutAdmin, isAdminAuthenticated: !!adminToken,
      studentToken, loginStudent, logoutStudent, isStudentAuthenticated: !!studentToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
