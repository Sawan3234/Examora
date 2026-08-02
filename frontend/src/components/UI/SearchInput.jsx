import { Search } from "lucide-react";

export function SearchInput({ placeholder, value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#98a2b3]" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-12 rounded-[10px] border border-[#d0d5dd] bg-white pl-10 pr-4 text-sm text-[#101828] outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#7c3aed]"
      />
    </div>
  );
}