"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ArtistForm } from "@/components/artists/ArtistForm";
import { TourDatesSection } from "@/components/artists/TourDatesSection";
import { ProjectsSection } from "@/components/artists/ProjectsSection";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { getArtist, deleteArtist, type Artist } from "@/lib/api/artists";

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setArtist(await getArtist(params.id));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load artist.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDelete() {
    if (!artist) return;
    setDeleting(true);
    try {
      await deleteArtist(artist.id);
      showSuccess("Artist deleted.");
      router.push("/artists");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Failed to delete artist.");
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
  if (!artist) return null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={artist.name}
        description={artist.slug}
        actions={
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        }
      />
      <ArtistForm initial={artist} />
      <div className="border-t border-[#EDEAE0] pt-8">
        <TourDatesSection artistId={artist.id} dates={[]} />
      </div>
      <div className="border-t border-[#EDEAE0] pt-8">
        <ProjectsSection artistId={artist.id} projects={[]} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete artist"
        message={`Delete "${artist.name}"? This is a soft delete.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
