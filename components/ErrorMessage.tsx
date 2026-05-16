interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-400 bg-red-50 p-4 text-red-800"
    >
      <p className="flex-1 text-sm">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
      >
        <span aria-hidden="true" className="text-xl leading-none">&times;</span>
      </button>
    </div>
  );
}
