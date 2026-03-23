import React, { useEffect, useRef, useState } from "react";
import { useDistricts, useWards } from "@/hooks/useAddressData";
import type { District, Ward } from "@/types/address.types";

interface AddressSelectorProps {
  type: "billing" | "shipping" | "calc_shipping";
  showWard?: boolean;
}

type AddressField = "state" | "city" | "address_2";

const BLOCKS_SELECT_CLASSES = {
  wrapper: "wc-blocks-components-select",
  container: "wc-blocks-components-select__container",
  label: "wc-blocks-components-select__label",
  select: "wc-blocks-components-select__select",
  expand: "wc-blocks-components-select__expand",
};

const CHECKOUT_LAYOUT_STYLE_ID = "coolbird_vietnam_address-blocks-layout";
const BLOCKS_PROXY_SELECT_SUFFIX = "__coolbird_vietnam_address_select";
const BLOCKS_PROXY_SOURCE_ATTR = "data-coolbird_vietnam_address-source-id";
const BLOCKS_PROXY_SYNC_BOUND_ATTR = "data-coolbird_vietnam_address-sync-bound";

// Store found element IDs for Select2 jQuery selectors
const foundIds: Record<string, string> = {};
// Track which converted elements still rely on Select2 after replacement.
const convertedFromInput: Set<string> = new Set();

const getFieldKey = (prefix: string, field: AddressField) =>
  `${prefix}:${field}`;
const isNumericCode = (value?: string | null) =>
  !!value && /^\d+$/.test(value.trim());
const normalizeOptionText = (value?: string | null) =>
  (value || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const pickInitialSelectValue = (
  currentValue: string,
  datasetValue: string,
  savedValue: string,
) => {
  if (isNumericCode(currentValue)) {
    return currentValue;
  }
  if (isNumericCode(datasetValue)) {
    return datasetValue;
  }
  if (isNumericCode(savedValue)) {
    return savedValue;
  }
  return currentValue || datasetValue || savedValue || "";
};

const resolveSelectOptionValue = (
  el: HTMLSelectElement,
  candidateValue?: string,
) => {
  const rawCandidate = (
    candidateValue ||
    el.dataset.coolbird_vietnam_addressInitialValue ||
    ""
  ).trim();
  if (!rawCandidate) {
    return "";
  }

  const options = Array.from(el.options);
  const exactValueMatch = options.find(
    (option) => option.value === rawCandidate,
  );
  if (exactValueMatch) {
    return rawCandidate;
  }

  const normalizedCandidate = normalizeOptionText(rawCandidate);
  const exactLabelMatch = options.find(
    (option) => normalizeOptionText(option.textContent) === normalizedCandidate,
  );
  if (exactLabelMatch) {
    return exactLabelMatch.value;
  }

  return rawCandidate;
};

const refreshSelectEnhancement = (select: HTMLSelectElement) => {
  if (typeof jQuery === "undefined" || !(jQuery as any).fn?.select2) {
    return;
  }

  const $select = (jQuery as any)(select);
  if ($select.hasClass("select2-hidden-accessible")) {
    $select.trigger("change.select2");
  }
};

const ensureCheckoutLayoutStyles = () => {
  if (document.getElementById(CHECKOUT_LAYOUT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = CHECKOUT_LAYOUT_STYLE_ID;
  style.textContent = `
    @media (min-width: 768px) {
      #billing.wc-block-components-address-form .wc-block-components-address-form__state,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city {
        grid-column: auto / span 1 !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        flex: 1 1 calc(50% - 8px) !important;
        margin-top: 16px !important;
      }

      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select,
      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__container,
      #billing.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__select,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__container,
      #billing.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__select,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__container,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__state .wc-blocks-components-select__select,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__container,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__city .wc-blocks-components-select__select {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      #billing.wc-block-components-address-form .wc-block-components-address-form__address_2,
      #billing.wc-block-components-address-form .wc-block-components-address-form__address_1,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__address_2,
      #shipping.wc-block-components-address-form .wc-block-components-address-form__address_1 {
        grid-column: 1 / -1 !important;
      }
    }
  `;

  document.head.appendChild(style);
};

const getPossibleFieldIds = (prefix: string, field: AddressField) => {
  // My Account classic: shipping_state, billing_city
  // WooCommerce Blocks: billing-state, billing_city
  // WooCommerce Blocks wrapper: billing-billing-state, billing-billing-city
  return [
    `${prefix}_${field}`,
    `${prefix}-${field}`,
    `${prefix}-${prefix}-${field}`,
  ];
};

const getPossibleFieldWrapperIds = (prefix: string, field: AddressField) => {
  if (field === "address_2") {
    return [
      `${prefix}-address_2-field`,
      `${prefix}_address_2_field`,
      `${prefix}-address-2-field`,
      `${prefix}_${prefix}-address_2-field`,
      `${prefix}_${prefix}-address-2-field`,
    ];
  }

  return [
    `${prefix}-${field}-field`,
    `${prefix}_${field}_field`,
    `${prefix}_${prefix}-${field}-field`,
  ];
};

const findFieldWrapper = (
  prefix: string,
  field: AddressField,
): HTMLElement | null => {
  if (field === "address_2") {
    const address2El = findAddress2Element(prefix);
    if (address2El) {
      return address2El.closest(
        ".wc-block-components-address-form__address_2",
      ) as HTMLElement | null;
    }
  }

  for (const id of getPossibleFieldWrapperIds(prefix, field)) {
    const el = document.getElementById(id);
    if (el) {
      return el;
    }
  }
  return null;
};

const findCountryElement = (prefix: string): HTMLSelectElement | null => {
  // Checkout/Blocks: billing-country, billing_country
  // My Account edit-address: billing_billing-country, billing_country
  const possibleIds = [
    `${prefix}-country`,
    `${prefix}_country`,
    `${prefix}_${prefix}-country`,
    `${prefix}_${prefix}_country`,
  ];

  for (const id of possibleIds) {
    const el = document.getElementById(id);
    if (el instanceof HTMLSelectElement) {
      return el;
    }
  }

  return null;
};

const cloneInputAttributesToSelect = (
  input: HTMLInputElement,
  select: HTMLSelectElement,
) => {
  Array.from(input.attributes).forEach((attr) => {
    if (["type", "class", "value", "id", "name"].includes(attr.name)) {
      return;
    }
    select.setAttribute(attr.name, attr.value);
  });
};

const getBlocksProxySelectId = (sourceId: string) =>
  `${sourceId}${BLOCKS_PROXY_SELECT_SUFFIX}`;

const findBlocksProxySelect = (sourceId: string): HTMLSelectElement | null => {
  const proxy = document.getElementById(getBlocksProxySelectId(sourceId));
  return proxy instanceof HTMLSelectElement ? proxy : null;
};

const syncBlocksSourceInput = (
  select: HTMLSelectElement,
  value: string,
  dispatchEvents = false,
) => {
  const sourceId = select.getAttribute(BLOCKS_PROXY_SOURCE_ATTR);
  if (!sourceId) {
    return;
  }

  const source = document.getElementById(sourceId);
  if (!(source instanceof HTMLInputElement)) {
    return;
  }

  const previousValue = source.value;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(source, value);
  } else if (source.value !== value) {
    source.value = value;
  }

  // Keep the DOM attribute in sync too so follow-up renders and validators
  // don't read a stale empty value from the original Blocks input.
  source.setAttribute("value", value);

  // Woo Blocks is React-driven. Reset the React value tracker so the
  // synthetic input/change events below are treated as real updates.
  const tracker = (
    source as HTMLInputElement & {
      _valueTracker?: { setValue: (nextValue: string) => void };
    }
  )._valueTracker;

  if (tracker) {
    tracker.setValue(previousValue);
  }

  if (!dispatchEvents) {
    return;
  }

  try {
    source.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: value }),
    );
  } catch {
    source.dispatchEvent(new Event("input", { bubbles: true }));
  }
  source.dispatchEvent(new Event("change", { bubbles: true }));
};

