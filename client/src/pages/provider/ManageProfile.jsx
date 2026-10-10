import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { formatDate, toInputDate, todayInput } from "../../utils/format";
import { Alert, Badge, Button, Card, ChipInput, Field, Input, PageHeader, PageLoader, Textarea } from "../../components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const empty = {
  businessName: "",
  categories: [],
  description: "",
  coverImage: "",
  location: "",
  serviceAreas: [],
  startingPrice: "",
  skills: [],
  portfolio: [],
  experienceYears: "",
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  blockedDates: [],
};

export default function ManageProfile() {
  const { refresh } = useAuth();
  const { data: categories } = useFetch("/categories");
  const { data: existing, loading, error: loadError, reload } = useFetch("/providers/me");
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState({ tone: "", text: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dateDraft, setDateDraft] = useState("");

  const isNew = !existing;

  useEffect(() => {
    if (!existing) return;
    setForm({
      businessName: existing.businessName,
      categories: existing.categories.map((c) => c._id),
      description: existing.description || "",
      coverImage: existing.coverImage || "",
      location: existing.location,
      serviceAreas: existing.serviceAreas || [],
      startingPrice: existing.startingPrice || "",
      skills: existing.skills || [],
      portfolio: existing.portfolio || [],
      experienceYears: existing.experienceYears || "",
      workingDays: existing.availability?.workingDays ?? empty.workingDays,
      blockedDates: (existing.availability?.blockedDates || []).map(toInputDate),
    });
  }, [existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key, value) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.businessName.trim().length < 2) v.businessName = "Business name is required";
    if (!form.location.trim()) v.location = "Base location is required";
    if (form.categories.length === 0) v.categories = "Choose at least one category";
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setMessage({ tone: "", text: "" });
    try {
      const payload = {
        businessName: form.businessName,
        categories: form.categories,
        description: form.description,
        coverImage: form.coverImage,
        location: form.location,
        // The base city is always a service area.
        serviceAreas: [...new Set([form.location, ...form.serviceAreas])],
        startingPrice: Number(form.startingPrice) || 0,
        skills: form.skills,
        portfolio: form.portfolio,
        experienceYears: Number(form.experienceYears) || 0,
        availability: { workingDays: form.workingDays, blockedDates: form.blockedDates },
      };
      await (isNew ? api.post("/providers/profile", payload) : api.patch("/providers/profile", payload));
      setMessage({ tone: "success", text: isNew ? "Profile created — you're now visible to customers." : "Profile updated." });
      await Promise.all([reload(), refresh()]);
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !existing) return <PageLoader />;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <PageHeader
        title={isNew ? "Create your provider profile" : "My profile"}
        subtitle={isNew ? "Customers can find you and send requests once your profile is published." : undefined}
        actions={existing && <Badge tone={existing.verified ? "green" : "amber"}>{existing.verified ? "✓ Verified" : "Pending verification"}</Badge>}
      />
      {loadError && !isNew && <Alert>{loadError}</Alert>}
      <Alert tone={message.tone === "success" ? "success" : "error"}>{message.text}</Alert>

      <Card className="space-y-5 p-6">
        <h2 className="font-semibold text-slate-900">Business</h2>
        <Field label="Business name" required error={errors.businessName}>
          <Input value={form.businessName} onChange={set("businessName")} maxLength={100} />
        </Field>
        <Field label="Categories" required error={errors.categories}>
          <div className="flex flex-wrap gap-2">
            {(categories || []).map((c) => {
              const on = form.categories.includes(c._id);
              return (
                <button key={c._id} type="button" aria-pressed={on} onClick={() => toggle("categories", c._id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set("description")} maxLength={2000} placeholder="Tell customers what makes your service special…" />
        </Field>
        <Field label="Skills & specialities" hint="e.g. Candid photography, Drone shots — customers' requirements are matched against these">
          <ChipInput value={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} />
        </Field>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-semibold text-slate-900">Pricing & coverage</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Base city" required error={errors.location}>
            <Input value={form.location} onChange={set("location")} placeholder="Hyderabad" />
          </Field>
          <Field label="Starting price (₹)">
            <Input type="number" min="0" value={form.startingPrice} onChange={set("startingPrice")} />
          </Field>
          <Field label="Years of experience">
            <Input type="number" min="0" max="60" value={form.experienceYears} onChange={set("experienceYears")} />
          </Field>
        </div>
        <Field label="Other cities you serve">
          <ChipInput value={form.serviceAreas} onChange={(serviceAreas) => setForm((f) => ({ ...f, serviceAreas }))} placeholder="Add a city and press Enter" max={20} />
        </Field>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="font-semibold text-slate-900">Availability</h2>
        <Field label="Days you work" hint="Customers whose event falls on another day won't be matched to you.">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = form.workingDays.includes(i);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => toggle("workingDays", i)}
                  className={`h-10 w-14 rounded-lg border text-sm font-medium transition ${on ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-400"}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Dates you are unavailable">
          <div className="flex gap-2">
            <Input type="date" min={todayInput()} value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="max-w-xs" />
            <Button type="button" variant="secondary" onClick={() => {
              if (dateDraft && !form.blockedDates.includes(dateDraft)) setForm((f) => ({ ...f, blockedDates: [...f.blockedDates, dateDraft].sort() }));
              setDateDraft("");
            }}>Block date</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {form.blockedDates.length === 0 && <span className="text-sm text-slate-400">No blocked dates</span>}
            {form.blockedDates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                {formatDate(d)}
                <button type="button" aria-label={`Unblock ${d}`} onClick={() => setForm((f) => ({ ...f, blockedDates: f.blockedDates.filter((x) => x !== d) }))}>×</button>
              </span>
            ))}
          </div>
        </Field>
      </Card>

      <Card className="space-y-5 p-6">
        <Field label="Cover image URL" hint="Shown at the top of your profile and on your card. A wide, high-quality photo works best.">
          <Input type="url" value={form.coverImage} onChange={set("coverImage")} placeholder="https://…" />
        </Field>
        <Field label="Portfolio image URLs" hint="Paste image links (e.g. from Cloudinary or Google Drive public links). Direct image uploads can be added later.">
          <ChipInput value={form.portfolio} onChange={(portfolio) => setForm((f) => ({ ...f, portfolio }))} placeholder="https://…" max={20} />
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={saving}>{isNew ? "Publish profile" : "Save changes"}</Button>
      </div>
    </form>
  );
}
