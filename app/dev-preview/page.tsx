"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export default function DevPreviewPage() {
  const [body, setBody] = useState("");
  return (
    <div className="mx-auto max-w-3xl p-8">
      <RichTextEditor label="Body" value={body} onChange={setBody} />
    </div>
  );
}