const bindProxySelectSync = (select: HTMLSelectElement) => {
  if (select.dataset.coolbird_vietnam_addressSyncBound === "yes") {
    return;
  }

  select.dataset.coolbird_vietnam_addressSyncBound = "yes";
  select.setAttribute(BLOCKS_PROXY_SYNC_BOUND_ATTR, "yes");

  const syncFromSelect = () => {
    syncBlocksSourceInput(select, select.value, true);
  };

  select.addEventListener("change", syncFromSelect);

  const sourceId = select.getAttribute(BLOCKS_PROXY_SOURCE_ATTR);
  const source = sourceId ? document.getElementById(sourceId) : null;
  if (source instanceof HTMLInputElement) {
    const syncFromSource = () => {
      const resolvedValue = resolveSelectOptionValue(select, source.value);
      if (resolvedValue && select.value !== resolvedValue) {
        select.value = resolvedValue;
      }

      if (isNumericCode(resolvedValue) && source.value !== resolvedValue) {
        syncBlocksSourceInput(select, resolvedValue, false);
      }

      refreshSelectEnhancement(select);
    };

    source.addEventListener("input", syncFromSource);
    source.addEventListener("change", syncFromSource);
  }

  if (typeof jQuery !== "undefined") {
    const $select = (jQuery as any)(select);
    $select.on("select2:select.coolbird_vietnam_addressSync", syncFromSelect);
    $select.on("select2:clear.coolbird_vietnam_addressSync", syncFromSelect);
    $select.on("select2:unselect.coolbird_vietnam_addressSync", syncFromSelect);
    $select.on("change.coolbird_vietnam_addressSync", syncFromSelect);
  }
};

const createBlocksExpandIcon = () => {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("xmlns", svgNs);
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", BLOCKS_SELECT_CLASSES.expand);

  const path = document.createElementNS(svgNs, "path");
  path.setAttribute(
    "d",
    "M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z",
  );
  svg.appendChild(path);

  return svg;
};

