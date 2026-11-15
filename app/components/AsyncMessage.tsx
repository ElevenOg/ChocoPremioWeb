import FeedbackDialog from "./FeedbackDialog";

export default function AsyncMessage({ message, onRetry, href }: {
  message: string;
  onRetry?: () => void;
  href?: string;
}) {
  return (
    <FeedbackDialog
      title={onRetry ? "¿Reintentar?" : "No se pudo continuar"}
      description={message}
      standalone
      actions={[
        ...(onRetry ? [{ label: "REINTENTAR", onClick: onRetry }] : []),
        ...(href ? [{ label: "VOLVER AL INICIO", href, secondary: Boolean(onRetry) }] : []),
      ]}
    />
  );
}
