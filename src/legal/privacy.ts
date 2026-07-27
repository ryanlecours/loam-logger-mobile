import type { LegalSection } from './terms';

// MIRROR of apps/web/src/pages/PrivacyPolicy.tsx in the loam-logger repo.
// The two repos share no package, so this copy is maintained by hand \u2014 any
// edit to one must land in the other in the same session. Section numbering
// and wording are kept identical so a reader (or a partner's legal reviewer)
// comparing the web policy against the in-app policy sees the same document.
export const PRIVACY_LAST_UPDATED = 'July 26, 2026';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Privacy Policy',
    body: `Last updated: ${PRIVACY_LAST_UPDATED}

Loam Logger ("we," "us," or "our") is operated by Loam Labs LLC. This policy explains what data we collect, how we use it, and your choices.`,
  },
  {
    title: '1. Data We Collect',
    body: `\u2022 Account & Auth: Basic profile info from OAuth providers (e.g., Garmin, Strava, WHOOP, Suunto, Google, Apple), such as your name, email, and provider ID.

\u2022 Fitness Data (when connected): Rides, distance, elevation, duration, heart rate metrics, activity metadata.

\u2022 Payment & Subscription Data: Subscription tier, purchase history, and transaction identifiers processed through Apple In-App Purchase (via RevenueCat) or Stripe. We do not store full payment card details.

\u2022 App Usage & Behavioral Analytics: Device/browser info, IP address, in-app events (e.g., bike added, ride logged), and technical diagnostics for performance monitoring. On the web app, a small percentage of sessions may be recorded for playback (see Section 6).

\u2022 Location Data: Ride start coordinates (latitude/longitude) from your connected fitness provider, used to display ride location names and fetch weather conditions. We do not track your location in real time.

\u2022 Biometric Authentication: The mobile app supports Face ID and Touch ID for convenient app unlock. All biometric data is processed entirely on your device by Apple's Secure Enclave. We never receive, transmit, or store your biometric data.`,
  },
  {
    title: '2. How We Use Data',
    body: `\u2022 Provide core features (ride import, analytics, bike/component tracking).
\u2022 Process subscriptions and manage account entitlements.
\u2022 Improve reliability, performance, and user experience.
\u2022 Secure accounts and prevent abuse.`,
  },
  {
    title: '3. Legal Basis for Processing',
    body: `If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, our legal basis for processing your data depends on the type of data and the context:

\u2022 Contractual necessity: Account data, fitness data, and subscription data are processed to provide the service you signed up for.
\u2022 Legitimate interest: Error tracking (Sentry), product analytics (PostHog), and security monitoring are processed to maintain and improve the service. You may object to analytics processing by opting out in Settings (see Section 6 for details).
\u2022 Consent: Where required by law, we obtain your consent before processing (e.g., push notifications, optional integrations).`,
  },
  {
    title: '4. Integration Provider Data',
    body: `When you connect a fitness platform, we access data via that provider's APIs solely to deliver Loam Logger features. We do not sell provider-derived data. Access is limited to the scopes you approve and can be revoked at any time within Loam Logger or through the provider.

Supported providers: Garmin, Strava, WHOOP, and Suunto. Each provider has its own terms and privacy policy governing your data on their platform.`,
  },
  {
    // Anchored on the web at /privacy#garmin-connect-data. Garmin's developer
    // program requires a direct link to this clause, and requires written
    // approval before any future change to it \u2014 do not edit without that.
    title: '4a. Garmin Connect Data',
    body: `This section describes specifically how Garmin data is collected, used, processed, stored, and shared.

WHAT WE COLLECT

When you connect Garmin Connect, we access the Garmin Activity API only. We do not request, receive, or store health or wellness data \u2014 no daily summaries, sleep, stress, body composition, pulse ox, respiration, heart rate variability, or Body Battery. For cycling activities only, we receive:

\u2022 Activity summary: activity type and name, start time, duration, distance, elevation gain, average and maximum heart rate, starting coordinates, and the Garmin device model that recorded the activity.
\u2022 Activity details (per-point samples), when provided: timestamp, GPS position, elevation, speed, cadence, heart rate, and power, sampled through the ride. These are used to draw your route map and to detect chairlift/shuttle segments so they are not counted as pedaling time.
\u2022 Account identifier: your Garmin user ID, plus OAuth access and refresh tokens, used solely to maintain the connection.

HOW WE USE AND PROCESS IT

Ride duration from Garmin activities accrues against the components installed on your bike to produce component wear hours and service predictions. Garmin data is therefore an input to derived outputs shown throughout the app, and those outputs identify Garmin as a contributing data source. Starting coordinates are used to name the ride location and fetch historical weather for that ride. We do not sell Garmin data, use it for advertising, or share it with data brokers.

THIRD PARTIES THAT PROCESS IT

Garmin-derived data is stored in our database and processed by the infrastructure providers listed in Section 5 \u2014 Railway (API hosting), Neon (database), and Vercel (web hosting).

Third-party AI processing: if you are on a paid plan, we generate a short plain-language maintenance summary for your bike using Anthropic, PBC (the Claude API). What is sent is the derived maintenance state \u2014 component names, accumulated hours, service intervals, and status. Raw Garmin activity data, GPS coordinates, per-point samples, Garmin account identifiers, and your name and email are not sent. Anthropic acts as our sub-processor, does not use the data to train models, and returns the summary only to you.

Garmin data is not sent to our analytics or error-tracking providers. PostHog receives product events without fitness data, and Sentry receives no ride information (Sections 6 and 7).

STORAGE, RETENTION, AND DELETION

Garmin data is stored in the United States (see Section 12), encrypted in transit, and retained while your account is active.

\u2022 If you disconnect Garmin in Loam Logger, or revoke access from your Garmin account, we revoke our access tokens, stop all further imports, and delete the raw per-point GPS tracks supplied by Garmin. Rides already imported remain as part of your own maintenance record, because deleting them would erase the component service history the app exists to keep.
\u2022 If Garmin notifies us that you deregistered, we apply the same deletion automatically.
\u2022 You can request full deletion of previously imported Garmin rides at any time, and deleting your Loam Logger account removes all of it.

Your data on Garmin's own platform is governed by Garmin's privacy policy at garmin.com/en-US/privacy/connect/. You can review or revoke Loam Logger's access at any time from your Garmin Connect account settings.`,
  },
  {
    title: '5. Sharing & Third-Party Processors',
    body: `We do not sell personal data. We share data with the following categories of trusted processors under data-processing terms:

\u2022 Hosting & Infrastructure: Railway (API hosting), Vercel (web hosting), Neon (database).
\u2022 Error Tracking: Sentry (see Section 7).
\u2022 Product Analytics: PostHog (see Section 6).
\u2022 Subscription Management: RevenueCat (manages Apple and Google in-app purchases; receives your user ID, subscription status, and purchase events).
\u2022 Payment Processing: Stripe (processes web subscription payments; receives your email and payment details).
\u2022 Email: Resend (transactional and product emails).
\u2022 AI Processing: Anthropic, PBC (Claude API) generates the plain-language maintenance summary shown on paid plans. It receives derived maintenance state only \u2014 component names, hours, service intervals, and status \u2014 never your name, email, GPS coordinates, raw activity data, credentials, or payment details. Anthropic does not use this data to train models.

We may also disclose data if required by law or to protect rights and safety.`,
  },
  {
    title: '6. Product Analytics & Session Replay',
    body: `We use PostHog (posthog.com), operated by PostHog Inc. and hosted in the United States, to understand how people use Loam Logger so we can improve it. PostHog receives:

\u2022 Identity: Your internal user ID, email, name, subscription tier, and role.
\u2022 Behavioral events: Pages visited, buttons clicked, and product-level events such as "bike added," "ride logged," or "subscription started."
\u2022 Technical context: IP address, browser and device information, and the referring URL.
\u2022 Session recordings (sampled, web only): On a small percentage of web sessions, PostHog records a video-like playback of your interactions. All form inputs (text fields, passwords, selects, textareas) are masked by default so their contents are not captured. No fitness data, ride details, or bike photos are included.

PostHog acts as our data processor under a data-processing agreement. They do not sell your data. For details, see PostHog's privacy policy at https://posthog.com/privacy.

You can opt out of PostHog analytics at any time from the Privacy section in your account Settings. The opt-out applies to both browser activity and server-side events tied to your account.`,
  },
  {
    title: '7. Error Tracking & Crash Reporting',
    body: `We use Sentry (sentry.io), a third-party error tracking service, to monitor application stability and diagnose crashes. When an error occurs, Sentry may receive a pseudonymized user identifier (an internal ID, not your name or email), device and OS information, and technical details about the error. No fitness data, ride information, or personal content is sent to Sentry. Sentry retains error data for 90 days by default. For more information, see Sentry's privacy policy at https://sentry.io/privacy/.`,
  },
  {
    title: '8. Cookies & Local Storage',
    body: `The web app uses cookies for session authentication and CSRF protection. The mobile app uses encrypted on-device storage (Keychain/SecureStore) for authentication tokens and preferences. We do not use cookies for advertising or cross-site tracking.`,
  },
  {
    title: '9. Retention & Deletion',
    body: `We retain your data while your account is active and for a reasonable period afterward as needed for service integrity and legal obligations. Specifically:

\u2022 Account and ride data: Retained until you delete your account.
\u2022 Raw GPS tracks from a connected provider: Deleted when you disconnect that provider (see Section 4a for the Garmin specifics).
\u2022 Error tracking data (Sentry): Retained for 90 days.
\u2022 Analytics data (PostHog): Retained for up to 12 months.

You can delete your account and all associated data at any time from Settings or by contacting us. Disconnecting a provider stops new imports; you may also request removal of previously imported data from that provider.`,
  },
  {
    title: '10. Security',
    body: 'We use industry-standard security controls including encrypted storage, HTTPS for all communications, and access controls. However, no method of transmission or storage is 100% secure.',
  },
  {
    title: '11. Children',
    body: 'You must be at least 16 years old to use Loam Logger (see our Terms of Service). We do not knowingly collect data from anyone under 16. If we learn that a user is under 16, we will delete their account and associated data promptly.',
  },
  {
    title: '12. International Transfers',
    body: 'Your data is processed in the United States. If you are located outside the United States, your data will be transferred to the U.S. for processing. Where required by law (e.g., GDPR), we rely on Standard Contractual Clauses (SCCs) or other approved transfer mechanisms to ensure appropriate safeguards. Copies of applicable SCCs are available upon request by contacting us at the email below.',
  },
  {
    title: '13. Your Rights',
    body: `Depending on your jurisdiction, you may have the right to:

\u2022 Access the personal data we hold about you
\u2022 Correct inaccurate data
\u2022 Delete your account and associated data
\u2022 Object to processing based on legitimate interest
\u2022 Export your data in a portable format
\u2022 Opt out of analytics (via Settings)

To exercise any of these rights, contact us at the email below or use the in-app controls where available.`,
  },
  {
    title: '14. Changes',
    body: 'We may update this policy. We will post the new date above and, if the changes are material, notify you in-app or by email.',
  },
  {
    title: '15. Contact',
    body: 'Questions, deletion requests, or data rights inquiries: ryan.lecours@loamlogger.app',
  },
];
