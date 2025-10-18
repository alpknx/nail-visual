import { test, expect } from "@playwright/test";

async function signIn(page, email: string) {
  await page.goto("/signin");
  await page.getByPlaceholder("email").fill(email);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(
      page.getByRole("button", { name: "Выйти" }).or(page.getByText(email))
  ).toBeVisible();
}

test("client creates reference → pro offers → client accepts", async ({ page }) => {
  const clientEmail = "client@example.com";
  await signIn(page, clientEmail);

  // create reference via API
  const refRes = await page.request.post("/api/references", {
    data: {
      imageUrl: "https://picsum.photos/600/800?e2e",
      city: "Almaty",
      tags: ["french", "nude"],
      note: "e2e test",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(refRes.ok()).toBeTruthy();
  const ref = await refRes.json();
  const referenceId: string = ref.id;
  expect(referenceId).toBeTruthy();

  // check reference is open
  const refCheck = await page.request.get(`/api/references?id=${referenceId}`);
  const refJson = await refCheck.json();
  expect(refJson.data?.[0]?.status).toBe("open");

  // pro session
  const proCtx = await page.context().browser()!.newContext();
  const proPage = await proCtx.newPage();
  await proPage.goto("/");
  await signIn(proPage, "pro@example.com");

  // create offer via API
  const offerRes = await proPage.request.post("/api/offers", {
    data: {
      refId: referenceId,
      pricePln: 150,
      message: "Готов завтра, материалы включены",
    },
    headers: { "Content-Type": "application/json" },
  });
  expect(offerRes.ok()).toBeTruthy();
  const offer = await offerRes.json();
  const offerId: string = offer.id;

  await proCtx.close();

  // client again
  const clientCtx2 = await page.context().browser()!.newContext();
  const clientPage = await clientCtx2.newPage();
  await clientPage.goto("/");
  await signIn(clientPage, clientEmail);

  // accept offer via UI if есть кнопка, иначе через API
  await clientPage.goto(`/references/${referenceId}`);
  const acceptBtn = clientPage.getByRole("button", { name: "Принять" }).first();
  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
  } else {
    await clientPage.request.patch(`/api/offers/${offerId}`, {
      data: { status: "accepted" },
      headers: { "Content-Type": "application/json" },
    });
  }

  // verify states
  const offersList = await clientPage.request.get(
      `/api/offers?referenceId=${referenceId}`
  );
  const offersJson = await offersList.json();
  const accepted = offersJson.data.find((o: any) => o.id === offerId);
  expect(accepted?.status).toBe("accepted");
  expect(accepted?.acceptedAt ?? accepted?.accepted_at).toBeTruthy();

  const refFinal = await clientPage.request.get(
      `/api/references?id=${referenceId}`
  );
  const refFinalJson = await refFinal.json();
  expect(refFinalJson.data?.[0]?.status).toBe("matched");
});
