import { Link } from "react-router-dom";
import { IMG } from "../utils/images";
import { Logo } from "./Navbar";

/** Split-screen layout shared by Login and Register: form on the left, photo on the right. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-10 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-4xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img src={IMG.auth} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        <figure className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <blockquote className="font-display text-3xl font-medium leading-snug">
            “One requirement, four proposals, and our whole wedding team was booked in a weekend.”
          </blockquote>
          <figcaption className="mt-4 text-sm text-white/70">Priya S., Hyderabad</figcaption>
        </figure>
      </div>
    </div>
  );
}
