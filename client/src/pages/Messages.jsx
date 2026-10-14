import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import api, { errorMessage, unwrap } from "../services/api";
import { sized } from "../utils/images";
import { Alert, Button, EmptyState, PageLoader } from "../components/ui";

const timeLabel = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const dayLabel = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Avatar({ user, size = "h-11 w-11" }) {
  const label = (user.businessName || user.name || "?").charAt(0).toUpperCase();
  return user.avatar ? (
    <img src={sized(user.avatar, 120)} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-lg font-semibold text-brand-700`}>{label}</span>
  );
}

export default function Messages() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const { socket, refreshMessages } = useRealtime();
  const navigate = useNavigate();

  const [convos, setConvos] = useState(null);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottom = useRef(null);
  const lastTyped = useRef(0);
  const typingTimer = useRef(null);

  const loadConvos = useCallback(async () => {
    try {
      setConvos(unwrap(await api.get("/messages/conversations")));
    } catch (err) {
      setError(errorMessage(err));
      setConvos([]);
    }
  }, []);

  const loadThread = useCallback(async () => {
    if (!userId) return setThread(null);
    try {
      setThread(unwrap(await api.get(`/messages/with/${userId}`)));
      refreshMessages();
      loadConvos();
    } catch (err) {
      setError(errorMessage(err));
      setThread(null);
    }
  }, [userId, refreshMessages, loadConvos]);

  useEffect(() => {
    loadConvos();
  }, [loadConvos]);

  useEffect(() => {
    setError("");
    setThread(null);
    loadThread();
  }, [loadThread]);

  // Live updates.
  useEffect(() => {
    if (!socket) return;
    const onMessage = (m) => {
      const other = String(m.sender) === String(me._id) ? String(m.recipient) : String(m.sender);
      loadConvos();
      if (other === userId) {
        setThread((t) => (t && !t.messages.some((x) => x._id === m._id) ? { ...t, messages: [...t.messages, m] } : t));
        if (String(m.recipient) === String(me._id)) api.get(`/messages/with/${userId}`).then(refreshMessages).catch(() => {});
        setTyping(false);
      }
    };
    const onTyping = ({ from }) => {
      if (from !== userId) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 2500);
    };
    socket.on("message", onMessage);
    socket.on("typing", onTyping);
    return () => {
      socket.off("message", onMessage);
      socket.off("typing", onTyping);
    };
  }, [socket, userId, me._id, loadConvos, refreshMessages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages.length, typing]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const m = unwrap(await api.post("/messages", { recipient: userId, text: body }));
      setText("");
      setThread((t) => (t && !t.messages.some((x) => x._id === m._id) ? { ...t, messages: [...t.messages, m] } : t));
      loadConvos();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const onType = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (socket && userId && now - lastTyped.current > 1500) {
      lastTyped.current = now;
      socket.emit("typing", { to: userId });
    }
  };

  if (convos === null) return <PageLoader />;

  // The counterpart may not have a conversation yet (first message from a profile).
  const sidebar = [...convos];
  if (thread && !sidebar.some((c) => c.user._id === thread.user._id)) {
    sidebar.unshift({ user: thread.user, last: { text: "New conversation", createdAt: new Date().toISOString() }, unread: 0 });
  }

  let lastDay = "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid h-[calc(100vh-170px)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[20rem_1fr]">
        {/* Conversations */}
        <aside className={`flex-col border-r border-slate-200 ${userId ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h1 className="font-display text-2xl font-semibold text-slate-900">Messages</h1>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {sidebar.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-slate-400">
                No conversations yet.{" "}
                {me.role === "CUSTOMER" ? <Link to="/providers" className="font-semibold text-brand-600">Find a provider</Link> : "Customers will appear here."}
              </li>
            )}
            {sidebar.map((c) => (
              <li key={c.user._id}>
                <Link
                  to={`/messages/${c.user._id}`}
                  className={`flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50 ${c.user._id === userId ? "bg-brand-50/60" : ""}`}
                >
                  <Avatar user={c.user} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold text-slate-900">{c.user.businessName || c.user.name}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{dayLabel(c.last.createdAt)}</span>
                    </span>
                    <span className={`block truncate text-sm ${c.unread ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                      {c.last.mine ? "You: " : ""}{c.last.text}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{c.unread}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Thread */}
        <section className={`min-h-0 flex-col ${userId ? "flex" : "hidden md:flex"}`}>
          {!userId ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState icon="💬" title="Select a conversation" description="Pick a thread on the left, or message a provider from their profile." />
            </div>
          ) : !thread ? (
            error ? <div className="p-6"><Alert>{error}</Alert></div> : <PageLoader />
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
                <button className="mr-1 text-slate-500 md:hidden" onClick={() => navigate("/messages")} aria-label="Back">←</button>
                <Avatar user={thread.user} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{thread.user.businessName || thread.user.name}</p>
                  <p className="text-xs text-slate-400">
                    {typing ? <span className="text-brand-600">typing…</span> : thread.user.role === "PROVIDER" ? "Provider" : "Customer"}
                  </p>
                </div>
                {thread.user.profileId && (
                  <Link to={`/providers/${thread.user.profileId}`} className="ml-auto text-sm font-semibold text-brand-600">View profile</Link>
                )}
              </header>

              <div className="flex-1 space-y-1 overflow-y-auto bg-slate-50 px-5 py-4">
                {thread.messages.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">Say hello 👋 Share your date, city and what you need.</p>
                )}
                {thread.messages.map((m) => {
                  const mine = String(m.sender) === String(me._id);
                  const day = dayLabel(m.createdAt);
                  const showDay = day !== lastDay;
                  lastDay = day;
                  return (
                    <div key={m._id}>
                      {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">{day}</p>}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[78%] animate-pop rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                            {timeLabel(m.createdAt)}{mine && m.readAt ? " · Seen" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex">
                    <div className="flex gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottom} />
              </div>

              <form onSubmit={send} className="border-t border-slate-100 p-3">
                {error && <p className="mb-2 px-2 text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <input
                    value={text}
                    onChange={onType}
                    maxLength={2000}
                    placeholder="Write a message…"
                    className="flex-1 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    aria-label="Message"
                  />
                  <Button type="submit" loading={sending} disabled={!text.trim()}>Send</Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