const findAddress2Element = (prefix: string): HTMLElement | null => {
  const form = document.getElementById(prefix);

  if (form) {
    const proxySelect = form.querySelector(
      `.wc-block-components-address-form__address_2 select[${BLOCKS_PROXY_SOURCE_ATTR}]`,
    );
    if (proxySelect instanceof HTMLElement) {
      return proxySelect;
    }

    const input = form.querySelector(
      ".wc-block-components-address-form__address_2 input:not(.wc-block-components-address-form__address_2-hidden-input)",
    );
    if (input instanceof HTMLElement) {
      return input;
    }

    const select = form.querySelector(
      ".wc-block-components-address-form__address_2 select",
    );
    if (select instanceof HTMLElement) {
      return select;
    }
  }

  // My Account edit-address (classic): find by ID patterns
  const possibleIds = [
    `${prefix}-address_2`,
    `${prefix}_address_2`,
    `${prefix}-address-2`,
    `${prefix}_address_2-field`,
    `${prefix}-address_2-field`,
    `${prefix}-address-2-field`,
  ];

  for (const id of possibleIds) {
    const el = document.getElementById(id);
    if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
      return el;
    }
  }

  return null;
};

const hideLegacyAddress2Artifacts = (prefix: string) => {
  const form = document.getElementById(prefix);
  if (!form) {
    return;
  }

  const toggle = form.querySelector(
    ".wc-block-components-address-form__address_2-toggle",
  );
  if (toggle instanceof HTMLElement) {
    toggle.style.display = "none";
  }

  const hiddenInput = form.querySelector(
    ".wc-block-components-address-form__address_2-hidden-input",
  );
  if (hiddenInput instanceof HTMLElement) {
    hiddenInput.style.display = "none";
    hiddenInput.setAttribute("aria-hidden", "true");
  }

  const staleWrappers = form.querySelectorAll<HTMLElement>(
    `.wc-block-components-address-form__address_2[id$="-address_2-field"]:not(.wc-block-components-text-input)`,
  );
  staleWrappers.forEach((wrapper) => wrapper.remove());
};

const arrangeVietnamAddressFields = (prefix: string) => {
  const form = document.getElementById(prefix);
  const stateWrapper = findFieldWrapper(prefix, "state");
  const cityWrapper = findFieldWrapper(prefix, "city");
  const wardWrapper = findFieldWrapper(prefix, "address_2");
  const addressWrapper = form?.querySelector(
    ".wc-block-components-address-form__address_1",
  ) as HTMLElement | null;

  if (
    !form ||
    !stateWrapper ||
    !cityWrapper ||
    !addressWrapper ||
    !isVietnamSelected(prefix)
  ) {
    return;
  }

  addressWrapper.insertAdjacentElement("beforebegin", cityWrapper);
  cityWrapper.insertAdjacentElement("beforebegin", stateWrapper);

  if (wardWrapper) {
    addressWrapper.insertAdjacentElement("beforebegin", wardWrapper);
  }
};

const isVietnamSelected = (prefix: string) => {
  const countryEl = findCountryElement(prefix);
  return !countryEl || countryEl.value === "VN";
};

const convertBlocksInputToSelect = (
  input: HTMLInputElement,
): HTMLSelectElement => {
  const wrapper = input.parentElement;
  const labelText =
    wrapper?.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
    input.getAttribute("aria-label") ||
    "";
  const initialValue = input.value;
  const existingProxy = findBlocksProxySelect(input.id);

  if (existingProxy) {
    bindProxySelectSync(existingProxy);
    if (initialValue && !existingProxy.value) {
      existingProxy.dataset.coolbird_vietnam_addressInitialValue = initialValue;
    }
    return existingProxy;
  }

  const select = document.createElement("select");

  cloneInputAttributesToSelect(input, select);
  select.id = getBlocksProxySelectId(input.id);
  select.setAttribute(BLOCKS_PROXY_SOURCE_ATTR, input.id);
  select.className = BLOCKS_SELECT_CLASSES.select;
  select.size = 1;

  if (initialValue) {
    select.dataset.coolbird_vietnam_addressInitialValue = initialValue;
  }

  if (!wrapper) {
    return select;
  }

  wrapper.classList.remove("wc-block-components-text-input");
  Array.from(wrapper.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      child.style.display = "none";
      child.setAttribute("aria-hidden", "true");
    }
  });

  input.style.display = "none";
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;

  const selectWrapper = document.createElement("div");
  selectWrapper.className = BLOCKS_SELECT_CLASSES.wrapper;

  const selectContainer = document.createElement("div");
  selectContainer.className = BLOCKS_SELECT_CLASSES.container;

  const label = document.createElement("label");
  label.htmlFor = select.id;
  label.className = BLOCKS_SELECT_CLASSES.label;
  label.textContent = labelText;

  selectContainer.appendChild(label);
  selectContainer.appendChild(select);
  selectContainer.appendChild(createBlocksExpandIcon());
  selectWrapper.appendChild(selectContainer);
  wrapper.appendChild(selectWrapper);

  bindProxySelectSync(select);

  return select;
};

