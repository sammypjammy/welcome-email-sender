export const EMAIL_SUBJECT = "Welcome to Packard Law Firm!";

// ===============================
// WELCOME EMAIL TEMPLATE
// EDIT EMAIL WORDING HERE
// ===============================

export function buildWelcomeEmail(caseManager, selectedName) {
  if (!caseManager) return "";

  let videoSection = `Video List:
Welcome to the Packard Law Firm: https://youtu.be/50BLOdPsrEw
What to Expect: https://youtu.be/-Bqpx0qiips
Important information: https://youtu.be/gE7zTKGbmVY`;

  // Only add the case manager intro video if they have one
  if (caseManager.introVideo) {
    videoSection += `
(Case Manager) Intro. Video: ${caseManager.introVideo}`;
  }

  // Only add the Social Security timeline if they have one
  if (caseManager.ssTimeline) {
    videoSection += `
SS Timeline: ${caseManager.ssTimeline}`;
  }

  return `Good afternoon,

Your case has been set up and all necessary filings are complete. I have assigned you to a great case manager, ${caseManager.fullName}. Attached is ${caseManager.fullName}'s contact information, as well as videos, and a welcome packet from our firm giving additional important information.

${caseManager.fullName}'s Contact Information:
Phone: ${caseManager.phone}
Email: ${caseManager.email}

${videoSection}

Additionally, I wanted to tell you about an app we use called Case Status. Our other clients like it and find it to be very helpful when communicating with us. On our end, we will post updates about your claim. On your end, you can use the app to communicate with your case manager. It is particularly helpful if you use it to tell us about:
• Any change in medical providers or medications
• Any ongoing medical appointments, including ER visits or hospitalizations
• Any mail you receive from the Social Security Administration
• Any other questions you have

Please download the app to gain quick updates to your case and easy access to your case manager. A link will be sent to your phone with an invitation to download the Case Status app. If you haven't received the link yet, we've included a link below or if you have any other questions, ${caseManager.firstName} will be happy to assist.

Case Status App. Download: http://www.casestatus.com/downloadapp

It's been a pleasure working with you, and I know that you are in good hands with your case manager.

Thank you,

Sam Jensen
Filing Specialist
210-340-8877`;
}