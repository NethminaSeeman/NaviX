import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch } from "react-icons/fi";
import { vibrateLight } from "@/utils/haptics";

const SearchBar = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Search destinations, routes, food, history...",
  suggestions = [],
}) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const labels = suggestions.map((item) => ({
    id: item.id,
    label: `${item.name} · ${item.district || ""}`.trim(),
    sub: item.category ? String(item.category) : "",
    name: item.name,
  }));

  const filtered =
    value.trim().length === 0
      ? labels.slice(0, 6)
      : labels.filter((row) =>
          row.label.toLowerCase().includes(value.toLowerCase())
        );

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (name) => {
    onChange(name);
    setOpen(false);
    vibrateLight(8);
  };

  return (
    <form
      ref={wrapRef}
      onSubmit={onSubmit}
      className="tech-panel relative p-2 ring-1 ring-transparent transition focus-within:ring-cyan-500/25"
    >
      <FiSearch className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        className="w-full rounded-md border border-slate-300 bg-white/90 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900/80"
      />
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            id={listId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute left-2 right-2 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white/95 py-1 shadow-xl backdrop-blur-md dark:border-cyan-500/20 dark:bg-slate-900/95"
            role="listbox"
          >
            {filtered.map((row) => (
              <li key={row.id} role="option">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row.name)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-cyan-500/10 dark:hover:bg-cyan-500/15"
                >
                  <FiSearch className="mt-0.5 shrink-0 text-cyan-500 opacity-70" />
                  <span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{row.label}</span>
                    {row.sub ? (
                      <span className="ml-2 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-800 dark:text-cyan-200">
                        {row.sub}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </form>
  );
};

export default SearchBar;
