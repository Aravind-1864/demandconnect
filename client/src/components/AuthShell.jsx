import { Link } from "react-router-dom";
import { Logo } from "./Navbar";

/** Login / Register shell: bright playful split. Yellow brand block on the left, form on the right. */
export default function AuthShell({ title, subtitle, children, footer, headline = ["Let's get", "the party", "started."], note = "Free for customers. Always." }) {
  return (
    <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-8 sm:py-10">
      <div className="grid overflow-hidden rounded-[2rem] bg-[#fffaf0] p-3 shadow-xl shadow-amber-900/10 ring-1 ring-amber-900/5 sm:p-4 lg:grid-cols-2 lg:gap-4">
        <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[1.6rem] bg-[#ffd23f] p-7 text-[#1d1a2b] sm:p-10 lg:min-h-[640px]">
          <Link to="/" className="inline-block lg:invisible"><Logo /></Link>

          <div className="relative z-10 mt-10">
            <h2 className="font-display text-[clamp(2.4rem,5.2vw,4.6rem)] font-medium leading-[0.96] tracking-tight">
              {headline.map((l) => (
                <span key={l} className="block">{l}</span>
              ))}
            </h2>
            <p className="mt-4 text-sm font-medium sm:text-base">{note}</p>
          </div>

          <div aria-hidden className="relative z-10 mt-8 flex items-end gap-3">
            <span className="h-14 w-14 rounded-full bg-[#ff7aa8]" />
            <span className="h-14 w-14 rounded-2xl bg-[#5ad1c0]" />
            <span className="h-14 w-14 rounded-full bg-[#7a6bff]" />
            <span className="h-9 w-24 rounded-full bg-[#1d1a2b]" />
          </div>

          <span aria-hidden className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-[#ffe27a]" />
          <span aria-hidden className="absolute -bottom-16 right-8 h-44 w-44 rotate-12 rounded-[2.5rem] bg-[#ffbf1f]" />
        </div>

        <div className="auth-form flex flex-col justify-center px-3 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <h1 className="font-display text-3xl font-medium tracking-tight text-[#1d1a2b] sm:text-4xl">{title}</h1>
            <p className="mt-1.5 text-sm text-[#6b6580] sm:text-base">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-sm text-[#6b6580]">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
