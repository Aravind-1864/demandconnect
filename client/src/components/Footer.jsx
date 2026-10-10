import { Link } from "react-router-dom";
import { Logo } from "./Navbar";

export default function Footer() {
  return (
    <footer className="mt-auto bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Post your event requirements once. Compare real proposals from local photographers, caterers, decorators and more,
            and book the people you trust.
          </p>
        </div>
        <nav className="space-y-2 text-sm">
          <p className="font-display text-base text-white">Customers</p>
          <Link to="/providers" className="block hover:text-white">Browse providers</Link>
          <Link to="/ai/describe" className="block hover:text-white">Describe your event</Link>
          <Link to="/register" className="block hover:text-white">Create an account</Link>
        </nav>
        <nav className="space-y-2 text-sm">
          <p className="font-display text-base text-white">Providers</p>
          <Link to="/register?role=PROVIDER" className="block hover:text-white">Join as a provider</Link>
          <Link to="/login" className="block hover:text-white">Log in</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} DemandConnect. Made for celebrations.
      </div>
    </footer>
  );
}
