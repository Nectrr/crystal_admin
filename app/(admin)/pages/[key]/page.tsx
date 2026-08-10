"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { HomePageForm } from "@/components/pages/HomePageForm";
import { AboutPageForm } from "@/components/pages/AboutPageForm";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/app/providers/ToastProvider";
import { getPage, type HomePageContent, type AboutPageContent } from "@/lib/api/pages";

const LABELS: Record<string, string> = { home: "Homepage", about: "About page" };

export default function PageEditPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const { showError } = useToast();
  const [content, setContent] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const page = await getPage<unknown>(params.key);
        setContent(page.content ?? {});
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Failed to load page.");
        setContent({});
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.key]);

  if (!LABELS[params.key]) {
    return (
      <div>
        <PageHeader title="Unknown page" />
        <Button variant="secondary" onClick={() => router.push("/pages")}>
          <ArrowLeft className="h-4 w-4" /> Back to pages
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={LABELS[params.key]}
        description="Changes are live on the public site as soon as you save."
        actions={
          <Button variant="secondary" onClick={() => router.push("/pages")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B8952F]" />
        </div>
      ) : params.key === "home" ? (
        <HomePageForm initial={(content as HomePageContent) ?? {}} />
      ) : (
        <AboutPageForm initial={(content as AboutPageContent) ?? {}} />
      )}
    </div>
  );
}
