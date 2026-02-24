// // import React, { createContext, useContext, useState, useEffect } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import { useToast } from './ToastContext';
// // import api from '../utils/api'; // Imports our Axios client

// // const AuthContext = createContext(null);

// // const parseJwt = (token) => {
// //   try {
// //     if (!token || typeof token !== 'string') return null;
// //     const base64Url = token.split('.')[1];
// //     if (!base64Url) return null;
// //     const base64 = window.atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
// //     const jsonPayload = decodeURIComponent(base64.split('').map(function(c) {
// //         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
// //     }).join(''));
// //     return JSON.parse(jsonPayload);
// //   } catch (e) {
// //     return null;
// //   }
// // };

// // export const AuthProvider = ({ children }) => {
// //   const [user, setUser] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const navigate = useNavigate();
// //   const { addToast } = useToast();

// //   const [token, setToken] = useState(() => localStorage.getItem('token'));

// //   useEffect(() => {
// //     const initAuth = () => {
// //       if (token) {
// //         const decoded = parseJwt(token);
// //         if (decoded && decoded.exp * 1000 > Date.now()) {
// //           // Keep the role from the token
// //           setUser({ ...decoded, token });
// //         } else {
// //           localStorage.removeItem('token');
// //           setToken(null);
// //           setUser(null);
// //         }
// //       } else {
// //         setUser(null);
// //       }
// //       setLoading(false);
// //     };
// //     initAuth();
// //   }, [token]);

// //   const login = async (email, password) => {
// //     try {
// //       // Calls POST /api/auth/login on backend
// //       const response = await api.post('/auth/login', { email, password });
// //       const { access_token, user_id, role } = response.data;

// //       localStorage.setItem('token', access_token);
// //       setToken(access_token);

// //       const decoded = parseJwt(access_token);
// //       setUser({ ...decoded, user_id, role, token: access_token });

// //       addToast(`Access Granted: ${role}`, 'success');

// //       // Backend dictates the role, so we route based on true backend role
// //       if (role === 'MASTER') navigate('/master/dashboard');
// //       else if (role === 'COORDINATOR') navigate('/coordinator/dashboard');
// //       else navigate('/team/dashboard');

// //       return true;
// //     } catch (error) {
// //       const errMsg = error.response?.data?.error || 'Login failed. Check credentials.';
// //       addToast(errMsg, 'error');
// //       throw error; // Throw so the login page can stop its loading spinner
// //     }
// //   };

// //   const register = async (formData) => {
// //     try {
// //       // Calls POST /api/auth/register on backend
// //       await api.post('/auth/register', {
// //         name: formData.teamName, // Maps teamName to the User's name
// //         email: formData.email,
// //         password: formData.password,
// //         role: 'TEAM' // Backend requires role
// //       });
      
// //       addToast('Registration successful! Please login.', 'success');
// //       navigate('/login');
// //     } catch (error) {
// //       const errMsg = error.response?.data?.error || 'Registration failed';
// //       addToast(errMsg, 'error');
// //       throw error;
// //     }
// //   };

// //   const logout = async () => {
// //     try {
// //       // Notify backend to delete active session
// //       await api.post('/auth/logout');
// //     } catch (e) {
// //       console.log("Session already cleared on backend");
// //     } finally {
// //       localStorage.removeItem('token');
// //       setToken(null);
// //       setUser(null);
// //       navigate('/login');
// //       addToast('Logged out successfully', 'info');
// //     }
// //   };

// //   return (
// //     <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
// //       {children}
// //     </AuthContext.Provider>
// //   );
// // };

// // export const useAuth = () => {
// //   const context = useContext(AuthContext);
// //   if (!context) throw new Error("useAuth must be used within AuthProvider");
// //   return context;
// // }

// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useToast } from './ToastContext';
// import api from '../utils/api'; 

// const AuthContext = createContext(null);

// const parseJwt = (token) => {
//   try {
//     if (!token || typeof token !== 'string') return null;
//     const base64Url = token.split('.')[1];
//     if (!base64Url) return null;
//     const base64 = window.atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
//     const jsonPayload = decodeURIComponent(base64.split('').map(function(c) {
//         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//     }).join(''));
//     return JSON.parse(jsonPayload);
//   } catch (e) {
//     return null;
//   }
// };

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
//   const { addToast } = useToast();

