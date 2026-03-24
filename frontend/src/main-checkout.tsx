import { createCheckoutControllers } from "@/checkout/controller";

const controllers = createCheckoutControllers();

let connected = false;
let scheduledConnect = 0;
let scheduledCardFixes: number[] = [];
let subscribedToCartStore = false;
let checkoutRequestPatched = false;

const connectControllers = () => {
  subscribeToCartStore();
  controllers.forEach((controller) => controller.connect());
  syncNewSchemaAddressCardStore();
  fixAddressCards();
  scheduleAddressCardFixes();
  connected = true;
};

const scheduleConnect = (delay = 0) => {
  window.clearTimeout(scheduledConnect);
  scheduledConnect = window.setTimeout(connectControllers, delay);
};

const hasAddressUi = () =>
  document.querySelector(".woocommerce-address-fields") !== null ||
  document.querySelector(".wc-block-components-address-form") !== null ||
  document.getElementById("billing") !== null ||
  document.getElementById("shipping") !== null ||
  document.getElementById("billing_state") !== null ||
  document.getElementById("shipping_state") !== null;

const isNewAddressSchema = () =>
  (
    window.coolviad_checkout_data?.address_schema ||
    window.coolviad_vn?.address_schema ||
    "new"
  ) === "new";

const dedupeRepeatedAddressSegments = (text: string) => {
  const segments = text
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return text;
  }

  const dedupedSegments: string[] = [];
  const normalizeSegment = (segment: string) =>
    segment.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

  for (const segment of segments) {
    const previousSegment = dedupedSegments[dedupedSegments.length - 1];
    if (
      !previousSegment ||
      normalizeSegment(previousSegment) !== normalizeSegment(segment)
    ) {
      dedupedSegments.push(segment);
    }
  }

  return dedupedSegments.join(", ");
};

const syncNewSchemaAddressCardStore = () => {
  if (!isNewAddressSchema()) {
    return;
  }
};

const subscribeToCartStore = () => {
  if (subscribedToCartStore) {
    return;
  }

  const subscribe = window.wp?.data?.subscribe;
  if (!subscribe) {
    return;
  }

  subscribedToCartStore = true;
  subscribe(() => {
    syncNewSchemaAddressCardStore();
    fixAddressCards();
  });
};

const patchCheckoutRequestPayload = () => {
  if (checkoutRequestPatched || !isNewAddressSchema() || typeof window.fetch !== "function") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);

    const requestMethod = (
      init?.method ||
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    if (
      requestMethod !== "POST" ||
      !requestUrl.includes("/wc/store/v1/checkout")
    ) {
      return originalFetch(input, init);
    }

    const rawBody =
      typeof init?.body === "string"
        ? init.body
        : input instanceof Request
          ? await input.clone().text()
          : "";

    if (!rawBody) {
      return originalFetch(input, init);
    }

    try {
      const payload = JSON.parse(rawBody) as {
        additional_fields?: Record<string, unknown>;
        billing_address?: Record<string, unknown>;
        shipping_address?: Record<string, unknown>;
        extensions?: Record<string, unknown>;
      };

      const normalizeAddress = (
        addressType: "billing" | "shipping",
        address?: Record<string, unknown>,
      ): Record<string, unknown> | undefined => {
        if (!address) {
          return address;
        }

        const city = typeof address.city === "string" ? address.city : "";
        if (!city) {
          return address;
        }

        return {
          ...address,
          address_2: city,
          [`${addressType}_address_2`]: city,
          [`${addressType}_city`]: city,
        };
      };

      const billingAddressBase = normalizeAddress("billing", payload.billing_address);
      const shippingAddressBase = normalizeAddress("shipping", payload.shipping_address);
      const getAddressCity = (address?: Record<string, unknown>) =>
        typeof address?.city === "string" ? address.city : "";

      const billingAddress = billingAddressBase
        ? {
            ...billingAddressBase,
            billing_address_2: getAddressCity(billingAddressBase),
          }
        : billingAddressBase;
      const shippingAddress = shippingAddressBase
        ? {
            ...shippingAddressBase,
            shipping_address_2: getAddressCity(shippingAddressBase),
          }
        : shippingAddressBase;

      const nextPayload = {
        ...payload,
        additional_fields: {
          ...((payload.additional_fields as Record<string, unknown>) || {}),
          billing_address_2: getAddressCity(billingAddress),
          shipping_address_2: getAddressCity(shippingAddress),
        },
        billing_address: billingAddress,
        shipping_address: shippingAddress,
        extensions: {
          ...(payload.extensions || {}),
          coolviad: {
            ...((payload.extensions?.coolviad as Record<string, unknown>) || {}),
            billing_ward_code: getAddressCity(billingAddress),
            shipping_ward_code: getAddressCity(shippingAddress),
          },
        },
      };

      const nextBody = JSON.stringify(nextPayload);

      if (input instanceof Request) {
        return originalFetch(
          new Request(input, {
            body: nextBody,
            method: requestMethod,
          }),
        );
      }

      return originalFetch(input, {
        ...init,
        body: nextBody,
      });
    } catch {
      return originalFetch(input, init);
    }
  };

  checkoutRequestPatched = true;
};

