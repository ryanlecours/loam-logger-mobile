import type { LegalSection } from './terms';

export const PRIVACY_LAST_UPDATED = 'November 13, 2025';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Privacy Policy',
    body: `Last updated: ${PRIVACY_LAST_UPDATED}

Loam Logger ("we," "us," or "our") is an application built by Ryan LeCours. This policy explains what data we collect, how we use it, and your choices.`,
  },
  {
    title: '1. Data We Collect',
    body: `\u2022 Account & Auth: Basic profile info from OAuth providers (e.g., Garmin, Google, Apple), such as your name, email, and provider ID.

\u2022 Fitness Data (when connected): Rides, distance, elevation, duration, heart rate metrics, activity metadata.

\u2022 App Usage: Device/browser info and in-app events for diagnostics and performance.`,
  },
  {
    title: '2. How We Use Data',
    body: `\u2022 Provide core features (ride import, analytics, bike/component tracking).
\u2022 Improve reliability, performance, and user experience.
\u2022 Secure accounts and prevent abuse.`,
  },
  {
    title: '3. Garmin Data',
    body: 'If you connect Garmin, we access data via Garmin\'s APIs solely to deliver Loam Logger features. We do not sell Garmin-derived data. Access is limited to the scopes you approve and can be revoked at any time via Garmin or within Loam Logger.',
  },
  {
    title: '4. Sharing',
    body: 'We do not sell personal data. We may share with trusted processors (e.g., hosting, analytics) under data-processing terms. We may disclose if required by law or to protect rights and safety.',
  },
  {
    title: '5. Retention & Deletion',
    body: 'We retain data while your account is active and as needed for service integrity. You can request deletion of your account and associated data at any time from Settings or by contacting us. Disconnecting Garmin stops new imports; you may also request removal of previously imported Garmin data.',
  },
  {
    title: '6. Security',
    body: 'We use industry-standard security controls; however, no method of transmission or storage is 100% secure.',
  },
  {
    title: '7. Children',
    body: 'Loam Logger is not intended for children under 18. We do not knowingly collect data from children.',
  },
  {
    title: '8. International Transfers',
    body: 'Data may be processed in the United States or other countries with appropriate safeguards.',
  },
  {
    title: '9. Changes',
    body: 'We may update this policy. We\'ll post the new date above and, if material, notify you in-app.',
  },
  {
    title: '10. Contact',
    body: 'Questions or deletion requests: ryan.lecours@loamlogger.app',
  },
];
