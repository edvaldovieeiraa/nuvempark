"use client";

export function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-texto-2 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const BASE =
  "w-full h-11 px-3.5 rounded-xl border border-borda bg-superficie text-sm " +
  "placeholder:text-texto-3 focus:outline-none focus:border-brand-400 " +
  "focus:ring-4 focus:ring-brand-500/15 hover:border-brand-200";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${BASE} ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}