const fixAddressCards = () => {
  const addressCards = document.querySelectorAll(
    ".wc-block-components-address-card address",
  );

  addressCards.forEach((card) => {
    const spans = card.querySelectorAll("span");
    spans.forEach((span) => {
      const spanText = span.textContent || "";
      const updatedSpanText = spanText.replace(/\b(\d{4,6})\b/g, (match) => {
        const preloadedNames = window.coolviad_vn?.preloaded_names || {};
        return preloadedNames[match] || match;
      });

      const normalizedSpanText =
        isNewAddressSchema()
          ? dedupeRepeatedAddressSegments(updatedSpanText)
          : updatedSpanText;

      if (normalizedSpanText !== spanText) {
        span.textContent = normalizedSpanText;
      }
    });
  });
};

const scheduleAddressCardFixes = () => {
  scheduledCardFixes.forEach((timeoutId) => window.clearTimeout(timeoutId));
  scheduledCardFixes = [0, 100, 300, 800, 1500, 3000, 5000].map((delay) =>
    window.setTimeout(() => {
      subscribeToCartStore();
      syncNewSchemaAddressCardStore();
      fixAddressCards();
    }, delay),
  );
};

const bootstrapCheckout = () => {
  if (!hasAddressUi()) {
    return;
  }

  connectControllers();
};

const setupObservers = () => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const parentElement = mutation.target.parentElement;
        if (
          parentElement?.closest(".wc-block-components-address-card") !== null
        ) {
          fixAddressCards();
          return;
        }
      }

      if (mutation.type === "attributes") {
        const target = mutation.target;
        if (
          target instanceof HTMLElement &&
          (target.classList.contains("wc-block-components-address-form") ||
            target.classList.contains("wc-block-components-address-card__edit"))
        ) {
          scheduleConnect(100);
          return;
        }
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue;
        }

        if (
          node.matches(".woocommerce-address-fields, .wc-block-components-address-form") ||
          node.id === "billing" ||
          node.id === "shipping" ||
          node.querySelector(
            ".woocommerce-address-fields, .wc-block-components-address-form, #billing, #shipping",
          )
        ) {
          scheduleConnect(100);
          return;
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ["aria-expanded", "style", "class"],
  });

  if (typeof jQuery !== "undefined") {
    const body = (jQuery as any)(document.body);
    body.on("updated_checkout.coolbirdBootstrap", () => scheduleConnect(100));
    body.on("updated_wc_div.coolbirdBootstrap", () => scheduleConnect(100));
    body.on("country_to_state_changed.coolbirdBootstrap", () =>
      scheduleConnect(100),
    );
  }

  document.addEventListener("wc_fragments_refreshed", () => scheduleConnect(100));
  document.addEventListener("woocommerce_checkout_loaded", () =>
    scheduleConnect(100),
  );
};

const init = () => {
  window.coolbirdCheckoutDebugSnapshot = (prefix = "shipping") => {
    const controller = controllers.find((item) => item.getPrefix() === prefix);
    return controller ? controller.getDebugSnapshot() : null;
  };

  bootstrapCheckout();
  patchCheckoutRequestPayload();
  subscribeToCartStore();
  setupObservers();

  if (!connected) {
    scheduleConnect(300);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
