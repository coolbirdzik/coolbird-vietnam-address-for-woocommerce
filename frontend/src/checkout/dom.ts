import type { District, Ward } from "@/types/address.types";

export type CheckoutPrefix = "billing" | "shipping" | "calc_shipping";
export type AddressField = "state" | "city" | "address_2";
export type AddressSchema = "old" | "new";
export type OptionItem = { value: string; label: string };

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

type SavedAddressData = {
  state: string;
  city: string;
  ward: string;
};

const isNumericCode = (value?: string | null) =>
  !!value && /^\d+$/.test(value.trim());

const normalizeOptionText = (value?: string | null) =>
  (value || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

const getSelect2EventValue = (event: unknown) => {
  if (
    event &&
    typeof event === "object" &&
    "params" in event &&
    (event as { params?: { data?: { id?: string } } }).params?.data?.id
  ) {
    return String(
      (event as { params?: { data?: { id?: string } } }).params!.data!.id,
    );
  }

  if (
    event &&
    typeof event === "object" &&
    "val" in event &&
    typeof (event as { val?: unknown }).val === "string"
  ) {
    return (event as { val: string }).val;
  }

  return "";
};

export const getAddressSchema = (): AddressSchema =>
  (window.coolbird_vietnam_address_array?.address_schema as AddressSchema) ||
  window.coolviad_vn?.address_schema ||
  "new";

export const getSavedAddressData = (prefix: CheckoutPrefix): SavedAddressData =>
  ((window.coolbird_vietnam_address_array?.saved as Record<
    string,
    Partial<SavedAddressData>
  > | undefined)?.[prefix] || {
    state: "",
    city: "",
    ward: "",
  }) as SavedAddressData;

export const getPreloadedAddressName = (value?: string | null) => {
  if (!value) {
    return "";
  }

  const preloadedNames = window.coolviad_vn?.preloaded_names || {};
  return preloadedNames[value] || "";
};

export const getCityPlaceholder = (schema: AddressSchema) =>
  schema === "new"
    ? String(
        window.coolviad_vn?.i18n?.select_ward ||
          window.coolbird_vietnam_address_array?.select_ward ||
          "Select ward/commune/town",
      )
    : String(
        window.coolviad_vn?.i18n?.select_district ||
          window.coolbird_vietnam_address_array?.select_district ||
          "Select district",
      );

export const getWardPlaceholder = () =>
  String(
    window.coolviad_vn?.i18n?.select_ward ||
      window.coolbird_vietnam_address_array?.select_ward ||
      "Select ward/commune/town",
  );

export const getLoadingPlaceholder = () =>
  String(
    window.coolviad_vn?.i18n?.loading ||
      window.coolbird_vietnam_address_array?.loading_text ||
      "Loading...",
  );

export const ensureCheckoutLayoutStyles = () => {
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

export const getPossibleFieldIds = (prefix: CheckoutPrefix, field: AddressField) => [
  `${prefix}_${field}`,
  `${prefix}-${field}`,
  `${prefix}-${prefix}-${field}`,
];

const getPossibleFieldWrapperIds = (
  prefix: CheckoutPrefix,
  field: AddressField,
) => {
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

export const getDelegatedSelectors = (
  prefix: CheckoutPrefix,
  field: AddressField,
) => {
  const baseIds =
    field === "address_2"
      ? [`${prefix}_address_2`, `${prefix}-address_2`, `${prefix}-address-2`]
      : getPossibleFieldIds(prefix, field);

  const selectors = new Set<string>();
  baseIds.forEach((id) => {
    selectors.add(`#${id}`);
    if (field === "city" || field === "address_2") {
      selectors.add(`#${id}${BLOCKS_PROXY_SELECT_SUFFIX}`);
    }
  });

  return Array.from(selectors).join(", ");
};

export const findFieldWrapper = (
  prefix: CheckoutPrefix,
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

const findCountryElement = (prefix: CheckoutPrefix): HTMLSelectElement | null => {
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

export const isVietnamSelected = (prefix: CheckoutPrefix) => {
  const countryEl = findCountryElement(prefix);
  return !countryEl || countryEl.value === "VN";
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

export const getSourceInputForProxy = (select: HTMLSelectElement | null) => {
  if (!select) {
    return null;
  }

  const sourceId = select.getAttribute(BLOCKS_PROXY_SOURCE_ATTR);
  if (!sourceId) {
    return null;
  }

  const source = document.getElementById(sourceId);
  return source instanceof HTMLInputElement ? source : null;
};

export const syncBlocksSourceInput = (
  select: HTMLSelectElement,
  value: string,
  dispatchEvents = false,
) => {
  const source = getSourceInputForProxy(select);
  if (!source) {
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

  source.setAttribute("value", value);

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

const resolveSelectOptionValue = (
  select: HTMLSelectElement,
  candidateValue?: string,
) => {
  const rawCandidate = (
    candidateValue ||
    select.dataset.coolbird_vietnam_addressInitialValue ||
    ""
  ).trim();

  if (!rawCandidate) {
    return "";
  }

  const exactValueMatch = Array.from(select.options).find(
    (option) => option.value === rawCandidate,
  );
  if (exactValueMatch) {
    return rawCandidate;
  }

  const normalizedCandidate = normalizeOptionText(rawCandidate);
  const exactLabelMatch = Array.from(select.options).find(
    (option) => normalizeOptionText(option.textContent) === normalizedCandidate,
  );

  return exactLabelMatch ? exactLabelMatch.value : rawCandidate;
};

const refreshSelectUi = (select: HTMLSelectElement) => {
  if (
    select.hasAttribute(BLOCKS_PROXY_SOURCE_ATTR) ||
    typeof jQuery === "undefined" ||
    !(jQuery as any).fn?.select2
  ) {
    return;
  }

  const $select = (jQuery as any)(select);
  if ($select.hasClass("select2-hidden-accessible")) {
    $select.trigger("change.select2");
    return;
  }

  $select.select2({
    width: "100%",
    language: {
      noResults: () =>
        String(
          window.coolbird_vietnam_address_array?.formatNoMatches || "No value",
        ),
    },
  });
};

export const setSelectValue = (
  select: HTMLSelectElement,
  value: string,
  dispatchEvents = false,
) => {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(select, value);
  } else {
    select.value = value;
  }

  syncBlocksSourceInput(select, value, false);
  refreshSelectUi(select);

  if (!dispatchEvents) {
    return;
  }

  try {
    select.dispatchEvent(
      new InputEvent("input", { bubbles: true, data: value }),
    );
  } catch {
    select.dispatchEvent(new Event("input", { bubbles: true }));
  }

  select.dispatchEvent(new Event("change", { bubbles: true }));
};

const bindProxySelectSync = (select: HTMLSelectElement) => {
  if (select.dataset.coolbird_vietnam_addressSyncBound === "yes") {
    return;
  }

  select.dataset.coolbird_vietnam_addressSyncBound = "yes";
  select.setAttribute(BLOCKS_PROXY_SYNC_BOUND_ATTR, "yes");

  const syncFromSelect = (nextValue?: string) => {
    const valueToSync = nextValue || select.value;

    if (valueToSync && select.value !== valueToSync) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(select, valueToSync);
      } else {
        select.value = valueToSync;
      }
    }

    syncBlocksSourceInput(select, valueToSync, true);
  };

  select.addEventListener("change", () => syncFromSelect());

  const source = getSourceInputForProxy(select);
  if (source) {
    const syncFromSource = () => {
      const nextValue = resolveSelectOptionValue(select, source.value);
      if (nextValue && select.value !== nextValue) {
        select.value = nextValue;
      }
    };

    source.addEventListener("input", syncFromSource);
    source.addEventListener("change", syncFromSource);
  }

  if (typeof jQuery !== "undefined") {
    const $select = (jQuery as any)(select);
    $select.on("change.coolbirdProxySync", () => syncFromSelect());
    $select.on("select2:select.coolbirdProxySync", (event: unknown) =>
      syncFromSelect(getSelect2EventValue(event)),
    );
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

const convertBlocksInputToSelect = (
  input: HTMLInputElement,
): HTMLSelectElement => {
  const existingProxy = findBlocksProxySelect(input.id);
  const initialValue = input.value;

  if (existingProxy) {
    bindProxySelectSync(existingProxy);
    if (initialValue && !existingProxy.value) {
      existingProxy.dataset.coolbird_vietnam_addressInitialValue = initialValue;
    }
    return existingProxy;
  }

  const wrapper = input.parentElement;
  const labelText =
    wrapper?.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
    input.getAttribute("aria-label") ||
    "";

  const select = document.createElement("select");
  cloneInputAttributesToSelect(input, select);
  select.id = getBlocksProxySelectId(input.id);
  select.setAttribute(BLOCKS_PROXY_SOURCE_ATTR, input.id);
  select.className = BLOCKS_SELECT_CLASSES.select;
  select.size = 1;

  if (initialValue) {
    select.dataset.coolbird_vietnam_addressInitialValue = initialValue;
    const pendingLabel = getPreloadedAddressName(initialValue) || initialValue;
    const option = document.createElement("option");
    option.value = initialValue;
    option.textContent = pendingLabel;
    select.appendChild(option);
    select.value = initialValue;
  }

  if (!wrapper) {
    bindProxySelectSync(select);
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

  const container = document.createElement("div");
  container.className = BLOCKS_SELECT_CLASSES.container;

  const label = document.createElement("label");
  label.htmlFor = select.id;
  label.className = BLOCKS_SELECT_CLASSES.label;
  label.textContent = labelText;

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(createBlocksExpandIcon());
  selectWrapper.appendChild(container);
  wrapper.appendChild(selectWrapper);

  bindProxySelectSync(select);
  return select;
};

const findAddress2Element = (prefix: CheckoutPrefix): HTMLElement | null => {
  const form = document.getElementById(prefix);

  if (form) {
    const proxy = form.querySelector(
      `.wc-block-components-address-form__address_2 select[${BLOCKS_PROXY_SOURCE_ATTR}]`,
    );
    if (proxy instanceof HTMLElement) {
      return proxy;
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

export const hideLegacyAddress2Artifacts = (prefix: CheckoutPrefix) => {
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

export const arrangeVietnamAddressFields = (prefix: CheckoutPrefix) => {
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

const getPlainSelectFromInput = (id: string) => {
  const el = findBlocksProxySelect(id) || document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    const select = document.createElement("select");
    select.id = id;
    cloneInputAttributesToSelect(el, select);
    select.className = (el.className || "").trim();
    if (el.value) {
      select.dataset.coolbird_vietnam_addressInitialValue = el.value;
    }
    el.parentNode?.replaceChild(select, el);
    return select;
  }

  return el instanceof HTMLSelectElement ? el : null;
};

export const findSelect = (
  prefix: CheckoutPrefix,
  field: AddressField,
): HTMLSelectElement | null => {
  const possibleIds =
    field === "address_2"
      ? [`${prefix}_address_2`, `${prefix}-address_2`, `${prefix}-address-2`]
      : getPossibleFieldIds(prefix, field);

  for (const id of possibleIds) {
    let el: HTMLElement | null = null;
    const form = document.getElementById(prefix);
    if (form) {
      el =
        field === "address_2"
          ? findAddress2Element(prefix)
          : findBlocksProxySelect(id) || form.querySelector(`#${id}`);
    }

    if (!el) {
      el =
        field === "address_2"
          ? findAddress2Element(prefix)
          : document.getElementById(id);
    }

    if (!el) {
      continue;
    }

    if (el instanceof HTMLInputElement) {
      const select =
        field === "city" || field === "address_2"
          ? convertBlocksInputToSelect(el)
          : getPlainSelectFromInput(id);
      if (!select) {
        continue;
      }
      refreshSelectUi(select);
      return select;
    }

    if (el instanceof HTMLSelectElement && el.hasAttribute(BLOCKS_PROXY_SOURCE_ATTR)) {
      bindProxySelectSync(el);
    }

    if (el instanceof HTMLSelectElement) {
      refreshSelectUi(el);
      return el;
    }
  }

  return null;
};

export const readStateValue = (
  prefix: CheckoutPrefix,
  includeSavedFallback = false,
) => {
  const select = findSelect(prefix, "state");
  if (select?.value) {
    return select.value;
  }

  return includeSavedFallback ? getSavedAddressData(prefix).state : "";
};

export const readChildFieldValue = (
  prefix: CheckoutPrefix,
  field: "city" | "address_2",
  includeSavedFallback = false,
) => {
  const select = findSelect(prefix, field);
  const sourceInput = getSourceInputForProxy(select);
  const sourceValue = sourceInput?.value || sourceInput?.getAttribute("value") || "";
  const datasetValue = select?.dataset.coolbird_vietnam_addressInitialValue || "";
  const selectValue = select?.value || "";
  const fallbackValue =
    field === "city"
      ? getSavedAddressData(prefix).city
      : getSavedAddressData(prefix).ward;

  if (isNumericCode(selectValue)) {
    return selectValue;
  }
  if (isNumericCode(sourceValue)) {
    return sourceValue;
  }
  if (isNumericCode(datasetValue)) {
    return datasetValue;
  }
  if (includeSavedFallback && isNumericCode(fallbackValue)) {
    return fallbackValue;
  }

  return selectValue || sourceValue || datasetValue || (includeSavedFallback ? fallbackValue : "");
};

export const clearSelect = (
  select: HTMLSelectElement | null,
  placeholder: string,
  preserveValue?: string,
) => {
  if (!select) {
    return;
  }

  populateSelect(
    select,
    [],
    placeholder,
    preserveValue,
    Boolean(preserveValue),
  );
};

export const populateSelect = (
  select: HTMLSelectElement,
  items: OptionItem[],
  placeholder: string,
  selectedValue?: string,
  preserveMissingValue = false,
) => {
  const nextValue = selectedValue?.trim() || "";
  const hasSelectedOption = items.some((item) => item.value === nextValue);

  select.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = placeholder;
  select.appendChild(emptyOption);

  items.forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });

  if (preserveMissingValue && nextValue && !hasSelectedOption) {
    const pendingOption = document.createElement("option");
    pendingOption.value = nextValue;
    pendingOption.textContent = getPreloadedAddressName(nextValue) || nextValue;
    select.appendChild(pendingOption);
  }

  const resolvedValue = hasSelectedOption || preserveMissingValue ? nextValue : "";
  setSelectValue(select, resolvedValue, false);
  delete select.dataset.coolbird_vietnam_addressInitialValue;
};

export const mapProvinceItemsToOptions = (
  schema: AddressSchema,
  items: District[] | Ward[],
): OptionItem[] =>
  items.map((item) => ({
    value:
      schema === "new"
        ? (item as Ward).xaid || (item as District).maqh
        : (item as District).maqh || (item as Ward).xaid,
    label: item.name,
  }));

export const mapWardItemsToOptions = (items: Ward[]): OptionItem[] =>
  items.map((item) => ({ value: item.xaid, label: item.name }));
