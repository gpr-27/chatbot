import React, { useState } from 'react';
import '../styles/Auth.css';

function LoginForm({ onLoginSuccess, switchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEmail('');
        setPassword('');
        onLoginSuccess(data);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        
        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="auth-button" 
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Login'}
        </button>
        
        <div className="auth-switch">
          <span>
            Don't have an account?{' '}
            <button 
              type="button" 
              className="switch-button" 
              onClick={switchToSignup}
            >
              Sign Up
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}

export default LoginForm; 