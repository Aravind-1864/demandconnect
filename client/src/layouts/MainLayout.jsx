import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CompareBar } from "../components/widgets";

export default function MainLayout() {
  const { pathname } = useLocation();

  // Smooth, inertial scrolling for mouse wheels. Touch keeps native momentum.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      syncTouch: false,
    });
    window.__lenis = lenis;
    return () => {
      delete window.__lenis;
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f0efff]/60 overflow-x-hidden">
      {/* ── High-Vibrance Ambient Luminous Pastel Mesh for Intense Glassmorphism Refraction ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-20 -left-20 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-indigo-300/55 via-purple-300/40 to-transparent blur-[70px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/5 -right-20 h-[620px] w-[620px] rounded-full bg-gradient-to-bl from-violet-300/50 via-pink-300/40 to-transparent blur-[80px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/4 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-cyan-300/45 via-blue-200/35 to-transparent blur-[75px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-28 right-1/4 h-[580px] w-[580px] rounded-full bg-gradient-to-tl from-purple-300/50 via-indigo-200/40 to-transparent blur-[85px] -z-10"
      />

      <Navbar />
      {/* Keyed on the path so every navigation replays the entrance animation. */}
      <main key={pathname} className="flex-1 animate-fade-in pt-4">
        <Outlet />
      </main>
      <Footer />
      <CompareBar />
    </div>
  );
}
