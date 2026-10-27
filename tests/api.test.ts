import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
test(
  "API lifecycle: persistence, sharing, permissions, conflicts, import and cleanup",
  { skip: !base },
  async () => {
    async function call(
      path: string,
      user = "alice",
      method = "GET",
      body?: unknown,
    ) {
      const r = await fetch(`${base}/api${path}`, {
        method,
        headers: {
          cookie: `demo-user=${user}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, data: await r.json() };
    }
    const created = await call("/documents", "alice", "POST", {
      title: "Integration test",
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    const path = `/documents/${id}`;
    try {
      assert.equal((await call(path, "charlie")).status, 403);
      assert.equal((await call(path, "invalid")).status, 401);
      assert.equal(
        (await call(`${path}/shares`, "alice", "POST", { userId: "bob" }))
          .status,
        201,
      );
      assert.equal(
        (await call(`${path}/shares`, "alice", "POST", { userId: "bob" }))
          .status,
        409,
      );
      assert.equal((await call(path, "bob")).status, 200);
      assert.equal(
        (await call(path, "bob", "PATCH", { title: "Forbidden", version: 1 }))
          .status,
        403,
      );
      assert.equal((await call(path, "bob", "DELETE")).status, 403);
      assert.equal(
        (await call(`${path}/shares`, "bob", "POST", { userId: "charlie" }))
          .status,
        403,
      );
      const content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [
              { type: "text", text: "Saved by Bob", marks: [{ type: "bold" }] },
            ],
          },
        ],
      };
      const saved = await call(path, "bob", "PATCH", { content, version: 1 });
      assert.equal(saved.status, 200);
      assert.equal(saved.data.version, 2);
      assert.deepEqual((await call(path)).data.content, content);
      assert.equal(
        (await call(path, "alice", "PATCH", { content, version: 1 })).status,
        409,
      );
      assert.equal(
        (await call(`${path}/shares/bob`, "alice", "DELETE")).status,
        200,
      );
      assert.equal((await call(path, "bob")).status, 403);
      assert.equal(
        (await call(path, "bob", "PATCH", { content, version: 2 })).status,
        403,
      );
      const form = new FormData();
      form.append(
        "file",
        new File(["# Imported\n\n- item"], "example.md", {
          type: "text/markdown",
        }),
      );
      const imported = await fetch(`${base}/api/documents/import`, {
        method: "POST",
        headers: { cookie: "demo-user=alice" },
        body: form,
      });
      assert.equal(imported.status, 201);
      const doc = await imported.json();
      assert.equal(doc.title, "example");
      assert.equal(doc.content.content[0].type, "heading");
      await call(`/documents/${doc.id}`, "alice", "DELETE");
      const badForm = new FormData();
      badForm.append(
        "file",
        new File(["x"], "bad.html", { type: "text/html" }),
      );
      assert.equal(
        (
          await fetch(`${base}/api/documents/import`, {
            method: "POST",
            headers: { cookie: "demo-user=alice" },
            body: badForm,
          })
        ).status,
        400,
      );
    } finally {
      assert.equal((await call(path, "alice", "DELETE")).status, 200);
      assert.equal((await call(path)).status, 404);
    }
  },
);
