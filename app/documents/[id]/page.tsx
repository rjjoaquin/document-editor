import { Suspense } from "react";
import { notFound } from "next/navigation";
import { currentUser, HttpError } from "@/lib/auth";
import { accessibleDocument } from "@/lib/permissions";
import { DocumentEditor } from "@/components/editor";
async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  const { id } = await params;
  const d = await accessibleDocument(id, user.id).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  return (
    <>
      <div className="editor-brand">
        Papertrail <span>DOCUMENT WORKSPACE</span>
      </div>
      <DocumentEditor
        document={{
          ...d,
          content: JSON.parse(d.content),
          updatedAt: d.updatedAt.toISOString(),
        }}
        owner={d.ownerId === user.id}
      />
    </>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="dashboard" role="status">Opening document…</main>}><DocumentPage {...props} /></Suspense>;
}