// Helper to find element by multiple possible IDs (kebab-case and snake_case for WooCommerce Blocks)
// Returns HTMLSelectElement - for city field it will convert INPUT to SELECT
const findEl = (
  prefix: string,
  field: AddressField,
): HTMLSelectElement | null => {
  // WooCommerce Blocks: find form by id="billing" / id="shipping"
  // My Account / classic: form has no id — find element by ID directly in document
  const possibleIds =
    field === "address_2"
      ? [getFieldKey(prefix, field)]
      : getPossibleFieldIds(prefix, field);

  for (const id of possibleIds) {
    // Try form-scoped lookup (WooCommerce Blocks / checkout)
    let el: HTMLElement | null = null;
    const form = document.getElementById(prefix);
    if (form) {
      el =
        field === "address_2"
          ? findAddress2Element(prefix)
          : findBlocksProxySelect(id) || form.querySelector(`#${id}`);
    }
    // Fallback: search document directly (My Account edit-address pages)
    if (!el) {
      el =
        field === "address_2"
          ? findAddress2Element(prefix)
          : document.getElementById(id);
    }

    if (el) {
      // If it's an input (WooCommerce Blocks), convert to select
      if (el.tagName === "INPUT") {
        const useBlocksSelectMarkup = field === "city" || field === "address_2";
        const select = useBlocksSelectMarkup
          ? convertBlocksInputToSelect(el as HTMLInputElement)
          : getEl(id);

        if (select) {
          if (!useBlocksSelectMarkup) {
            convertedFromInput.add(id);
          }
          if (useBlocksSelectMarkup) {
            bindProxySelectSync(select);
          }
          foundIds[getFieldKey(prefix, field)] = select.id;
          return select;
        }
      }
      if (
        el instanceof HTMLSelectElement &&
        el.hasAttribute(BLOCKS_PROXY_SOURCE_ATTR)
      ) {
        bindProxySelectSync(el);
      }
      foundIds[getFieldKey(prefix, field)] = el.id;
      // Already a SELECT - on checkout WooCommerce usually handles Select2, but on
      // My Account / non-checkout pages we need to apply it ourselves.
      // Check if Select2 is already initialized (has select2-hidden-accessible class).
      const alreadyHasSelect2 = el.classList.contains(
        "select2-hidden-accessible",
      );
      if (
        !alreadyHasSelect2 &&
        typeof jQuery !== "undefined" &&
        (jQuery as any).fn?.select2
      ) {
        const selector = `#${el.id}`;
        trySelect2(selector, "init");
      }
      return el as HTMLSelectElement;
    }
  }
  return null;
};

// Get correct selector for Select2 based on found element ID.
// Blocks city selects intentionally stay native so WooCommerce Blocks CSS can style them.
const getSelect2Selector = (
  prefix: string,
  field: AddressField,
): string | null => {
  const foundId = foundIds[getFieldKey(prefix, field)];
  // Only use Select2 if this element was converted from INPUT
  if (foundId && convertedFromInput.has(foundId)) {
    return `#${foundId}`;
  }
  // Not a converted element - let WooCommerce handle it
  return null;
};

const getEl = (id: string): HTMLSelectElement | null => {
  const el = findBlocksProxySelect(id) || document.getElementById(id);
  // If it's an input (WooCommerce Blocks), convert to select
  if (el && el.tagName === "INPUT") {
    const select = document.createElement("select");
    select.id = id;
    cloneInputAttributesToSelect(el as HTMLInputElement, select);
    select.className = (el.className || "").trim();
    if ((el as HTMLInputElement).value) {
      select.dataset.coolbird_vietnam_addressInitialValue = (
        el as HTMLInputElement
      ).value;
    }
    el.parentNode?.replaceChild(select, el);
    return select;
  }
  return el as HTMLSelectElement | null;
};

const trySelect2 = (
  selector: string,
  method: "init" | "refresh" | "destroy",
) => {
  if (typeof jQuery === "undefined" || !(jQuery as any).fn?.select2) {
    return;
  }
  try {
    const $el = (jQuery as any)(selector);
    // Check if Select2 is already initialized
    const isInitialized = $el.hasClass("select2-hidden-accessible");

    if (method === "init") {
      if (isInitialized) {
        // Just refresh instead
        $el.trigger("change.select2");
      } else {
        $el.select2();
      }
    } else if (method === "refresh") $el.trigger("change.select2");
    else if (method === "destroy") $el.select2("destroy");
  } catch (e) {
    console.error(`[trySelect2] ${selector} - Error:`, e);
  }
};

const buildOptions = (
  el: HTMLSelectElement,
  items: { value: string; label: string }[],
  placeholder: string,
  currentValue?: string,
) => {
  el.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = placeholder;
  el.appendChild(empty);
  items.forEach(({ value, label }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    el.appendChild(opt);
  });
  // Only set value if items exist and currentValue is valid for the new options.
  // When clearing (items.length === 0) or when province changed, currentValue may be
  // from the old province — only set if it matches an actual option.
  const resolvedValue =
    items.length > 0 ? resolveSelectOptionValue(el, currentValue) : "";
  el.value = resolvedValue;
  syncBlocksSourceInput(el, resolvedValue);
  refreshSelectEnhancement(el);
  delete el.dataset.coolbird_vietnam_addressInitialValue;
};

