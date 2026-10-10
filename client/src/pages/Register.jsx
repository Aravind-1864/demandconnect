import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import AuthShell from "../components/AuthShell";
import { Alert, Button, Field, Input } from "../components/ui";

const ROLES = [
  { value: "CUSTOMER", title: "I need services", text: "Post events, compare proposals, book providers" },
  { value: "PROVIDER", title: "I offer services", text: "Create a profile, find requirements, send proposals" },
];

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: params.get("role") === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = "Enter a valid email address";
    if (form.password.length < 8) v.password = "Password must be at least 8 characters";
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    setError("");
    try {
      const u = await register(form);
      navigate(u.role === "PROVIDER" ? "/provider/profile" : "/choose-mode", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">I want to…</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  form.role === r.value ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <input type="radio" name="role" className="sr-only" checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} />
                <span className="block text-sm font-semibold text-slate-900">{r.title}</span>
                <span className="block text-xs text-slate-500">{r.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Full name" required error={errors.name}>
          <Input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" required error={errors.password} hint="At least 8 characters">
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
