type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-lg",
};

export function Avatar({ src, name, size = "sm" }: AvatarProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const dim = SIZE_CLASSES[size];

  if (src) {
    return <img src={src} alt={name} className={`${dim} rounded-full object-cover shrink-0`} />;
  }

  return (
    <span
      aria-label={name}
      className={`${dim} inline-flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 font-medium text-zinc-600 dark:text-zinc-300 shrink-0 select-none`}
    >
      {initials}
    </span>
  );
}
