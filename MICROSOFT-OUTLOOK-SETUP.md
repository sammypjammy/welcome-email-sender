# Microsoft Outlook draft setup

The app can create an Outlook draft with its body and fixed PDF attachments through Microsoft Graph.

## 1. Add the PDFs

1. Copy each PDF into `public/attachments`.
2. Add each file to the matching case manager and language in `attachmentsByLanguage` in `src/outlookConfig.js`:

```js
attachmentsByLanguage: {
  english: {
    "Amanda Zuscar": ["Welcome Packet - Amanda Z. 2024.pdf"],
  },
  spanish: {
    "Lesley Lopez": ["Spanish Welcome Packet - Lesley.pdf"],
  },
},
```

## 2. Register the browser app

1. In the Microsoft Entra admin center, open **App registrations** and create a registration.
2. Use **Accounts in this organizational directory only** for a Packard-only app.
3. Under **Authentication**, add a **Single-page application** redirect URI for the dedicated MSAL callback page. For production, use `https://welcome-email-sender.vercel.app/auth/callback`. For local development, add `http://localhost:5173/auth/callback`.
4. Under **API permissions**, add Microsoft Graph delegated permission `Mail.ReadWrite`.
5. Copy the **Application (client) ID** and **Directory (tenant) ID** from the registration overview.

The app uploads PDFs smaller than 3 MB directly and uses a Microsoft Graph upload session for PDFs from 3 MB through 150 MB.

## 3. Configure and deploy

The supplied `clientId` and `tenantId` are set in `src/outlookConfig.js`. The configured `/auth/callback` path is a lightweight MSAL Browser 5 redirect bridge; its absolute URL must exactly match an SPA redirect URI registered in Entra.

Microsoft authentication does not support opening the standalone HTML directly with a `file:` URL. Run locally with `npm run dev` or deploy the `dist` directory to an HTTPS site whose URL is registered as the SPA redirect URI.
