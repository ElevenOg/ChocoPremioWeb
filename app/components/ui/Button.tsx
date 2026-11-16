import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
} from "react";
import Link from "next/link";
import styles from "./Button.module.css";
import LoadingLink from "./LoadingLink";

type StyleProps = {
  variant?: "primary" | "secondary" | "light" | "whatsapp" | "custom";
  size?: "normal" | "compact" | "large" | "small";
  shape?: "pill" | "rounded";
  className?: string;
};

const variants = {
  custom: "",
  primary: "bg-[var(--cp-brand)] text-white",
  secondary: "border border-gray-300 bg-white text-[var(--cp-brand)]",
  light: "bg-white text-[var(--cp-brand)] hover:bg-[#f8f1e3]",
  whatsapp: "bg-[#25D366] text-white",
};

const sizes = {
  normal: "px-6 py-3",
  small: "px-5 py-2",
  compact: "px-5 py-2.5",
  large: "px-7 py-3.5",
};

function buttonClasses({
  variant = "primary",
  size = "normal",
  shape = "pill",
  className = "",
}: StyleProps) {
  if (variant === "custom") return className;
  return [
    "inline-flex items-center justify-center gap-2 text-center text-sm font-bold transition hover:scale-105",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c47a00]",
    "disabled:cursor-not-allowed disabled:opacity-45",
    variants[variant],
    sizes[size],
    shape === "pill" ? "rounded-full" : "rounded-xl",
    className,
  ].join(" ");
}

export function Button({
  variant = "custom",
  size,
  shape,
  className,
  type = "button",
  loading,
  loadingLabel = "Cargando",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={loading ? loadingLabel : props["aria-label"]}
      data-loading={loading === undefined ? undefined : String(loading)}
      className={`${buttonClasses({ variant, size, shape, className })} ${loading === undefined ? "" : styles.pending}`}
    >
      {loading === undefined ? children : <>
        <span className={styles.label} aria-hidden={loading || undefined}>{children}</span>
        <span className={styles.spinner} aria-hidden="true" />
      </>}
    </button>
  );
}

type ButtonLinkProps =
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  StyleProps & { href: string; loadingLabel?: string };

export function ButtonLink({
  variant,
  size,
  shape,
  className,
  target,
  rel,
  loadingLabel,
  children,
  ...props
}: ButtonLinkProps) {
  const safeRel = [rel, target === "_blank" ? "noopener noreferrer" : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  if (loadingLabel) return <LoadingLink {...props} target={target} rel={safeRel}
    loadingLabel={loadingLabel}
    className={buttonClasses({ variant, size, shape, className })}>{children}</LoadingLink>;

  return (
    <Link
      {...props}
      prefetch={false}
      target={target}
      rel={safeRel}
      className={buttonClasses({ variant, size, shape, className })}
    >
      {children}
    </Link>
  );
}
