import { test } from "node:test";
import assert from "node:assert/strict";
import { richTextSchema, patchSchema, emptyContent } from "../lib/validations";
import { importContent } from "../lib/document-import";
test("valid structured document preserves supported formatting", () => {
  assert.ok(
    richTextSchema.safeParse({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title", marks: [{ type: "bold" }] }],
        },
      ],
    }).success,
  );
  assert.ok(richTextSchema.safeParse(emptyContent).success);
});
test("reject unsafe and malformed documents", () => {
  for (const doc of [
    { type: "doc", content: [{ type: "script", text: "alert(1)" }] },
    { type: "doc", content: [{ type: "text", text: "invalid root child" }] },
    { type: "doc", content: [{ type: "heading", attrs: { level: 8 } }] },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    },
  ])
    assert.equal(richTextSchema.safeParse(doc).success, false);
});
test("updates require version and reject arbitrary owner ids", () => {
  assert.equal(patchSchema.safeParse({ content: emptyContent }).success, false);
  assert.equal(
    patchSchema.safeParse({ version: 1, ownerId: "bob" }).success,
    false,
  );
});
test("plain text retains paragraphs and breaks", () => {
  const doc = importContent("notes.txt", "one\nline\n\ntwo");
  assert.equal(doc.content?.length, 2);
  assert.equal(doc.content?.[0].content?.[1].type, "hardBreak");
});
test("Markdown imports headings, marks, and nested lists", () => {
  const doc = importContent(
    "notes.md",
    "# Title\n\nA **bold** and *italic* note.\n\n- first\n- second\n  - nested\n\n1. ordered",
  );
  assert.equal(doc.content?.[0].type, "heading");
  assert.equal(doc.content?.[1].content?.[1].marks?.[0].type, "bold");
  assert.ok(doc.content?.some((n) => n.type === "bulletList"));
  assert.ok(doc.content?.some((n) => n.type === "orderedList"));
});
test("HTML imports as inert text and empty Markdown is valid", () => {
  assert.ok(
    richTextSchema.safeParse(importContent("x.md", "<script>alert(1)</script>"))
      .success,
  );
  assert.ok(richTextSchema.safeParse(importContent("x.md", "")).success);
});
