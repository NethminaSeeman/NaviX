const SkeletonLoader = ({ lines = 3, className = "" }) => (
  <div className={`animate-pulse space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="h-4 rounded bg-slate-200 dark:bg-slate-700"
      />
    ))}
  </div>
);

export default SkeletonLoader;
