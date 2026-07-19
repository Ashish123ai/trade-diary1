import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const [mode, setMode] = useState('register'); // 'login' | 'register' | 'otp'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

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
        const data = await register(fullName, email, password);
        if (data.needsVerification) {
          setOtpEmail(data.email);
          setMode('otp');
          setInfo(`We've sent a 6-digit code to ${data.email}.`);
        }
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        setOtpEmail(data.email);
        setMode('otp');
        setInfo(`Your email isn't verified yet. Enter the code we sent to ${data.email}, or resend it below.`);
      } else {
        setError(data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!otp || otp.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(otpEmail, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await resendOtp(otpEmail);
      setInfo('A new code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend code.');
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
          {mode !== 'otp' && (
            <div className="flex mb-5 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Login
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); setInfo(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}
              >
                Register
              </button>
            </div>
          )}

          {mode === 'otp' ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 text-center">Verify your email</h2>
              <p className="text-sm text-gray-400 text-center mb-5">Enter the code sent to {otpEmail}</p>

              {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
              {info && <div className="mb-4 bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{info}</div>}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">6-digit code</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    className="input text-center tracking-[0.5em] text-lg font-semibold"
                    placeholder="000000"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-60">
                  {loading ? 'Please wait...' : 'Verify & Continue'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-4">
                Didn't get it?{' '}
                <button onClick={handleResend} disabled={loading} className="text-brand font-medium">Resend code</button>
              </p>
              <p className="text-center text-sm text-gray-400 mt-2">
                <button onClick={() => { setMode('register'); setError(''); setInfo(''); }} className="text-gray-500">Back</button>
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
