import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import { getManagerAttachments, outlookConfig } from "./outlookConfig.js";

const GRAPH_SCOPES = ["Mail.ReadWrite"];
const MAX_SIMPLE_ATTACHMENT_BYTES = 3_000_000;
const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;
let msalInstance;
let initializationPromise;

function getRedirectUri() {
  if (outlookConfig.redirectUri.trim()) return outlookConfig.redirectUri.trim();
  if (window.location.protocol === "file:") {
    throw new Error("Microsoft sign-in requires this app to run from an HTTPS site or localhost.");
  }
  return window.location.origin;
}

async function getMsalInstance() {
  if (!outlookConfig.clientId.trim() || !outlookConfig.tenantId.trim()) {
    throw new Error("Microsoft Outlook integration has not been configured yet.");
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication({
      auth: {
        clientId: outlookConfig.clientId.trim(),
        authority: `https://login.microsoftonline.com/${outlookConfig.tenantId.trim()}`,
        redirectUri: getRedirectUri(),
      },
      cache: {
        cacheLocation: "sessionStorage",
      },
    });
    initializationPromise = msalInstance.initialize();
  }

  await initializationPromise;
  return msalInstance;
}

async function getAccessToken() {
  const app = await getMsalInstance();
  let account = app.getActiveAccount() || app.getAllAccounts()[0];

  if (!account) {
    const loginResult = await app.loginPopup({ scopes: GRAPH_SCOPES });
    account = loginResult.account;
    app.setActiveAccount(account);
  }

  try {
    const result = await app.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    const result = await app.acquireTokenPopup({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

async function loadAttachment(attachment) {
  const response = await fetch(attachment.path);
  if (!response.ok) {
    throw new Error(`Could not load ${attachment.name}.`);
  }

  const buffer = await response.arrayBuffer();
  return {
    name: attachment.name,
    buffer,
  };
}

async function graphRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const graphError = await response.json().catch(() => null);
    throw new Error(graphError?.error?.message || "Microsoft Graph request failed.");
  }

  return response;
}

async function addSimpleAttachment(draftId, attachment, accessToken) {
  await graphRequest(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(draftId)}/attachments`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: attachment.name,
        contentType: "application/pdf",
        contentBytes: arrayBufferToBase64(attachment.buffer),
      }),
    },
  );
}

async function addLargeAttachment(draftId, attachment, accessToken) {
  const sessionResponse = await graphRequest(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(draftId)}/attachments/createUploadSession`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        AttachmentItem: {
          attachmentType: "file",
          name: attachment.name,
          size: attachment.buffer.byteLength,
          contentType: "application/pdf",
        },
      }),
    },
  );
  const { uploadUrl } = await sessionResponse.json();

  for (let start = 0; start < attachment.buffer.byteLength; start += UPLOAD_CHUNK_BYTES) {
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, attachment.buffer.byteLength);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Range": `bytes ${start}-${end - 1}/${attachment.buffer.byteLength}`,
      },
      body: attachment.buffer.slice(start, end),
    });

    if (!response.ok) throw new Error(`Could not upload ${attachment.name}.`);
  }
}

async function addAttachment(draftId, attachment, accessToken) {
  if (attachment.buffer.byteLength < MAX_SIMPLE_ATTACHMENT_BYTES) {
    await addSimpleAttachment(draftId, attachment, accessToken);
  } else {
    await addLargeAttachment(draftId, attachment, accessToken);
  }
}

export async function createOutlookDraft({ recipient, subject, body, managerName, language }) {
  const configuredAttachments = getManagerAttachments(managerName, language);

  const accessToken = await getAccessToken();
  const attachments = await Promise.all(configuredAttachments.map(loadAttachment));
  const response = await graphRequest(
    "https://graph.microsoft.com/v1.0/me/messages",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: recipient } }],
      }),
    },
  );

  const draft = await response.json();
  for (const attachment of attachments) {
    await addAttachment(draft.id, attachment, accessToken);
  }

  if (!draft.webLink) throw new Error("The draft was created, but Outlook did not return a link to open it.");
  return draft;
}
