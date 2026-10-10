import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage, unwrap } from "../../services/api";
import { IMG } from "../../utils/images";
import { Alert, Button, Card, PageHeader, Textarea } from "../../components/ui";

const EXAMPLES = [
  "I need a wedding photographer in Hyderabad on 20 December 2026. My budget is ₹50,000. I need candid and traditional photography.",
  "Birthday party for 60 guests in Hyderabad next month. Looking for a caterer and decoration, around 80k total.",
];

export default function DescribeEvent() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) return setError("Please describe your event in a bit more detail.");
    setLoading(true);
    setError("");
    try {
      const parsed = unwrap(await api.post("/ai/parse-requirement", { text }));
      navigate("/ai/analyze", { state: { parsed } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Describe your event"
        subtitle="Write it the way you would tell a friend: what, where, when and your budget. You'll review everything before it is saved."
      />

      <img src={IMG.describe} alt="" className="mb-6 h-44 w-full rounded-3xl object-cover" />
      <Card className="p-6">
        <form onSubmit={analyze} className="space-y-4">
          <Alert>{error}</Alert>
          <Textarea
            rows={7}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I need a wedding photographer in Hyderabad on 20 December 2026 with a budget of ₹50,000…"
            aria-label="Event description"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{text.length}/2000</span>
            <Button type="submit" loading={loading}>
              {loading ? "Analyzing…" : "Analyze requirements"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-slate-600">Try an example</p>
        <div className="space-y-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left text-sm text-slate-600 transition hover:border-brand-200 hover:bg-brand-50/50"
            >
              “{ex}”
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
