import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [mode, setMode] = useState('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!fullName || !email || !password || !confirmPassword) {
        setError('Please fill all fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agree) {
        setError('Please agree to the Terms and Privacy Policy.');
        return;
      }
    } else if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(fullName, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center font-bold">TD</div>
          <span className="text-xl font-bold text-brand">Trade Diary</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex mb-5 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}
            >
              Register
            </button>
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center">
            {mode === 'register' ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-gray-400 text-center mb-5">
            {mode === 'register' ? 'Join us today' : 'Sign in to continue journaling'}
          </p>

          {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
            </div>
            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
              </div>
            )}
            {mode === 'register' && (
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-brand" />
                I agree to the <span className="text-brand">Terms</span> and <span className="text-brand">Privacy Policy</span>
              </label>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-60">
              {loading ? 'Please wait...' : mode === 'register' ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            {mode === 'register' ? (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-brand font-medium">Sign in</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-brand font-medium">Sign up</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
