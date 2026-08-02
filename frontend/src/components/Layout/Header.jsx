import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "../UI/Themetoggle";

export function Header({ adminName, adminEmail }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const adminMenuRef = useRef(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUserDetailsClick = () => {
    setIsUserDetailsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between gap-4">

        {/* Left — title */}
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Welcome back, {adminName}
          </p>
        </div>

        {/* Right — theme toggle + admin menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <div className="relative" ref={adminMenuRef}>
            <button
              type="button"
              onClick={() => setIsAdminMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-3 py-2 rounded-[20px] shadow-sm transition-all hover:shadow-md"
              aria-expanded={isAdminMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-base font-bold text-white">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {adminName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  admin
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition-transform ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isAdminMenuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-[280px] overflow-hidden rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0px_30px_80px_rgba(17,24,39,0.15)] dark:shadow-[0px_30px_80px_rgba(0,0,0,0.4)]"
                role="menu"
              >
                {/* Dropdown header */}
                <div className="bg-[linear-gradient(120deg,#4338ca_0%,#6d28d9_55%,#a21caf_100%)] p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border-2 border-white/30 text-[14px] font-extrabold text-white/95">
                      {adminName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-extrabold leading-tight">Administrator</p>
                      <p className="text-[13px] text-white/80">Full Access</p>
                    </div>
                  </div>
                </div>

                {/* Dropdown body */}
                <div className="space-y-1 bg-white dark:bg-slate-900 p-4">

                  {/* User details */}
                  <button
                    type="button"
                    onClick={handleUserDetailsClick}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    role="menuitem"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                      <User className="h-5 w-5" />
                    </span>
                    <span>
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                        User Details
                      </p>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">
                        View profile information
                      </p>
                    </span>
                  </button>

                  {/* Expanded user details */}
                  {isUserDetailsOpen && (
                    <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-200 dark:border-indigo-800">
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                            Name
                          </p>
                          <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                            {adminName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                            Email
                          </p>
                          <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                            {adminEmail || 'admin@examora.com'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    role="menuitem"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      <LogOut className="h-5 w-5" />
                    </span>
                    <span>
                      <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">
                        Logout
                      </p>
                      <p className="text-[12px] text-red-400 dark:text-red-500">
                        Return to login
                      </p>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}