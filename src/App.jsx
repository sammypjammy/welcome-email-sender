import { useEffect, useMemo, useRef, useState } from "react";
import { caseManagers } from "./caseManagers.js";
import { buildWelcomeEmail, EMAIL_SUBJECT } from "./emailTemplate.js";
import { getManagerAttachments, isOutlookGraphConfigured } from "./outlookConfig.js";
import { createOutlookDraft } from "./outlookGraph.js";

const MANAGER_STORAGE_KEY = "packard-selected-case-manager";
const THEME_STORAGE_KEY = "packard-welcome-email-theme";
const LANGUAGE_STORAGE_KEY = "packard-welcome-email-language";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const themes = [
  { id: "light", label: "Light", icon: "\u2600\ufe0f" },
  { id: "dark", label: "Dark", icon: "\ud83c\udf19" },
  { id: "sepia", label: "Sepia", icon: "\ud83d\udcdc" },
  { id: "forest", label: "Forest", icon: "\ud83c\udf32" },
  { id: "blossom", label: "Blossom", icon: "\ud83c\udf38" },
];

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy failed");
}

function getSavedManager() {
  try {
    const savedManager = localStorage.getItem(MANAGER_STORAGE_KEY);
    return savedManager && caseManagers[savedManager] ? savedManager : "";
  } catch {
    return "";
  }
}

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return themes.some(({ id }) => id === savedTheme) ? savedTheme : "light";
  } catch {
    return "light";
  }
}

function getSavedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "spanish" ? "spanish" : "english";
  } catch {
    return "english";
  }
}

