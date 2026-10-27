import { test, expect } from "@playwright/test";
test("create, format, autosave, reopen, share, edit, revoke and import", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Documents", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Document title" }),
  ).toBeVisible();
  const documentId = page.url().split("/").pop()!;
  try {
    await page
      .getByRole("textbox", { name: "Document title" })
      .fill("Project Notes");
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.getByRole("combobox", { name: "Text style" }).selectOption("2");
    await editor.pressSequentially("Project heading");
    await editor.press("Enter");
    await page.getByRole("combobox", { name: "Text style" }).selectOption("0");
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await editor.pressSequentially("Bold notes");
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await editor.press("Enter");
    await page
      .getByRole("button", { name: "Bulleted list", exact: true })
      .click();
    await editor.pressSequentially("A list item");
    await expect(page.getByRole("status")).toHaveText("All changes saved");
    await page.reload();
    await expect(editor.locator("h2")).toHaveText("Project heading");
    await expect(editor.locator("strong")).toHaveText("Bold notes");
    await expect(editor.locator("li")).toContainText("A list item");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const bob = page
      .locator(".share-user")
      .filter({ hasText: "bob@example.com" });
    await bob.getByRole("button", { name: "Grant access" }).click();
    await expect(bob).toContainText("Can edit");
    await page.getByRole("button", { name: "Close sharing" }).click();
    await page.getByRole("button", { name: "All documents" }).click();
    await Promise.all([
      page.waitForEvent("load"),
      page
        .getByRole("combobox", { name: "Active demo user" })
        .selectOption("bob"),
    ]);
    await page
      .getByRole("link")
      .filter({ has: page.getByRole("heading", { name: "Project Notes" }) })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Document title" }),
    ).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("button", { name: "Share", exact: true }),
    ).toHaveCount(0);
    await editor.click();
    await editor.press("Control+End");
    await editor.press("Enter");
    await editor.pressSequentially("Edited by Bob");
    await expect(page.getByRole("status")).toHaveText("All changes saved");
    await page.getByRole("button", { name: "All documents" }).click();
    await Promise.all([
      page.waitForEvent("load"),
      page
        .getByRole("combobox", { name: "Active demo user" })
        .selectOption("alice"),
    ]);
    await page.goto(`/documents/${documentId}`);
    await expect(editor).toContainText("Edited by Bob");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
      .locator(".share-user")
      .filter({ hasText: "bob@example.com" })
      .getByRole("button", { name: "Revoke access" })
      .click();
    await expect(
      page.locator(".share-user").filter({ hasText: "bob@example.com" }),
    ).toContainText("No access");
    await page.getByRole("button", { name: "Close sharing" }).click();
    await page.getByRole("button", { name: "All documents" }).click();
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "Browser import.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Imported heading\n\n- Imported list"),
      });
    await expect(editor.locator("h1")).toHaveText("Imported heading");
    await expect(editor.locator("li")).toContainText("Imported list");
    const importedId = page.url().split("/").pop()!;
    await editor.click();
    await editor.press("Control+End");
    await editor.pressSequentially(" saved");
    await expect(page.getByRole("status")).toHaveText("All changes saved");
    await page.reload();
    await expect(editor).toContainText("saved");
    await page.request.delete(`/api/documents/${importedId}`);
  } finally {
    await page.request.post("/api/demo-session", { data: { userId: "alice" } });
    await page.request.delete(`/api/documents/${documentId}`);
  }
});
