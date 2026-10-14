import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = {
  CUSTOMER: [
    { to: "/customer", label: "Overview", end: true },
    { to: "/customer/requests", label: "My requests" },
    { to: "/customer/bookings", label: "Bookings" },
    { to: "/customer/saved", label: "Saved providers" },
    { to: "/messages", label: "Messages" },
    { to: "/choose-mode", label: "+ New event" },
  ],
  PROVIDER: [
    { to: "/provider", label: "Overview", end: true },
    { to: "/provider/profile", label: "My profile" },
    { to: "/provider/requests", label: "Open requests" },
    { to: "/provider/proposals", label: "My proposals" },
    { to: "/provider/bookings", label: "Bookings" },
    { to: "/provider/calendar", label: "Calendar" },
    { to: "/messages", label: "Messages" },
  ],
  ADMIN: [{ to: "/admin", label: "Admin", end: true }],
};

const itemClass = ({ isActive }) =>
  `whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
    isActive
      ? "glass-btn-active text-indigo-950 font-bold shadow-md"
      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
  }`;

export default function DashboardLayout() {
  const { user } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <div className="glass-panel rounded-2xl p-2.5 shadow-sm">
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Dashboard">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={itemClass}>
                {i.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 animate-fade-up">
        <Outlet />
      </div>
    </div>
  );
}
