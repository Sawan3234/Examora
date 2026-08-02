import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, BriefcaseBusiness, BarChart3, Eye, EyeOff } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuthStore } from '../../store/authStore';
import { userAPI } from '../../api/services';

export const Input = ({ icon, placeholder, type = 'text', rightIcon, onRightIconClick, ...rest }) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
    )}
    <input
      type={type}
      placeholder={placeholder}
      className="w-full h-[48px] rounded-[10px] border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
      style={{ paddingLeft: icon ? '34px' : '12px', paddingRight: rightIcon ? '38px' : '12px' }}
      {...rest}
    />
    {rightIcon && (
      <button
        type="button"
        onClick={onRightIconClick}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        {rightIcon}
      </button>
    )}
  </div>
);

export const LeftPanel = ({ tag, tagDot = true, heading, subtext, features, dotColor = '#34D399' }) => (
  <div
    className="relative flex flex-col justify-between p-8 overflow-hidden"
    style={{ background: 'linear-gradient(135deg,#5b21b6 0%, #3b0764 100%)' }}
  >
    <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(124,58,237,0.4)', filter: 'blur(55px)' }} />
    <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'rgba(91,33,182,0.3)', filter: 'blur(40px)' }} />

    <div className="relative z-10 flex items-center gap-3">
      <img src={logo} alt="Examora logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
      <div>
        <p className="text-[16px] font-semibold text-white/90 leading-none">Examora</p>
        <p className="text-[14px] text-white/38 mt-0.5">AI Proctoring</p>
      </div>
    </div>

    <div className="relative z-10">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.13)' }}>
        {tagDot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />}
        <span className="text-[14px] text-white/55">{tag}</span>
      </div>
      <h2 className="text-[28px] font-semibold text-white leading-[1.32] mb-4" dangerouslySetInnerHTML={{ __html: heading }} />
      <p className="text-[15px] text-white/80 leading-[1.75] max-w-[300px]">{subtext}</p>
    </div>

    <div className="relative z-10 flex flex-col gap-5">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            {feature.icon}
          </div>
          <span className="text-[15px] text-white/80">{feature.text}</span>
        </div>
      ))}
    </div>
  </div>
);

 export const AuthShell = ({ leftProps, children }) => (
  <div
    className="min-h-screen w-full flex items-center justify-center p-6 py-10"
    style={{ background: '#EFF6FF', minHeight: '100dvh' }}
  >
    <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(191,219,254,0.6) 0%, transparent 70%)' }} />
    <a href="/" className="fixed top-5 left-6 flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors z-10">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Back to home
    </a>

     <div
      className="relative z-10 w-full grid rounded-[20px] overflow-hidden"
      style={{
        boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)',
        maxWidth: '920px',
        width: '100%',
        gridTemplateColumns: '40% 60%',
        alignItems: 'stretch',
      }}
    >
      <LeftPanel {...leftProps} />
      <div className="bg-white px-12 py-10 flex flex-col justify-center">{children}</div>
    </div>
  </div>
);

const SignIn = () => {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const alertMessage = error || '';

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    return e;
  };

 const handleSubmit = async (ev) => {
  ev?.preventDefault?.();
  const e = validate();
  if (Object.keys(e).length > 0) return;

  console.log('🔵 Attempting login...');
  const user = await login(email, password);
  console.log('🟢 User after login:', user);
  
  if (user) {
    console.log('🔵 User role:', user.role);
    
    if (user.role === 'admin') {
      console.log('🟢 Admin detected! Navigating to /admin/dashboard');
      navigate('/admin/dashboard');
      return;
    } else if (user.role === 'student') {
      console.log('🟢 Student detected! Checking face status...');
      try {
        const faceStatus = await userAPI.getFaceStatus();
        console.log('🟢 Face status:', faceStatus.data);
        if (!faceStatus.data.faceRegistered) {
          navigate('/face-register');
        } else {
          navigate('/student/dashboard');
        }
      } catch (err) {
        console.error('❌ Face status error:', err);
        navigate('/student/dashboard');
      }
    } else {
      navigate('/');
    }
  } else {
    console.log('❌ Login failed - user is null');
  }
};
  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[26px] font-semibold text-slate-900 mb-2">Welcome back</h1>
      <p className="text-[15px] text-slate-500 mb-6">Sign in to access your account</p>

      {alertMessage && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {alertMessage}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">Email</label>
          <Input placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">Password</label>
          <Input
            placeholder="••••••••"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightIcon={showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            onRightIconClick={() => setShowPass((s) => !s)}
          />
        </div>
      </div>

      <div className="text-right mt-3 mb-7">
        <a href="#" className="text-[13px] font-medium text-violet-600 hover:text-violet-700">Forgot password?</a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[50px] rounded-[10px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: '#5b21b6', boxShadow: '0 4px 14px rgba(91,33,182,0.3)' }}
      >
        {loading ? 'Signing in...' : 'Sign in'} <ArrowRight size={14} />
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[11px] text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <p className="text-center text-[12px] text-slate-400 mt-5">
        New here?{' '}
        <button type="button" onClick={() => window.location.assign('/register')} className="text-violet-600 font-medium hover:text-violet-700">
          Create account
        </button>
      </p>
    </form>
  );
};

export const LoginPage = () => {
  const features = [
    { icon: <Building2 size={14} color="#818CF8" />, text: 'Institutions & organizations' },
    { icon: <BriefcaseBusiness size={14} color="#34D399" />, text: 'Corporate assessments' },
    { icon: <BarChart3 size={14} color="#FBBF24" />, text: 'Analytics & reports' },
  ];

  const leftProps = {
    tag: 'Secure & easy',
    heading: 'One account<br/>for everyone',
    subtext: 'Sign in to access exams, reports and your dashboard.',
    features,
  };

  return (
    <AuthShell leftProps={leftProps}>
      <SignIn />
    </AuthShell>
  );
};

export default LoginPage;