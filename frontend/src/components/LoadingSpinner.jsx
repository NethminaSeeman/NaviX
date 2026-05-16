const LoadingSpinner = ({ text = "Loading..." }) => (
  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ceygo-primary border-t-transparent shadow-sm" />
    <span>{text}</span>
  </div>
);

export default LoadingSpinner;
