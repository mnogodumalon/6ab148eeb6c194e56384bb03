/**
 * Rechnung erstellen — 10-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Berater wählen (multiple)
 *        → 4) Zeiterfassungseinträge wählen (multiple) → 5) Rechnungsdatum
 *        → 6) Nettobetrag → 7) Mehrwertsteuer → 8) Abrechnungsmonat & -jahr
 *        → 9) Notizen → 10) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung (abrechenbar=true).
 * Writes: rechnungen (createRechnungenEntry) — rechnungsstatus fixed to 'entwurf'.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
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
      nettobetrag: 6,
      mehrwertsteuer: 7,
      rechnungsmonat: 8,
      rechnungsjahr: 8,
      notizen: 9,
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
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: (r) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: fieldDate(r, 'datum') ?? tx('Ohne Datum'),
        subtitle: tx`${fieldNumber(r, 'stunden') ?? '?'} Std. — ${ctx.ref('berater') ?? ''}`,
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
        description: tx('Rechnung für einen Kunden auf Basis eines Projekts und der Zeiterfassungseinträge erstellen.'),
        needs: [tx('Kundenname'), tx('Projekt'), tx('Abrechenbare Zeiteinträge'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Schritt 1: Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt wird abgerechnet?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung …')}
          avatar="none"
          create={false}
          emptyText={tx('Kein Projekt gefunden. Bitte zuerst ein Projekt anlegen.')}
        />
      </WizardStep>

      {/* Schritt 3: Berater wählen (multiple) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Projekt beteiligt?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            avatar="initials"
            searchPlaceholder={tx('Name …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge wählen (multiple) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche abrechenbaren Zeiteinträge sollen auf dieser Rechnung erscheinen?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            avatar="none"
            searchPlaceholder={tx('Datum oder Tätigkeit …')}
            emptyText={tx('Keine abrechenbaren Zeiteinträge für dieses Projekt gefunden. Bitte zuerst Stunden erfassen.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Rechnungsdatum')}
        />
      </WizardStep>

      {/* Schritt 5: Rechnungsdatum */}
      <WizardStep
        label={tx('Rechnungsdatum')}
        description={tx('Wann wird die Rechnung ausgestellt?')}
      >
        <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Nettobetrag')}
        />
      </WizardStep>

      {/* Schritt 6: Nettobetrag */}
      <WizardStep
        label={tx('Nettobetrag')}
        description={tx('Wie hoch ist der Nettobetrag der Rechnung?')}
      >
        <Bound
          form={flow.forms.rechnungen}
          name="nettobetrag"
          hint={tx('In Euro, ohne Mehrwertsteuer')}
        />
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Mehrwertsteuer')}
        />
      </WizardStep>

      {/* Schritt 7: Mehrwertsteuer */}
      <WizardStep
        label={tx('Mehrwertsteuer')}
        description={tx('Welcher Mehrwertsteuersatz gilt für diese Rechnung?')}
      >
        <Bound
          form={flow.forms.rechnungen}
          name="mehrwertsteuer"
          hint={tx('In Prozent, z. B. 19')}
        />
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Abrechnungsmonat')}
        />
      </WizardStep>

      {/* Schritt 8: Abrechnungsmonat und -jahr */}
      <WizardStep
        label={tx('Abrechnungszeitraum')}
        description={tx('Welchem Monat und Jahr wird diese Rechnung zugeordnet?')}
      >
        <Bound form={flow.forms.rechnungen} name="rechnungsmonat" allowClear />
        <Bound
          form={flow.forms.rechnungen}
          name="rechnungsjahr"
          hint={tx('Jahreszahl, z. B. 2026')}
        />
        <StepNav
          onBack={() => setStep(7)}
          onNext={() => flow.validateStep(8)}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Schritt 9: Notizen (optional) */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Gibt es zusätzliche Hinweise oder Anmerkungen zur Rechnung?')}
      >
        <Bound
          form={flow.forms.rechnungen}
          name="notizen"
          rows={4}
          hint={tx('Optional — z. B. Zahlungsbedingungen oder interne Vermerke')}
        />
        <StepNav
          onBack={() => setStep(8)}
          onNext={() => flow.validateStep(9)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 10: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'rechnungsstatus', label: tx('Rechnungsstatus'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Rechnungsnummer, Gesamtbetrag und Fälligkeitsdatum werden automatisch vom System vergeben.')}
            confirmLabel={tx('Rechnung anlegen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch berechnet und zugewiesen.')}
          next={[
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
            },
            {
              label: tx('Neues Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
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
