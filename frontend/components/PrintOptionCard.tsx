"use client";

// Blinkit-style option card — green selection highlight
interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  sublabel?: string;
}

interface Props<T extends string> {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function PrintOptionCard<T extends string>({ title, options, value, onChange }: Props<T>) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1A1A1A] mb-3">{title}</p>
      <div className="flex gap-3">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 py-3 px-3 rounded-xl text-center transition-all duration-150 border-2 ${
                active
                  ? "border-[#0C831F] bg-[#E8F5E9] dark:bg-[#0C831F]/20"
                  : "border-[#E8E8E8] bg-white hover:border-[#0C831F]/40"
              }`}
            >
              {opt.icon && <span className="text-xl block mb-1">{opt.icon}</span>}
              <span className={`text-sm font-semibold block ${active ? "text-[#0C831F]" : "text-[#1A1A1A]"}`}>
                {opt.label}
              </span>
              {opt.sublabel && (
                <span className={`text-xs block mt-0.5 ${active ? "text-[#0C831F]/70" : "text-[#999] dark:text-[#999]"}`}>
                  {opt.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
