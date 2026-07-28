import { PageHeader } from "@/components/layout/PageHeader";
import { ShowForm } from "@/components/shows/ShowForm";

export default function NewShowPage() {
  return (
    <div>
      <PageHeader title="New show" description="Create a new tour/show entry" />
      <ShowForm />
    </div>
  );
}