//   const [token, setToken] = useState(() => localStorage.getItem('token'));

//   useEffect(() => {
//     const initAuth = () => {
//       if (token) {
//         const decoded = parseJwt(token);
//         if (decoded && decoded.exp * 1000 > Date.now()) {
//           // Retrieve the saved email
//           const email = localStorage.getItem('user_email');
//           setUser({ ...decoded, token, email });
//         } else {
//           localStorage.removeItem('token');
//           localStorage.removeItem('user_email');
//           setToken(null);
//           setUser(null);
//         }
//       } else {
//         setUser(null);
//       }
//       setLoading(false);
//     };
//     initAuth();
//   }, [token]);

//   const login = async (email, password) => {
//     try {
//       const response = await api.post('/auth/login', { email, password });
//       const { access_token, user_id, role } = response.data;

//       localStorage.setItem('token', access_token);
//       localStorage.setItem('user_email', email); // Save email for Super Admin checks
//       setToken(access_token);

//       const decoded = parseJwt(access_token);
//       setUser({ ...decoded, user_id, role, token: access_token, email });

//       addToast(`Access Granted: ${role}`, 'success');

//       if (role === 'MASTER') navigate('/master/dashboard');
//       else if (role === 'COORDINATOR') navigate('/coordinator/dashboard');
//       else navigate('/team/dashboard');

//       return true;
//     } catch (error) {
//       const errMsg = error.response?.data?.error || 'Login failed. Check credentials.';
//       addToast(errMsg, 'error');
//       throw error; 
//     }
//   };

//   const register = async (formData) => {
//     try {
//       await api.post('/auth/register', {
//         name: formData.teamName, 
//         email: formData.email,
//         password: formData.password,
//         role: 'TEAM'
//       });
      
//       addToast('Registration successful! Please login.', 'success');
//       navigate('/login');
//     } catch (error) {
//       const errMsg = error.response?.data?.error || 'Registration failed';
//       addToast(errMsg, 'error');
//       throw error;
//     }
//   };

//   const logout = async () => {
//     try {
//       await api.post('/auth/logout');
//     } catch (e) {
//       console.log("Session already cleared on backend");
//     } finally {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user_email');
//       setToken(null);
//       setUser(null);
//       navigate('/login');
//       addToast('Logged out successfully', 'info');
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within AuthProvider");
//   return context;
// }


import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import api from '../utils/api'; 

const AuthContext = createContext(null);

const parseJwt = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = window.atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
    const jsonPayload = decodeURIComponent(base64.split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  // SWITCHED TO sessionStorage
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));

  useEffect(() => {
    const initAuth = () => {
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          const email = sessionStorage.getItem('user_email');
          setUser({ ...decoded, token, email });
        } else {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user_email');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user_id, role } = response.data;

      // SWITCHED TO sessionStorage
      sessionStorage.setItem('token', access_token);
      sessionStorage.setItem('user_email', email); 
      setToken(access_token);

      const decoded = parseJwt(access_token);
      setUser({ ...decoded, user_id, role, token: access_token, email });

      addToast(`Access Granted: ${role}`, 'success');

      if (role === 'MASTER') navigate('/master/dashboard');
      else if (role === 'COORDINATOR') navigate('/coordinator/dashboard');
      else navigate('/team/dashboard');

      return true;
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Login failed. Check credentials.';
      addToast(errMsg, 'error');
      throw error; 
    }
  };

  const register = async (formData) => {
    try {
      await api.post('/auth/register', {
        name: formData.teamName, 
        email: formData.email,
        password: formData.password,
        role: 'TEAM'
      });
      
      addToast('Registration successful! Please login.', 'success');
      navigate('/login');
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Registration failed';
      addToast(errMsg, 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.log("Session already cleared on backend");
    } finally {
      // SWITCHED TO sessionStorage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user_email');
      setToken(null);
      setUser(null);
      navigate('/login');
      addToast('Logged out successfully', 'info');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// THIS IS THE CRITICAL EXPORT THAT VITE WAS MISSING
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};