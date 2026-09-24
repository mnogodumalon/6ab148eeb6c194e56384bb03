/**
 * Rechnung erstellen — 9-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Berater auswählen →
 *        4) Zeiterfassungseinträge wählen → 5) Rechnungsdatum & Fälligkeitsdatum →
 *        6) Abrechnungsmonat & -jahr → 7) Nettobetrag & Mehrwertsteuer →
 *        8) Notizen → 9) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (rechnungsstatus fixed: entwurf).
 * Composes: IntentWizardShell, EntitySelectStep, Field, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldNumber, fieldLookup, todayIso } from '@/lib/journey';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { tx } from '@/i18n';

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
      rechnungsmonat: 6,
      rechnungsjahr: 6,
      nettobetrag: 7,
      mehrwertsteuer: 7,
      notizen: 8,
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
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: tx`${fieldDate(r, 'datum') ?? '—'} · ${fieldNumber(r, 'stunden') ?? '?'} Std.`,
        subtitle: ctx.ref('berater'),
        status: r.fields.abrechenbar ? { key: 'abrechenbar', label: tx('Abrechenbar') } : undefined,
      }),
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neue Rechnung für einen Kunden und ein Projekt auf Basis von Zeiterfassungseinträgen anlegen.'),
        needs: [tx('Kundenname'), tx('Projektkennung'), tx('Zeiterfassungseinträge')],
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
          searchPlaceholder={tx('Name oder E-Mail …')}
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
          searchPlaceholder={tx('Projektkennung …')}
          columns={2}
        />
      </WizardStep>

      {/* Step 3 — Berater (multipleapplookup) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Auftrag beteiligt?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            avatar="initials"
            columns={2}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassungseinträge')}
        />
      </WizardStep>

      {/* Step 4 — Zeiterfassungseinträge (multipleapplookup) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge sollen in die Rechnung einfließen?')}
        needs={['berater']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            emptyText={tx('Keine abrechenbaren Zeiterfassungseinträge gefunden.')}
            columns={2}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Rechnungsdaten')}
        />
      </WizardStep>

      {/* Step 5 — Rechnungsdatum & Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Rechnungsdatum und Fälligkeitsdatum festlegen.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
          <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Abrechnungsmonat')}
        />
      </WizardStep>

      {/* Step 6 — Abrechnungsmonat & Abrechnungsjahr */}
      <WizardStep
        label={tx('Abrechnungszeitraum')}
        description={tx('Monat und Jahr des Abrechnungszeitraums auswählen.')}
        needs={['rechnungsdatum']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
          <Bound form={flow.forms.rechnungen} name="rechnungsjahr" hint={tx('Z. B. 2026')} />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Step 7 — Nettobetrag & Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuersatz eingeben.')}
        needs={['rechnungsmonat']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" hint={tx('In Prozent, z. B. 19')} />
        </div>
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Step 8 — Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Anmerkungen zur Rechnung.')}
        needs={['nettobetrag']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="notizen" rows={4} />
        </div>
        <StepNav
          onBack={() => setStep(7)}
          onNext={() => flow.validateStep(8)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 9 — Prüfen & anlegen */}
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
            whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag vergibt das System automatisch nach dem Anlegen.')}
            confirmLabel={tx('Rechnung als Entwurf anlegen')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung ist als Entwurf gespeichert. Rechnungsnummer und Gesamtbetrag werden vom System vergeben.')}
          next={[
            {
              label: tx('Weitere Rechnung erstellen'),
            },
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
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
