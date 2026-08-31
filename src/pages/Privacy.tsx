const LAST_UPDATED = '31 August 2026';
const SUPPORT_EMAIL = 'support@hamsyltravels.com';
const OPERATOR = 'Hamsyl Travels / Fastigo';

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: 'who',
    title: '1. Who we are',
    body: [
      `${OPERATOR} (“Fastigo”, “we”, “us”, or “our”) operates the Fastigo passenger app, the Fastigo Driver app, and related websites and admin tools (together, the “Services”).`,
      'This Privacy Policy explains what information we collect, how we use it, and the choices you have. It is intended for users in Nigeria and elsewhere who use our ride-hailing Services.',
      `If you have questions, contact us at ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    id: 'scope',
    title: '2. Scope',
    body: [
      'This policy applies to information we collect through:',
      '• The Fastigo passenger mobile application',
      '• The Fastigo Driver mobile application',
      '• Our websites and support channels linked to the Services',
      'It does not cover third-party websites, payment processors, maps providers, or app stores, which have their own policies.',
    ],
  },
  {
    id: 'collect',
    title: '3. Information we collect',
    body: [
      'Account & profile: name, email address, phone number, username, password (stored in hashed form), profile photo, and similar account details you provide.',
      'Driver / KYC information: government ID numbers and images (for example NIN or driver’s licence), application selfies, vehicle details, vehicle photos, ownership or inspection documents, and related verification data when you apply as a driver.',
      'Location: precise or approximate location from your device when you use map, matching, navigation, trip tracking, or go online as a driver. Background location may be used on the Driver app while you are online or on an active trip so passengers can track you and we can match nearby rides.',
      'Trip & usage: pickup and drop-off details, route information, fare estimates and totals, trip status, ratings, chat messages related to a trip, support tickets, SOS alerts, and app interaction logs.',
      'Payments & wallet: payment method metadata, wallet balances and transactions, payout / bank account details you provide for driver cash-out, and records needed for commissions and refunds. Card details are typically processed by our payment partners (for example Paystack) and are not stored in full on our servers.',
      'Device & technical: device type, operating system, app version, push notification tokens, IP address, crash and performance diagnostics, and similar technical data.',
      'Communications: messages you send to support, and notifications we send about trips, security, or promotions (subject to your settings).',
    ],
  },
  {
    id: 'use',
    title: '4. How we use information',
    body: [
      'We use personal information to:',
      '• Create and manage your account',
      '• Match passengers with drivers and provide live trip tracking',
      '• Verify driver identity and vehicle eligibility (KYC)',
      '• Calculate fares, process payments, wallets, payouts, and commissions',
      '• Provide in-app chat, support, safety features (including SOS), and notifications',
      '• Improve safety, prevent fraud, and enforce our terms',
      '• Analyse and improve the Services, maps accuracy, and reliability',
      '• Comply with legal obligations and respond to lawful requests',
      '• Send service messages; marketing only where permitted and with controls where required',
    ],
  },
  {
    id: 'legal',
    title: '5. Legal bases (where applicable)',
    body: [
      'Depending on your location, we process data because it is necessary to perform our contract with you (providing rides and driver tools), because we have a legitimate interest in operating a safe and reliable platform, because you consented (for example certain location or marketing permissions), or because we must comply with law.',
    ],
  },
  {
    id: 'share',
    title: '6. How we share information',
    body: [
      'We may share information with:',
      '• The other party to a trip (for example passenger name/photo and pickup details shown to a driver; driver name, photo, vehicle, and live location shown to a passenger during a trip)',
      '• Service providers who help us host, map, message, analyse, or process payments (under contracts that limit their use of your data)',
      '• Admin / KYC officers and authorised operations staff reviewing driver applications or safety incidents',
      '• Authorities when required by law or to protect rights, safety, and security',
      '• A successor entity if we are involved in a merger, acquisition, or asset transfer',
      'We do not sell your personal information.',
    ],
  },
  {
    id: 'location',
    title: '7. Location data',
    body: [
      'Location is core to ride-hailing. Passengers use location to set pickup points and see nearby drivers. Drivers share location while online or on a trip for matching, navigation, and passenger tracking.',
      'You can control location permissions in your device settings. If you disable location, some features will not work. On Fastigo Driver, denying “Always” / background location may limit tracking when the app is in the background.',
    ],
  },
  {
    id: 'retention',
    title: '8. Retention',
    body: [
      'We keep account, trip, payment, and KYC records for as long as needed to provide the Services, resolve disputes, meet accounting and legal requirements, and protect against fraud. When data is no longer required, we delete or anonymise it where practicable.',
    ],
  },
  {
    id: 'security',
    title: '9. Security',
    body: [
      'We use administrative, technical, and organisational measures designed to protect personal information (including encrypted transport, access controls, and hashed passwords). No method of transmission or storage is completely secure; please use a strong password and keep your device updated.',
    ],
  },
  {
    id: 'rights',
    title: '10. Your choices and rights',
    body: [
      'Depending on applicable law, you may request access, correction, deletion, or a copy of certain personal data, or object to / restrict some processing. You can update many profile details in the apps, manage notification preferences, and revoke device permissions.',
      `To make a privacy request, email ${SUPPORT_EMAIL} from the address linked to your account. We may need to verify your identity before responding.`,
      'To request deletion of your account and associated data, use https://keke-web-pied.vercel.app/delete-account or email us with the subject “Account deletion request”.',
    ],
  },
  {
    id: 'children',
    title: '11. Children',
    body: [
      'The Services are not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided data, contact us and we will take appropriate steps.',
    ],
  },
  {
    id: 'transfers',
    title: '12. International transfers',
    body: [
      'We primarily operate in Nigeria. If data is processed or stored in other countries (for example by cloud or payment providers), we take steps designed to protect it in line with this policy and applicable law.',
    ],
  },
  {
    id: 'changes',
    title: '13. Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. We will post the revised version on this page and update the “Last updated” date. Continued use of the Services after changes means you accept the updated policy, except where additional consent is required by law.',
    ],
  },
  {
    id: 'contact',
    title: '14. Contact',
    body: [
      `${OPERATOR}`,
      `Privacy & support: ${SUPPORT_EMAIL}`,
      'Website: https://keke-web-pied.vercel.app/privacy',
      'API / services: https://keke.hamsyltravels.com',
    ],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-panel/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/brand/mark.png"
              alt="Fastigo"
              className="h-9 w-9 rounded-xl"
            />
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-trigo uppercase">
                Fastigo
              </p>
              <p className="text-sm text-muted">Privacy Policy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/delete-account"
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition hover:border-trigo/40 hover:text-trigo"
            >
              Delete account
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-full bg-trigo px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-trigo-hover"
            >
              Contact
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="animate-rise rounded-[var(--radius-panel)] border border-line bg-panel p-6 shadow-[var(--shadow-soft)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-trigo uppercase">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-6 text-[15px] leading-7 text-ink/90">
            This Privacy Policy describes how Fastigo collects, uses, and shares
            information when you use our passenger and driver apps. It is the
            policy linked from our Apple App Store and Google Play listings.
          </p>

          <nav className="mt-8 rounded-2xl bg-trigo-muted/60 p-4 sm:p-5">
            <p className="text-xs font-bold tracking-wide text-trigo-deep uppercase">
              On this page
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm font-medium text-ink/80 hover:text-trigo"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold tracking-tight text-ink">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className="text-[15px] leading-7 text-ink/85 whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} {OPERATOR}. All rights reserved.
        </p>
      </main>
    </div>
  );
}
