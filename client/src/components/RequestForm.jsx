import { useState } from "react";
import api, { errorMessage } from "../services/api";
import useFetch from "../utils/useFetch";
import { todayInput, toInputDate } from "../utils/format";
import { Alert, Button, Card, ChipInput, Field, Input, Select, Textarea } from "./ui";

const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Anniversary", "Corporate event", "Baby shower", "Reception", "Party", "Other"];

const blank = {
  title: "",
  eventType: "Wedding",
  location: "",
  eventDate: "",
  duration: "",
  guestCount: "",
  budgetMin: "",
  budgetMax: "",
  description: "",
  services: [{ category: "", requirements: [] }],
};

/** Shared by Manual Mode (blank form) and AI Mode (pre-filled, user-confirmed). */
export default function RequestForm({ initial, mode = "MANUAL", invitedProviders = [], submitLabel = "Post requirement", onSaved }) {
  const { data: categories } = useFetch("/categories");
  const [form, setForm] = useState(() => ({
    ...blank,
    ...initial,
    eventDate: toInputDate(initial?.eventDate),
    duration: initial?.duration || "",
    guestCount: initial?.guestCount || "",
    budgetMin: initial?.budgetMin || "",
    budgetMax: initial?.budgetMax || "",
    services: initial?.services?.length ? initial.services : blank.services,
  }));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setService = (i, patch) =>
    setForm((f) => ({ ...f, services: f.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = "Give your requirement a short title";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.eventDate) e.eventDate = "Choose the event date";
    else if (form.eventDate < todayInput()) e.eventDate = "Event date cannot be in the past";
    if (form.budgetMax && Number(form.budgetMin || 0) > Number(form.budgetMax)) e.budgetMin = "Minimum cannot exceed maximum";
    if (form.services.some((s) => !s.category)) e.services = "Choose a category for every service";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setApiError("");
    try {
      const payload = {
        title: form.title,
        eventType: form.eventType,
        location: form.location,
        eventDate: form.eventDate,
        duration: Number(form.duration) || 0,
        guestCount: Number(form.guestCount) || 0,
        budgetMin: Number(form.budgetMin) || 0,
        budgetMax: Number(form.budgetMax) || 0,
        description: form.description,
        services: form.services.map(({ category, requirements }) => ({ category, requirements })),
        mode,
        invitedProviders,
      };
      const res = await api.post("/requests", payload);
      onSaved(res.data.data);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Alert>{apiError}</Alert>

      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Event details</h2>
        <Field label="Title" required error={errors.title}>
          <Input value={form.title} onChange={set("title")} placeholder="e.g. Wedding photography and catering" maxLength={120} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Event type" required>
            <Select value={form.eventType} onChange={set("eventType")}>
              {[...new Set([form.eventType, ...EVENT_TYPES])].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Event date" required error={errors.eventDate}>
            <Input type="date" min={todayInput()} value={form.eventDate} onChange={set("eventDate")} />
          </Field>
          <Field label="Location (city)" required error={errors.location}>
            <Input value={form.location} onChange={set("location")} placeholder="Hyderabad" />
          </Field>
          <Field label="Guests">
            <Input type="number" min="0" value={form.guestCount} onChange={set("guestCount")} placeholder="150" />
          </Field>
          <Field label="Budget — minimum (₹)" error={errors.budgetMin}>
            <Input type="number" min="0" value={form.budgetMin} onChange={set("budgetMin")} placeholder="0" />
          </Field>
          <Field label="Budget — maximum (₹)" hint="Leave empty if flexible">
            <Input type="number" min="0" value={form.budgetMax} onChange={set("budgetMax")} placeholder="50000" />
          </Field>
          <Field label="Duration (hours)">
            <Input type="number" min="0" value={form.duration} onChange={set("duration")} placeholder="8" />
          </Field>
        </div>
        <Field label="Additional details">
          <Textarea value={form.description} onChange={set("description")} placeholder="Anything providers should know…" maxLength={2000} />
        </Field>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Services needed</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => setForm((f) => ({ ...f, services: [...f.services, { category: "", requirements: [] }] }))}>
            + Add service
          </Button>
        </div>
        {errors.services && <p className="text-sm text-red-600">{errors.services}</p>}

        {form.services.map((s, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-end gap-3">
              <Field label="Category" className="flex-1">
                <Select value={s.category} onChange={(e) => setService(i, { category: e.target.value })}>
                  <option value="">Select…</option>
                  {(categories || []).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              {form.services.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }))}>
                  Remove
                </Button>
              )}
            </div>
            <Field label="Specific requirements" hint="e.g. Candid photography, Drone shots — press Enter after each">
              <ChipInput value={s.requirements} onChange={(requirements) => setService(i, { requirements })} max={15} />
            </Field>
          </div>
        ))}
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
