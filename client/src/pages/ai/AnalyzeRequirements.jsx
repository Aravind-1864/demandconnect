import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import RequestForm from "../../components/RequestForm";
import { Alert, Badge, PageHeader } from "../../components/ui";

export default function AnalyzeRequirements() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const parsed = state?.parsed;

  // Direct visits / refreshes have no analysis to show.
  if (!parsed) return <Navigate to="/ai/describe" replace />;

  const initial = {
    title: [parsed.eventType, ...parsed.services.map((s) => s.categoryName)].filter(Boolean).join(" · "),
    eventType: parsed.eventType || "Other",
    location: parsed.location,
    eventDate: parsed.eventDate,
    duration: parsed.duration,
    guestCount: parsed.guestCount,
    budgetMin: parsed.budgetMin,
    budgetMax: parsed.budgetMax,
    description: parsed.description,
    services: parsed.services.map((s) => ({ category: s.category, requirements: s.requirements })),
  };

  const missing = [
    !parsed.location && "location",
    !parsed.eventDate && "event date",
    !parsed.services.length && "service type",
    !parsed.budgetMax && "budget",
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/ai/describe" className="text-sm text-slate-500 hover:text-slate-800">← Edit description</Link>
      <div className="mt-3">
        <PageHeader
          title="Review what we understood"
          subtitle="Check and correct each field. Nothing is saved until you confirm."
          actions={<Badge tone={parsed.source === "ai" ? "brand" : "slate"}>{parsed.source === "ai" ? "AI-extracted" : "Auto-extracted"}</Badge>}
        />
      </div>

      <div className="mb-6 space-y-3">
        <Alert tone="warning">{parsed.warning}</Alert>
        {missing.length > 0 && (
          <Alert tone="info">
            We couldn't find your {missing.join(", ")}. Please fill {missing.length > 1 ? "them" : "it"} in below for better matches.
          </Alert>
        )}
      </div>

      <RequestForm
        initial={initial}
        mode="AI"
        submitLabel="Confirm & find providers"
        onSaved={(request) => navigate(`/ai/recommendations/${request._id}`, { replace: true })}
      />
    </div>
  );
}
