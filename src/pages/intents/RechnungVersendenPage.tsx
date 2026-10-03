/**
 * Rechnung versenden — 3-Schritt-Wizard.
 * Steps: 1) Rechnung wählen → 2) Daten prüfen & Status wählen → 3) Status setzen (Prüfen & speichern).
 * Reads: rechnungen (rechnungsnummer, kunde, gesamtbetrag, rechnungsstatus). Writes: rechnungen.rechnungsstatus (Update über useRechnungVersendenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Field, ChoiceGroup, StepNav, SummaryStep, SuccessStep, StatusBadge.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useRechnungVersendenFlow } from '@/lib/journey/flows/RechnungVersenden';
import { formatCurrency } from '@/lib/formatters';
import { tx } from '@/i18n';

export default function RechnungVersendenPage() {
  const [step, setStep] = useState(1);
  const flow = useRechnungVersendenFlow({
    steps: { rechnungen: 1, rechnungsstatus: 2 },
    items: {
      rechnungen: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'rechnungsnummer'),
        subtitle: [ctx.ref('kunde'), fieldNumber(r, 'gesamtbetrag') != null ? formatCurrency(fieldNumber(r, 'gesamtbetrag') ?? undefined) : null]
          .filter(Boolean)
          .join(' · '),
        status: fieldLookup(r, 'rechnungsstatus')?.label,
      }),
    },
  });

  const form = flow.forms.rechnungen;
  const record = flow.targets.rechnungen.record;
  const picker = flow.picks.rechnungen;
  const status = record ? fieldLookup(record, 'rechnungsstatus') : null;
  const gesamt = record ? fieldNumber(record, 'gesamtbetrag') : null;

  return (
    <IntentWizardShell
      title={tx('Rechnung versenden')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Rechnung prüfen und auf Versendet oder Bezahlt setzen.'),
        needs: [tx('Eine Rechnung im Entwurf')],
      }}
    >
      <WizardStep label={tx('Rechnung')} description={tx('Welche Rechnung möchtest du bearbeiten?')}>
        <EntitySelectStep
          {...picker.select}
          {...flow.pick('rechnungen')}
          searchPlaceholder={tx('Rechnungsnummer suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Daten prüfen')} description={tx('Stimmen Nummer, Kunde und Betrag? Dann wähle den neuen Status.')}>
        {record ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 overflow-hidden space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold min-w-0 truncate">{fieldText(record, 'rechnungsnummer')}</span>
                {status && <StatusBadge statusKey={status.key} label={status.label} />}
              </div>
              <p className="text-sm text-muted-foreground">
                {tx('Kunde')}: {picker.refLabel(record, 'kunde') ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                {tx('Gesamtbetrag')}: {gesamt != null ? formatCurrency(gesamt) : '—'}
              </p>
            </div>
            <Field form={form} name="rechnungsstatus">
              <ChoiceGroup {...form.choice('rechnungsstatus')} />
            </Field>
            <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Status setzen')} />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>

      <WizardStep label={tx('Status setzen')} description={tx('Versendet nach dem Versand, Bezahlt nach Zahlungseingang.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Rechnungsstatus wird sofort aktualisiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weitere Rechnung bearbeiten'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Rechnung aus Zeiteinträgen erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
