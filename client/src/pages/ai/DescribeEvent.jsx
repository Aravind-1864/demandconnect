import { useEffect, useRef, useState } from "react";
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
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  useEffect(() => {
    return () => recognition.current?.stop();
  }, []);

  const toggleVoice = () => {
    if (listening) return recognition.current?.stop();
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    const base = text ? text.trimEnd() + " " : "";
    rec.onresult = (e) => {
      const spoken = [...e.results].map((r) => r[0].transcript).join(" ");
      setText((base + spoken).slice(0, 2000));
    };
    rec.onerror = (e) => {
      setListening(false);
      setError(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in your browser to dictate." : "Voice input stopped. Please try again.");
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setError("");
    setListening(true);
    rec.start();
  };

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
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{text.length}/2000</span>
              {SpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-pressed={listening}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    listening ? "border-red-300 bg-red-50 text-red-600" : "border-slate-300 text-slate-600 hover:border-brand-200"
                  }`}
                >
                  <span className={listening ? "animate-pulse" : ""}>🎙️</span>
                  {listening ? "Listening… tap to stop" : "Speak instead"}
                </button>
              )}
            </div>
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
