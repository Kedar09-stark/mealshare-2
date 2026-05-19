import { useEffect, useRef, useState } from 'react';
import { Building2, Heart, MapPin, Award, Users, ArrowRight, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { UserRole } from '../App';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenAuth?: (action: 'login' | 'register', role: UserRole) => void;
}

/* ─── tiny hook: fires once when element enters viewport ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── animated counter ─── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 60);
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setCount(to); clearInterval(id); }
      else setCount(start);
    }, 24);
    return () => clearInterval(id);
  }, [visible, to]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── floating particle ─── */
function Particle({ x, y, size, delay, color }: { x: number; y: number; size: number; delay: number; color: string }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: size, height: size, borderRadius: '50%',
      background: color, opacity: 0.18,
      animation: `float ${3 + delay}s ease-in-out ${delay}s infinite alternate`,
      pointerEvents: 'none',
    }} />
  );
}

const PARTICLES = [
  { x: 8,  y: 15, size: 60,  delay: 0,   color: '#0d9488' },
  { x: 88, y: 10, size: 40,  delay: 0.5, color: '#ea580c' },
  { x: 20, y: 75, size: 80,  delay: 1,   color: '#0d9488' },
  { x: 75, y: 60, size: 55,  delay: 1.5, color: '#f97316' },
  { x: 50, y: 90, size: 35,  delay: 0.8, color: '#14b8a6' },
  { x: 93, y: 80, size: 70,  delay: 2,   color: '#ea580c' },
  { x: 35, y: 30, size: 25,  delay: 1.2, color: '#0d9488' },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes float {
  from { transform: translateY(0px) rotate(0deg); }
  to   { transform: translateY(-28px) rotate(8deg); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px 2px rgba(13,148,136,0.25); }
  50%       { box-shadow: 0 0 40px 8px rgba(13,148,136,0.45); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes bounce-x {
  0%, 100% { transform: translateX(0); }
  50%       { transform: translateX(6px); }
}

.landing-root { font-family: 'Inter', sans-serif; }

.hero-title {
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #ea580c 80%, #f97316 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 4s linear infinite;
}

.btn-primary {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 14px 28px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  animation: pulse-glow 3s ease-in-out infinite;
}
.btn-primary:hover {
  transform: translateY(-3px) scale(1.04);
  filter: brightness(1.1);
  box-shadow: 0 12px 32px rgba(13,148,136,0.4);
}

.btn-secondary {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  color: #ea580c;
  border: 2px solid #fb923c;
  border-radius: 14px;
  padding: 13px 28px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.btn-secondary:hover {
  transform: translateY(-3px) scale(1.04);
  background: #fff7ed;
  box-shadow: 0 12px 32px rgba(234,88,12,0.2);
}

.glass-card {
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1.5px solid rgba(255,255,255,0.8);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}
.glass-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 24px 56px rgba(13,148,136,0.15);
  border-color: rgba(13,148,136,0.35);
}

.step-card {
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(16px);
  border: 1.5px solid rgba(255,255,255,0.8);
  border-radius: 20px;
  padding: 28px 24px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}
.step-card::before {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(13,148,136,0.07) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s;
}
.step-card:hover::before { opacity: 1; }
.step-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(13,148,136,0.13); }

.nav-btn-outline {
  background: transparent;
  border: 1.5px solid #0d9488;
  color: #0f766e;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-btn-outline:hover { background: #f0fdfa; transform: translateY(-1px); }

.nav-btn-solid {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-btn-solid:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.35); }

.reveal { opacity: 0; transform: translateY(36px); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.show { opacity: 1; transform: translateY(0); }

.icon-ring {
  width: 64px; height: 64px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
  transition: transform 0.3s ease;
}
.glass-card:hover .icon-ring { transform: scale(1.12) rotate(6deg); }

.stat-num {
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 900;
  color: #fff;
  line-height: 1;
}
.stat-label { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 6px; }

.arrow-icon { animation: bounce-x 1.5s ease-in-out infinite; display: inline-block; }

@media (max-width: 640px) {
  .btn-primary, .btn-secondary { padding: 12px 20px; font-size: 14px; border-radius: 12px; }
}
`;

export function LandingPage({ onSelectRole, onOpenAuth }: LandingPageProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const featRef = useInView();
  const statsRef = useInView();
  const stepsRef = useInView();

  /* parallax on hero bg */
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handle = () => {
      const y = window.scrollY;
      el.style.backgroundPositionY = `${y * 0.4}px`;
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const features = [
    {
      icon: <MapPin size={28} />, color: '#0d9488', bg: '#f0fdfa',
      title: 'Easy Location Tracking',
      desc: 'Precise pickup location selection ensures smooth coordination between hotels and NGOs.',
    },
    {
      icon: <Award size={28} />, color: '#ea580c', bg: '#fff7ed',
      title: 'Quality Assurance',
      desc: 'Built-in quality scoring ensures only safe, fresh food reaches those in need.',
    },
    {
      icon: <Users size={28} />, color: '#0d9488', bg: '#f0fdfa',
      title: 'Impact Tracking',
      desc: 'Track meals served, people helped, and environmental impact in real-time.',
    },
    {
      icon: <Shield size={28} />, color: '#ea580c', bg: '#fff7ed',
      title: 'Verified Partners',
      desc: 'All hotels and NGOs are verified to ensure trust and transparency.',
    },
    {
      icon: <Sparkles size={28} />, color: '#0d9488', bg: '#f0fdfa',
      title: 'Smart Matching',
      desc: 'AI-powered system matches donations to the nearest and most suitable NGOs.',
    },
    {
      icon: <TrendingUp size={28} />, color: '#ea580c', bg: '#fff7ed',
      title: 'Analytics Dashboard',
      desc: 'Rich dashboards for tracking performance, trends, and community impact.',
    },
  ];

  const steps = [
    { num: '01', color: '#0d9488', bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', title: 'Hotels Donate', desc: 'Hotels list excess food with quality details and pickup location.' },
    { num: '02', color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', title: 'NGOs Browse',   desc: 'NGOs view available donations and reserve what they need.' },
    { num: '03', color: '#0d9488', bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', title: 'Schedule Pickup', desc: 'Coordinate pickup times and track donation in real-time.' },
    { num: '04', color: '#ea580c', bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', title: 'Track Impact',  desc: 'Monitor meals served and people helped with live stats.' },
  ];

  return (
    <div className="landing-root" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdfa 0%, #fff 45%, #fff7ed 100%)', overflowX: 'hidden', position: 'relative' }}>
      <style>{STYLES}</style>

      {/* ── Floating particles ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(13,148,136,0.12)',
        animation: 'slideDown 0.6s ease both',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg,#0d9488,#ea580c)', borderRadius: 12, padding: 8, display: 'flex', animation: 'spin-slow 8s linear infinite' }}>
              <Heart size={22} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg,#0f766e,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              FoodShare
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="nav-btn-outline" onClick={() => onOpenAuth ? onOpenAuth('login', 'hotel') : onSelectRole('hotel')}>
              Hotel Login
            </button>
            <button className="nav-btn-solid" onClick={() => onOpenAuth ? onOpenAuth('login', 'ngo') : onSelectRole('ngo')}>
              NGO Login
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px,10vw,120px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)', borderRadius: 999, padding: '6px 16px', marginBottom: 28, animation: 'fadeIn 0.8s ease both' }}>
            <Sparkles size={14} color="#0d9488" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e' }}>Connecting Hotels & NGOs</span>
          </div>

          <h1 className="hero-title" style={{ fontSize: 'clamp(32px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.12, marginBottom: 24, animation: 'fadeUp 0.9s ease 0.1s both' }}>
            Connect Hotels with NGOs<br />to Fight Food Waste
          </h1>

          <p style={{ fontSize: 'clamp(15px,2.5vw,20px)', color: '#4b5563', lineHeight: 1.7, marginBottom: 42, animation: 'fadeUp 0.9s ease 0.25s both', maxWidth: 600, margin: '0 auto 42px' }}>
            A platform where hotel chains donate excess quality food to NGOs — ensuring no meal goes to waste while helping those in need.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', animation: 'fadeUp 0.9s ease 0.4s both' }}>
            <button className="btn-primary" onClick={() => onOpenAuth ? onOpenAuth('register', 'hotel') : onSelectRole('hotel')}>
              <Building2 size={18} />
              I'm a Hotel Chain
              <span className="arrow-icon"><ArrowRight size={16} /></span>
            </button>
            <button className="btn-secondary" onClick={() => onOpenAuth ? onOpenAuth('register', 'ngo') : onSelectRole('ngo')}>
              <Heart size={18} />
              I'm an NGO
              <span className="arrow-icon"><ArrowRight size={16} /></span>
            </button>
          </div>
        </div>

        {/* decorative orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      </section>

      {/* ── Features ── */}
      <section style={{ padding: 'clamp(40px,6vw,80px) 20px', position: 'relative', zIndex: 1 }}>
        <div
          ref={featRef.ref}
          className={`reveal ${featRef.visible ? 'show' : ''}`}
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              Why Choose <span style={{ background: 'linear-gradient(135deg,#0d9488,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FoodShare?</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>Everything you need to make food donation effortless and impactful.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 22 }}>
            {features.map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: '28px 24px', transitionDelay: `${i * 60}ms` }}>
                <div className="icon-ring" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 17, color: '#0f172a', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: 'clamp(40px,6vw,80px) 20px', position: 'relative', zIndex: 1 }}>
        <div
          ref={statsRef.ref}
          className={`reveal ${statsRef.visible ? 'show' : ''}`}
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          <div style={{
            borderRadius: 28,
            background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #ea580c 100%)',
            padding: 'clamp(32px,5vw,60px) 32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* bg mesh */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents: 'none' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 24, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              {[
                { val: 150, suffix: '+', label: 'Hotels Registered' },
                { val: 50000, suffix: '+', label: 'Meals Donated' },
                { val: 75, suffix: '+', label: 'NGO Partners' },
                { val: 25000, suffix: '+', label: 'People Served' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="stat-num"><Counter to={s.val} suffix={s.suffix} /></div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: 'clamp(40px,6vw,80px) 20px', position: 'relative', zIndex: 1 }}>
        <div
          ref={stepsRef.ref}
          className={`reveal ${stepsRef.visible ? 'show' : ''}`}
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              How It <span style={{ background: 'linear-gradient(135deg,#0d9488,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Works</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>Four simple steps from surplus food to satisfied communities.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} className="step-card" style={{ transitionDelay: `${i * 80}ms` }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `2px solid ${s.color}22` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.num}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: '#6b7280', fontSize: 13.5, lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: 'clamp(40px,6vw,80px) 20px 60px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
            Ready to Make a <span style={{ background: 'linear-gradient(135deg,#0d9488,#ea580c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Difference?</span>
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 34, fontSize: 15 }}>Join hundreds of hotels and NGOs already fighting food waste together.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => onOpenAuth ? onOpenAuth('register', 'hotel') : onSelectRole('hotel')}>
              <Building2 size={17} /> Register as Hotel
            </button>
            <button className="btn-secondary" onClick={() => onOpenAuth ? onOpenAuth('register', 'ngo') : onSelectRole('ngo')}>
              <Heart size={17} /> Register as NGO
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(13,148,136,0.12)', background: 'rgba(255,255,255,0.6)', padding: '24px 20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ background: 'linear-gradient(135deg,#0d9488,#ea580c)', borderRadius: 8, padding: 5, display: 'flex' }}>
            <Heart size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 700, color: '#0f766e' }}>FoodShare</span>
        </div>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>© 2025 FoodShare. Fighting hunger, reducing waste, one meal at a time.</p>
      </footer>
    </div>
  );
}