export default function App() {
  const [clientEmail, setClientEmail] = useState("");
  const [selectedManager, setSelectedManager] = useState(getSavedManager);
  const [errors, setErrors] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [theme, setTheme] = useState(getSavedTheme);
  const [language, setLanguage] = useState(getSavedLanguage);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const emailInputRef = useRef(null);
  const themePickerRef = useRef(null);

  const manager = caseManagers[selectedManager];
  const emailBody = useMemo(() => buildWelcomeEmail(manager), [manager]);
  const managerAttachments = getManagerAttachments(selectedManager, language);
  const availableManagerNames = useMemo(
    () => Object.keys(caseManagers).filter((name) => getManagerAttachments(name, language).length),
    [language],
  );
  const hasRequiredFields = Boolean(clientEmail.trim() && selectedManager);

  useEffect(() => {
    if (!selectedManager) return;
    try {
      localStorage.setItem(MANAGER_STORAGE_KEY, selectedManager);
    } catch {
      // The app still works if browser storage is unavailable.
    }
  }, [selectedManager]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still applies if browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // The language selector still works if browser storage is unavailable.
    }
  }, [language]);

  useEffect(() => {
    if (!isThemeMenuOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!themePickerRef.current?.contains(event.target)) setIsThemeMenuOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setIsThemeMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isThemeMenuOpen]);

  function validate() {
    const nextErrors = {};
    const trimmedEmail = clientEmail.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Enter the client's email address.";
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!selectedManager) {
      nextErrors.manager = "Select a case manager.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    if (isOutlookGraphConfigured) {
      setIsCreatingDraft(true);
      setCopyStatus("Signing in and creating your Outlook draft…");

      try {
        const draft = await createOutlookDraft({
          recipient: clientEmail.trim(),
          subject: EMAIL_SUBJECT,
          body: emailBody,
          managerName: selectedManager,
          language,
        });
        setCopyStatus("Draft created with its PDF attachments. Opening Outlook…");
        window.location.assign(draft.webLink);
      } catch (error) {
        setCopyStatus(`The Outlook draft could not be created. ${error.message}`);
      } finally {
        setIsCreatingDraft(false);
      }
      return;
    }

    const composeUrl =
      "https://outlook.office.com/mail/deeplink/compose" +
      `?to=${encodeURIComponent(clientEmail.trim())}` +
      `&subject=${encodeURIComponent(EMAIL_SUBJECT)}`;

    window.open(composeUrl, "_blank", "noopener,noreferrer");

    try {
      await copyToClipboard(emailBody);
      setCopyStatus("Email body copied. Paste it into the Outlook draft.");
    } catch {
      setCopyStatus("Outlook opened, but the email body could not be copied. Use the preview to copy it manually.");
    }
  }

  function handleEmailChange(event) {
    setClientEmail(event.target.value);
    setCopyStatus("");
    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
  }

  function handleManagerChange(event) {
    setSelectedManager(event.target.value);
    setCopyStatus("");
    if (errors.manager) {
      setErrors((current) => ({ ...current, manager: undefined }));
    }
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setCopyStatus("");
    setIsPreviewOpen(false);

    if (selectedManager && !getManagerAttachments(selectedManager, nextLanguage).length) {
      setSelectedManager("");
      setErrors((current) => ({ ...current, manager: undefined }));
    }
  }

  function handleClear() {
    setClientEmail("");
    setSelectedManager("");
    setErrors({});
    setIsPreviewOpen(false);
    setCopyStatus("");
    emailInputRef.current?.focus();
  }

  return (
    <main className="page-shell">
      <div className="app-shell">
        <header className="app-header">
          <span className="app-brand">Welcome Email Sender</span>
          <div className="app-header-actions">
            <div className="language-selector" role="radiogroup" aria-label="Packet language">
              <button
                className={`language-option ${language === "english" ? "active" : ""}`}
                type="button"
                role="radio"
                aria-checked={language === "english"}
                onClick={() => handleLanguageChange("english")}
              >
                English
              </button>
              <button
                className={`language-option ${language === "spanish" ? "active" : ""}`}
                type="button"
                role="radio"
                aria-checked={language === "spanish"}
                onClick={() => handleLanguageChange("spanish")}
              >
                Spanish
              </button>
            </div>

            <div className="theme-picker" ref={themePickerRef}>
            <button
              className="theme-toggle"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isThemeMenuOpen}
              onClick={() => setIsThemeMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{"\ud83c\udfa8"}</span>
              <span>Theme</span>
              <span className="theme-chevron" aria-hidden="true">&#9662;</span>
            </button>

            {isThemeMenuOpen && (
              <div className="theme-menu" role="menu" aria-label="Choose color scheme">
                {themes.map((option) => (
                  <button
                    className="theme-option"
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === option.id}
                    key={option.id}
                    onClick={() => {
                      setTheme(option.id);
                      setIsThemeMenuOpen(false);
                    }}
                  >
                    <span aria-hidden="true">{option.icon}</span>
                    <span>{option.label}</span>
                    <span className="theme-check" aria-hidden="true">&#10003;</span>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </header>

        <section className="panel" aria-labelledby="page-title">
          <div className="page-header">
            <p className="eyebrow">Client onboarding</p>
            <h1 id="page-title">Welcome Email Sender</h1>
            <p className="subtitle">Prepare a personalized welcome email and open it in Outlook.</p>
          </div>

          <form className="sender-card" onSubmit={handleSubmit} noValidate>
          <div className="form-fields">
            <div className="field-group">
            <label htmlFor="client-email">Client Email</label>
            <input
              ref={emailInputRef}
              id="client-email"
              className={errors.email ? "has-error" : ""}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="client@email.com"
              value={clientEmail}
              onChange={handleEmailChange}
              onBlur={() => {
                if (clientEmail.trim() && !EMAIL_PATTERN.test(clientEmail.trim())) {
                  setErrors((current) => ({ ...current, email: "Enter a valid email address." }));
                }
              }}
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoFocus
            />
            {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
            </div>

            <div className="field-group">
            <label htmlFor="case-manager">Case Manager</label>
            <div className="select-wrap">
              <select
                id="case-manager"
                className={errors.manager ? "has-error" : ""}
                value={selectedManager}
                onChange={handleManagerChange}
                aria-describedby={errors.manager ? "manager-error" : undefined}
                aria-invalid={Boolean(errors.manager)}
              >
                <option value="">Select a case manager</option>
                {availableManagerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            {errors.manager && <p className="field-error" id="manager-error">{errors.manager}</p>}
            </div>
          </div>

          <button
            className="preview-toggle"
            type="button"
            onClick={() => setIsPreviewOpen((open) => !open)}
            aria-expanded={isPreviewOpen}
            disabled={!hasRequiredFields}
          >
            {isPreviewOpen ? "Hide preview" : "Preview email"}
            <span aria-hidden="true">{isPreviewOpen ? "\u2212" : "+"}</span>
          </button>

          {isPreviewOpen && (
            <section className="email-preview" aria-label="Email preview">
              <dl>
                <div><dt>To:</dt><dd>{clientEmail.trim()}</dd></div>
                <div><dt>Subject:</dt><dd>{EMAIL_SUBJECT}</dd></div>
              </dl>
              <pre>{emailBody}</pre>
            </section>
          )}

          <div className="actions">
            <button className="primary-button" type="submit" disabled={!hasRequiredFields || isCreatingDraft}>
              <span>{isCreatingDraft ? "Creating Draft…" : "Open Outlook Draft"}</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7.5 4.5h8v8M15 5 8.25 11.75M15 10.5v4a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
              </svg>
            </button>
            <button className="clear-button" type="button" onClick={handleClear} disabled={!clientEmail && !selectedManager && !isPreviewOpen}>
              Clear
            </button>
          </div>

          <p className="privacy-note">
            {isOutlookGraphConfigured
              ? !selectedManager
                ? `Choose a case manager to use the ${language === "spanish" ? "Spanish" : "English"} welcome packet.`
                : managerAttachments.length
                ? `${managerAttachments.length} PDF attachment${managerAttachments.length === 1 ? "" : "s"} will be added automatically. Nothing is sent until you review it.`
                : "No PDF is mapped to this case manager yet. The draft will still be created for review."
              : "Outlook attachment setup is pending. Until configured, the email body is copied for you to paste."}
          </p>
          </form>
        </section>
      </div>

      {copyStatus && (
        <div className="toast-container" aria-live="polite" aria-atomic="true">
          <div className={`toast ${copyStatus.includes("could not") ? "toast-error" : "toast-success"}`} role="status">
            {copyStatus}
          </div>
        </div>
      )}
    </main>
  );
}
