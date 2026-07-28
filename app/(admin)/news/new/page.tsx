import { PageHeader } from "@/components/layout/PageHeader";
import { NewsForm } from "@/components/news/NewsForm";

export default function NewArticlePage() {
  return (
    <div>
      <PageHeader title="New article" description="Create a new news article" />
      <NewsForm />
    </div>
  );
}
