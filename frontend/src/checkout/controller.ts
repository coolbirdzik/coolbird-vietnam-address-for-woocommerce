import { loadDistrictChildren, loadProvinceChildren } from "@/checkout/api";
import {
  arrangeVietnamAddressFields,
  clearSelect,
  ensureCheckoutLayoutStyles,
  findSelect,
  getAddressSchema,
  getCityPlaceholder,
  getDelegatedSelectors,
  getLoadingPlaceholder,
  getSourceInputForProxy,
  getWardPlaceholder,
  hideLegacyAddress2Artifacts,
  isVietnamSelected,
  mapProvinceItemsToOptions,
  mapWardItemsToOptions,
  populateSelect,
  readChildFieldValue,
  readStateValue,
  setSelectValue,
  type AddressSchema,
  type CheckoutPrefix,
} from "@/checkout/dom";

const shouldTriggerCheckoutRefresh = () =>
  document.body.classList.contains("woocommerce-checkout") ||
  document.querySelector(".wc-block-checkout") !== null;

const triggerCheckoutRefresh = () => {
  if (typeof jQuery === "undefined" || !shouldTriggerCheckoutRefresh()) {
    return;
  }

  (jQuery as any)("body").trigger("update_checkout");
};

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

const DEBUG_PREFIX = "[coolbird-checkout-debug]";

export class CheckoutAddressController {
  private readonly prefix: CheckoutPrefix;
  private readonly schema: AddressSchema;
  private readonly showWard: boolean;
  private bound = false;
  private hydratedOnce = false;
  private provinceRequestToken = 0;
  private wardRequestToken = 0;
  private currentProvince = "";
  private currentCity = "";
  private currentWard = "";
  private suppressControllerHandlers = false;
  private readonly namespace: string;
  private reconnectTimers: number[] = [];
  private storeSyncTimers: number[] = [];
  private checkoutRefreshTimer = 0;
  private liveSelectionTimers: number[] = [];
  private selectionLockTimer = 0;
  private selectionLockExpiresAt = 0;

  constructor(prefix: CheckoutPrefix, schema = getAddressSchema()) {
    this.prefix = prefix;
    this.schema = schema;
    this.showWard = schema !== "new";
    this.namespace = `.coolbirdCheckout_${prefix}`;
  }

  getPrefix() {
    return this.prefix;
  }

  private syncWindowSavedSelection() {
    const localizedData = window.coolbird_vietnam_address_array;
    const saved = localizedData?.saved as
      | Record<string, { state?: string; city?: string; ward?: string }>
      | undefined;

    if (!localizedData || !saved) {
      return;
    }

    localizedData.saved = {
      ...saved,
      [this.prefix]: {
        ...(saved[this.prefix] || {}),
        state: this.currentProvince,
        city: this.currentCity,
        ward: this.currentWard,
      },
    };
  }

  private syncWooBlocksAddressStore() {
    if (this.prefix === "calc_shipping") {
      return;
    }

    const cartDispatch = window.wp?.data?.dispatch?.("wc/store/cart") as
      | {
          setBillingAddress?: (address: Record<string, string>) => void;
          setShippingAddress?: (address: Record<string, string>) => void;
        }
      | undefined;
    const cartSelect = window.wp?.data?.select?.("wc/store/cart") as
      | {
          getCustomerData?: () => {
            shippingAddress?: Record<string, string>;
            billingAddress?: Record<string, string>;
          };
        }
      | undefined;

    if (!cartDispatch || !cartSelect?.getCustomerData) {
      return;
    }

    const customerData = cartSelect.getCustomerData();
    const addressKey =
      this.prefix === "billing" ? "billingAddress" : "shippingAddress";
    const currentAddress = customerData?.[addressKey];

    if (!currentAddress) {
      return;
    }

    const nextAddress = {
      ...currentAddress,
      state: this.currentProvince,
      city: this.currentCity,
      address_2: this.schema === "new" ? this.currentCity : this.currentWard,
      [`${this.prefix}_city`]: this.currentCity,
      [`${this.prefix}_address_2`]:
        this.schema === "new" ? this.currentCity : this.currentWard,
    };

    if (this.prefix === "billing") {
      cartDispatch.setBillingAddress?.(nextAddress);
      return;
    }

    cartDispatch.setShippingAddress?.(nextAddress);
  }

