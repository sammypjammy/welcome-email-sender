import { useEffect, useRef, useState } from "react";
import { EMAIL_RESOURCES_FOLDER_URL } from "./toolkitConfig.js";
import {
  getCustomRemarks,
  getEmailSignature,
  getSetting,
  saveCustomRemarks,
  saveEmailSignature,
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
  const signatureNameInputRef = useRef(null);

  useEffect(() => {
    if (!isSignatureModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsSignatureModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    signatureNameInputRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSignatureModalOpen]);

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
