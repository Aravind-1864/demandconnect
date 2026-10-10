import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { DEMO } from "../services/api";
import { resetDemo } from "../services/demoApi";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {DEMO && (
        <div className="bg-slate-900 px-4 py-2 text-center text-xs text-white">
          Preview build with sample data. Backend, database and live AI are not connected.{" "}
          <button
            className="font-semibold underline"
            onClick={() => {
              resetDemo();
              localStorage.removeItem("dc_token");
              window.location.href = "/";
            }}
          >
            Reset demo
          </button>
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
