import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageLoader } from "./components/ui";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProviderListing from "./pages/manual/ProviderListing";
import ProviderDetails from "./pages/manual/ProviderDetails";

// Role-specific areas are code-split so visitors don't download them.
const ChooseMode = lazy(() => import("./pages/ChooseMode"));
const DescribeEvent = lazy(() => import("./pages/ai/DescribeEvent"));
const AnalyzeRequirements = lazy(() => import("./pages/ai/AnalyzeRequirements"));
const Recommendations = lazy(() => import("./pages/ai/Recommendations"));
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const MyRequests = lazy(() => import("./pages/customer/MyRequests"));
const NewRequest = lazy(() => import("./pages/customer/NewRequest"));
const Proposals = lazy(() => import("./pages/customer/Proposals"));
const Bookings = lazy(() => import("./pages/customer/Bookings"));
const ProviderDashboard = lazy(() => import("./pages/provider/ProviderDashboard"));
const ManageProfile = lazy(() => import("./pages/provider/ManageProfile"));
const AvailableRequests = lazy(() => import("./pages/provider/AvailableRequests"));
const MyProposals = lazy(() => import("./pages/provider/MyProposals"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Page not found</h1>
      <Link to="/" className="mt-6 inline-block font-semibold text-brand-600 hover:text-brand-700">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="providers" element={<ProviderListing />} />
          <Route path="providers/:id" element={<ProviderDetails />} />

          <Route element={<ProtectedRoute roles={["CUSTOMER"]} />}>
            <Route path="choose-mode" element={<ChooseMode />} />
            <Route path="ai/describe" element={<DescribeEvent />} />
            <Route path="ai/analyze" element={<AnalyzeRequirements />} />
            <Route path="ai/recommendations/:requestId" element={<Recommendations />} />

            <Route element={<DashboardLayout />}>
              <Route path="customer" element={<CustomerDashboard />} />
              <Route path="customer/requests" element={<MyRequests />} />
              <Route path="customer/requests/new" element={<NewRequest />} />
              <Route path="customer/requests/:id/proposals" element={<Proposals />} />
              <Route path="customer/bookings" element={<Bookings />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["PROVIDER"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="provider" element={<ProviderDashboard />} />
              <Route path="provider/profile" element={<ManageProfile />} />
              <Route path="provider/requests" element={<AvailableRequests />} />
              <Route path="provider/proposals" element={<MyProposals />} />
              <Route path="provider/bookings" element={<Bookings />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
