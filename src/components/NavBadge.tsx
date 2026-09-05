export function NavBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      className="inline-flex items-center justify-center text-[10.5px] font-bold text-white rounded-full min-w-[16px] h-4 px-1 ml-1 align-top"
      style={{ background: "var(--critical)" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
