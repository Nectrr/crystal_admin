import { PageHeader } from "@/components/layout/PageHeader";
import { ArtistForm } from "@/components/artists/ArtistForm";

export default function NewArtistPage() {
  return (
    <div>
      <PageHeader title="New artist" description="Create a new artist profile" />
      <ArtistForm />
    </div>
  );
}
