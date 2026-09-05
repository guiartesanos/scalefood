export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-5">
      <div className="w-full max-w-sm bg-paper border border-line rounded-lg p-8 shadow-[var(--shadow)] flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="brandmark text-2xl">Food Scale</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="font-sans text-[13px] px-3 py-2 rounded border border-line bg-paper-2 text-ink outline-none focus:border-accent w-full"
    />
  );
}

export function AuthButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="bg-accent hover:bg-accent-ink text-white font-semibold text-sm rounded py-2.5 transition-colors"
    >
      {children}
    </button>
  );
}
