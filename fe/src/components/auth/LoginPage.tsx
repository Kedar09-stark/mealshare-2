import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { AuthForm } from './AuthForm';
import { UserRole } from '../../App';
import { Link } from 'react-router-dom';
import { apiLogin, setAuth, apiSendOTP, apiVerifyOTP } from '../../lib/auth';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface LoginPageProps {
  role: UserRole;
  onBack: () => void;
  onLogin: (role: UserRole) => void;
}

export function LoginPage({ role, onBack, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  const effectiveRole = role ?? 'ngo';

  // OTP Timer
  useEffect(() => {
    if (!showOTPStep) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showOTPStep]);

  // Resend Countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (resendCountdown === 0 && canResend === false && showOTPStep) {
      setCanResend(true);
    }
  }, [resendCountdown, showOTPStep]);

  const handleLogin = () => {
    if (!username || !password) return alert('Please enter username and password');
    (async () => {
      try {
        setLoading(true);
        const res = await apiLogin(username, password);
        setAuth(res.token, res.user);
        onLogin(res.user.role as UserRole);
      } catch (err: any) {
        const msg = err?.message || 'Login failed';
        alert(msg);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleOTPLogin = () => {
    if (!email) return alert('Please enter your email');
    
    (async () => {
      try {
        setLoading(true);
        await apiSendOTP(email, 'login');
        setShowOTPStep(true);
        setTimeLeft(600);
        setCanResend(false);
        setResendCountdown(0);
      } catch (err: any) {
        alert(err?.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedOtp = value.split('').slice(0, 6 - index);
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      const nextInput = document.getElementById(`login-otp-${nextIndex}`);
      nextInput?.focus();
    } else if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) {
        document.getElementById(`login-otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`login-otp-${index - 1}`)?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const response = await apiVerifyOTP(email, otpCode, 'login');
      setOtpSuccess(true);
      
      setTimeout(() => {
        setAuth(response.token, response.user);
        onLogin(response.user.role as UserRole);
      }, 1500);
    } catch (err: any) {
      setOtpError(err?.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOTP = async () => {
    setOtpLoading(true);
    setOtpError(null);

    try {
      await apiSendOTP(email, 'login');
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(600);
      setCanResend(false);
      setResendCountdown(30);
      setOtpSuccess(false);
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to resend OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;

  if (showOTPStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex flex-col">
        <header className="px-6 py-4 border-b bg-white/80">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xl font-semibold">Verify Email</div>
            <Button variant="outline" onClick={() => {
              setShowOTPStep(false);
              setOtp(['', '', '', '', '', '']);
              setOtpError(null);
            }} disabled={otpLoading}>Back</Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {otpSuccess ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
                  <p className="text-gray-600">Logging you in...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Enter OTP</h2>
                    <p className="text-gray-600">
                      We sent a 6-digit code to <span className="font-semibold text-gray-900">{email}</span>
                    </p>
                  </div>

                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    isExpired
                      ? 'bg-red-50 border border-red-200'
                      : timeLeft < 120
                        ? 'bg-yellow-50 border border-yellow-200'
                        : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <Clock className={`w-5 h-5 ${
                      isExpired
                        ? 'text-red-600'
                        : timeLeft < 120
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isExpired
                        ? 'text-red-700'
                        : timeLeft < 120
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                    }`}>
                      {isExpired
                        ? 'OTP has expired. Request a new one.'
                        : `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-3 justify-between">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`login-otp-${index}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          disabled={isExpired || otpLoading}
                          className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 disabled:text-gray-400 transition"
                        />
                      ))}
                    </div>

                    {otpError && (
                      <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{otpError}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={verifyOTP}
                    disabled={otpLoading || isExpired || otp.some((d) => !d)}
                    className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-600">Didn't receive the code?</span>
                    <button
                      onClick={resendOTP}
                      disabled={!canResend || otpLoading || (!isExpired && timeLeft > 30)}
                      className={`text-sm font-semibold transition ${
                        canResend && (isExpired || timeLeft <= 30)
                          ? 'text-teal-600 hover:text-teal-700 cursor-pointer'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {!canResend && resendCountdown > 0
                        ? `Resend in ${resendCountdown}s`
                        : isExpired || timeLeft <= 30
                          ? 'Resend OTP'
                          : 'Resend'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex flex-col">
      <header className="px-6 py-4 border-b bg-white/80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-semibold">FoodShare — Login</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Back</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full px-4">
          <div className="max-w-md mx-auto bg-white/80 p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-center mb-2">{effectiveRole === 'hotel' ? 'Hotel / Donor Login' : 'NGO Login'}</h2>
            <p className="text-center text-sm text-gray-600 mb-6">Sign in to your account to continue</p>

            {/* Login Method Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod('credentials')}
                className={`flex-1 py-2 px-3 rounded transition font-medium cursor-pointer ${
                  loginMethod === 'credentials'
                    ? 'bg-white text-teal-600 shadow-sm border-2 border-teal-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Username & Password
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('otp')}
                className={`flex-1 py-2 px-3 rounded transition font-medium cursor-pointer ${
                  loginMethod === 'otp'
                    ? 'bg-white text-teal-600 shadow-sm border-2 border-teal-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                Email OTP
              </button>
            </div>

            {loginMethod === 'credentials' ? (
              <>
                <AuthForm
                  username={username}
                  setUsername={setUsername}
                  password={password}
                  setPassword={setPassword}
                  submitLabel={loading ? 'Signing in...' : 'Sign In'}
                  onSubmit={handleLogin}
                  loading={loading}
                />
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 disabled:bg-gray-100 transition"
                  />
                </div>
                <button
                  onClick={handleOTPLogin}
                  disabled={loading || !email}
                  className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
                <p className="text-xs text-gray-600 text-center">
                  We'll send a 6-digit code to your email for verification
                </p>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600 text-center">
              <span>Don't have an account? </span>
              <Link to={`/register?role=${effectiveRole}`} className="text-teal-700 underline">Register</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
