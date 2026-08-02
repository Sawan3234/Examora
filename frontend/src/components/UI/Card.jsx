export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-[18px] border border-[#eaecf0] shadow-[0px_1px_3px_rgba(16,24,40,0.08)] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, valueClassName = "", iconClassName = "" }) {
  return (
    <div className="min-h-[112px] rounded-[16px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-[0px_1px_3px_rgba(16,24,40,0.08)]">
      <div className="flex h-full items-start justify-between gap-5">
        <div>
          <p className="text-[18px] text-[#667085]">{label}</p>
          <p className={`mt-3 text-[24px] font-semibold leading-none ${valueClassName || "text-[#101828]"}`}>{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center ${iconClassName}`}>
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}