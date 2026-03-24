import { expect, test, type Page } from "@playwright/test";

const checkoutPath = "/checkout-3/";
const myAccountPath = "/my-account/";
const loginEmail = process.env.PLAYWRIGHT_CHECKOUT_EMAIL;
const loginPassword = process.env.PLAYWRIGHT_CHECKOUT_PASSWORD;

const waitForAddressFields = async (page: Page, prefix: "billing" | "shipping") => {
  await page.waitForFunction(
    (currentPrefix) => !!document.getElementById(`${currentPrefix}-state`),
    prefix,
  );
  await page.waitForFunction(
    (currentPrefix) =>
      !!document.getElementById(`${currentPrefix}-city`) ||
      !!document.getElementById(
        `${currentPrefix}-city__coolbird_vietnam_address_select`,
      ),
    prefix,
  );
};

const loginIfConfigured = async (page: Page) => {
  if (!loginEmail || !loginPassword) {
    return false;
  }

  await page.goto(myAccountPath, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const usernameField = page.locator('input[name="username"]');
  if (!(await usernameField.count())) {
    return true;
  }

  await usernameField.fill(loginEmail);
  await page.fill('input[name="password"]', loginPassword);
  await page.locator('button[name="login"]').click();
  await page.waitForTimeout(3000);
  return true;
};

const setSelectValue = async (page: Page, id: string, value: string) => {
  await page.evaluate(
    ({ selectId, nextValue }) => {
      const select = document.getElementById(selectId);
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error(`Missing select: ${selectId}`);
      }

      select.value = nextValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selectId: id, nextValue: value },
  );
};

const triggerSelect2Selection = async (
  page: Page,
  selectId: string,
  optionText: string,
) => {
  await page.evaluate(
    ({ currentSelectId, currentOptionText }) => {
      const select = document.getElementById(currentSelectId);
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error(`Missing select: ${currentSelectId}`);
      }

      const option = Array.from(select.options).find((item) =>
        item.textContent?.includes(currentOptionText),
      );

      if (!option) {
        throw new Error(
          `Missing option "${currentOptionText}" for select ${currentSelectId}`,
        );
      }

      if (typeof jQuery !== "undefined") {
        (jQuery as any)(select).trigger({
          type: "select2:select",
          params: {
            data: {
              id: option.value,
              text: option.textContent || option.value,
            },
          },
        });
      }

      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(select, option.value);
      } else {
        select.value = option.value;
      }

      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    {
      currentSelectId: selectId,
      currentOptionText: optionText,
    },
  );
};

