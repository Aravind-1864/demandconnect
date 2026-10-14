import { useState } from "react";
import { Link } from "react-router-dom";
import { useCollections } from "../../context/CollectionsContext";
import useFetch from "../../utils/useFetch";
import ProviderCard from "../../components/ProviderCard";
import { Button, EmptyState, PageHeader, PageLoader } from "../../components/ui";

export default function Saved() {
  const { saved } = useCollections();
  const { data, loading } = useFetch("/favorites");
  const [copied, setCopied] = useState(false);

  if (loading) return <PageLoader />;
  // Reflect hearts toggled on this page immediately.
  const list = (data || []).filter((p) => saved.has(p._id));

  const share = async () => {
    const url = `${window.location.origin}/shortlist?ids=${list.slice(0, 6).map((p) => p._id).join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PageHeader
        title="Saved providers"
        subtitle="Providers you have hearted. Share the shortlist with family or compare up to three."
        actions={list.length > 0 && <Button variant="secondary" onClick={share}>{copied ? "✓ Link copied" : "🔗 Share shortlist"}</Button>}
      />
      {list.length === 0 ? (
        <EmptyState
          icon="♡"
          title="No saved providers yet"
          description="Tap the heart on any provider to keep them here."
          action={<Link to="/providers"><Button>Browse providers</Button></Link>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => <ProviderCard key={p._id} provider={p} />)}
        </div>
      )}
    </>
  );
}
