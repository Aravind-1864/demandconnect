import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = {
  CUSTOMER: [
    { to: "/customer", label: "Overview", end: true },
    { to: "/customer/requests", label: "My requests" },
    { to: "/customer/bookings", label: "Bookings" },
    { to: "/choose-mode", label: "+ New event" },
  ],
  PROVIDER: [
    { to: "/provider", label: "Overview", end: true },
    { to: "/provider/profile", label: "My profile" },
    { to: "/provider/requests", label: "Open requests" },
    { to: "/provider/proposals", label: "My proposals" },
    { to: "/provider/bookings", label: "Bookings" },
  ],
  ADMIN: [{ to: "/admin", label: "Admin", end: true }],
};

const itemClass = ({ isActive }) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function DashboardLayout() {
  const { user } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible" aria-label="Dashboard">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={itemClass}>
              {i.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
