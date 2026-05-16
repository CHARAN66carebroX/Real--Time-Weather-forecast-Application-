interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-label={label ?? "Loading..."}>
      <div className="border-4 border-white/30 border-t-white rounded-full w-10 h-10 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
