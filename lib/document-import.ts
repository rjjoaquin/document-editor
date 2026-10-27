import { marked, type Token, type Tokens } from "marked";
import { richTextSchema, type RichNode } from "./validations";
function inline(
  tokens: Token[] = [],
  marks: { type: string }[] = [],
): RichNode[] {
  return tokens.flatMap((token): RichNode[] => {
    if (token.type === "br") return [{ type: "hardBreak" }];
    if (token.type === "strong" || token.type === "em" || token.type === "del")
      return inline(token.tokens, [
        ...marks,
        {
          type:
            token.type === "strong"
              ? "bold"
              : token.type === "em"
                ? "italic"
                : "strike",
        },
      ]);
    if ("tokens" in token && token.tokens) return inline(token.tokens, marks);
    const text = "text" in token ? String(token.text) : token.raw;
    return text
      ? [{ type: "text", text, ...(marks.length ? { marks } : {}) }]
      : [];
  });
}
function blocks(tokens: Token[]): RichNode[] {
  return tokens.flatMap((t): RichNode[] => {
    if (t.type === "space") return [];
    if (t.type === "heading")
      return [
        {
          type: "heading",
          attrs: { level: Math.min(3, t.depth) },
          content: inline(t.tokens),
        },
      ];
    if (t.type === "list")
      return [
        {
          type: t.ordered ? "orderedList" : "bulletList",
          ...(t.ordered ? { attrs: { start: Number(t.start) || 1 } } : {}),
          content: (t as Tokens.List).items.map((item) => {
            const content = blocks(item.tokens);
            return {
              type: "listItem",
              content:
                content[0]?.type === "paragraph"
                  ? content
                  : [{ type: "paragraph" }, ...content],
            };
          }),
        },
      ];
    if (t.type === "blockquote")
      return [{ type: "blockquote", content: blocks(t.tokens ?? []) }];
    if (t.type === "hr") return [{ type: "horizontalRule" }];
    if (t.type === "code")
      return [
        {
          type: "codeBlock",
          content: t.text ? [{ type: "text", text: t.text }] : [],
        },
      ];
    return [
      {
        type: "paragraph",
        content:
          "tokens" in t && t.tokens
            ? inline(t.tokens)
            : [
                {
                  type: "text",
                  text: ("text" in t ? String(t.text) : t.raw) || " ",
                },
              ],
      },
    ];
  });
}
export function importContent(filename: string, text: string) {
  const content: RichNode[] = filename.toLowerCase().endsWith(".md")
    ? blocks(marked.lexer(text))
    : text
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n/)
        .map((p) => ({
          type: "paragraph",
          content: p
            .split("\n")
            .flatMap((line, i): RichNode[] => [
              ...(i ? [{ type: "hardBreak" }] : []),
              ...(line ? [{ type: "text", text: line }] : []),
            ]),
        }));
  return richTextSchema.parse({
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  });
}
