"use client";

import { Badge } from "@/components/ui/Table";
import { privateLinkStatus, type PrivateLink } from "@/lib/api/privateLinks";

export function PrivateLinkStatusBadge({ link }: { link: PrivateLink }) {
  switch (privateLinkStatus(link)) {
    case "revoked":
      return <Badge color="red">Revoked</Badge>;
    case "expired":
      return <Badge color="gray">Expired</Badge>;
    case "sold_out":
      return <Badge color="gray">Sold out</Badge>;
    default:
      return <Badge color="green">Active</Badge>;
  }
}

export async function copyLink(url: string, onSuccess: (m: string) => void, onError: (m: string) => void) {
  try {
    await navigator.clipboard.writeText(url);
    onSuccess("Link copied.");
  } catch {
    onError("Couldn't copy — select the link and copy it manually.");
  }
}
