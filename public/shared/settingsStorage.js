(function initializePackardSettings(global) {
  "use strict";

  const SETTINGS_STORAGE_KEY = "packard-toolkit-settings";
  const CUSTOM_REMARKS_STORAGE_KEY = "packard-toolkit-custom-remarks";
  const EMAIL_SIGNATURE_STORAGE_KEY = "packard-toolkit-email-signature";
  const DEFAULT_SETTINGS = Object.freeze({
    openDraftsInNewTab: true,
    confirmBeforeClearingMedTabs: true,
  });

  function readJson(key, fallback) {
    try {
      const value = global.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getSetting(name) {
    const savedSettings = readJson(SETTINGS_STORAGE_KEY, {});
    return Object.hasOwn(DEFAULT_SETTINGS, name)
      ? savedSettings[name] ?? DEFAULT_SETTINGS[name]
      : savedSettings[name];
  }

  function setSetting(name, value) {
    const savedSettings = readJson(SETTINGS_STORAGE_KEY, {});
    return writeJson(SETTINGS_STORAGE_KEY, { ...savedSettings, [name]: value });
  }

  function normalizeRemark(remark) {
    if (!remark || typeof remark !== "object") return null;
    const id = typeof remark.id === "string" ? remark.id.trim() : "";
    const title = typeof remark.title === "string" ? remark.title.trim() : "";
    const text = typeof remark.text === "string" ? remark.text.trim() : "";
    return id && title && text ? { id, title, text, kind: "custom" } : null;
  }

  function getCustomRemarks() {
    const remarks = readJson(CUSTOM_REMARKS_STORAGE_KEY, []);
    return Array.isArray(remarks) ? remarks.map(normalizeRemark).filter(Boolean) : [];
  }

  function saveCustomRemarks(remarks) {
    const normalizedRemarks = Array.isArray(remarks)
      ? remarks.map(normalizeRemark).filter(Boolean)
      : [];
    return writeJson(CUSTOM_REMARKS_STORAGE_KEY, normalizedRemarks);
  }

  function normalizeEmailSignature(signature) {
    if (!signature || typeof signature !== "object") return null;
    const name = typeof signature.name === "string" ? signature.name.trim() : "";
    const position = typeof signature.position === "string" ? signature.position.trim() : "";
    const phone = typeof signature.phone === "string" ? signature.phone.trim() : "";
    return name && position && phone ? { name, position, phone } : null;
  }

  function getEmailSignature() {
    return normalizeEmailSignature(readJson(EMAIL_SIGNATURE_STORAGE_KEY, null));
  }

  function saveEmailSignature(signature) {
    const normalizedSignature = normalizeEmailSignature(signature);
    return normalizedSignature
      ? writeJson(EMAIL_SIGNATURE_STORAGE_KEY, normalizedSignature)
      : false;
  }

  global.PackardSettings = Object.freeze({
    SETTINGS_STORAGE_KEY,
    CUSTOM_REMARKS_STORAGE_KEY,
    EMAIL_SIGNATURE_STORAGE_KEY,
    getSetting,
    setSetting,
    getCustomRemarks,
    saveCustomRemarks,
    getEmailSignature,
    saveEmailSignature,
  });
})(window);
