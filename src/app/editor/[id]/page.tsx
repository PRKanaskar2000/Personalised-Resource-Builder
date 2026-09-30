import { notFound } from "next/navigation";
import { EditorShell } from "@/components/EditorShell";
import { getConnector } from "@/lib/connectors";
import { getResource, getTemplate, listAssets } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) notFound();
  const [fundraisers, assets, template] = await Promise.all([
    getConnector().listFundraisers(),
    listAssets(),
    resource.templateId ? getTemplate(resource.templateId) : Promise.resolve(null),
  ]);

  return (
    <EditorShell
      resource={resource}
      fundraisers={fundraisers}
      assets={assets}
      lockedLayerIds={template?.lockedLayerIds ?? []}
    />
  );
}
