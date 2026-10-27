import { z } from "zod";
export type RichNode = {
  type: string;
  text?: string;
  attrs?: { level?: number; start?: number; language?: string | null };
  marks?: { type: string }[];
  content?: RichNode[];
};
const node: z.ZodType<RichNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        "doc",
        "paragraph",
        "text",
        "heading",
        "bulletList",
        "orderedList",
        "listItem",
        "hardBreak",
        "horizontalRule",
        "blockquote",
        "codeBlock",
      ]),
      text: z.string().min(1).optional(),
      attrs: z
        .object({
          level: z.number().int().min(1).max(3).optional(),
          start: z.number().int().min(1).optional(),
          language: z.string().max(80).nullable().optional(),
        })
        .strict()
        .optional(),
      marks: z
        .array(
          z
            .object({
              type: z.enum(["bold", "italic", "underline", "strike", "code"]),
            })
            .strict(),
        )
        .optional(),
      content: z.array(node).optional(),
    })
    .strict(),
);
function validTree(n: RichNode, depth = 0): boolean {
  if (depth > 60) return false;
  const children = n.content ?? [];
  if (n.type === "text") return !!n.text && !n.content;
  if (n.text || n.marks) return false;
  if (["hardBreak", "horizontalRule"].includes(n.type)) return !n.content;
  const inline = ["text", "hardBreak"];
  const blocks = [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "codeBlock",
    "horizontalRule",
  ];
  if (n.type === "heading" && !n.attrs?.level) return false;
  const allowed = ["paragraph", "heading"].includes(n.type)
    ? inline
    : n.type === "codeBlock"
      ? ["text"]
      : ["bulletList", "orderedList"].includes(n.type)
        ? ["listItem"]
        : blocks;
  if (
    ["doc", "listItem", "bulletList", "orderedList", "blockquote"].includes(
      n.type,
    ) &&
    !children.length
  )
    return false;
  if (n.type === "listItem" && children[0]?.type !== "paragraph") return false;
  return children.every(
    (c) => allowed.includes(c.type) && validTree(c, depth + 1),
  );
}
export const richTextSchema = node.refine(
  (n) => n.type === "doc" && validTree(n),
  "Invalid rich-text document structure",
);
export const titleSchema = z.string().trim().min(1).max(200);
export const patchSchema = z
  .object({
    title: titleSchema.optional(),
    content: richTextSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => v.title !== undefined || v.content !== undefined);
export const emptyContent: RichNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
