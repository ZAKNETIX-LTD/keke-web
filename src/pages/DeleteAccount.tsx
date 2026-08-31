const SUPPORT_EMAIL = 'support@hamsyltravels.com';
const OPERATOR = 'Hamsyl Travels / Fastigo';
const DELETE_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  'Account deletion request',
)}&body=${encodeURIComponent(
  [
    'Please delete my Fastigo account and associated personal data.',
    '',
    'Full name:',
    'Phone number linked to the account:',
    'Email linked to the account:',
    'App (passenger / driver):',
    '',
    'I confirm that I am the account holder and request permanent deletion of my account and associated data, subject to any legal retention requirements.',
  ].join('\n'),
)}`;

export function DeleteAccountPage() {
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
              <p className="text-sm text-muted">Account deletion</p>
            </div>
          </div>
          <a
            href="/privacy"
            className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition hover:border-trigo/40 hover:text-trigo"
          >
            Privacy Policy
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="animate-rise rounded-[var(--radius-panel)] border border-line bg-panel p-6 shadow-[var(--shadow-soft)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-trigo uppercase">
            Your data
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Request account deletion
          </h1>
          <p className="mt-6 text-[15px] leading-7 text-ink/90">
            You can request that we delete your Fastigo passenger or driver
            account and the personal data associated with it. This page is the
            web path linked from our Apple App Store and Google Play listings.
          </p>

          <div className="mt-8 rounded-2xl bg-trigo-muted/60 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">How to request deletion</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-ink/85">
              <li>
                Tap the button below (or email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-trigo hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                ) from the email or phone number linked to your account.
              </li>
              <li>
                Include your full name, phone number, email, and whether you use
                the passenger or driver app so we can find the right account.
              </li>
              <li>
                We will verify that you own the account, then delete or
                anonymise associated data within a reasonable period (typically
                within 30 days), except where we must retain certain records for
                legal, accounting, fraud-prevention, or safety reasons.
              </li>
            </ol>

            <a
              href={DELETE_MAILTO}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-trigo px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-trigo-hover sm:w-auto"
            >
              Request account deletion
            </a>
          </div>

          <section className="mt-10 space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              What gets deleted
            </h2>
            <p className="text-[15px] leading-7 text-ink/85">
              When deletion is completed, we remove or anonymise account profile
              details, app credentials, and personal data that is no longer
              needed to operate the Services—subject to the exceptions below.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              What may be retained
            </h2>
            <p className="text-[15px] leading-7 text-ink/85">
              We may keep limited information where required by law or for
              legitimate business needs, for example trip and payment records for
              tax and accounting, fraud or safety investigations, unresolved
              disputes, and KYC or regulatory records for the period required by
              applicable rules. Retained data is restricted and not used for
              other purposes.
            </p>
          </section>

          <section className="mt-10 space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              After you delete
            </h2>
            <p className="text-[15px] leading-7 text-ink/85">
              Deletion is permanent. You will lose access to wallets, trip
              history, and driver verification status tied to that account. If
              you want to use Fastigo again later, you will need to create a new
              account (and complete driver KYC again if you were a driver).
            </p>
          </section>

          <p className="mt-10 text-[15px] leading-7 text-ink/85">
            More detail on how we handle personal data is in our{' '}
            <a href="/privacy" className="font-semibold text-trigo hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          © {new Date().getFullYear()} {OPERATOR}. All rights reserved.
        </p>
      </main>
    </div>
  );
}
