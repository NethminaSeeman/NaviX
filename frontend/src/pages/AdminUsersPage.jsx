import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiLoader, FiRefreshCw, FiSearch, FiShield, FiUserX } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/services/adminApi";

const PAGE_SIZE = 25;

const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState({
    total: 0,
    users: [],
  });

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE)),
    [result.total]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listUsers({
        query,
        status,
        limit: PAGE_SIZE,
        offset,
      });
      setResult({
        total: data.total,
        users: data.users,
      });
    } catch (err) {
      setError(err?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [offset, query, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTick]);

  const applySearch = (event) => {
    event.preventDefault();
    setOffset(0);
    setQuery(queryInput.trim());
  };

  const refresh = () => setRefreshTick((n) => n + 1);

  const updateUser = async (target, patch) => {
    setSavingUserId(target.id);
    setError("");
    try {
      await adminApi.updateUser(target.id, patch);
      refresh();
    } catch (err) {
      setError(err?.message || "Could not update user.");
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <section className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-panel space-y-3 p-5"
      >
        <p className="mono-label text-[11px] text-cyan-500">NAVI_X / ADMIN</p>
        <h1 className="section-title">User Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Search users, suspend or reactivate accounts, and manage admin access.
        </p>
      </motion.div>

      <form onSubmit={applySearch} className="tech-panel grid gap-3 p-4 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Search by email or name
          </span>
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-cyan-500/20 dark:bg-zinc-900">
            <FiSearch className="text-slate-400" />
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-cyan-500/20 dark:bg-zinc-900"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-gradient-to-r from-cyan-500 to-teal-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_22px_rgba(34,211,238,0.35)] transition hover:brightness-110"
          >
            Search
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-cyan-500/20 dark:text-slate-200 dark:hover:bg-slate-800/60"
          >
            <FiRefreshCw />
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="tech-panel overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-cyan-500/15 dark:bg-zinc-900/80 dark:text-cyan-300/80">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Loading users...
                </td>
              </tr>
            ) : result.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              result.users.map((entry) => {
                const busy = savingUserId === entry.id;
                const isSelf = entry.id === currentUser?.id;
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-cyan-500/10"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {entry.name || "Unnamed user"}
                      </div>
                      <div className="text-xs text-slate-500">{entry.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.is_admin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-1 text-xs font-semibold text-purple-600 dark:text-purple-300">
                          <FiShield />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          entry.account_status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {entry.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() =>
                            updateUser(entry, {
                              account_status:
                                entry.account_status === "active" ? "suspended" : "active",
                            })
                          }
                          className="rounded-md border border-amber-400/40 px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
                        >
                          <span className="inline-flex items-center gap-1">
                            <FiUserX />
                            {entry.account_status === "active" ? "Suspend" : "Reactivate"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          onClick={() => updateUser(entry, { is_admin: !entry.is_admin })}
                          className="rounded-md border border-cyan-500/30 px-2 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-cyan-300"
                        >
                          {entry.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                        {busy && (
                          <span className="inline-flex items-center text-cyan-500">
                            <FiLoader className="animate-spin" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span>
          Showing {result.users.length} of {result.total} users
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/20"
          >
            Prev
          </button>
          <span className="mono-label text-xs">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setOffset((prev) =>
                prev + PAGE_SIZE >= result.total ? prev : prev + PAGE_SIZE
              )
            }
            disabled={offset + PAGE_SIZE >= result.total || loading}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/20"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdminUsersPage;