test("province change reloads child options", async ({ page, baseURL }) => {
  test.skip(!loginEmail || !loginPassword, "Checkout credentials not configured");

  await loginIfConfigured(page);
  await page.goto(`${baseURL}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await waitForAddressFields(page, "shipping");

  await setSelectValue(page, "shipping-state", "HANOI");

  await page.waitForFunction(() => {
    const select = document.getElementById(
      "shipping-city__coolbird_vietnam_address_select",
    );
    return (
      select instanceof HTMLSelectElement &&
      select.querySelectorAll("option").length > 10 &&
      !!select.querySelector('option[value="00004"]')
    );
  });

  const cityState = await page.evaluate(() => ({
    province: document.getElementById("shipping-state")?.value || null,
    optionCount: document.querySelectorAll(
      "#shipping-city__coolbird_vietnam_address_select option",
    ).length,
  }));

  expect(cityState.province).toBe("HANOI");
  expect(cityState.optionCount).toBeGreaterThan(10);
});

test("saved address hydrates when credentials are configured", async ({
  page,
  baseURL,
}) => {
  test.skip(!loginEmail || !loginPassword, "Checkout credentials not configured");

  await loginIfConfigured(page);
  await page.goto(`${baseURL}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await waitForAddressFields(page, "shipping");

  await page.waitForFunction(() => {
    const select = document.getElementById(
      "shipping-city__coolbird_vietnam_address_select",
    );
    return (
      select instanceof HTMLSelectElement &&
      select.querySelectorAll("option").length > 1 &&
      !!select.value
    );
  });

  const hydrated = await page.evaluate(() => ({
    state: document.getElementById("shipping-state")?.value || null,
    cityInput: document.getElementById("shipping-city")?.value || null,
    cityProxy:
      document.getElementById("shipping-city__coolbird_vietnam_address_select")
        ?.value || null,
  }));

  expect(hydrated.state).toBeTruthy();
  expect(hydrated.cityInput).toBeTruthy();
  expect(hydrated.cityProxy).toBe(hydrated.cityInput);
});

test("new child selection survives checkout refresh when credentials are configured", async ({
  page,
  baseURL,
}) => {
  test.skip(!loginEmail || !loginPassword, "Checkout credentials not configured");

  await loginIfConfigured(page);
  await page.goto(`${baseURL}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await waitForAddressFields(page, "shipping");

  await setSelectValue(page, "shipping-state", "HANOI");

  await page.waitForFunction(() => {
    const select = document.getElementById(
      "shipping-city__coolbird_vietnam_address_select",
    );
    return (
      select instanceof HTMLSelectElement &&
      !!select.querySelector('option[value="00004"]')
    );
  });

  await setSelectValue(
    page,
    "shipping-city__coolbird_vietnam_address_select",
    "00004",
  );

  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    if (typeof jQuery !== "undefined") {
      (jQuery as any)("body").trigger("update_checkout");
    }
  });
  await page.waitForTimeout(3000);

  const selected = await page.evaluate(() => ({
    state: document.getElementById("shipping-state")?.value || null,
    cityInput: document.getElementById("shipping-city")?.value || null,
    cityProxy:
      document.getElementById("shipping-city__coolbird_vietnam_address_select")
        ?.value || null,
  }));

  expect(selected.state).toBe("HANOI");
  expect(selected.cityInput).toBe("00004");
  expect(selected.cityProxy).toBe("00004");
});

test("select2 event ordering keeps the latest province after multiple changes", async ({
  page,
  baseURL,
}) => {
  test.skip(!loginEmail || !loginPassword, "Checkout credentials not configured");

  await loginIfConfigured(page);
  await page.goto(`${baseURL}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await waitForAddressFields(page, "shipping");

  await triggerSelect2Selection(page, "shipping-state", "Thành phố Hà Nội");
  await page.waitForFunction(
    () =>
      document
        .querySelectorAll("#shipping-city__coolbird_vietnam_address_select option")
        .length > 10,
  );
  await triggerSelect2Selection(
    page,
    "shipping-city__coolbird_vietnam_address_select",
    "Phường Ba Đình",
  );
  await page.waitForTimeout(2000);

  await triggerSelect2Selection(page, "shipping-state", "An Giang");
  await page.waitForFunction(() => {
    const state = document.getElementById("shipping-state");
    const select = document.getElementById(
      "shipping-city__coolbird_vietnam_address_select",
    );
    return (
      state instanceof HTMLSelectElement &&
      state.value === "ANGIANG" &&
      select instanceof HTMLSelectElement &&
      !!select.querySelector('option[value="30307"]')
    );
  });

  await triggerSelect2Selection(
    page,
    "shipping-city__coolbird_vietnam_address_select",
    "Phường Long Xuyên",
  );
  await page.waitForTimeout(4000);

  const selected = await page.evaluate(() => ({
    state: document.getElementById("shipping-state")?.value || null,
    stateText:
      document.getElementById("select2-shipping-state-container")?.textContent ||
      null,
    cityInput: document.getElementById("shipping-city")?.value || null,
    cityProxy:
      document.getElementById("shipping-city__coolbird_vietnam_address_select")
        ?.value || null,
  }));

  expect(selected.state).toBe("ANGIANG");
  expect(selected.stateText).toContain("An Giang");
  expect(selected.cityInput).toBe(selected.cityProxy);
});

test("new schema address card does not duplicate ward segments", async ({
  page,
  baseURL,
}) => {
  test.skip(!loginEmail || !loginPassword, "Checkout credentials not configured");

  await loginIfConfigured(page);
  await page.goto(`${baseURL}${checkoutPath}`, { waitUntil: "domcontentloaded" });
  await waitForAddressFields(page, "shipping");

  await triggerSelect2Selection(page, "shipping-state", "An Giang");
  await page.waitForFunction(() => {
    const select = document.getElementById(
      "shipping-city__coolbird_vietnam_address_select",
    );
    return (
      select instanceof HTMLSelectElement &&
      !!select.querySelector('option[value="30307"]')
    );
  });
  await triggerSelect2Selection(
    page,
    "shipping-city__coolbird_vietnam_address_select",
    "Phường Long Xuyên",
  );
  await page.waitForTimeout(4000);

  const secondaryAddressTexts = await page
    .locator(".wc-block-components-address-card__address-section--secondary")
    .allTextContents();

  const hasAdjacentDuplicate = secondaryAddressTexts.some((addressText) => {
    const normalizedSegments = addressText
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    return normalizedSegments.some(
      (segment, index) => index > 0 && segment === normalizedSegments[index - 1],
    );
  });

  expect(hasAdjacentDuplicate).toBe(false);
});
