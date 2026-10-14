import { Link } from "react-router-dom";
import { IMG } from "../utils/images";
import { Logo } from "./Navbar";

/** Split-screen layout used by Login: form on the left, photo framed in an elegant glass card on the right. */
export default function AuthShellClassic({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-6 sm:py-10 grid min-h-[calc(100vh-100px)] lg:grid-cols-12 gap-8 items-center">
      {/* Form Container */}
      <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </div>

      {/* Photo Frame Container - Compact, shifted inward, rounded glass card with hover */}
      <div className="hidden lg:block lg:col-span-6 xl:col-span-6 h-full max-h-[640px] my-auto">
        <div className="group relative h-full w-full overflow-hidden rounded-[2rem] glass-card p-2 border border-white/90 shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-indigo-500/20">
          <div className="relative h-full w-full overflow-hidden rounded-[1.6rem]">
            <img
              src={IMG.auth}
              alt="Wedding decor"
              style={{ willChange: "transform" }}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent transition-opacity duration-300 group-hover:from-slate-950/85" />

            <figure className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 text-white">
              <blockquote className="font-display text-xl sm:text-2xl font-semibold leading-snug drop-shadow-sm">
                “One requirement, four proposals, and our whole wedding team was booked in a weekend.”
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
                Priya S., Hyderabad
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>
  );
}