// Get address schema from wp_localize_script
const getAddressSchema = (): "old" | "new" => {
  return (
    (window.coolbird_vietnam_address_array?.address_schema as "old" | "new") ||
    "new"
  );
};

/**
 * Headless component — no rendered UI.
 * Attaches to existing WooCommerce-rendered form selects and drives province → district → ward cascading.
 *
 * Schema 'old': Province → District (city) → Ward (address_2)
 * Schema 'new': Province → Ward (city) - no district, no address_2
 */
export const AddressSelector: React.FC<AddressSelectorProps> = ({
  type,
  showWard = false,
}) => {
  const prefix = type === "calc_shipping" ? "calc_shipping" : type;
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");

  const provinceRef = useRef("");
  const districtRef = useRef("");
  const wardRef = useRef("");
  const hasUserSelectionRef = useRef(false);
  const provinceInteractionAtRef = useRef(0);

  // Determine which schema we're using
  const schema = getAddressSchema();
  const isNewSchema = schema === "new";

  // In 'new' schema: city field contains wards/communes directly from province
  // (districts.php in new schema contains villages, not districts!)
  // In 'old' schema: city field contains districts, then wards from district
  const { data: districtsOrWards = [] } = useDistricts(
    province ? province : null,
  );

  // For old schema only - wards come from district (when showWard is enabled)
  const { data: wards = [], isLoading: loadingWards } = useWards(
    !isNewSchema && showWard && district ? district : null,
  );

  // Keep refs in sync so event handlers always have fresh values
  useEffect(() => {
    provinceRef.current = province;
  }, [province]);
  useEffect(() => {
    districtRef.current = district;
  }, [district]);
  useEffect(() => {
    wardRef.current = ward;
  }, [ward]);

  // Refs to latest data — needed inside event handlers that don't re-run on render
  const districtsOrWardsRef = useRef<(District | Ward)[]>([]);
  const wardsRef = useRef<Ward[]>([]);
  useEffect(() => {
    districtsOrWardsRef.current = districtsOrWards;
  }, [districtsOrWards]);
  useEffect(() => {
    wardsRef.current = wards;
  }, [wards]);

  // Seed React state from the current checkout form so dependent selects populate on first load.
  useEffect(() => {
    ensureCheckoutLayoutStyles();

    const stateEl = findEl(prefix, "state");
    const cityEl = findEl(prefix, "city");
    const wardEl = showWard ? findEl(prefix, "address_2") : null;

    // Get saved values from localized data (from PHP)
    const savedData = (window.coolbird_vietnam_address_array?.saved as any)?.[
      prefix
    ];
    const savedProvince = savedData?.state || "";
    const savedDistrict = savedData?.city || "";
    const savedWard = savedData?.ward || "";

    const initialProvince = stateEl?.value || savedProvince || "";
    const initialDistrict = pickInitialSelectValue(
      cityEl?.value || "",
      cityEl?.dataset.coolbird_vietnam_addressInitialValue || "",
      savedDistrict,
    );
    const initialWard = pickInitialSelectValue(
      wardEl?.value || "",
      wardEl?.dataset.coolbird_vietnam_addressInitialValue || "",
      savedWard,
    );

    if (initialProvince) {
      provinceRef.current = initialProvince;
      setProvince(initialProvince);
    }
    if (initialDistrict) {
      districtRef.current = initialDistrict;
      setDistrict(initialDistrict);
    }
    if (initialWard) {
      wardRef.current = initialWard;
      setWard(initialWard);
    }
  }, [prefix, isNewSchema, showWard]);

  // ─── Ward field visibility ────────────────────────────────────────────────
  useEffect(() => {
    if (!showWard || prefix === "calc_shipping") return;

    const show = () => {
      if (!isVietnamSelected(prefix)) {
        return;
      }

      hideLegacyAddress2Artifacts(prefix);
      const wrapper = findFieldWrapper(prefix, "address_2");
      if (wrapper) {
        wrapper.style.display = "block";
      }
      arrangeVietnamAddressFields(prefix);
    };
    show();

    if (typeof jQuery !== "undefined") {
      (jQuery as any)(document.body).on(
        `updated_checkout.ward_vis_${prefix}`,
        show,
      );
    }
    return () => {
      if (typeof jQuery !== "undefined") {
        (jQuery as any)(document.body).off(
          `updated_checkout.ward_vis_${prefix}`,
        );
      }
    };
  }, [prefix, showWard]);

  // ─── Province listener ────────────────────────────────────────────────────
  useEffect(() => {
    // Shared helper — reads current select value and cascades to city/ward.
    const cascadeProvinceChange = (val: string) => {
      hasUserSelectionRef.current = true;
      provinceRef.current = val;
      districtRef.current = "";
      wardRef.current = "";
      setDistrict("");
      setWard("");
      // Immediately clear district/ward selects synchronously so WooCommerce Blocks
      // (which changes values via React synthetic events, not native DOM events)
      // sees an empty select immediately. Pass empty items to buildOptions so
      // resolveSelectOptionValue doesn't incorrectly resolve old values.
      const cityEl = findEl(prefix, "city");
      const placeholder = isNewSchema
        ? "Select ward/commune/town"
        : "Select district";
      if (cityEl) {
        buildOptions(cityEl, [], placeholder);
        const select2CitySelector = getSelect2Selector(prefix, "city");
        if (select2CitySelector) trySelect2(select2CitySelector, "refresh");
      }
      if (showWard) {
        const wardEl = findEl(prefix, "address_2");
        const select2WardSelector = getSelect2Selector(prefix, "address_2");
        if (wardEl) {
          buildOptions(wardEl, [], "Select ward/commune/town");
          if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
        }
      }
      arrangeVietnamAddressFields(prefix);
      // Update province AFTER clearing selects so useDistricts loads new data.
      setProvince(val);
    };

    const markProvinceInteraction = () => {
      provinceInteractionAtRef.current = Date.now();
    };

    const onInteraction = (event: Event) => {
      const target = event.target;
      const stateWrapper = findFieldWrapper(prefix, "state");
      if (!(target instanceof Node) || !stateWrapper?.contains(target)) {
        return;
      }

      markProvinceInteraction();
    };

    const onDelegatedChange = (event: Event) => {
      const currentStateEl = findEl(prefix, "state");
      if (!currentStateEl || event.target !== currentStateEl) {
        return;
      }

      markProvinceInteraction();
      cascadeProvinceChange(currentStateEl.value);
    };

    document.body.addEventListener("mousedown", onInteraction, true);
    document.body.addEventListener("keydown", onInteraction, true);
    document.body.addEventListener("change", onDelegatedChange, true);
    const pollInterval = window.setInterval(() => {
      const currentStateEl = findEl(prefix, "state");
      const currentValue = currentStateEl?.value || "";

      if (currentValue && currentValue !== provinceRef.current) {
        const interactedRecently =
          Date.now() - provinceInteractionAtRef.current < 2000;

        if (!hasUserSelectionRef.current || interactedRecently) {
          cascadeProvinceChange(currentValue);
          return;
        }

        if (!currentStateEl) {
          return;
        }

        currentStateEl.value = provinceRef.current;
        const select2StateSelector = getSelect2Selector(prefix, "state");
        if (select2StateSelector) {
          trySelect2(select2StateSelector, "refresh");
        }
      }
    }, 250);

    return () => {
      document.body.removeEventListener("mousedown", onInteraction, true);
      document.body.removeEventListener("keydown", onInteraction, true);
      document.body.removeEventListener("change", onDelegatedChange, true);
      window.clearInterval(pollInterval);
    };
  }, [prefix, showWard, isNewSchema]);

  // ─── District/City listener ─────────────────────────────────────────────────
  useEffect(() => {
    // In new schema, city is actually ward - no district step
    if (isNewSchema) return;

    const onDelegatedChange = (event: Event) => {
      const cityEl = findEl(prefix, "city");
      if (!cityEl || event.target !== cityEl) {
        return;
      }

      hasUserSelectionRef.current = true;
      const val = cityEl.value;
      districtRef.current = val;
      wardRef.current = "";
      setDistrict(val);
      setWard("");
      // Immediately clear ward select
      if (showWard) {
        const wardEl = findEl(prefix, "address_2");
        const select2WardSelector = getSelect2Selector(prefix, "address_2");
        if (wardEl) {
          buildOptions(wardEl, [], "Select ward/commune/town");
          if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
        }
      }
      arrangeVietnamAddressFields(prefix);
      // Trigger shipping recalc when district is chosen
      if (val && typeof jQuery !== "undefined")
        (jQuery as any)("body").trigger("update_checkout");
    };

    document.body.addEventListener("change", onDelegatedChange, true);
    return () => {
      document.body.removeEventListener("change", onDelegatedChange, true);
    };
  }, [prefix, showWard, isNewSchema]);

  // ─── Ward listener ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showWard || prefix === "calc_shipping") return;

    arrangeVietnamAddressFields(prefix);

    const onDelegatedChange = (event: Event) => {
      const wardEl = findEl(prefix, "address_2");
      if (!wardEl || event.target !== wardEl) {
        return;
      }

      hasUserSelectionRef.current = true;
      wardRef.current = wardEl.value;
      setWard(wardEl.value);
      // Trigger shipping recalc when ward is chosen
      if (wardEl.value && typeof jQuery !== "undefined") {
        (jQuery as any)("body").trigger("update_checkout");
      }
    };

    document.body.addEventListener("change", onDelegatedChange, true);
    return () => {
      document.body.removeEventListener("change", onDelegatedChange, true);
    };
  }, [prefix, showWard]);

  // ─── City/Ward listener for new schema ────────────────────────────────────────
  useEffect(() => {
    // In new schema, city is actually ward - listen for changes
    if (!isNewSchema) return;

    const onDelegatedChange = (event: Event) => {
      const cityEl = findEl(prefix, "city");
      if (!cityEl || event.target !== cityEl) {
        return;
      }

      hasUserSelectionRef.current = true;
      const val = cityEl.value;
      districtRef.current = val;
      setDistrict(val);
      // Trigger shipping recalc when ward is chosen
      if (val && typeof jQuery !== "undefined") {
        (jQuery as any)("body").trigger("update_checkout");
      }
    };

    document.body.addEventListener("change", onDelegatedChange, true);
    return () => {
      document.body.removeEventListener("change", onDelegatedChange, true);
    };
  }, [prefix, isNewSchema]);

  // ─── Populate city field (districts in old schema, wards in new schema) ──────
  useEffect(() => {
    if (!province) return;

    const cityEl = findEl(prefix, "city");
    if (!cityEl) return;

    const select2CitySelector = getSelect2Selector(prefix, "city");

    // Always populate with the current districtsOrWards data.
    // React Query's isLoading can have timing issues with cached data:
    // when province changes from A→B, the hook may return cached B data immediately
    // (isLoading=false) OR start a fetch (isLoading=true), depending on cache state.
    // By always populating with whatever districtsOrWards is right now, we avoid
    // stale-closure timing issues where isLoading=true but old cached data renders.
    // The onChange handler already clears the select before useDistricts fires.
    if (isNewSchema) {
      // New schema: city field = wards/communes directly from province
      // In new schema, districts.php actually contains villages!
      const items = districtsOrWards.map((item) => {
        // Ward has xaid, District has maqh
        const code =
          "xaid" in item ? (item as Ward).xaid : (item as District).maqh;
        return { value: code, label: item.name };
      });
      buildOptions(
        cityEl,
        items,
        "Select ward/commune/town",
        districtRef.current || undefined,
      );
    } else {
      // Old schema: city field = districts
      const items = districtsOrWards.map((item) => {
        const code =
          "xaid" in item ? (item as Ward).xaid : (item as District).maqh;
        return { value: code, label: item.name };
      });
      buildOptions(
        cityEl,
        items,
        "Select district",
        districtRef.current || undefined,
      );
    }
    // Trigger Select2 to update display
    if (select2CitySelector) trySelect2(select2CitySelector, "refresh");
    // NOTE: Do NOT call triggerWooCommerceUpdate here — it would wipe the select we just built
  }, [districtsOrWards, province, prefix, isNewSchema]);

  // ─── Populate wards when data arrives (old schema only) ────────────────────
  useEffect(() => {
    // Only in old schema with showWard enabled
    if (!showWard || prefix === "calc_shipping" || isNewSchema) return;
    const wardEl = findEl(prefix, "address_2");
    if (!wardEl || !district) return;

    const select2WardSelector = getSelect2Selector(prefix, "address_2");
    if (loadingWards) {
      buildOptions(wardEl, [], "Loading...");
      if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
      arrangeVietnamAddressFields(prefix);
      return;
    }

    buildOptions(
      wardEl,
      wards.map((w: Ward) => ({ value: w.xaid, label: w.name })),
      "Select ward/commune/town",
      wardRef.current || undefined,
    );
    if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
    arrangeVietnamAddressFields(prefix);
    // NOTE: Do NOT call triggerWooCommerceUpdate here
  }, [wards, loadingWards, prefix, district, showWard, isNewSchema]);

  // ─── After WooCommerce's checkout AJAX rerenders, restore our selects ──────
  useEffect(() => {
    if (typeof jQuery === "undefined") return;

    const onUpdated = () => {
      if (isVietnamSelected(prefix)) {
        hideLegacyAddress2Artifacts(prefix);
      }

      const stateEl = findEl(prefix, "state");
      const stateValue = stateEl?.value || "";
      const previousProvince = provinceRef.current;
      const shouldTrustDomState = !hasUserSelectionRef.current;
      const provinceChanged =
        shouldTrustDomState && !!previousProvince && stateValue !== previousProvince;
      const provinceInitialized =
        shouldTrustDomState && !previousProvince && !!stateValue;

      // Once the customer has actively chosen a province, keep our React state
      // authoritative. Woo Blocks can repaint the form with an older snapshot
      // right after shipping recalculation, which would otherwise pull the UI
      // back to the previously saved province.
      const select2StateSelector = getSelect2Selector(prefix, "state");
      if (
        hasUserSelectionRef.current &&
        stateEl &&
        provinceRef.current &&
        stateValue !== provinceRef.current
      ) {
        stateEl.value = provinceRef.current;
        if (select2StateSelector) trySelect2(select2StateSelector, "refresh");
      }

      if ((provinceChanged || provinceInitialized) && stateValue) {
        provinceRef.current = stateValue;
        setProvince(stateValue);
      }

      if (provinceChanged) {
        // Province changed in the live WooCommerce form, but our event listener
        // may have missed it because Blocks replaced the select element.
        // Clear dependent values here and let the province query repopulate the city field.
        districtRef.current = "";
        wardRef.current = "";
        wardsRef.current = [];
        setDistrict("");
        setWard("");
      }

      // Re-init Select2 only on converted elements
      const select2CitySelector = getSelect2Selector(prefix, "city");
      const select2WardSelector = getSelect2Selector(prefix, "address_2");
      if (select2StateSelector) trySelect2(select2StateSelector, "init");
      if (select2CitySelector) trySelect2(select2CitySelector, "init");
      if (select2WardSelector) trySelect2(select2WardSelector, "init");

      if (provinceChanged) {
        const cityEl = findEl(prefix, "city");
        if (cityEl) {
          buildOptions(
            cityEl,
            [],
            isNewSchema ? "Select ward/commune/town" : "Select district",
          );
          if (select2CitySelector) trySelect2(select2CitySelector, "refresh");
        }

        if (showWard && !isNewSchema) {
          const wardEl = findEl(prefix, "address_2");
          if (wardEl) {
            buildOptions(wardEl, [], "Select ward/commune/town");
            if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
          }
        }

        arrangeVietnamAddressFields(prefix);
        return;
      }

      // Re-populate city field (districts in old schema, wards in new schema)
      // Always re-find the cityEl — WooCommerce may have replaced the DOM element
      // during repaint, so stale closures would miss user interactions.
      const cityEl = findEl(prefix, "city");
      if (
        cityEl &&
        provinceRef.current &&
        districtsOrWardsRef.current.length > 0
      ) {
        const items = districtsOrWardsRef.current.map((item) => {
          const code =
            "xaid" in item ? (item as Ward).xaid : (item as District).maqh;
          return { value: code, label: item.name };
        });
        const placeholder = isNewSchema
          ? "Select ward/commune/town"
          : "Select district";
        const currentDistrictCodes = new Set(items.map((i) => i.value));
        const safeDistrict =
          districtRef.current && currentDistrictCodes.has(districtRef.current)
            ? districtRef.current
            : cityEl.value && currentDistrictCodes.has(cityEl.value)
              ? cityEl.value
              : "";
        buildOptions(cityEl, items, placeholder, safeDistrict || undefined);
        if (select2CitySelector) trySelect2(select2CitySelector, "refresh");
        // Sync cleared districtRef back if we didn't restore it
        if (!safeDistrict) {
          districtRef.current = "";
        }
      } else if (
        cityEl &&
        provinceRef.current &&
        districtsOrWardsRef.current.length === 0
      ) {
        // New province selected but wards not loaded yet — DO NOT restore old ward.
        // The districtsOrWards effect will populate once wards arrive.
        districtRef.current = "";
        wardRef.current = "";
        buildOptions(
          cityEl,
          [],
          isNewSchema ? "Select ward/commune/town" : "Select district",
        );
      }

      // Re-populate ward options (old schema only)
      // Always re-find wardEl since WooCommerce may have rebuilt the DOM element.
      if (showWard && !isNewSchema) {
        const wardEl = findEl(prefix, "address_2");
        const currentDistrict = districtRef.current || cityEl?.value || "";
        if (wardEl && currentDistrict && wardsRef.current.length > 0) {
          const currentWardCodes = new Set(wardsRef.current.map((w) => w.xaid));
          const safeWard =
            wardRef.current && currentWardCodes.has(wardRef.current)
              ? wardRef.current
              : wardEl.value && currentWardCodes.has(wardEl.value)
                ? wardEl.value
                : "";
          buildOptions(
            wardEl,
            wardsRef.current.map((w) => ({ value: w.xaid, label: w.name })),
            "Select ward/commune/town",
            safeWard || undefined,
          );
          if (select2WardSelector) trySelect2(select2WardSelector, "refresh");
          if (!safeWard) {
            wardRef.current = "";
          }
        }
        const wrapper = findFieldWrapper(prefix, "address_2");
        if (wrapper) {
          wrapper.style.display = "block";
        }
        arrangeVietnamAddressFields(prefix);
      }
    };

    (jQuery as any)(document.body).on(
      `updated_checkout.selects_${prefix}`,
      onUpdated,
    );
    return () => {
      (jQuery as any)(document.body).off(`updated_checkout.selects_${prefix}`);
    };
  }, [prefix, showWard, isNewSchema]);

  // Woo Blocks can re-render the address form after validation or Store API updates.
  // Keep the Vietnam-specific field order stable after those DOM mutations.
  useEffect(() => {
    if (!showWard || prefix === "calc_shipping") return;

    const form = document.getElementById(prefix);
    if (!form || typeof MutationObserver === "undefined") return;

    let scheduled = false;
    const syncLayout = () => {
      scheduled = false;
      if (!isVietnamSelected(prefix)) {
        return;
      }
      hideLegacyAddress2Artifacts(prefix);
      const wardWrapper = findFieldWrapper(prefix, "address_2");
      if (wardWrapper) {
        wardWrapper.style.display = "block";
      }
      arrangeVietnamAddressFields(prefix);
    };

    const observer = new MutationObserver(() => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(syncLayout);
    });

    observer.observe(form, { childList: true, subtree: true });
    syncLayout();

    return () => {
      observer.disconnect();
    };
  }, [prefix, showWard]);

  return null;
};
