import { useEffect, useRef, useState } from "react";
import { caseManagers } from "./caseManagers.js";
import {
  buildWelcomeEmail,
  buildWelcomeSubject,
  DEFAULT_EMAIL_TEMPLATES,
  mergeEmailTemplates,
  TEMPLATE_PLACEHOLDERS,
} from "./emailTemplate.js";
import { EMAIL_RESOURCES_FOLDER_URL } from "./toolkitConfig.js";
import {
  getCustomCaseManagers,
  getCustomRemarks,
  getEmailSignature,
  getEmailTemplates,
  getSetting,
  saveCustomCaseManagers,
  saveCustomRemarks,
  saveEmailSignature,
  saveEmailTemplates,
  setSetting,
} from "./settingsStorage.js";

function ToggleSetting({ checked, description, label, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-copy">
        <h3>{label}</h3>
        {description && <p>{description}</p>}
      </div>
      <button
        className="toggle-switch"
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true"></span>
      </button>
    </div>
  );
}

function createRemarkId() {
  if (window.crypto?.randomUUID) return `custom-${window.crypto.randomUUID()}`;
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SettingsPage() {
  const [openDraftsInNewTab, setOpenDraftsInNewTab] = useState(() => getSetting("openDraftsInNewTab"));
  const [confirmBeforeClearing, setConfirmBeforeClearing] = useState(() => getSetting("confirmBeforeClearingMedTabs"));
  const [customRemarks, setCustomRemarks] = useState(getCustomRemarks);
  const [isRemarkFormOpen, setIsRemarkFormOpen] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [remarkTitle, setRemarkTitle] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [emailSignature, setEmailSignature] = useState(getEmailSignature);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signaturePosition, setSignaturePosition] = useState("");
  const [signaturePhone, setSignaturePhone] = useState("");
  const [emailTemplates, setEmailTemplates] = useState(() => mergeEmailTemplates(getEmailTemplates()));
  const [editingTemplateLanguage, setEditingTemplateLanguage] = useState(null);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [customCaseManagers, setCustomCaseManagers] = useState(getCustomCaseManagers);
  const [isCaseManagerModalOpen, setIsCaseManagerModalOpen] = useState(false);
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerIntroVideo, setManagerIntroVideo] = useState("");
  const [managerTimeline, setManagerTimeline] = useState("");
  const [managerFormError, setManagerFormError] = useState("");
  const signatureNameInputRef = useRef(null);
  const allCaseManagers = [...Object.values(caseManagers), ...customCaseManagers];
  const previewManager = allCaseManagers[0];
  const previewSignature = emailSignature || { name: "Your Name", position: "Your Position", phone: "Your Phone" };

  useEffect(() => {
    if (!isSignatureModalOpen && !editingTemplateLanguage && !isCaseManagerModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsSignatureModalOpen(false);
      setEditingTemplateLanguage(null);
      setIsCaseManagerModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    if (isSignatureModalOpen) signatureNameInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSignatureModalOpen, editingTemplateLanguage, isCaseManagerModalOpen]);

  function updateToggle(name, value, updateState) {
    updateState(value);
    setSetting(name, value);
  }

  function closeRemarkForm() {
    setIsRemarkFormOpen(false);
    setEditingRemarkId(null);
    setRemarkTitle("");
    setRemarkText("");
  }

  function openNewRemarkForm() {
    setEditingRemarkId(null);
    setRemarkTitle("");
    setRemarkText("");
    setIsRemarkFormOpen(true);
  }

  function editRemark(remark) {
    setEditingRemarkId(remark.id);
    setRemarkTitle(remark.title);
    setRemarkText(remark.text);
    setIsRemarkFormOpen(true);
  }

  function submitRemark(event) {
    event.preventDefault();
    const title = remarkTitle.trim();
    const text = remarkText.trim();
    if (!title || !text) return;

    const nextRemarks = editingRemarkId
      ? customRemarks.map((remark) => remark.id === editingRemarkId ? { ...remark, title, text } : remark)
      : [...customRemarks, { id: createRemarkId(), title, text, kind: "custom" }];

    setCustomRemarks(nextRemarks);
    saveCustomRemarks(nextRemarks);
    closeRemarkForm();
  }

  function deleteRemark(remarkId) {
    const nextRemarks = customRemarks.filter((remark) => remark.id !== remarkId);
    setCustomRemarks(nextRemarks);
    saveCustomRemarks(nextRemarks);
    if (editingRemarkId === remarkId) closeRemarkForm();
  }

  function openSignatureModal() {
    setSignatureName(emailSignature?.name ?? "");
    setSignaturePosition(emailSignature?.position ?? "");
    setSignaturePhone(emailSignature?.phone ?? "");
    setIsSignatureModalOpen(true);
  }

  function submitSignature(event) {
    event.preventDefault();
    const nextSignature = {
      name: signatureName.trim(),
      position: signaturePosition.trim(),
      phone: signaturePhone.trim(),
    };
    if (!nextSignature.name || !nextSignature.position || !nextSignature.phone) return;
    setEmailSignature(nextSignature);
    saveEmailSignature(nextSignature);
    setIsSignatureModalOpen(false);
  }

  function openTemplateEditor(language) {
    setTemplateSubject(emailTemplates[language].subject);
    setTemplateBody(emailTemplates[language].body);
    setEditingTemplateLanguage(language);
  }

  function submitTemplate(event) {
    event.preventDefault();
    const subject = templateSubject.trim();
    const body = templateBody.trim();
    if (!editingTemplateLanguage || !subject || !body) return;
    const nextTemplates = {
      ...emailTemplates,
      [editingTemplateLanguage]: { subject, body },
    };
    setEmailTemplates(nextTemplates);
    saveEmailTemplates(nextTemplates);
    setEditingTemplateLanguage(null);
  }

  function restoreTemplateDefault() {
    const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[editingTemplateLanguage];
    if (!defaultTemplate) return;
    setTemplateSubject(defaultTemplate.subject);
    setTemplateBody(defaultTemplate.body);
  }

  function insertPlaceholder(placeholder) {
    setTemplateBody((current) => `${current}${current.endsWith("\n") ? "" : "\n"}${placeholder}`);
  }

  function closeCaseManagerModal() {
    setIsCaseManagerModalOpen(false);
    setManagerName("");
    setManagerPhone("");
    setManagerEmail("");
    setManagerIntroVideo("");
    setManagerTimeline("");
    setManagerFormError("");
  }

  function submitCaseManager(event) {
    event.preventDefault();
    const fullName = managerName.trim();
    const duplicate = allCaseManagers.some((manager) => manager.fullName.toLowerCase() === fullName.toLowerCase());
    if (duplicate) {
      setManagerFormError("A case manager with this name already exists.");
      return;
    }
    const nextManager = {
      fullName,
      firstName: fullName.split(/\s+/)[0],
      phone: managerPhone.trim(),
      email: managerEmail.trim(),
      introVideo: managerIntroVideo.trim() || null,
      ssTimeline: managerTimeline.trim() || null,
      kind: "custom",
    };
    if (!nextManager.fullName || !nextManager.phone || !nextManager.email) return;
    const nextManagers = [...customCaseManagers, nextManager];
    setCustomCaseManagers(nextManagers);
    saveCustomCaseManagers(nextManagers);
    closeCaseManagerModal();
  }

  return (
    <main className="panel settings-panel" aria-labelledby="page-title">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 id="page-title">Settings</h1>
          <p className="subtitle">Personalize how the Packard Toolkit works for you.</p>
        </div>
      </div>

      <div className="settings-stack">
        <section id="email-signature" className="settings-card settings-anchor-card" aria-labelledby="signature-settings-title">
          <div className="settings-card-header settings-card-header-action">
            <div>
              <p className="settings-section-label">Welcome Emails</p>
              <h2 id="signature-settings-title">Email Signature</h2>
              <p className="settings-description">Save the contact details you want to use in your welcome email signature.</p>
            </div>
            <button className="add-remark-button" type="button" onClick={openSignatureModal}>
              {emailSignature ? "Edit Signature" : "+ Add Signature"}
            </button>
          </div>

          {emailSignature ? (
            <div className="signature-preview" aria-label="Saved email signature">
              <p className="signature-name">{emailSignature.name}</p>
              <p>{emailSignature.position}</p>
              <p>{emailSignature.phone}</p>
            </div>
          ) : (
            <p className="settings-empty-state signature-empty-state">No email signature saved yet.</p>
          )}
        </section>

        <section className="settings-card" aria-labelledby="template-settings-title">
          <div className="settings-card-header">
            <p className="settings-section-label">Welcome Emails</p>
            <h2 id="template-settings-title">Email Templates</h2>
            <p className="settings-description">Personalize the subject and wording used for your generated emails.</p>
          </div>
          <div className="template-list">
            {["english", "spanish"].map((templateLanguage) => (
              <article className="template-row" key={templateLanguage}>
                <div>
                  <h3>{templateLanguage === "english" ? "English Welcome Email" : "Spanish Welcome Email"}</h3>
                  <p>{emailTemplates[templateLanguage].subject}</p>
                </div>
                <button className="secondary-link-button" type="button" onClick={() => openTemplateEditor(templateLanguage)}>Edit Template</button>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-card" aria-labelledby="case-manager-settings-title">
          <div className="settings-card-header settings-card-header-action">
            <div>
              <p className="settings-section-label">Welcome Emails</p>
              <h2 id="case-manager-settings-title">Case Managers</h2>
              <p className="settings-description">View contact details or add a manager to your welcome-email list.</p>
            </div>
            <button className="add-remark-button" type="button" onClick={() => setIsCaseManagerModalOpen(true)}>+ Add Case Manager</button>
          </div>
          <div className="case-manager-list">
            {allCaseManagers.map((caseManager) => (
              <details className="case-manager-item" key={caseManager.fullName}>
                <summary>
                  <span>{caseManager.fullName}</span>
                  <span className="case-manager-summary-meta">{caseManager.kind === "custom" ? "Custom" : "View contact info"}</span>
                </summary>
                <dl className="case-manager-details">
                  <div><dt>Phone</dt><dd>{caseManager.phone}</dd></div>
                  <div><dt>Email</dt><dd><a href={`mailto:${caseManager.email}`}>{caseManager.email}</a></dd></div>
                  {caseManager.introVideo && <div><dt>Intro video</dt><dd><a href={caseManager.introVideo} target="_blank" rel="noreferrer">Open video</a></dd></div>}
                  {caseManager.ssTimeline && <div><dt>SS timeline</dt><dd><a href={caseManager.ssTimeline} target="_blank" rel="noreferrer">Open video</a></dd></div>}
                </dl>
              </details>
            ))}
          </div>
        </section>

        <section className="settings-card" aria-labelledby="email-settings-title">
          <div className="settings-card-header">
            <p className="settings-section-label">Email Sender</p>
            <h2 id="email-settings-title">Draft preferences</h2>
          </div>
          <ToggleSetting
            label="Open drafts in a new tab"
            description="Keep the Toolkit open while Outlook loads the generated draft."
            checked={openDraftsInNewTab}
            onChange={(value) => updateToggle("openDraftsInNewTab", value, setOpenDraftsInNewTab)}
          />
          <div className="settings-divider"></div>
          <div className="resource-row">
            <div className="setting-copy">
              <h3>Email Resources</h3>
              <p>Access shared email templates and welcome packets.</p>
            </div>
            <a className="secondary-link-button" href={EMAIL_RESOURCES_FOLDER_URL} target="_blank" rel="noreferrer">
              Open Email Templates &amp; Welcome Packets
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="med-tabs-settings-title">
          <div className="settings-card-header">
            <p className="settings-section-label">Med Tabs</p>
            <h2 id="med-tabs-settings-title">Clear behavior</h2>
          </div>
          <ToggleSetting
            label="Confirm before clearing"
            description="Ask before removing the current intake text and generated Med Tabs."
            checked={confirmBeforeClearing}
            onChange={(value) => updateToggle("confirmBeforeClearingMedTabs", value, setConfirmBeforeClearing)}
          />
        </section>

        <section className="settings-card" aria-labelledby="remarks-settings-title">
          <div className="settings-card-header settings-card-header-action">
            <div>
              <p className="settings-section-label">Canned Remarks</p>
              <h2 id="remarks-settings-title">Custom Remarks</h2>
              <p className="settings-description">Add your own click-to-copy remarks.</p>
            </div>
            <button className="add-remark-button" type="button" onClick={openNewRemarkForm}>+ Add Remark</button>
          </div>

          {isRemarkFormOpen && (
            <form className="remark-editor" onSubmit={submitRemark}>
              <div className="field-group">
                <label htmlFor="remark-title">Remark name/title</label>
                <input id="remark-title" value={remarkTitle} onChange={(event) => setRemarkTitle(event.target.value)} autoFocus required />
              </div>
              <div className="field-group">
                <label htmlFor="remark-text">Remark text</label>
                <textarea id="remark-text" value={remarkText} onChange={(event) => setRemarkText(event.target.value)} rows="5" required></textarea>
              </div>
              <div className="remark-editor-actions">
                <button className="save-remark-button" type="submit">{editingRemarkId ? "Save Changes" : "Add Remark"}</button>
                <button className="clear-button" type="button" onClick={closeRemarkForm}>Cancel</button>
              </div>
            </form>
          )}

          <div className="custom-remarks-list">
            {customRemarks.length ? customRemarks.map((remark) => (
              <article className="custom-remark-row" key={remark.id}>
                <div>
                  <h3>{remark.title}</h3>
                  <p>{remark.text}</p>
                </div>
                <div className="custom-remark-actions">
                  <button type="button" onClick={() => editRemark(remark)}>Edit</button>
                  <button className="delete-action" type="button" onClick={() => deleteRemark(remark.id)}>Delete</button>
                </div>
              </article>
            )) : (
              <p className="settings-empty-state">No custom remarks yet.</p>
            )}
          </div>
        </section>
      </div>

      {editingTemplateLanguage && (
        <div className="settings-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingTemplateLanguage(null);
        }}>
          <section className="settings-modal template-editor-modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title">
            <div className="settings-modal-header">
              <div>
                <p className="settings-section-label">{editingTemplateLanguage === "english" ? "English" : "Spanish"} Template</p>
                <h2 id="template-modal-title">Edit Welcome Email</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close template editor" onClick={() => setEditingTemplateLanguage(null)}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form className="template-editor-form" onSubmit={submitTemplate}>
              <div className="template-edit-fields">
                <div className="field-group">
                  <label htmlFor="template-subject">Subject</label>
                  <input id="template-subject" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} autoFocus required />
                </div>
                <div className="field-group">
                  <label htmlFor="template-body">Email body</label>
                  <textarea id="template-body" value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} required></textarea>
                </div>
                <div className="placeholder-picker">
                  <p>Insert case-manager information</p>
                  <div>
                    {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                      <button type="button" key={placeholder} onClick={() => insertPlaceholder(placeholder)}>{placeholder}</button>
                    ))}
                  </div>
                  <small>Your saved signature is always added automatically after this text.</small>
                </div>
              </div>
              <section className="template-live-preview" aria-label="Template preview">
                <p className="template-preview-label">Live Preview</p>
                <dl>
                  <div><dt>Subject</dt><dd>{buildWelcomeSubject(previewManager, { subject: templateSubject, body: templateBody }, editingTemplateLanguage)}</dd></div>
                </dl>
                <pre>{buildWelcomeEmail(previewManager, previewSignature, { subject: templateSubject, body: templateBody }, editingTemplateLanguage)}</pre>
              </section>
              <div className="template-editor-actions">
                <button className="restore-default-button" type="button" onClick={restoreTemplateDefault}>Restore Default</button>
                <div className="settings-modal-actions">
                  <button className="clear-button" type="button" onClick={() => setEditingTemplateLanguage(null)}>Cancel</button>
                  <button className="save-remark-button" type="submit">Save Template</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {isCaseManagerModalOpen && (
        <div className="settings-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCaseManagerModal();
        }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="case-manager-modal-title">
            <div className="settings-modal-header">
              <div>
                <p className="settings-section-label">Welcome Emails</p>
                <h2 id="case-manager-modal-title">Add Case Manager</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close case manager form" onClick={closeCaseManagerModal}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form className="signature-form" onSubmit={submitCaseManager}>
              <div className="field-group">
                <label htmlFor="manager-name">Full name</label>
                <input id="manager-name" value={managerName} onChange={(event) => { setManagerName(event.target.value); setManagerFormError(""); }} autoComplete="name" required autoFocus />
                {managerFormError && <p className="field-error">{managerFormError}</p>}
              </div>
              <div className="form-fields">
                <div className="field-group">
                  <label htmlFor="manager-phone">Phone number</label>
                  <input id="manager-phone" type="tel" value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} autoComplete="tel" required />
                </div>
                <div className="field-group">
                  <label htmlFor="manager-email">Email</label>
                  <input id="manager-email" type="email" value={managerEmail} onChange={(event) => setManagerEmail(event.target.value)} autoComplete="email" required />
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="manager-intro-video">Intro video URL <span className="optional-label">Optional</span></label>
                <input id="manager-intro-video" type="url" value={managerIntroVideo} onChange={(event) => setManagerIntroVideo(event.target.value)} placeholder="https://youtu.be/..." />
              </div>
              <div className="field-group">
                <label htmlFor="manager-timeline">Social Security timeline URL <span className="optional-label">Optional</span></label>
                <input id="manager-timeline" type="url" value={managerTimeline} onChange={(event) => setManagerTimeline(event.target.value)} placeholder="https://youtu.be/..." />
              </div>
              <div className="settings-modal-actions">
                <button className="clear-button" type="button" onClick={closeCaseManagerModal}>Cancel</button>
                <button className="save-remark-button" type="submit">Add Case Manager</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isSignatureModalOpen && (
        <div className="settings-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsSignatureModalOpen(false);
        }}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title">
            <div className="settings-modal-header">
              <div>
                <p className="settings-section-label">Welcome Emails</p>
                <h2 id="signature-modal-title">{emailSignature ? "Edit Email Signature" : "Add Email Signature"}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close signature editor" onClick={() => setIsSignatureModalOpen(false)}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form className="signature-form" onSubmit={submitSignature}>
              <div className="field-group">
                <label htmlFor="signature-name">Name</label>
                <input ref={signatureNameInputRef} id="signature-name" value={signatureName} onChange={(event) => setSignatureName(event.target.value)} autoComplete="name" required />
              </div>
              <div className="field-group">
                <label htmlFor="signature-position">Position</label>
                <input id="signature-position" value={signaturePosition} onChange={(event) => setSignaturePosition(event.target.value)} autoComplete="organization-title" required />
              </div>
              <div className="field-group">
                <label htmlFor="signature-phone">Phone number</label>
                <input id="signature-phone" type="tel" value={signaturePhone} onChange={(event) => setSignaturePhone(event.target.value)} autoComplete="tel" required />
              </div>
              <div className="settings-modal-actions">
                <button className="clear-button" type="button" onClick={() => setIsSignatureModalOpen(false)}>Cancel</button>
                <button className="save-remark-button" type="submit">Save Signature</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
