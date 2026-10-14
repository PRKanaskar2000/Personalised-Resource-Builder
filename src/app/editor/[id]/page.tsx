import { notFound } from "next/navigation";
import { EditorShell } from "@/components/EditorShell";
import { resourceFor } from "@/lib/access";
import { requireSession } from "@/lib/auth";
import { getConnector } from "@/lib/connectors";
import { withDerivedValues, withSampleCustomFields } from "@/lib/personalisation";
import { listClientAssets } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  // Only a resource in one of this user's own events can be opened
  const found = await resourceFor(session, (await params).id);
  if (!found) notFound();
  const { resource, event } = found;

  const [fundraisers, assets] = await Promise.all([getConnector().listFundraisers(), listClientAssets(event.clientId)]);
  const settings = event.settings;

  return (
    <EditorShell
      resource={resource}
      // The dummy values shown on the canvas, with calculated values (progress, impact) added
      fundraisers={fundraisers.map((person) => withDerivedValues(withSampleCustomFields(person, settings), settings))}
      assets={assets}
      settings={settings}
    />
  );
}
