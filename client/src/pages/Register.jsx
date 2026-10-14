import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import useFetch from "../utils/useFetch";
import { errorMessage } from "../services/api";
import AuthShell from "../components/AuthShellClassic";
import { Alert, Button, Field, Input } from "../components/ui";

const ROLES = [
  { value: "CUSTOMER", title: "I need services", text: "Post events, compare proposals, book providers" },
  { value: "PROVIDER", title: "I offer services", text: "Create a profile, find requirements, send proposals" },
];

export default function Register() {
  const { user, register } = useAuth();
  const { data: categories } = useFetch("/categories");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: params.get("role") === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
    businessName: "",
    category: "",
    location: "Hyderabad",
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
    if (form.role === "PROVIDER") {
      if (!form.category) v.category = "Select what service you provide (e.g., Decoration)";
      if (form.businessName.trim().length < 2) v.businessName = "Enter your business or brand name";
    }
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === "PROVIDER" && {
          businessName: form.businessName,
          categories: form.category ? [form.category] : [],
          location: form.location,
        }),
      };
      const u = await register(payload);
      navigate(u.role === "PROVIDER" ? "/provider/requests" : "/choose-mode", { replace: true });
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
                className={`cursor-pointer rounded-xl p-4 transition ${
                  form.role === r.value ? "bg-white text-slate-900 ring-2 ring-slate-900" : "bg-white/70 text-slate-900 ring-1 ring-slate-200 hover:ring-slate-400"
                }`}
              >
                <input type="radio" name="role" className="sr-only" checked={form.role === r.value} onChange={() => setForm({ ...form, role: r.value })} />
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className={`mt-0.5 block text-xs text-slate-500`}>{r.text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Full name" required error={errors.name}>
          <Input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>

        {form.role === "PROVIDER" && (
          <div className="space-y-4 rounded-2xl border border-brand-200/80 bg-brand-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Provider Details</p>
            
            <Field label="What service do you provide?" required error={errors.category} hint="Choose your primary specialization">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="">Select a category (e.g. Decoration, Catering…)</option>
                {(categories || []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Business / Brand name" required error={errors.businessName} hint="e.g. Star Event Decorators">
              <Input
                placeholder="Your business or trade name"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              />
            </Field>

            <Field label="Operating city / Location" hint="e.g. Hyderabad">
              <Input
                placeholder="City (default: Hyderabad)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
          </div>
        )}

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
