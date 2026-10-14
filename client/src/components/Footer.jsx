import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-auto overflow-hidden bg-[#0c0c1d] text-white">
      <div className="mx-auto max-w-[1360px] px-4 pb-10 pt-20 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <p className="max-w-md font-display text-2xl font-medium leading-tight tracking-tight text-white/90">
            Post once. Compare real proposals. Book the people you trust.
          </p>
          <nav className="space-y-2 text-sm text-white/60">
            <p className="eyebrow mb-4 text-white/40">Customers</p>
            <Link to="/providers" className="block hover:text-white">Browse providers</Link>
            <Link to="/ai/describe" className="block hover:text-white">Describe your event</Link>
            <Link to="/register" className="block hover:text-white">Create an account</Link>
          </nav>
          <nav className="space-y-2 text-sm text-white/60">
            <p className="eyebrow mb-4 text-white/40">Providers</p>
            <Link to="/register?role=PROVIDER" className="block hover:text-white">Join as a provider</Link>
            <Link to="/login" className="block hover:text-white">Log in</Link>
          </nav>
        </div>

        <p className="mt-20 select-none font-display text-[clamp(2.4rem,10vw,9rem)] font-bold uppercase leading-[0.8] tracking-tighter text-white/[0.07]">
          DemandConnect
        </p>
        <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/40">
          <span>© {new Date().getFullYear()} DemandConnect</span>
          <span>Made for celebrations</span>
        </div>
      </div>
    </footer>
  );
}
