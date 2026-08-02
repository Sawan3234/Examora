import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Shield, Zap, BarChart3 } from 'lucide-react';
import logo from '../assets/logo.png';

const WaveMorphDivider = ({ progress = 0 }) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const topBlueAlpha = Math.max(0, 0.2 * (1 - clamped * 1.35));
  const midBlueAlpha = Math.max(0, 0.12 * (1 - clamped * 1.35));

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(191,219,254,${topBlueAlpha}) 0%, rgba(125,211,252,${midBlueAlpha}) 20%, #5b21b6 55%, #5b21b6 100%)`,
      }}
    >
      <svg
        viewBox="0 0 1440 320"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-full h-full"
        style={{
          transform: `translateY(${-300 * clamped}px) scale(${1 + clamped * 0.32})`,
          transformOrigin: 'center bottom',
          transition: 'transform 120ms linear',
        }}
      >
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5b21b6" />
            <stop offset="40%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
        </defs>
        <path fill="url(#wg1)" fillOpacity="0.35" stroke="none">
          <animate attributeName="d" dur="9s" repeatCount="indefinite"
            values="M0,160 C240,90 480,230 720,160 C960,90 1200,230 1440,160 L1440,320 L0,320 Z;M0,185 C240,115 480,250 720,175 C960,105 1200,235 1440,180 L1440,320 L0,320 Z;M0,140 C240,210 480,80 720,150 C960,220 1200,95 1440,145 L1440,320 L0,320 Z;M0,160 C240,90 480,230 720,160 C960,90 1200,230 1440,160 L1440,320 L0,320 Z" />
        </path>
        <path fill="url(#wg2)" fillOpacity="0.55" stroke="none">
          <animate attributeName="d" dur="7s" repeatCount="indefinite"
            values="M0,185 C200,95 440,250 680,170 C920,95 1180,235 1440,180 L1440,320 L0,320 Z;M0,145 C220,230 460,85 700,185 C940,285 1180,105 1440,165 L1440,320 L0,320 Z;M0,205 C200,115 440,265 680,175 C920,95 1160,255 1440,185 L1440,320 L0,320 Z;M0,185 C200,95 440,250 680,170 C920,95 1180,235 1440,180 L1440,320 L0,320 Z" />
        </path>
        <path fill="#5b21b6" stroke="none">
          <animate attributeName="d" dur="5s" repeatCount="indefinite"
            values="M0,210 C200,130 400,280 600,180 C800,110 1000,280 1200,180 C1320,130 1400,250 1440,210 L1440,320 L0,320 Z;M0,170 C180,250 380,120 580,210 C780,300 980,100 1180,200 C1320,280 1410,150 1440,170 L1440,320 L0,320 Z;M0,230 C220,145 420,300 620,170 C820,90 1020,300 1220,160 C1340,95 1410,240 1440,210 L1440,320 L0,320 Z;M0,210 C200,130 400,280 600,180 C800,110 1000,280 1200,180 C1320,130 1400,250 1440,210 L1440,320 L0,320 Z" />
        </path>
      </svg>
      <div className="absolute inset-0" style={{ opacity: 0.06 + clamped * 0.45, background: 'linear-gradient(180deg, #5b21b6 0%, #5b21b6 100%)' }} />
    </div>
  );
};

const StatPill = ({ value, label }) => (
  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200/80 shadow-sm">
    <span className="text-[15px] font-bold text-slate-800">{value}</span>
    <span className="text-[13px] text-slate-500">{label}</span>
  </div>
);

