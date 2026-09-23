/**
 * Rechnung erstellen — 9-Schritt-Wizard (inkl. Zusammenfassung).
 * Steps: 1) Kunden wählen → 2) Projekt wählen → 3) Berater wählen (mehrere) →
 *        4) Zeiterfassungseinträge verknüpfen (mehrere) → 5) Rechnungsdatum & Fälligkeit →
 *        6) Abrechnungsmonat & -jahr → 7) Netto & MwSt. → 8) Notizen → 9) Prüfen & anlegen.
 * Reads: kunden, projekte (filter: in_bearbeitung), berater (filter: aktiv),
 *        zeiterfassung (filter: abrechenbar = true).
 * Writes: rechnungen (useRechnungErstellenFlow / rechnungsstatus=entwurf automatisch).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, Field, StepNav,
 *           SummaryStep, SuccessStep.
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
      faelligkeitsdatum: 5,
      rechnungsmonat: 6,
      rechnungsjahr: 6,
      nettobetrag: 7,
      mehrwertsteuer: 7,
      notizen: 8,
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'kundentyp') ?? undefined,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldNumber(r, 'stundensatz') != null
          ? tx`${fieldNumber(r, 'stundensatz')} €/h`
          : undefined,
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: fieldDate(r, 'datum') != null
          ? tx`${fieldDate(r, 'datum') ?? ''} · ${String(fieldNumber(r, 'stunden') ?? '?')} Std.`
          : tx`${String(fieldNumber(r, 'stunden') ?? '?')} Std.`,
        subtitle: ctx.ref('berater'),
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      subtitle={tx('Neue Rechnung auf Basis eines Projekts anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Rechnung für einen Kunden und ein Projekt erfassen.'),
        needs: [
          tx('Kundenname'),
          tx('Projektkürzel'),
          tx('Nettobetrag und Mehrwertsteuer'),
        ],
      }}
    >
      {/* Schritt 1 — Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung ausgestellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail suchen …')}
          avatar="initials"
          create={{ fields: ['kundenname', 'email', 'kundentyp', 'anlagedatum'] }}
        />
      </WizardStep>

      {/* Schritt 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt wird abgerechnet?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Kein Projekt in Bearbeitung gefunden. Zuerst ein Projekt anlegen.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Schritt 3 — Berater auswählen (mehrere möglich) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater:innen sind an dieser Rechnung beteiligt?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            searchPlaceholder={tx('Vorname oder Nachname suchen …')}
            avatar="initials"
            emptyText={tx('Kein aktiver Berater gefunden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Schritt 4 — Zeiterfassungseinträge verknüpfen */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche abrechenbaren Stunden gehören zu dieser Rechnung?')}
        needs={['berater']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            emptyText={tx('Keine abrechenbaren Zeiteinträge gefunden. Stunden erst erfassen.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Datum')}
        />
      </WizardStep>

      {/* Schritt 5 — Rechnungsdatum & Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Wann wird die Rechnung ausgestellt und wann ist sie fällig?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
          <Bound
            form={flow.forms.rechnungen}
            name="faelligkeitsdatum"
            hint={tx('Optional — z. B. 30 Tage nach Rechnungsdatum')}
          />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Abrechnungsmonat')}
        />
      </WizardStep>

      {/* Schritt 6 — Rechnungsmonat & -jahr */}
      <WizardStep
        label={tx('Abrechnungsmonat')}
        description={tx('Für welchen Monat und welches Jahr wird abgerechnet?')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="rechnungsmonat"
            hint={tx('Der Abrechnungszeitraum dieser Rechnung')}
          />
          <Bound
            form={flow.forms.rechnungen}
            name="rechnungsjahr"
            hint={tx('z. B. 2026')}
          />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Schritt 7 — Nettobetrag & MwSt. */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer für diese Rechnung eingeben.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="nettobetrag"
            hint={tx('Betrag in Euro ohne Steuer, z. B. 2500')}
          />
          <Bound
            form={flow.forms.rechnungen}
            name="mehrwertsteuer"
            hint={tx('Steuersatz in Prozent, z. B. 19')}
          />
        </div>
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Schritt 8 — Notizen (optional) */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale interne Anmerkungen zur Rechnung.')}
      >
        <Bound
          form={flow.forms.rechnungen}
          name="notizen"
          rows={4}
          hint={tx('Nur intern sichtbar — erscheint nicht auf der Rechnung')}
        />
        <StepNav
          onBack={() => setStep(7)}
          onNext={() => flow.validateStep(8)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 9 — Zusammenfassung & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx(
              'Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.'
            )}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Die Rechnungsnummer und der Gesamtbetrag wurden automatisch berechnet und gesetzt.'
          )}
          next={[
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
            },
            {
              label: tx('Angebot erstellen'),
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