  getDebugSnapshot() {
    const stateSelect = findSelect(this.prefix, "state");
    const citySelect = findSelect(this.prefix, "city");
    const wardSelect = this.showWard ? findSelect(this.prefix, "address_2") : null;
    const citySource = getSourceInputForProxy(citySelect);
    const wardSource = getSourceInputForProxy(wardSelect);

    return {
      prefix: this.prefix,
      schema: this.schema,
      hydratedOnce: this.hydratedOnce,
      current: {
        province: this.currentProvince,
        city: this.currentCity,
        ward: this.currentWard,
      },
      dom: {
        stateValue: stateSelect?.value || null,
        stateText:
          document.getElementById(`select2-${this.prefix}-state-container`)
            ?.textContent?.trim() || null,
        cityValue: citySelect?.value || null,
        cityText:
          document.getElementById(
            `select2-${this.prefix}-city__coolbird_vietnam_address_select-container`,
          )?.textContent?.trim() || null,
        citySourceValue: citySource?.value || null,
        citySourceAttr: citySource?.getAttribute("value") || null,
        wardValue: wardSelect?.value || null,
        wardSourceValue: wardSource?.value || null,
        wardSourceAttr: wardSource?.getAttribute("value") || null,
      },
      saved:
        (window.coolbird_vietnam_address_array?.saved as Record<string, unknown> | undefined)?.[
          this.prefix
        ] || null,
    };
  }

  private log(label: string, extra?: Record<string, unknown>) {
    console.log(`${DEBUG_PREFIX}[${this.prefix}] ${label}`, {
      ...this.getDebugSnapshot(),
      ...(extra || {}),
    });
  }

  bind() {
    if (this.bound) {
      return;
    }

    document.body.addEventListener("change", this.handleNativeChange, true);
    document.addEventListener("submit", this.handleFormSubmit, true);

    if (typeof jQuery !== "undefined") {
      const body = (jQuery as any)(document.body);
      body.on(
        `select2:select${this.namespace}`,
        getDelegatedSelectors(this.prefix, "state"),
        this.handleProvinceSelect2,
      );

      body.on(
        `select2:select${this.namespace}`,
        getDelegatedSelectors(this.prefix, "city"),
        this.handleCitySelect2,
      );

      if (this.showWard) {
        body.on(
          `select2:select${this.namespace}`,
          getDelegatedSelectors(this.prefix, "address_2"),
          this.handleWardSelect2,
        );
      }

      body.on(`updated_checkout${this.namespace}`, this.handleCheckoutUpdated);
      body.on(`updated_wc_div${this.namespace}`, this.handleCheckoutUpdated);
      body.on(
        `country_to_state_changed${this.namespace}`,
        this.handleCheckoutUpdated,
      );
    }

    this.bound = true;
    this.log("bind");
  }