const FeatureCard = ({ icon, title, desc, stat, iconColor, iconBg, borderColor, index = 0, animate = false }) => (
  <article
    className="group relative rounded-2xl bg-white/[0.07] backdrop-blur-sm px-5 py-6 text-left transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/[0.11]"
    style={{
      border: `1px solid ${borderColor}`,
      opacity: animate ? 1 : 0,
      transform: animate ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 100}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 100}ms, background 0.3s`,
    }}
  >
    <div
      className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl"
      style={{ background: iconBg, color: iconColor }}
    >
      {icon}
    </div>

    <p className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: iconColor, opacity: 0.8 }}>
      {stat}
    </p>

    <h3 className="text-[16px] leading-snug font-semibold text-white mb-2.5 tracking-tight">{title}</h3>
    <p className="text-[13.5px] leading-relaxed text-violet-200/60">{desc}</p>
  </article>
);

export default function Landing() {
  const [typedDescription, setTypedDescription] = useState('');
  const [waveProgress, setWaveProgress] = useState(0);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const waveSectionRef = useRef(null);
  const featuresGridRef = useRef(null);
  const heroRef = useRef(null);
  const heroDescription = ' AI-powered proctoring with KNN face verification. Detect cheating instantly. Fair for all.';
  
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setTypedDescription(heroDescription.slice(0, index));
      if (index >= heroDescription.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [heroDescription]);

  useEffect(() => {
    const handleWaveScroll = () => {
      if (!waveSectionRef.current) return;
      const rect = waveSectionRef.current.getBoundingClientRect();
      const start = window.innerHeight * 0.9;
      const end = window.innerHeight * 0.2;
      setWaveProgress(Math.max(0, Math.min(1, (start - rect.top) / (start - end))));
    };
    handleWaveScroll();
    window.addEventListener('scroll', handleWaveScroll, { passive: true });
    window.addEventListener('resize', handleWaveScroll);
    return () => {
      window.removeEventListener('scroll', handleWaveScroll);
      window.removeEventListener('resize', handleWaveScroll);
    };
  }, []);

  useEffect(() => {
    if (!featuresGridRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setFeaturesVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(featuresGridRef.current);
    return () => observer.disconnect();
  }, []);

  const featureItems = [
    {
      title: 'Face Recognition',
      desc: 'KNN-powered identity verification',
      stat: '99.4% accuracy',
      iconColor: '#818CF8',
      iconBg: 'rgba(99,102,241,0.12)',
      borderColor: 'rgba(99,102,241,0.25)',
      icon: <Eye className="h-5 w-5" />,
    },
    {
      title: 'Secure & Private',
      desc: 'End-to-end encrypted sessions',
      stat: '256-bit AES',
      iconColor: '#34D399',
      iconBg: 'rgba(16,185,129,0.12)',
      borderColor: 'rgba(16,185,129,0.25)',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      title: 'Real-Time Detection',
      desc: 'Instant violation alerts',
      stat: 'Zero friction',
      iconColor: '#FBBF24',
      iconBg: 'rgba(245,158,11,0.12)',
      borderColor: 'rgba(245,158,11,0.25)',
      icon: <Zap className="h-5 w-5" />,
    },
    {
      title: 'Detailed Reports',
      desc: 'Complete exam analytics',
      stat: 'Live dashboards',
      iconColor: '#F472B6',
      iconBg: 'rgba(236,72,153,0.12)',
      borderColor: 'rgba(236,72,153,0.25)',
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col relative" style={{ background: '#EFF6FF' }}>
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(191,219,254,0.7) 0%, transparent 70%)',
      }} />

      <section className="relative z-10 min-h-screen flex flex-col">
        <header className="relative z-10 flex justify-between items-center px-6 sm:px-12 lg:px-20 py-4 bg-white/60 backdrop-blur-md border-b border-slate-200/70">
          <div className="flex items-center gap-3 cursor-pointer">
            <img src={logo} alt="Examora logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
              <div>
                <h1 className="text-[18px] font-bold tracking-tight text-slate-900 leading-none">Examora</h1>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">AI Proctoring</p>
              </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] text-[14px] font-semibold transition-all hover:-translate-y-0.9 shadow-md shadow-blue-500/20 ml-3"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </button>
          </div>
        </header>

        <main
          ref={heroRef}
          className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-20 py-16 lg:py-0"
        >
          <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div
              className="flex flex-col gap-7"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.65s ease, transform 0.65s ease',
              }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[12px] font-semibold text-blue-600 tracking-wide">AI-powered exam security</span>
              </div>

              <h2 className="text-[42px] sm:text-[52px] lg:text-[56px] font-extrabold text-slate-900 leading-[1.08] tracking-tight">
                Secure Online<br />
                <span style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Proctoring
                </span>
                <br />Made Simple
              </h2>

              <p className="text-[16px] sm:text-[18px] font-normal text-slate-500 leading-relaxed max-w-lg min-h-[80px]">
                {typedDescription}
                <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-blue-500/60 animate-pulse" aria-hidden="true" />
              </p>

              <div className="flex flex-wrap gap-3 items-center justify-center lg:justify-start lg:ml-10">
                <button
                  className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] text-[15px] font-semibold flex items-center gap-2.5 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/25"
                  onClick={() => window.location.href = '/register'}
                >
                  Start for free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <StatPill value="Free" label="beta" />
                <StatPill value="Easy" label="Exam Conduct" />
                <StatPill value="5Min" label="setup time" />
              </div>
            </div>

            <div
              className="hidden lg:flex items-center justify-center"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
                transition: 'opacity 0.75s ease 0.15s, transform 0.75s ease 0.15s',
              }}
            >
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 -m-8 rounded-3xl" style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

                <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-300/40 border border-slate-200/80 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[12px] text-slate-400 font-medium">Live session - 3 candidates</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  {[
                    { name: 'Kapil Dev', status: 'Clean', statusColor: 'text-emerald-600', statusBg: 'bg-emerald-50 border-emerald-200', score: '78%', avatar: '#818CF8' },
                    { name: 'Priyansh Sharma', status: 'Flagged', statusColor: 'text-amber-600', statusBg: 'bg-amber-50 border-amber-200', score: '61%', avatar: '#FBBF24' },
                    { name: 'RamHari Karki', status: 'Clean', statusColor: 'text-emerald-600', statusBg: 'bg-emerald-50 border-emerald-200', score: '91%', avatar: '#34D399' },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors mb-1">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ background: c.avatar }}>
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 rounded-full bg-slate-100 flex-1">
                            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: c.score }} />
                          </div>
                          <span className="text-[11px] text-slate-400">{c.score}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold ${c.statusColor} ${c.statusBg} border px-2.5 py-1 rounded-full`}>{c.status}</span>
                    </div>
                  ))}

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
                    {[['3', 'Active'], ['1', 'Flagged'], ['0', 'Disconnected']].map(([val, lbl]) => (
                      <div key={lbl} className="text-center">
                        <p className="text-[20px] font-bold text-slate-800">{val}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-3 max-w-[220px]">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700">Suspicious behavior</p>
                    <p className="text-[10px] text-slate-400">Arjun Thapa - just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>

      <section ref={waveSectionRef} className="relative z-10 h-[100vh] -mb-[12px]">
        <div className="sticky top-0 h-screen">
          <WaveMorphDivider progress={waveProgress} />
        </div>
      </section>

      <section
        className="relative z-10 -mt-[42vh] sm:-mt-[46vh] px-6 sm:px-12 lg:px-20 pt-12 sm:pt-16 pb-20 sm:pb-28 flex flex-col items-center gap-14 sm:gap-18"
        style={{ background: 'linear-gradient(180deg, #5b21b6 0%, #581c87 100%)' }}
      >
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-24"
          style={{ background: 'linear-gradient(180deg, rgba(88,28,135,0) 0%, rgba(91,33,182,1) 100%)' }} />

        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }} />

        <div className="relative z-10 text-center flex flex-col items-center gap-3 max-w-2xl">
          <p className="text-[11px] sm:text-[12px] tracking-[0.22em] text-violet-300/70 font-semibold uppercase">Platform benefits</p>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white leading-tight">Why teams choose Examora</h2>
          <p className="text-[15px] sm:text-[17px] font-normal text-violet-200/60 leading-relaxed">Built for institutions that cannot afford to compromise on integrity.</p>
        </div>

        <div ref={featuresGridRef} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-6xl">
          {featureItems.map((item, index) => (
            <FeatureCard key={item.title} index={index} animate={featuresVisible} {...item} />
          ))}
        </div>
      </section>

      <footer
        className="relative z-10 px-6 sm:px-12 lg:px-20 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: 'linear-gradient(180deg, #581c87 0%, #3b0764 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Examora logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          <span className="text-[13px] font-semibold text-white/50">Examora</span>
        </div>
        <p className="text-[12px] text-white/30">&copy; 2026 Examora. All rights reserved.</p>
        <div className="flex gap-6">
          {['Privacy', 'Terms', 'Security'].map((link) => (
            <a key={link} href="#" className="text-[12px] text-white/30 hover:text-white/60 transition-colors">{link}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}