import React, { useState } from 'react';

export default function AuthForm({ mode, onSubmit, onToggleMode, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <span className="brand-mark">JT</span>
          <h1>JobTrack</h1>
        </div>

        <p className="auth-subtitle">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>

        {error && <p className="form-error auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="jdoe"
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button type="button" className="auth-toggle" onClick={onToggleMode}>
          {mode === 'login' ? "Need an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
