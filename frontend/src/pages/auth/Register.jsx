import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, BriefcaseBusiness, BarChart3, Grid, Eye, EyeOff } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuthStore } from '../../store/authStore';

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
  <div className="relative flex flex-col justify-between p-10 overflow-hidden" style={{ background: '#3b0764' }}>
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
      <p className="text-[15px] text-white/60 leading-[1.75] max-w-[280px]">{subtext}</p>
    </div>

    <div className="relative z-10 flex flex-col gap-5">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            {feature.icon}
          </div>
          <span className="text-[15px] text-white/45">{feature.text}</span>
        </div>
      ))}
    </div>
  </div>
);

export const AuthShell = ({ leftProps, children }) => (
  <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: '#EFF6FF' }}>
    <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(191,219,254,0.6) 0%, transparent 70%)' }} />
    <a href="/" className="fixed top-5 left-6 flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors z-10">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Back to home
    </a>

    <div className="relative z-10 w-full grid rounded-[20px] overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)', maxWidth: '920px', width: '100%', gridTemplateColumns: '46% 54%' }}>
      <LeftPanel {...leftProps} />
      <div className="bg-white px-12 py-10 flex flex-col justify-center">{children}</div>
    </div>
  </div>
);

const Register = () => {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    if (!confirm) e.confirm = 'Please confirm password';
    if (password && confirm && password !== confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev?.preventDefault?.();
    const e = validate();
    if (Object.keys(e).length > 0) return;
    const ok = await register(fullName, email, password);
    if (ok) navigate('/face-register');
  };

  return (
    <div>
      <h1 className="text-[26px] font-semibold text-slate-900 mb-2">Create your account</h1>
      <p className="text-[15px] text-slate-500 mb-7">Create an account to access Examora</p>

      {(error) && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="mb-6">
        <label className="block text-[13px] font-medium text-slate-600 mb-2">Full name</label>
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">Email address</label>
          <Input placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">Password</label>
          <Input
            placeholder="Create a password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightIcon={showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            onRightIconClick={() => setShowPass((s) => !s)}
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-2">Confirm password</label>
          <Input
            placeholder="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            rightIcon={showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            onRightIconClick={() => setShowConfirm((s) => !s)}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full h-[50px] rounded-[10px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
        style={{ background: '#5b21b6', boxShadow: '0 4px 14px rgba(91,33,182,0.3)' }}
      >
        {loading ? 'Creating account...' : 'Create account'} <ArrowRight size={14} />
      </button>

      <p className="text-center text-[12px] text-slate-400 mt-4 leading-relaxed">
        By creating an account you agree to our{' '}
        <a href="#" className="text-violet-600">Terms</a> and{' '}
        <a href="#" className="text-violet-600">Privacy Policy</a>.
      </p>

      <p className="text-center text-[12px] text-slate-400 mt-3">
        Already have an account?{' '}
        <button onClick={() => window.location.assign('/login')} className="text-violet-600 font-medium hover:text-violet-700">Sign in</button>
      </p>
    </div>
  );
};

export const RegistrationPage = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <Building2 size={14} color="#818CF8" />, text: 'Institutions & organizations' },
    { icon: <BriefcaseBusiness size={14} color="#34D399" />, text: 'Corporate assessments' },
    { icon: <Grid size={14} color="#FBBF24" />, text: 'Works for any org' },
  ];

  const leftProps = {
    tag: 'Get started',
    heading: 'Create access<br/>to Examora',
    subtext: 'Sign up to manage exams, take assessments, and view reports.',
    features,
  };

  return (
    <AuthShell leftProps={leftProps}>
      <Register />
    </AuthShell>
  );
};

export default RegistrationPage;