import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    const isDarkNow = html.classList.contains('dark');
    
    if (isDarkNow) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  }

  return (
    <button
      onClick={toggle}
      className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700
                 flex items-center justify-center transition-all
                 duration-300 hover:scale-105 active:scale-95"
      aria-label="Toggle theme"
    >
      <Sun className="block dark:hidden w-5 h-5 text-slate-900" />
      <Moon className="hidden dark:block w-5 h-5 text-white" />
    </button>
  )
}