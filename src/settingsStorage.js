const settingsStorage = window.PackardSettings;

if (!settingsStorage) {
  throw new Error("Packard settings storage was not loaded.");
}

export const {
  SETTINGS_STORAGE_KEY,
  CUSTOM_REMARKS_STORAGE_KEY,
  EMAIL_SIGNATURE_STORAGE_KEY,
  EMAIL_TEMPLATES_STORAGE_KEY,
  CUSTOM_CASE_MANAGERS_STORAGE_KEY,
  getSetting,
  setSetting,
  getCustomRemarks,
  saveCustomRemarks,
  getEmailSignature,
  saveEmailSignature,
  getEmailTemplates,
  saveEmailTemplates,
  getCustomCaseManagers,
  saveCustomCaseManagers,
} = settingsStorage;