  connect() {
    this.bind();
    ensureCheckoutLayoutStyles();

    const stateSelect = findSelect(this.prefix, "state");
    const citySelect = findSelect(this.prefix, "city");

    if (!stateSelect || !citySelect || !isVietnamSelected(this.prefix)) {
      this.log("connect:skip", {
        hasState: Boolean(stateSelect),
        hasCity: Boolean(citySelect),
        isVietnam: isVietnamSelected(this.prefix),
      });
      return;
    }

    if (this.showWard) {
      findSelect(this.prefix, "address_2");
      hideLegacyAddress2Artifacts(this.prefix);
    }
    arrangeVietnamAddressFields(this.prefix);

    const provinceValue =
      this.currentProvince || readStateValue(this.prefix, !this.hydratedOnce);
    if (!provinceValue) {
      this.log("connect:no-province");
      return;
    }

    if (stateSelect.value !== provinceValue) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(stateSelect, provinceValue, true);
      });
    }

    const selectedCity =
      this.currentCity ||
      readChildFieldValue(this.prefix, "city", !this.hydratedOnce);
    const selectedWard =
      this.showWard && this.schema === "old"
        ? this.currentWard ||
          readChildFieldValue(this.prefix, "address_2", !this.hydratedOnce)
        : "";

    this.currentProvince = provinceValue;
    this.currentCity = selectedCity;
    this.currentWard = selectedWard;
    this.hydratedOnce = true;
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();
    this.log("connect", {
      provinceValue,
      selectedCity,
      selectedWard,
    });
    void this.loadProvinceOptions(provinceValue, selectedCity, selectedWard);
  }

  private readonly handleNativeChange = (event: Event) => {
    if (this.suppressControllerHandlers) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const stateSelect = findSelect(this.prefix, "state");
    if (stateSelect && target === stateSelect) {
      this.log("native-change:state", { eventValue: stateSelect.value });
      this.onProvinceChanged();
      return;
    }

    const citySelect = findSelect(this.prefix, "city");
    if (citySelect && target === citySelect) {
      this.log("native-change:city", { eventValue: citySelect.value });
      this.onCityChanged();
      return;
    }

    if (!this.showWard) {
      return;
    }

    const wardSelect = findSelect(this.prefix, "address_2");
    if (wardSelect && target === wardSelect) {
      this.log("native-change:ward", { eventValue: wardSelect.value });
      this.onWardChanged();
    }
  };

  private readonly handleProvinceSelect2 = (event: unknown) => {
    if (this.suppressControllerHandlers) {
      return;
    }
    const eventValue = getSelect2EventValue(event);
    const stateSelect = findSelect(this.prefix, "state");
    if (stateSelect && eventValue) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(stateSelect, eventValue, true);
      });
    }
    this.log("select2:state", { eventValue });
    this.onProvinceChanged(eventValue);
  };

  private readonly handleCitySelect2 = (event: unknown) => {
    if (this.suppressControllerHandlers) {
      return;
    }
    const eventValue = getSelect2EventValue(event);
    const citySelect = findSelect(this.prefix, "city");
    if (citySelect && eventValue) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(citySelect, eventValue, true);
      });
    }
    this.log("select2:city", { eventValue });
    this.onCityChanged(eventValue);
  };

  private readonly handleWardSelect2 = (event: unknown) => {
    if (this.suppressControllerHandlers) {
      return;
    }
    const eventValue = getSelect2EventValue(event);
    const wardSelect = findSelect(this.prefix, "address_2");
    if (wardSelect && eventValue) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(wardSelect, eventValue, true);
      });
    }
    this.log("select2:ward", { eventValue });
    this.onWardChanged(eventValue);
  };

  private readonly handleCheckoutUpdated = () => {
    this.log("updated-checkout");
    this.scheduleReconnect();
  };

  private readonly handleFormSubmit = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    if (
      !target.closest(
        ".wc-block-checkout, form.checkout, .woocommerce-address-fields, .woocommerce-EditAccountForm",
      )
    ) {
      return;
    }

    this.prepareSchemaNewSubmitAddress();
  };

  private runWithoutControllerHandlers(callback: () => void) {
    this.suppressControllerHandlers = true;
    try {
      callback();
    } finally {
      window.setTimeout(() => {
        this.suppressControllerHandlers = false;
      }, 0);
    }
  }

  private prepareSchemaNewSubmitAddress() {
    if (this.prefix === "calc_shipping" || this.schema !== "new" || !this.currentCity) {
      return;
    }

    window.coolbirdCheckoutPreserveLegacyAddress2Until = Date.now() + 5000;

    const cartDispatch = window.wp?.data?.dispatch?.("wc/store/cart") as
      | {
          setBillingAddress?: (address: Record<string, string>) => void;
          setShippingAddress?: (address: Record<string, string>) => void;
        }
      | undefined;
    const cartSelect = window.wp?.data?.select?.("wc/store/cart") as
      | {
          getCustomerData?: () => {
            shippingAddress?: Record<string, string>;
            billingAddress?: Record<string, string>;
          };
        }
      | undefined;

    if (!cartDispatch || !cartSelect?.getCustomerData) {
      return;
    }

    const customerData = cartSelect.getCustomerData();
    const addressKey =
      this.prefix === "billing" ? "billingAddress" : "shippingAddress";
    const currentAddress = customerData?.[addressKey];

    if (!currentAddress) {
      return;
    }

    const nextAddress = {
      ...currentAddress,
      state: this.currentProvince,
      city: this.currentCity,
      address_2: this.currentCity,
      [`${this.prefix}_city`]: this.currentCity,
      [`${this.prefix}_address_2`]: this.currentCity,
    };

    this.log("prepare-submit-address", {
      nextAddress,
    });

    if (this.prefix === "billing") {
      cartDispatch.setBillingAddress?.(nextAddress);
      return;
    }

    cartDispatch.setShippingAddress?.(nextAddress);
  }

  private scheduleWooBlocksAddressSync() {
    this.storeSyncTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.storeSyncTimers = [0, 100, 300, 1000, 2500].map((delay) =>
      window.setTimeout(() => {
        this.syncWooBlocksAddressStore();
      }, delay),
    );
  }

  private scheduleReconnect() {
    this.reconnectTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.log("schedule-reconnect");
    this.reconnectTimers = [80, 220, 500, 1000, 2000, 3500].map((delay) =>
      window.setTimeout(() => this.connect(), delay),
    );
  }

  private scheduleCheckoutRefresh(delay = 50) {
    window.clearTimeout(this.checkoutRefreshTimer);
    this.log("schedule-checkout-refresh", { delay });
    this.checkoutRefreshTimer = window.setTimeout(() => {
      triggerCheckoutRefresh();
    }, delay);
  }

  private reapplyLiveSelections() {
    const stateSelect = findSelect(this.prefix, "state");
    if (stateSelect && this.currentProvince && stateSelect.value !== this.currentProvince) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(stateSelect, this.currentProvince, true);
      });
      this.log("reapply-live:state", {
        currentProvince: this.currentProvince,
      });
    }

    const citySelect = findSelect(this.prefix, "city");
    if (citySelect && this.currentCity) {
      const hasCurrentCityOption = Array.from(citySelect.options).some(
        (option) => option.value === this.currentCity,
      );
      const citySource = getSourceInputForProxy(citySelect);
      const citySourceValue =
        citySource?.value || citySource?.getAttribute("value") || "";

      if (
        hasCurrentCityOption &&
        (citySelect.value !== this.currentCity || citySourceValue !== this.currentCity)
      ) {
        this.runWithoutControllerHandlers(() => {
          setSelectValue(citySelect, this.currentCity, true);
        });
        this.log("reapply-live:city", {
          currentCity: this.currentCity,
          citySourceValue,
        });
      }
    }

    if (!this.showWard || !this.currentWard) {
      return;
    }

    const wardSelect = findSelect(this.prefix, "address_2");
    if (!wardSelect) {
      return;
    }

    const hasCurrentWardOption = Array.from(wardSelect.options).some(
      (option) => option.value === this.currentWard,
    );
    const wardSource = getSourceInputForProxy(wardSelect);
    const wardSourceValue = wardSource?.value || wardSource?.getAttribute("value") || "";

    if (
      hasCurrentWardOption &&
      (wardSelect.value !== this.currentWard || wardSourceValue !== this.currentWard)
    ) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(wardSelect, this.currentWard, true);
      });
      this.log("reapply-live:ward", {
        currentWard: this.currentWard,
        wardSourceValue,
      });
    }
  }

  private scheduleLiveSelectionAssertion() {
    this.liveSelectionTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.log("schedule-live-selection-assertion");
    this.liveSelectionTimers = [50, 150, 400, 1000, 2000, 4000].map((delay) =>
      window.setTimeout(() => this.reapplyLiveSelections(), delay),
    );
  }

  private armSelectionLock(duration = 8000) {
    this.selectionLockExpiresAt = Date.now() + duration;
    this.log("arm-selection-lock", { duration });

    if (this.selectionLockTimer) {
      return;
    }

    this.selectionLockTimer = window.setInterval(() => {
      if (Date.now() >= this.selectionLockExpiresAt) {
        window.clearInterval(this.selectionLockTimer);
        this.selectionLockTimer = 0;
        this.log("release-selection-lock");
        return;
      }

      this.reapplyLiveSelections();
    }, 200);
  }

  private onProvinceChanged(nextProvinceValue = "") {
    const stateSelect = findSelect(this.prefix, "state");
    const citySelect = findSelect(this.prefix, "city");
    const wardSelect = this.showWard ? findSelect(this.prefix, "address_2") : null;

    if (!stateSelect || !citySelect) {
      return;
    }

    const provinceValue = nextProvinceValue || stateSelect.value;
    if (!provinceValue) {
      this.log("province-change:skip-empty", { nextProvinceValue });
      return;
    }

    if (stateSelect.value !== provinceValue) {
      setSelectValue(stateSelect, provinceValue, false);
    }

    this.hydratedOnce = true;
    this.currentProvince = provinceValue;
    this.currentCity = "";
    this.currentWard = "";
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();
    this.log("province-change", { provinceValue, nextProvinceValue });
    this.armSelectionLock();
    this.scheduleLiveSelectionAssertion();
    clearSelect(citySelect, getCityPlaceholder(this.schema));

    if (wardSelect) {
      clearSelect(wardSelect, getWardPlaceholder());
    }

    void this.loadProvinceOptions(provinceValue, "", "");
  }

  private onCityChanged(nextCityValue = "") {
    const citySelect = findSelect(this.prefix, "city");
    if (!citySelect) {
      return;
    }

    const cityValue = nextCityValue || citySelect.value;
    if (cityValue && citySelect.value !== cityValue) {
      setSelectValue(citySelect, cityValue, false);
    }

    this.hydratedOnce = true;
    this.currentCity = cityValue;
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();
    this.log("city-change", { cityValue, nextCityValue });

    if (this.schema === "new") {
      this.armSelectionLock();
      this.scheduleCheckoutRefresh();
      this.scheduleLiveSelectionAssertion();
      this.scheduleReconnect();
      return;
    }

    const wardSelect = this.showWard ? findSelect(this.prefix, "address_2") : null;
    if (wardSelect) {
      clearSelect(wardSelect, getWardPlaceholder());
    }

    const districtValue = cityValue;
    this.currentWard = "";
    if (!districtValue) {
      this.scheduleCheckoutRefresh();
      return;
    }

    this.armSelectionLock();
    this.scheduleCheckoutRefresh();
    this.scheduleLiveSelectionAssertion();
    this.scheduleReconnect();
    void this.loadWardOptions(districtValue, "");
  }

  private onWardChanged(nextWardValue = "") {
    this.hydratedOnce = true;
    const wardSelect = findSelect(this.prefix, "address_2");
    if (wardSelect && nextWardValue && wardSelect.value !== nextWardValue) {
      setSelectValue(wardSelect, nextWardValue, false);
    }
    this.currentWard = nextWardValue || wardSelect?.value || "";
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();
    this.log("ward-change", { wardValue: this.currentWard, nextWardValue });
    this.armSelectionLock();
    this.scheduleCheckoutRefresh();
    this.scheduleLiveSelectionAssertion();
    this.scheduleReconnect();
  }

  private async loadProvinceOptions(
    provinceValue: string,
    selectedCity: string,
    selectedWard: string,
  ) {
    const requestToken = ++this.provinceRequestToken;
    this.log("load-province-options:start", {
      provinceValue,
      selectedCity,
      selectedWard,
      requestToken,
    });
    const citySelect = findSelect(this.prefix, "city");
    if (!citySelect) {
      return;
    }

    populateSelect(
      citySelect,
      [],
      getLoadingPlaceholder(),
      selectedCity,
      Boolean(selectedCity),
    );

    if (this.showWard) {
      clearSelect(findSelect(this.prefix, "address_2"), getWardPlaceholder());
    }

    const children = await loadProvinceChildren(provinceValue);
    const latestState = readStateValue(this.prefix, false);
    this.log("load-province-options:resolved", {
      provinceValue,
      selectedCity,
      selectedWard,
      requestToken,
      latestState,
      childCount: children.length,
    });

    if (requestToken !== this.provinceRequestToken || latestState !== provinceValue) {
      this.log("load-province-options:stale", {
        provinceValue,
        requestToken,
        latestState,
      });
      return;
    }

    const nextCitySelect = findSelect(this.prefix, "city");
    if (!nextCitySelect) {
      return;
    }

    populateSelect(
      nextCitySelect,
      mapProvinceItemsToOptions(this.schema, children),
      getCityPlaceholder(this.schema),
      selectedCity,
    );
    this.currentProvince = provinceValue;
    this.currentCity = nextCitySelect.value;
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();

    if (selectedCity && nextCitySelect.value === selectedCity) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(nextCitySelect, selectedCity, true);
      });
      this.log("load-province-options:reapply-city", {
        selectedCity,
      });
      this.scheduleLiveSelectionAssertion();
    }

    arrangeVietnamAddressFields(this.prefix);

    if (this.schema === "old" && selectedCity) {
      await this.loadWardOptions(selectedCity, selectedWard);
    }
  }

  private async loadWardOptions(districtValue: string, selectedWard: string) {
    if (!this.showWard || this.schema === "new") {
      return;
    }

    const requestToken = ++this.wardRequestToken;
    this.log("load-ward-options:start", {
      districtValue,
      selectedWard,
      requestToken,
    });
    const wardSelect = findSelect(this.prefix, "address_2");
    if (!wardSelect) {
      return;
    }

    populateSelect(
      wardSelect,
      [],
      getLoadingPlaceholder(),
      selectedWard,
      Boolean(selectedWard),
    );

    const wards = await loadDistrictChildren(districtValue);
    const latestDistrict = readChildFieldValue(this.prefix, "city", false);
    this.log("load-ward-options:resolved", {
      districtValue,
      selectedWard,
      requestToken,
      latestDistrict,
      childCount: wards.length,
    });

    if (requestToken !== this.wardRequestToken || latestDistrict !== districtValue) {
      this.log("load-ward-options:stale", {
        districtValue,
        requestToken,
        latestDistrict,
      });
      return;
    }

    const nextWardSelect = findSelect(this.prefix, "address_2");
    if (!nextWardSelect) {
      return;
    }

    populateSelect(
      nextWardSelect,
      mapWardItemsToOptions(wards),
      getWardPlaceholder(),
      selectedWard,
    );
    this.currentWard = nextWardSelect.value;
    this.syncWindowSavedSelection();
    this.syncWooBlocksAddressStore();
    this.scheduleWooBlocksAddressSync();

    if (selectedWard && nextWardSelect.value === selectedWard) {
      this.runWithoutControllerHandlers(() => {
        setSelectValue(nextWardSelect, selectedWard, true);
      });
      this.log("load-ward-options:reapply-ward", {
        selectedWard,
      });
      this.scheduleLiveSelectionAssertion();
    }

    arrangeVietnamAddressFields(this.prefix);
  }
}

export const createCheckoutControllers = () =>
  (["billing", "shipping", "calc_shipping"] as CheckoutPrefix[]).map(
    (prefix) => new CheckoutAddressController(prefix),
  );
