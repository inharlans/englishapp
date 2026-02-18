export default function PrivacyPage() {
  return (
    <section className="ui-card-soft p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Englishapp provides vocabulary learning services. We collect only the minimum data needed
        to operate login, study progress, and billing features.
      </p>

      <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
        <p>
          1. Data collected: account email, encrypted password, OAuth account identifiers,
          vocabulary study progress, payment event metadata, and security logs.
        </p>
        <p>
          2. Purpose of use: account authentication, service operation, abuse prevention,
          customer support, and payment processing.
        </p>
        <p>
          3. Retention: we retain data while your account is active and delete or anonymize data
          when no longer required by law or operations.
        </p>
        <p>
          4. Third-party sharing: we do not sell personal data. We share limited data only with
          infrastructure and payment providers required to run the service.
        </p>
        <p>
          5. Contact: for privacy requests, contact the service operator through the official
          support channel.
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-500">Effective date: February 18, 2026</p>
    </section>
  );
}
