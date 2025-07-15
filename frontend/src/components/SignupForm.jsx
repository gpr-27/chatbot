import React, { useState } from 'react';
import '../styles/Auth.css';

function SignupForm({ onSignupSuccess, switchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName, email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setFullName('');
        setEmail('');
        setPassword('');
        onSignupSuccess(data);
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>
        
        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Enter your full name"
          />
        </div>
        
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
            placeholder="Enter your password (min 6 characters)"
            minLength="6"
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="auth-button" 
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Sign Up'}
        </button>
        
        <div className="auth-switch">
          <span>
            Already have an account?{' '}
            <button 
              type="button" 
              className="switch-button" 
              onClick={switchToLogin}
            >
              Login
            </button>
          </span>
        </div>
      </form>
    </div>
  );
}

export default SignupForm; 