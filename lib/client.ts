export type User = { id: string; name: string; email: string };
export type Doc = {
  id: string;
  title: string;
  content: import("@tiptap/react").JSONContent;
  ownerId: string;
  owner: User;
  version: number;
  updatedAt: string;
};
export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers:
      options?.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
