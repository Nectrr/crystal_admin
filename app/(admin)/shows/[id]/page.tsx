"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ShowForm } from "@/components/shows/ShowForm";
import { TourStopsTab } from "@/components/shows/TourStopsTab";
import { TicketingTab } from "@/components/shows/TicketingTab";
import { RegistrationsTab } from "@/components/shows/RegistrationsTab";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { getShow, deleteShow, publishShow, unpublishShow, type Show, type TourStop } from "@/lib/api/shows";

type Tab = "details" | "tour-stops" | "ticketing" | "registrations";

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("details");
  const [publishing, setPublishing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setShow(await getShow(params.id));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to load show.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handlePublishToggle() {
    if (!show) return;
    setPublishing(true);
    try {
      const updated = show.is_active ? await unpublishShow(show.id) : await publishShow(show.id);
      setShow(updated);
      showSuccess(show.is_active ? "Show unpublished." : "Show published.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.code === "NO_HERO_IMAGE") {
          showError("Can't publish: this show has no hero image set.");
        } else if (err.code === "TICKETS_NOT_CONFIGURED") {
          showError("Can't publish: ticket settings haven't been configured yet.");
        } else {
          showError(err.message);
        }
      } else {
        showError(err instanceof ApiError ? err.message : "Failed to update publish status.");
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!show) return;
    setDeleting(true);
    try {
      await deleteShow(show.id);
      showSuccess("Show deleted.");
      router.push("/shows");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete show.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
      </div>
    );
  }

  if (!show) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "tour-stops", label: "Tour Stops" },
    { key: "ticketing", label: "Ticketing" },
    { key: "registrations", label: "Registrations" },
  ];

  return (
    <div>
      <PageHeader
        title={`${show.artist_name} — ${show.tour_name}`}
        description={show.slug}
        actions={
          <>
            <Badge color={show.is_active ? "green" : "gray"}>{show.is_active ? "Published" : "Draft"}</Badge>
            <Button variant="secondary" onClick={handlePublishToggle} loading={publishing}>
              {show.is_active ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="flex gap-1 border-b border-[#EDEAE0] mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-[#B8952F] text-[#4A4A3C]" : "border-transparent text-[#8C8C78] hover:text-[#4A4A3C]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && <ShowForm initial={show} />}
      {tab === "tour-stops" && (
        <TourStopsTabWrapper showId={show.id} />
      )}
      {tab === "ticketing" && <TicketingTab showId={show.id} />}
      {tab === "registrations" && <RegistrationsTab showId={show.id} />}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete show"
        message={`Delete "${show.artist_name} — ${show.tour_name}"? This is a soft delete and can be recovered by an engineer if needed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function TourStopsTabWrapper({ showId }: { showId: string }) {
  // Tour stops aren't part of the Show payload, so this small wrapper owns their own fetch state.
  const [stops, setStops] = useState<TourStop[] | null>(null);
  const { showError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const show = await getShow(showId);
        // Tour stops are not returned on the show object per spec; if the backend nests them,
        // adjust here. For now we start with an empty list and let the tab manage CRUD state.
        setStops((show as unknown as { tour_stops?: TourStop[] }).tour_stops ?? []);
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load tour stops.");
        setStops([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  if (stops === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[#B8952F]" />
      </div>
    );
  }

  return <TourStopsTab showId={showId} stops={stops} onChange={setStops} />;
}
