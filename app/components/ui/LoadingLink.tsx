"use client";

import { useTransition, type AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Button.module.css";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  loadingLabel: string;
};

export default function LoadingLink({ href, loadingLabel, children, onClick, className, ...props }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return <Link {...props} href={href} prefetch={false}
    className={`${className ?? ""} ${styles.pending}`}
    data-loading={String(pending)} aria-busy={pending || undefined}
    aria-label={pending ? loadingLabel : props["aria-label"]}
    onClick={(event) => {
      onClick?.(event);
      if (pending) event.preventDefault();
    }}
    onNavigate={(event) => {
      event.preventDefault();
      if (pending) return;
      startTransition(() => router.push(href));
    }}>
    <span className={styles.label} aria-hidden={pending || undefined}>{children}</span>
    <span className={styles.spinner} aria-hidden="true" />
  </Link>;
}
