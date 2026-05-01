// Re-exports the terms version constant
// TODO: Import from @loam/shared when monorepo package linking is set up
export const CURRENT_TERMS_VERSION = '1.3.0';
export const TERMS_LAST_UPDATED = 'May 2026';

export type LegalSection = {
  title: string;
  body: string;
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: 'Terms and Conditions of Use',
    body: `Last Updated: May 2026

These Terms and Conditions ("Terms") govern your access to and use of Loam Logger, including the Loam Logger website, web application, mobile applications, and any related services, tools, features, content, or software (collectively, the "Service"). The Service is owned and operated by Loam Labs LLC ("Loam Logger," "Loam Labs," "we," "us," or "our").

By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy (available at https://loamlogger.app/privacy), which is incorporated by reference. If you do not agree, you must not access or use the Service.`,
  },
  {
    title: '1. Eligibility',
    body: `You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant that you meet this age requirement. If you are under 18, you may not create an account or use the Service.`,
  },
  {
    title: '2. Purpose of the Service',
    body: `Loam Logger is designed to help cyclists track ride data, component usage, and estimated maintenance intervals for bicycles and bicycle components. The Service is intended solely as an informational and organizational tool to assist users in planning maintenance.

Loam Logger is not a diagnostic, safety, or predictive failure tool. The Service does not guarantee the condition, safety, or performance of any bicycle or component.`,
  },
  {
    title: '3. No Professional Advice',
    body: `All information provided by the Service, including but not limited to maintenance intervals, remaining hours, wear estimates, alerts, warnings, notifications, or recommendations, is:

\u2022 Based on generalized assumptions, user-provided data, third-party data, or statistical averages
\u2022 Estimates only
\u2022 Provided for informational purposes only

The Service does not replace:

\u2022 Professional bicycle inspection
\u2022 Manufacturer-recommended service schedules
\u2022 Professional mechanical advice
\u2022 Common sense safety checks

You acknowledge and agree that:

\u2022 Bicycle maintenance and component wear vary widely based on riding style, terrain, conditions, weight, skill, setup, crashes, and manufacturing variance
\u2022 Components may fail without warning, regardless of estimated service intervals

You agree that all bicycle maintenance and safety decisions must be verified and performed by a qualified professional bicycle mechanic.`,
  },
  {
    title: '4. Assumption of Risk',
    body: `Cycling, including mountain biking, gravel riding, road cycling, and e-biking, is inherently dangerous and involves risk of serious injury, death, or property damage.

By using the Service, you acknowledge and agree that:

\u2022 Mechanical failure can occur at any time
\u2022 Failure of a bicycle component may result in serious injury or death
\u2022 You voluntarily assume all risks associated with riding, maintaining, and operating your bicycle

You agree that you are solely responsible for:

\u2022 Inspecting your bicycle before every ride
\u2022 Maintaining your bicycle in a safe and functional condition
\u2022 Determining when maintenance, service, repair, or replacement is required`,
  },
  {
    title: '5. Accounts & Security',
    body: `You are responsible for maintaining the confidentiality of your account credentials (including any passwords, tokens, or biometric unlock settings) and for all activity that occurs under your account. You agree to:

\u2022 Keep your login credentials secure and not share them with others
\u2022 Notify us promptly at support@loamlogger.app if you suspect unauthorized access to your account

We are not liable for any loss or damage arising from unauthorized use of your account.`,
  },
  {
    title: '6. Subscriptions & Payments',
    body: `Loam Logger offers free and paid subscription tiers. By subscribing to a paid plan, you agree to the following:

In-App Purchases (iOS/Android):

\u2022 Payment is charged to your Apple ID or Google Play account at confirmation of purchase.
\u2022 Subscriptions automatically renew unless canceled at least 24 hours before the end of the current billing period.
\u2022 You can manage and cancel subscriptions through your device's subscription settings (Apple: Settings > Subscriptions; Google: Play Store > Subscriptions).
\u2022 Refunds for in-app purchases are handled by Apple or Google per their respective refund policies.

Web Subscriptions (Stripe):

\u2022 Payment is processed by Stripe. You can manage your subscription and payment methods through the billing portal accessible from Settings.
\u2022 Subscriptions automatically renew unless canceled before the end of the current billing period.

General:

\u2022 We may change subscription pricing with at least 30 days' notice. Price changes do not apply to the current billing period.
\u2022 If you downgrade from a paid plan, you retain access to paid features until the end of your current billing period. Your data is preserved but certain features may become restricted.
\u2022 We do not provide refunds for partial billing periods, except where required by applicable law.`,
  },
  {
    title: '7. Intellectual Property',
    body: `The Service, including its design, code, text, graphics, logos, and features, is owned by Loam Labs LLC and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, reverse-engineer, or create derivative works from any part of the Service without our prior written consent.

You retain ownership of any data you provide to the Service (ride data, bike information, notes, etc.). By using the Service, you grant us a limited, non-exclusive license to process and display your data solely to provide the Service to you.`,
  },
  {
    title: '8. No Warranties',
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOAM LABS LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:

\u2022 MERCHANTABILITY
\u2022 FITNESS FOR A PARTICULAR PURPOSE
\u2022 ACCURACY OR RELIABILITY OF DATA
\u2022 NON-INFRINGEMENT
\u2022 AVAILABILITY OR UPTIME

WE DO NOT WARRANT THAT:

\u2022 THE SERVICE WILL BE ACCURATE, COMPLETE, OR ERROR-FREE
\u2022 ANY ESTIMATE WILL PREVENT MECHANICAL FAILURE
\u2022 ANY COMPONENT WILL LAST A CERTAIN PERIOD OF TIME
\u2022 ANY ALERT OR LACK OF ALERT INDICATES SAFETY OR UNSAFETY`,
  },
  {
    title: '9. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:

IN NO EVENT SHALL LOAM LABS LLC, ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, AFFILIATES, OR AGENTS BE LIABLE FOR ANY:

\u2022 PERSONAL INJURY
\u2022 DEATH
\u2022 PROPERTY DAMAGE
\u2022 EQUIPMENT FAILURE
\u2022 LOSS OF USE
\u2022 LOSS OF DATA
\u2022 LOST PROFITS
\u2022 CONSEQUENTIAL, INCIDENTAL, INDIRECT, OR SPECIAL DAMAGES

ARISING OUT OF OR RELATED TO:

\u2022 USE OR INABILITY TO USE THE SERVICE
\u2022 RELIANCE ON ANY ESTIMATE, ALERT, OR DATA PROVIDED BY THE SERVICE
\u2022 FAILURE OF ANY BICYCLE OR COMPONENT, WHETHER OR NOT SHOWN AS DUE, OVERDUE, OR NOT DUE FOR SERVICE

THIS LIMITATION APPLIES EVEN IF WE WERE ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

TO THE EXTENT ANY LIABILITY IS FOUND DESPITE THE ABOVE, OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO LOAM LABS LLC IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).`,
  },
  {
    title: '10. Explicit Disclaimer Regarding Component Failure',
    body: `You expressly acknowledge and agree that:

\u2022 Components may fail before, after, or without regard to any estimated service interval shown in Loam Logger
\u2022 A component may appear safe, not due, or not overdue and still fail catastrophically
\u2022 Absence of a warning, alert, or overdue status does not indicate safety

You agree that Loam Labs LLC shall not be responsible or liable for any injury, damage, or loss resulting from reliance on the Service to predict, prevent, or warn of component failure.`,
  },
  {
    title: '11. User Responsibilities',
    body: `You agree to:

\u2022 Provide accurate and complete information
\u2022 Keep your data reasonably up to date
\u2022 Follow manufacturer service recommendations
\u2022 Consult qualified professionals for inspection and repair
\u2022 Use the Service in compliance with all applicable laws

You must not:

\u2022 Use the Service for emergency, safety-critical, or life-dependent decisions
\u2022 Misrepresent data or attempt to reverse-engineer the Service`,
  },
  {
    title: '12. Indemnification',
    body: `You agree to defend, indemnify, and hold harmless Loam Labs LLC and its affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including attorneys' fees) arising out of or related to:

\u2022 Your use of the Service
\u2022 Your reliance on any estimate or data provided
\u2022 Any injury, death, or damage caused by a bicycle or component you own or operate
\u2022 Your violation of these Terms`,
  },
  {
    title: '13. Third-Party Services and Data',
    body: `The Service integrates with third-party platforms (e.g., Garmin, Strava, WHOOP, Suunto).

Loam Labs LLC is not responsible for:

\u2022 Accuracy or availability of third-party data
\u2022 Errors, delays, or omissions in imported data
\u2022 Decisions made based on third-party data

Use of third-party services is at your own risk and subject to their respective terms.`,
  },
  {
    title: '14. Force Majeure',
    body: 'We are not liable for any failure or delay in performing our obligations under these Terms caused by events beyond our reasonable control, including but not limited to natural disasters, internet or infrastructure outages, third-party API unavailability, government actions, or pandemics.',
  },
  {
    title: '15. Modification of the Service',
    body: 'We reserve the right to modify, suspend, or discontinue the Service or any feature at any time, with or without notice.',
  },
  {
    title: '16. Termination',
    body: 'We may terminate or suspend your access to the Service at our discretion, without liability, for any reason, including violation of these Terms. Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination (including disclaimers, limitation of liability, indemnification, and arbitration) shall survive.',
  },
  {
    title: '17. Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of the State of Washington, without regard to conflict of law principles.',
  },
  {
    title: '18. Mandatory Arbitration and Waiver of Class Actions',
    body: `PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.

Binding Arbitration

You and Loam Labs LLC agree that any dispute, claim, or controversy arising out of or relating to the Service or these Terms shall be resolved exclusively through final and binding arbitration, rather than in court, except that either party may bring claims in small claims court if eligible.

Arbitration Forum and Rules

The arbitration shall be administered by the American Arbitration Association (AAA) and conducted under the AAA Consumer Arbitration Rules.

Location and Format

Arbitration shall be conducted remotely (via video or telephone), or in the user's state of residence, if required by applicable law.

Costs

Loam Labs LLC will pay all AAA filing, administration, and arbitrator fees beyond any amount required to be paid by the user under the AAA Consumer Arbitration Rules. Each party shall bear its own attorneys' fees and costs, unless otherwise required by law.

Authority of Arbitrator

The arbitrator shall have exclusive authority to resolve any dispute relating to the interpretation, applicability, enforceability, or formation of this arbitration agreement.

Waiver of Jury Trial and Class Actions

YOU AND LOAM LABS LLC AGREE THAT ALL CLAIMS MUST BE BROUGHT IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.

YOU EXPRESSLY WAIVE ANY RIGHT TO A JURY TRIAL AND ANY RIGHT TO PARTICIPATE IN A CLASS ACTION OR CLASS-WIDE ARBITRATION.

Jurisdictional Exceptions

This arbitration provision does not apply where prohibited by applicable law. If you are a consumer in the European Union, United Kingdom, or another jurisdiction that prohibits mandatory pre-dispute arbitration, this section does not apply to you, and disputes will be resolved in the courts of your jurisdiction.

If any portion of this arbitration provision is found unenforceable, the remaining portions shall remain in full force and effect.`,
  },
  {
    title: '19. Severability',
    body: 'If any provision of these Terms is found unenforceable, the remaining provisions shall remain in full force and effect.',
  },
  {
    title: '20. Entire Agreement',
    body: 'These Terms, together with our Privacy Policy, constitute the entire agreement between you and Loam Labs LLC regarding the Service and supersede all prior agreements or understandings.',
  },
  {
    title: '21. Contact Information',
    body: `For questions regarding these Terms, contact:

Loam Labs LLC
Email: support@loamlogger.app

BY USING LOAM LOGGER, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO THESE TERMS, INCLUDING THE DISCLAIMERS AND LIMITATIONS OF LIABILITY.`,
  },
];
