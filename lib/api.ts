import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { HttpError } from "./auth";
export async function api(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof HttpError)
      return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError || e instanceof SyntaxError)
      return Response.json(
        {
          error:
            "Invalid request. Check the document content and required fields.",
        },
        { status: 400 },
      );
    if (typeof e === "object" && e && "code" in e && e.code === "P2002")
      return Response.json(
        { error: "This user already has access." },
        { status: 409 },
      );
    console.error(e);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !==
      (request.headers.get("host") ?? new URL(request.url).host)
  )
    throw new HttpError(403, "Cross-origin requests are not allowed.");
}
export function serialize<T extends { content: string }>(d: T) {
  return { ...d, content: JSON.parse(d.content) };
}
