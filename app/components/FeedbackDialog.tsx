"use client";

import { useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BrandBackground } from "./ui/Brand";
import { Button, ButtonLink } from "./ui/Button";
import useDialog from "./useDialog";
import styles from "./FeedbackDialog.module.css";

type Action = { label: string; onClick?: () => void; href?: string; secondary?: boolean; loading?: boolean; disabled?: boolean };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
function keepOpen() {}

export default function FeedbackDialog({ title, description, actions = [], loading = false, standalone = false, onClose = keepOpen }: {
  title: string;
  description: string;
  actions?: Action[];
  loading?: boolean;
  standalone?: boolean;
  onClose?: () => void;
}) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const dialog = useDialog(mounted, onClose);
  const titleId = useId();
  const descriptionId = useId();
  const content = <>
    {standalone && <BrandBackground className={styles.background} />}
    <div className={styles.overlay} onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className={styles.card} onClick={event => event.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        {loading && <div role="status" aria-label={title} className={styles.spinner} />}
        {actions.length > 0 && <div className={`${styles.actions} ${actions.length === 1 ? styles.single : ""}`}>
          {actions.map(action => {
            const className = `${styles.button} ${action.secondary ? styles.secondary : ""}`;
            return action.href
              ? <ButtonLink key={action.label} href={action.href} variant="custom" className={className}>{action.label}</ButtonLink>
              : <Button key={action.label} className={className} onClick={action.onClick} loading={action.loading} disabled={action.disabled}>{action.label}</Button>;
          })}
        </div>}
      </div>
    </div>
  </>;
  return mounted ? createPortal(content, document.body) : content;
}
