import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../utils/useFetch";
import { todayInput } from "../../utils/format";
import { MonthCalendar } from "../../components/visual";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, PageLoader } from "../../components/ui";
import { Link } from "react-router-dom";

export default function ProviderCalendar() {
  const { data, loading, error, reload } = useFetch("/providers/me/calendar");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <EmptyState
        title="Create your profile first"
        description="Your calendar appears once your provider profile exists."
        action={<Link to="/provider/profile"><Button>Create profile</Button></Link>}
      />
    );
  }

  const blocked = data.blockedDates.map((d) => new Date(d).toISOString().slice(0, 10));

  const setBlocked = async (list) => {
    setBusy(true);
    setActionError("");
    try {
      await api.patch("/providers/profile", { availability: { blockedDates: list } });
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Calendar" subtitle="Your confirmed jobs and the dates you've marked unavailable." />
      <Alert>{actionError}</Alert>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card className="p-6">
          <MonthCalendar bookings={data.bookings} blockedDates={data.blockedDates} workingDays={data.workingDays} />
        </Card>
        <Card className="h-fit p-6">
          <h2 className="text-xl font-semibold text-slate-900">Block a date</h2>
          <Field label="Date" className="mt-4">
            <Input type="date" min={todayInput()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button
            className="mt-3 w-full"
            loading={busy}
            disabled={!date || blocked.includes(date)}
            onClick={async () => {
              await setBlocked([...blocked, date]);
              setDate("");
            }}
          >
            Mark unavailable
          </Button>

          <h3 className="mt-6 text-sm font-semibold text-slate-700">Blocked dates</h3>
          <ul className="mt-2 space-y-1.5">
            {blocked.length === 0 && <li className="text-sm text-slate-400">None</li>}
            {blocked.sort().map((d) => (
              <li key={d} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
                {d}
                <button className="text-xs font-semibold hover:underline" onClick={() => setBlocked(blocked.filter((x) => x !== d))}>Unblock</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
