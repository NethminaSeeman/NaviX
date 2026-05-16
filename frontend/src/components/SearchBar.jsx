import { FiSearch } from "react-icons/fi";

const SearchBar = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Search destinations, routes, food, history...",
}) => (
  <form onSubmit={onSubmit} className="relative">
    <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-full border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm outline-none ring-ceygo-primary transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900/80"
    />
  </form>
);

export default SearchBar;
