import React, { useState, useEffect } from 'react';
import { UserRole } from '../../App';
import { Link } from 'react-router-dom';
import { apiLogin, setAuth, apiSendOTP, apiVerifyOTP } from '../../lib/auth';
import { AlertCircle, CheckCircle2, Clock, Heart, Mail, Lock, User, ArrowLeft, KeyRound, Send } from 'lucide-react';

interface LoginPageProps {
  role: UserRole;
  onBack: () => void;
  onLogin: (role: UserRole) => void;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
@keyframes float { from { transform:translateY(0) rotate(0deg); } to { transform:translateY(-20px) rotate(6deg); } }
@keyframes pulse-ring { 0%,100% { box-shadow:0 0 0 0 rgba(13,148,136,0.3); } 50% { box-shadow:0 0 0 14px rgba(13,148,136,0); } }
@keyframes spin-slow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes shake { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-6px); } 40%,80% { transform:translateX(6px); } }
@keyframes scale-in { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
@keyframes check-pop { 0% { transform:scale(0) rotate(-45deg); } 60% { transform:scale(1.2) rotate(5deg); } 100% { transform:scale(1) rotate(0deg); } }

.login-root { font-family:'Inter',sans-serif; min-height:100vh; background:linear-gradient(135deg,#f0fdfa 0%,#fff 45%,#fff7ed 100%); display:flex; flex-direction:column; position:relative; overflow:hidden; }

.login-particle { position:absolute; border-radius:50%; opacity:0.12; pointer-events:none; }

.login-header { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.82); backdrop-filter:blur(18px); border-bottom:1px solid rgba(13,148,136,0.12); animation:slideDown 0.5s ease both; }
.login-header-inner { max-width:900px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }

.login-back-btn { background:transparent; border:1.5px solid #d1d5db; color:#374151; border-radius:10px; padding:8px 18px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; }
.login-back-btn:hover { border-color:#0d9488; color:#0d9488; background:#f0fdfa; transform:translateY(-1px); }

.login-card { background:rgba(255,255,255,0.78); backdrop-filter:blur(20px); border:1.5px solid rgba(255,255,255,0.85); border-radius:24px; box-shadow:0 12px 48px rgba(0,0,0,0.08); padding:36px 32px; width:100%; max-width:440px; animation:fadeUp 0.7s ease 0.15s both; }
@media(max-width:480px) { .login-card { padding:28px 20px; border-radius:20px; } }

.login-tabs { display:flex; gap:4px; background:#f3f4f6; padding:4px; border-radius:14px; margin-bottom:28px; }
.login-tab { flex:1; padding:10px 12px; border:none; border-radius:11px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.25s ease; background:transparent; color:#6b7280; }
.login-tab.active { background:#fff; color:#0d9488; box-shadow:0 2px 12px rgba(13,148,136,0.12); }
.login-tab:hover:not(.active) { color:#374151; background:rgba(255,255,255,0.5); }

.login-input-group { position:relative; margin-bottom:16px; }
.login-input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none; transition:color 0.2s; }
.login-input { width:100%; padding:13px 14px 13px 44px; border:2px solid #e5e7eb; border-radius:14px; font-size:15px; background:rgba(255,255,255,0.7); transition:all 0.25s ease; outline:none; box-sizing:border-box; }
.login-input:focus { border-color:#0d9488; background:#fff; box-shadow:0 0 0 4px rgba(13,148,136,0.1); }
.login-input:focus + .login-input-icon, .login-input:focus ~ .login-input-icon { color:#0d9488; }
.login-input:disabled { background:#f3f4f6; color:#9ca3af; }

.login-submit { width:100%; padding:14px; border:none; border-radius:14px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.25s ease; background:linear-gradient(135deg,#0d9488,#0f766e); color:#fff; margin-top:8px; }
.login-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(13,148,136,0.35); filter:brightness(1.08); }
.login-submit:disabled { background:#d1d5db; cursor:not-allowed; transform:none; box-shadow:none; }

.login-otp-inputs { display:flex; gap:10px; justify-content:center; }
.login-otp-digit { width:48px; height:56px; text-align:center; font-size:22px; font-weight:800; border:2px solid #e5e7eb; border-radius:14px; background:rgba(255,255,255,0.8); transition:all 0.2s ease; outline:none; }
.login-otp-digit:focus { border-color:#0d9488; box-shadow:0 0 0 4px rgba(13,148,136,0.12); background:#fff; transform:scale(1.06); }
.login-otp-digit:disabled { background:#f3f4f6; color:#9ca3af; }
@media(max-width:400px) { .login-otp-digit { width:40px; height:48px; font-size:18px; border-radius:10px; } .login-otp-inputs { gap:6px; } }

.timer-badge { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; font-size:13px; font-weight:600; animation:fadeIn 0.4s ease both; }

.otp-error { display:flex; gap:8px; padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; animation:shake 0.4s ease; }

.success-container { text-align:center; animation:scale-in 0.5s ease both; }
.success-icon { animation:check-pop 0.6s ease 0.1s both; }

.resend-btn { background:none; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:color 0.2s; padding:0; }
.resend-btn:disabled { cursor:not-allowed; }
`;

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

  useEffect(() => {
    if (!showOTPStep) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [showOTPStep]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const interval = setInterval(() => { setResendCountdown((prev) => prev - 1); }, 1000);
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
      } catch (err: any) { alert(err?.message || 'Login failed'); }
      finally { setLoading(false); }
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
      } catch (err: any) { alert(err?.message || 'Failed to send OTP'); }
      finally { setLoading(false); }
    })();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pastedOtp = value.split('').slice(0, 6 - index);
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => { if (index + i < 6) newOtp[index + i] = digit; });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      document.getElementById(`login-otp-${nextIndex}`)?.focus();
    } else if (/^\d*$/.test(value)) {
      const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
      if (value && index < 5) document.getElementById(`login-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`login-otp-${index - 1}`)?.focus();
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) { setOtpError('Please enter all 6 digits'); return; }
    setOtpLoading(true); setOtpError(null);
    try {
      const response = await apiVerifyOTP(email, otpCode, 'login');
      setOtpSuccess(true);
      setTimeout(() => { setAuth(response.token, response.user); onLogin(response.user.role as UserRole); }, 1500);
    } catch (err: any) { setOtpError(err?.message || 'OTP verification failed'); }
    finally { setOtpLoading(false); }
  };

  const resendOTP = async () => {
    setOtpLoading(true); setOtpError(null);
    try {
      await apiSendOTP(email, 'login');
      setOtp(['', '', '', '', '', '']); setTimeLeft(600); setCanResend(false); setResendCountdown(30); setOtpSuccess(false);
    } catch (err: any) { setOtpError(err?.message || 'Failed to resend OTP'); }
    finally { setOtpLoading(false); }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;

  const particles = [
    { left:'8%',top:'20%',w:50,bg:'#0d9488',d:0 },
    { left:'85%',top:'15%',w:35,bg:'#ea580c',d:0.6 },
    { left:'15%',top:'70%',w:65,bg:'#14b8a6',d:1.2 },
    { left:'80%',top:'75%',w:45,bg:'#f97316',d:1.8 },
  ];

  // ── OTP Verification Screen ──
  if (showOTPStep) {
    return (
      <div className="login-root">
        <style>{CSS}</style>
        {particles.map((p,i) => (
          <div key={i} className="login-particle" style={{ left:p.left,top:p.top,width:p.w,height:p.w,background:p.bg, animation:`float ${3+p.d}s ease-in-out ${p.d}s infinite alternate` }} />
        ))}

        <header className="login-header">
          <div className="login-header-inner">
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ background:'linear-gradient(135deg,#0d9488,#ea580c)',borderRadius:10,padding:6,display:'flex',animation:'spin-slow 8s linear infinite' }}>
                <Heart size={16} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontSize:18,fontWeight:800,color:'#0f766e' }}>Verify Email</span>
            </div>
            <button className="login-back-btn" onClick={() => { setShowOTPStep(false); setOtp(['','','','','','']); setOtpError(null); }} disabled={otpLoading}>
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        </header>

        <main style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 16px',position:'relative',zIndex:1 }}>
          <div className="login-card">
            {otpSuccess ? (
              <div className="success-container" style={{ padding:'24px 0' }}>
                <div className="success-icon" style={{ display:'flex',justifyContent:'center',marginBottom:20 }}>
                  <div style={{ width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse-ring 1.5s ease infinite' }}>
                    <CheckCircle2 size={40} color="#fff" />
                  </div>
                </div>
                <h2 style={{ fontSize:24,fontWeight:800,color:'#059669',marginBottom:8 }}>Email Verified!</h2>
                <p style={{ color:'#6b7280',fontSize:14 }}>Logging you in...</p>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                {/* Icon + title */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
                    <div style={{ width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#f0fdfa,#ccfbf1)',border:'2px solid #99f6e4',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <KeyRound size={28} color="#0d9488" />
                    </div>
                  </div>
                  <h2 style={{ fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:6 }}>Enter OTP</h2>
                  <p style={{ color:'#6b7280',fontSize:13 }}>
                    We sent a 6-digit code to <span style={{ fontWeight:700,color:'#0f172a' }}>{email}</span>
                  </p>
                </div>

                {/* Timer */}
                <div className="timer-badge" style={{
                  background: isExpired ? '#fef2f2' : timeLeft < 120 ? '#fefce8' : '#eff6ff',
                  border: `1px solid ${isExpired ? '#fecaca' : timeLeft < 120 ? '#fde68a' : '#bfdbfe'}`,
                  color: isExpired ? '#dc2626' : timeLeft < 120 ? '#ca8a04' : '#2563eb',
                }}>
                  <Clock size={16} />
                  {isExpired ? 'OTP has expired. Request a new one.' : `Expires in ${minutes}:${seconds.toString().padStart(2,'0')}`}
                </div>

                {/* OTP inputs */}
                <div className="login-otp-inputs">
                  {otp.map((digit, index) => (
                    <input key={index} id={`login-otp-${index}`} type="text" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isExpired || otpLoading}
                      className="login-otp-digit"
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="otp-error">
                    <AlertCircle size={18} color="#dc2626" style={{ flexShrink:0,marginTop:1 }} />
                    <span style={{ fontSize:13,color:'#b91c1c' }}>{otpError}</span>
                  </div>
                )}

                <button onClick={verifyOTP} disabled={otpLoading || isExpired || otp.some(d => !d)} className="login-submit">
                  {otpLoading ? (
                    <><svg style={{ animation:'spin-slow 1s linear infinite',width:18,height:18 }} viewBox="0 0 24 24"><circle style={{ opacity:0.25 }} cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" /><path style={{ opacity:0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Verifying...</>
                  ) : 'Verify OTP'}
                </button>

                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:4 }}>
                  <span style={{ fontSize:13,color:'#6b7280' }}>Didn't receive the code?</span>
                  <button onClick={resendOTP}
                    disabled={!canResend || otpLoading || (!isExpired && timeLeft > 30)}
                    className="resend-btn"
                    style={{ color: canResend && (isExpired || timeLeft <= 30) ? '#0d9488' : '#9ca3af' }}
                  >
                    {!canResend && resendCountdown > 0 ? `Resend in ${resendCountdown}s` : isExpired || timeLeft <= 30 ? 'Resend OTP' : 'Resend'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Main Login Screen ──
  return (
    <div className="login-root">
      <style>{CSS}</style>
      {particles.map((p,i) => (
        <div key={i} className="login-particle" style={{ left:p.left,top:p.top,width:p.w,height:p.w,background:p.bg, animation:`float ${3+p.d}s ease-in-out ${p.d}s infinite alternate` }} />
      ))}

      <header className="login-header">
        <div className="login-header-inner">
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ background:'linear-gradient(135deg,#0d9488,#ea580c)',borderRadius:10,padding:6,display:'flex',animation:'spin-slow 8s linear infinite' }}>
              <Heart size={16} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize:18,fontWeight:800,color:'#0f766e' }}>FoodShare — Login</span>
          </div>
          <button className="login-back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </header>

      <main style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'32px 16px',position:'relative',zIndex:1 }}>
        <div className="login-card">
          {/* Title area */}
          <div style={{ textAlign:'center',marginBottom:28,animation:'fadeIn 0.6s ease both' }}>
            <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
              <div style={{ width:64,height:64,borderRadius:18,background: effectiveRole==='hotel' ? 'linear-gradient(135deg,#f0fdfa,#ccfbf1)' : 'linear-gradient(135deg,#fff7ed,#fed7aa)',border: effectiveRole==='hotel' ? '2px solid #99f6e4' : '2px solid #fdba74',display:'flex',alignItems:'center',justifyContent:'center' }}>
                {effectiveRole === 'hotel' ? <User size={28} color="#0d9488" /> : <Heart size={28} color="#ea580c" />}
              </div>
            </div>
            <h2 style={{ fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:6 }}>
              {effectiveRole === 'hotel' ? 'Hotel / Donor Login' : 'NGO Login'}
            </h2>
            <p style={{ fontSize:13,color:'#6b7280' }}>Sign in to your account to continue</p>
          </div>

          {/* Tabs */}
          <div className="login-tabs">
            <button type="button" onClick={() => setLoginMethod('credentials')} className={`login-tab ${loginMethod === 'credentials' ? 'active' : ''}`}>
              <span style={{ display:'inline-flex',alignItems:'center',gap:6 }}><Lock size={13} /> Username</span>
            </button>
            <button type="button" onClick={() => setLoginMethod('otp')} className={`login-tab ${loginMethod === 'otp' ? 'active' : ''}`}>
              <span style={{ display:'inline-flex',alignItems:'center',gap:6 }}><Mail size={13} /> Email OTP</span>
            </button>
          </div>

          {loginMethod === 'credentials' ? (
            <div style={{ animation:'fadeUp 0.35s ease both' }}>
              <div className="login-input-group">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" disabled={loading} className="login-input" style={{ paddingLeft:44 }} />
                <User size={18} className="login-input-icon" style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none' }} />
              </div>
              <div className="login-input-group">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" disabled={loading} className="login-input" style={{ paddingLeft:44 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                <Lock size={18} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none' }} />
              </div>
              <button onClick={handleLogin} disabled={loading || !username || !password} className="login-submit">
                {loading ? (
                  <><svg style={{ animation:'spin-slow 1s linear infinite',width:18,height:18 }} viewBox="0 0 24 24"><circle style={{ opacity:0.25 }} cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" /><path style={{ opacity:0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Signing in...</>
                ) : 'Sign In'}
              </button>
            </div>
          ) : (
            <div style={{ animation:'fadeUp 0.35s ease both',display:'flex',flexDirection:'column',gap:14 }}>
              <div className="login-input-group">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" disabled={loading} className="login-input" style={{ paddingLeft:44 }}
                  onKeyDown={(e) => e.key === 'Enter' && email && handleOTPLogin()} />
                <Mail size={18} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none' }} />
              </div>
              <button onClick={handleOTPLogin} disabled={loading || !email} className="login-submit">
                {loading ? (
                  <><svg style={{ animation:'spin-slow 1s linear infinite',width:18,height:18 }} viewBox="0 0 24 24"><circle style={{ opacity:0.25 }} cx="12" cy="12" r="10" fill="none" strokeWidth="4" stroke="currentColor" /><path style={{ opacity:0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Sending OTP...</>
                ) : <><Send size={15} /> Send OTP</>}
              </button>
              <p style={{ fontSize:12,color:'#9ca3af',textAlign:'center' }}>We'll send a 6-digit code to your email for verification</p>
            </div>
          )}

          <div style={{ marginTop:20,textAlign:'center',fontSize:13,color:'#6b7280',animation:'fadeIn 0.8s ease 0.3s both' }}>
            <span>Don't have an account? </span>
            <Link to={`/register?role=${effectiveRole}`} style={{ color:'#0d9488',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2 }}>Register</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
