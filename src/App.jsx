import { useEffect, useMemo, useRef, useState } from "react";
import { caseManagers } from "./caseManagers.js";
import { buildWelcomeEmail, EMAIL_SUBJECT } from "./emailTemplate.js";

const MANAGER_STORAGE_KEY = "packard-selected-case-manager";
const THEME_STORAGE_KEY = "packard-welcome-email-theme";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const themes = [
  { id: "light", label: "Light", color: "#386fe5" },
  { id: "dark", label: "Dark", color: "#6f9aff" },
  { id: "sepia", label: "Sepia", color: "#9a6c35" },
  { id: "forest", label: "Forest", color: "#3f7d58" },
  { id: "blossom", label: "Blossom", color: "#b65fcf" },
];

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

export default function App() {
  const [clientEmail, setClientEmail] = useState("");
  const [selectedManager, setSelectedManager] = useState(getSavedManager);
  const [errors, setErrors] = useState({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [theme, setTheme] = useState(getSavedTheme);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const emailInputRef = useRef(null);
  const themePickerRef = useRef(null);

  const manager = caseManagers[selectedManager];
  const emailBody = useMemo(() => buildWelcomeEmail(manager), [manager]);
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

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const composeUrl =
      "https://outlook.office.com/mail/deeplink/compose" +
      `?to=${encodeURIComponent(clientEmail.trim())}` +
      `&subject=${encodeURIComponent(EMAIL_SUBJECT)}` +
      `&body=${encodeURIComponent(emailBody)}`;

    window.open(composeUrl, "_blank", "noopener,noreferrer");
  }

  function handleEmailChange(event) {
    setClientEmail(event.target.value);
    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
  }

  function handleManagerChange(event) {
    setSelectedManager(event.target.value);
    if (errors.manager) {
      setErrors((current) => ({ ...current, manager: undefined }));
    }
  }

  function handleClear() {
    setClientEmail("");
    setSelectedManager("");
    setErrors({});
    setIsPreviewOpen(false);
    emailInputRef.current?.focus();
  }

  return (
    <main className="page-shell">
      <section className="app-container" aria-labelledby="page-title">
        <header className="page-header">
          <div className="brand-mark" aria-hidden="true">PLF</div>
          <div className="header-copy">
            <span className="eyebrow">The Packard Law Firm</span>
            <h1 id="page-title">Welcome Email Sender</h1>
            <p>Create a client welcome email in seconds.</p>
          </div>
          <div className="theme-picker" ref={themePickerRef}>
            <button
              className="theme-toggle"
              type="button"
              aria-haspopup="menu"
              aria-expanded={isThemeMenuOpen}
              onClick={() => setIsThemeMenuOpen((open) => !open)}
            >
              <span className="theme-toggle-swatch" aria-hidden="true" />
              <span>{themes.find(({ id }) => id === theme)?.label}</span>
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
                    <span className="theme-swatch" style={{ background: option.color }} aria-hidden="true" />
                    <span>{option.label}</span>
                    <span className="theme-check" aria-hidden="true">&#10003;</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

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
                {Object.keys(caseManagers).map((name) => (
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
            <button className="primary-button" type="submit" disabled={!hasRequiredFields}>
              <span>Open Welcome Email</span>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M7.5 4.5h8v8M15 5 8.25 11.75M15 10.5v4a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
              </svg>
            </button>
            <button className="clear-button" type="button" onClick={handleClear} disabled={!clientEmail && !selectedManager && !isPreviewOpen}>
              Clear
            </button>
          </div>

          <p className="privacy-note">
            Opens a prepared draft in Outlook. Nothing is sent automatically.
          </p>
        </form>
      </section>
    </main>
  );
}
