import { useNavigate, useSearchParams } from "react-router-dom";
import RequestForm from "../../components/RequestForm";
import useFetch from "../../utils/useFetch";
import { Alert, PageHeader, PageLoader } from "../../components/ui";

export default function NewRequest() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const providerId = params.get("provider");
  const { data: provider, loading } = useFetch(providerId ? `/providers/${providerId}` : null);

  if (providerId && loading) return <PageLoader />;

  const initial = provider
    ? {
        location: provider.location,
        services: [{ category: provider.categories?.[0]?._id || "", requirements: [] }],
      }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Post a requirement" subtitle="Providers will review it and send you priced proposals." />
      {provider && (
        <Alert tone="info" className="mb-6">
          <strong>{provider.businessName}</strong> will be invited to send you a proposal. Other matching providers can quote too.
        </Alert>
      )}
      <RequestForm
        initial={initial}
        mode="MANUAL"
        invitedProviders={provider ? [provider._id] : []}
        onSaved={(r) => navigate(`/customer/requests/${r._id}/proposals`, { replace: true })}
      />
    </div>
  );
}
