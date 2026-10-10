import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.from || homeFor(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your events and proposals."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <Alert>{error}</Alert>
        <Field label="Email" required>
          <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" required>
          <Input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Button type="submit" size="lg" loading={loading} className="w-full">Log in</Button>
      </form>
    </AuthShell>
  );
}
