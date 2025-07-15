import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import HomePage from './HomePage';

function Auth({ onLogin }) {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { 
          credentials: 'include' 
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.log('Not authenticated');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleSignupSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthMode('login');
  };

  const switchToSignup = () => {
    setAuthMode('signup');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (user) {
    return <HomePage user={user} onLogout={handleLogout} />;
  }

  return (
    <>
      {authMode === 'login' ? (
        <LoginForm 
          onLoginSuccess={handleLoginSuccess} 
          switchToSignup={switchToSignup} 
        />
      ) : (
        <SignupForm 
          onSignupSuccess={handleSignupSuccess} 
          switchToLogin={switchToLogin} 
        />
      )}
    </>
  );
}

export default Auth; 