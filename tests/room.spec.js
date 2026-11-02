import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [
        l.slice(0, i),
        l
          .slice(i + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      ];
    }),
);
const adminKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SECRET_KEY;
test("organizer account hosts; a guest joins, matches on hiring intent, and the organizer sees the connection", async ({
  browser,
}) => {
  test.skip(
    !env.VITE_SUPABASE_URL || !adminKey,
    "Live Supabase credentials required",
  );
  const admin = createClient(env.VITE_SUPABASE_URL, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext({ viewport: { width: 390, height: 844 } }),
  ]);
  const [host, guest] = await Promise.all(contexts.map((c) => c.newPage()));
  const errors = [];
  [host, guest].forEach((p) =>
    p.on("pageerror", (e) => errors.push(e.message)),
  );
  let roomId;
  const userIds = [];
  try {
    const hostEmail = `qa-host-${Date.now()}@example.com`,
      password = "QaHost-123456";
    const created = await admin.auth.admin.createUser({
      email: hostEmail,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userIds.push(created.data.user.id);
    await host.goto("/");
    await host.getByRole("button", { name: "Log in to host" }).click();
    await host.getByLabel("Email").fill(hostEmail);
    await host.getByLabel("Password").fill(password);
    await host.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(
      host.getByRole("heading", { name: "Create your event room." }),
    ).toBeVisible();
    await host.screenshot({
      path: "test-results/create-room-page.png",
      fullPage: true,
    });
    const eventName = `QA room ${Date.now()}`;
    await host.getByLabel("Event name", { exact: true }).fill(eventName);
    await host
      .getByRole("button", { name: "Create room & get QR code" })
      .click();
    await expect(
      host.getByRole("heading", { name: "Bring your room to life." }),
    ).toBeVisible();
    const url = await host.getByLabel("Invitation link").inputValue();
    const result = await admin
      .from("rooms")
      .select("id")
      .eq("name", eventName)
      .single();
    if (result.error) throw result.error;
    roomId = result.data.id;
    await host.getByRole("button", { name: "Close dialog" }).click();
    await expect(host.getByText("Your room is ready.")).toBeVisible();
    async function introduce(page, name, email, company, intent) {
      await page.getByLabel("Your name", { exact: true }).fill(name);
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("radio", { name: intent }).click();
      if (intent === "I’m looking for work")
        await page
          .getByLabel("What role are you looking for?")
          .fill("Frontend developer");
      else {
        await page.getByLabel("Company").fill(company);
        await page
          .getByLabel("Your role")
          .fill(intent === "I’m hiring" ? "Founder" : "Builder");
      }
    }
    // Scanning the QR code lands on the gate, not on a form.
    await guest.goto(url);
    await expect(guest.getByRole("heading", { name: eventName })).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Log in or sign up" }),
    ).toBeVisible();
    await guest.getByRole("button", { name: "Join as guest" }).click();
    await introduce(
      guest,
      "QA Bob",
      "qa-bob@example.com",
      "Freelance",
      "I’m looking for work",
    );
    await guest
      .getByRole("button", { name: "+ Frontend", exact: true })
      .first()
      .click();
    await guest
      .getByRole("button", { name: "+ Product", exact: true })
      .last()
      .click();
    await guest.getByRole("button", { name: "Join as guest" }).click();
    await expect(host.getByRole("tab", { name: "People (1)" })).toBeVisible({
      timeout: 15000,
    });
    await host.getByRole("tab", { name: "People (1)" }).click();
    await expect(host.getByRole("heading", { name: /QA Bob/ })).toBeVisible();
    await expect(host.getByText("qa-bob@example.com")).toBeVisible({
      timeout: 15000,
    });
    await host.screenshot({
      path: "test-results/organizer-live.png",
      fullPage: true,
    });
    await host.getByRole("tab", { name: "Live room" }).click();
    await host.screenshot({
      path: "test-results/organizer-stage.png",
      fullPage: true,
    });
    await host.getByRole("button", { name: "Join matching too" }).click();
    await introduce(
      host,
      "QA Alice",
      "qa-alice@example.com",
      "Tinyfox",
      "I’m hiring",
    );
    await host
      .getByRole("button", { name: "+ Product", exact: true })
      .first()
      .click();
    await host
      .getByRole("button", { name: "+ Frontend", exact: true })
      .last()
      .click();
    await host.getByRole("button", { name: "Find my people" }).click();
    await expect(host.getByText("Hiring match", { exact: true })).toBeVisible();
    await expect(guest.getByText("QA Alice", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      guest.getByText("Job opportunity", { exact: true }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Let’s meet", exact: true }).click();
    await expect(
      host.getByRole("heading", { name: "Who should join the conversation?" }),
    ).toBeVisible();
    await host
      .getByLabel("Add a note Optional")
      .fill("Would love to talk about building this together.");
    await host.getByRole("button", { name: "Send meeting request" }).click();
    await expect(
      host.getByRole("heading", { name: "Congratulations!" }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Back to dashboard" }).click();
    await guest.getByRole("tab", { name: /Inbox/ }).click();
    await expect(
      guest.getByText("Would love to talk about building this together."),
    ).toBeVisible();
    await guest
      .getByRole("button", { name: "Let’s meet", exact: true })
      .click();
    await expect(
      guest.getByRole("heading", { name: "Congratulations!" }),
    ).toBeVisible();
    await guest.getByRole("button", { name: "Back to dashboard" }).click();
    await guest.getByRole("tab", { name: /Inbox/ }).click();
    await expect(
      guest
        .getByRole("article")
        .getByText("You agreed to meet at Registration desk.", {
          exact: true,
        }),
    ).toBeVisible();
    await host.getByRole("tab", { name: /Inbox/ }).click();
    await host.getByRole("button", { name: "We met" }).click();
    await expect(
      host.getByRole("heading", { name: "Keep the conversation going." }),
    ).toBeVisible();
    await expect(host.getByLabel("Email")).toHaveValue("qa-alice@example.com");
    await host.getByRole("radio", { name: "WhatsApp" }).click();
    await host.getByLabel("WhatsApp number").fill("+65 9123 4567");
    await host
      .getByLabel("Message")
      .fill("Great meeting you — let’s build something.");
    await host
      .getByRole("button", { name: "Confirm we met & send card" })
      .click();
    await expect(
      guest.getByText("You met. Keep the connection going."),
    ).toBeVisible({ timeout: 15000 });
    await guest.getByRole("tab", { name: /Inbox/ }).click();
    await expect(guest.getByText("CONTACT ME")).toBeVisible({ timeout: 15000 });
    await expect(guest.getByText("+65 9123 4567")).toBeVisible();
    await expect(
      guest.getByText("Great meeting you — let’s build something."),
    ).toBeVisible();
    // The organizer sees who connected with whom.
    await host.getByRole("tab", { name: "Organizer view" }).click();
    await host.getByRole("tab", { name: /Connections/ }).click();
    await expect(host.getByText("Met ✓")).toBeVisible({ timeout: 15000 });
    await expect(
      host.getByRole("heading", { name: /QA Alice.*QA Bob/ }),
    ).toBeVisible();
    await host.screenshot({
      path: "test-results/desktop-room.png",
      fullPage: true,
    });
    await guest.screenshot({
      path: "test-results/mobile-room.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    if (roomId) {
      const users = await admin
        .from("room_members")
        .select("user_id")
        .eq("room_id", roomId);
      userIds.push(...(users.data || []).map((m) => m.user_id));
      await admin.from("contact_cards").delete().eq("room_id", roomId);
      await admin.from("member_contacts").delete().eq("room_id", roomId);
      await admin.from("introductions").delete().eq("room_id", roomId);
      await admin.from("room_members").delete().eq("room_id", roomId);
      await admin.from("rooms").delete().eq("id", roomId);
    }
    for (const id of new Set(userIds)) await admin.auth.admin.deleteUser(id);
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});
