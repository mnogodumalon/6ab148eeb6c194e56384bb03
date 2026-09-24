/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Berater wählen (multi) →
 *        4) Zeiterfassungseinträge verknüpfen (multi) →
 *        5) Datum, Beträge & Notizen eingeben → 6) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (rechnungsstatus='entwurf' automatisch gesetzt).
 * Composes: IntentWizardShell, EntitySelectStep (single + multi), Bound, Field,
 *           StepNav, SummaryStep, SuccessStep.
 */
import { useState, useEffect } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { fieldText, fieldDate, fieldNumber, fieldLookup, todayIso } from '@/lib/journey';
import { tx } from '@/i18n';
import { IconFileInvoice, IconReceipt } from '@tabler/icons-react';

// Compute gesamtbetrag live from netto + mwst (netto * (1 + mwst/100))
function computeGesamtbetrag(netto: number | null, mwst: number | null): number | null {
  if (netto == null) return null;
  const mwstFactor = mwst != null ? mwst / 100 : 0;
  return Math.round(netto * (1 + mwstFactor) * 100) / 100;
}

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useRechnungErstellenFlow({
    steps: {
      kunde: 1,
      projekt: 2,
      berater: 3,
      zeiterfassungseintraege: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      rechnungsmonat: 5,
      rechnungsjahr: 5,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      gesamtbetrag: 5,
      notizen: 5,
    },
    items: {
      kunde: (r) => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'kundentyp') ?? undefined,
      }),
      projekt: (r) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: (r) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldNumber(r, 'stundensatz') != null
          ? tx`${fieldNumber(r, 'stundensatz')!} €/h`
          : undefined,
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: tx`${fieldDate(r, 'datum') ?? '—'} — ${String(fieldNumber(r, 'stunden') ?? '?')} Std.`,
        subtitle: ctx.ref('berater'),
        status: fieldLookup(r, 'abrechenbar')
          ? { key: 'abrechenbar', label: tx('Abrechenbar') }
          : undefined,
      }),
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
  });

  const f = flow.forms.rechnungen;

  // Auto-compute gesamtbetrag whenever netto or mwst changes
  useEffect(() => {
    const netto = f.get('nettobetrag') as number | null | undefined;
    const mwst = f.get('mehrwertsteuer') as number | null | undefined;
    const gesamt = computeGesamtbetrag(netto ?? null, mwst ?? null);
    if (gesamt != null) {
      f.set('gesamtbetrag', gesamt);
    }
  }, [f.get('nettobetrag'), f.get('mehrwertsteuer')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived label for the success screen
  const nettoVal = f.get('nettobetrag') as number | null | undefined;
  const mwstVal = f.get('mehrwertsteuer') as number | null | undefined;
  const gesamtVal = computeGesamtbetrag(nettoVal ?? null, mwstVal ?? null);

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neue Rechnung für einen Kunden anlegen und Zeiterfassungseinträge verknüpfen.'),
        needs: [tx('Kundendaten'), tx('Projektzuordnung'), tx('Abrechnungszeitraum')],
      }}
    >
      {/* Step 1 — Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail suchen …')}
          avatar="initials"
          columns={2}
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt wird abgerechnet?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          columns={2}
        />
      </WizardStep>

      {/* Step 3 — Berater wählen (multi) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Auftrag beteiligt?')}
        needs={['projekt']}
      >
        <Field form={f} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            avatar="initials"
            columns={2}
            searchPlaceholder={tx('Name suchen …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Step 4 — Zeiterfassungseinträge (multi) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Stunden werden mit dieser Rechnung abgerechnet?')}
        needs={['berater']}
      >
        <Field form={f} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            columns={2}
            searchPlaceholder={tx('Datum oder Tätigkeit suchen …')}
            emptyText={tx('Keine abrechenbaren Einträge gefunden.')}
            create={false}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Datum & Beträge')}
        />
      </WizardStep>

      {/* Step 5 — Datum, Abrechnungszeitraum, Beträge, Notizen */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Datum, Abrechnungszeitraum und Rechnungsbeträge eingeben.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="rechnungsdatum" />
            <Bound form={f} name="faelligkeitsdatum" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="rechnungsmonat" allowClear />
            <Bound form={f} name="rechnungsjahr" hint={tx('z. B. 2026')} />
          </div>
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Bound form={f} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
              <Bound form={f} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
            </div>
            {/* Gesamtbetrag: hidden input (layer owns it), visual display for the user */}
            <Field form={f} name="gesamtbetrag">
              <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3">
                <IconReceipt size={20} className="shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Gesamtbetrag (inkl. MwSt.)')}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {gesamtVal != null
                      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gesamtVal)
                      : tx('Wird berechnet …')}
                  </p>
                </div>
              </div>
            </Field>
          </div>
          <Bound form={f} name="notizen" rows={3} />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 6 — Review */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Rechnungsnummer wird automatisch vergeben. Der Status startet als Entwurf.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Rechnungsnummer wurde automatisch vergeben. Du kannst nun Stunden erfassen oder ein weiteres Angebot anlegen.')}
          next={[
            {
              label: tx('Weitere Rechnung erstellen'),
            },
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
              icon: <IconFileInvoice size={16} />,
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
