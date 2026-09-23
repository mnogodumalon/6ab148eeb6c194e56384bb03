/**
 * Rechnung erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Beteiligte Berater:innen wählen →
 *        3) Abrechnungsmonat & -jahr → 4) Zeiterfassungseinträge verknüpfen →
 *        5) Nettobetrag & Mehrwertsteuer → 6) Fälligkeitsdatum & Notizen →
 *        7) Prüfen & anlegen.
 * Reads: projekte, berater, zeiterfassung (filter: abrechenbar=true).
 * Writes: rechnungen (projekt, kunde derived, berater, zeiterfassungseintraege,
 *          rechnungsmonat, rechnungsjahr, nettobetrag, mehrwertsteuer,
 *          faelligkeitsdatum, notizen; rechnungsdatum+rechnungsstatus set by plan).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, StepNav,
 *           SummaryStep, SuccessStep.
 * Note: rechnungsnummer set by tool `rechnungsnummer-vergeben`,
 *       gesamtbetrag by tool `rechnungsbetrag-berechnen`,
 *       PDF by tool `rechnung-pdf-erzeugen`.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldDate, fieldLookup } from '@/lib/journey';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useRechnungErstellenFlow({
    steps: {
      projekt: 1,
      berater: 2,
      rechnungsmonat: 3,
      rechnungsjahr: 3,
      zeiterfassungseintraege: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      faelligkeitsdatum: 6,
      notizen: 6,
    },
    items: {
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
        title: tx`${fieldDate(r, 'datum') ?? '—'} — ${String(fieldNumber(r, 'stunden') ?? '?')} Std.`,
        subtitle: ctx.ref('berater'),
      }),
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
        description: tx('Eine neue Rechnung auf Basis eines Projekts anlegen und Zeiterfassungseinträge verknüpfen.'),
        needs: [tx('Projektnummer'), tx('Abrechnungsmonat'), tx('Netto- und Mehrwertsteuerbetrag')],
      }}
    >
      {/* Step 1 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt soll die Rechnung erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
          onSelect={(id) => {
            flow.pick('projekt').onSelect(id);
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Step 2 — Beteiligte Berater:innen wählen */}
      <WizardStep
        label={tx('Berater:innen')}
        description={tx('Wähle alle an diesem Projekt beteiligten Berater:innen aus.')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.forms.rechnungen.records('berater', flow.picks.berater.labelOf)}
            avatar="initials"
            searchPlaceholder={tx('Name suchen …')}
            create={false}
            emptyText={tx('Keine Berater:innen gefunden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Abrechnungszeitraum')}
        />
      </WizardStep>

      {/* Step 3 — Abrechnungsmonat und -jahr */}
      <WizardStep
        label={tx('Zeitraum')}
        description={tx('Für welchen Monat und welches Jahr wird abgerechnet?')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
          <Bound
            form={flow.forms.rechnungen}
            name="rechnungsjahr"
            hint={tx('z. B. 2026')}
            placeholder="2026"
          />
        </div>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Step 4 — Zeiterfassungseinträge verknüpfen */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Verknüpfe die abrechenbaren Zeiterfassungseinträge des Zeitraums.')}
        needs={['rechnungsmonat', 'rechnungsjahr']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.forms.rechnungen.records(
              'zeiterfassungseintraege',
              flow.picks.zeiterfassungseintraege.labelOf,
            )}
            searchPlaceholder={tx('Datum oder Berater suchen …')}
            create={false}
            emptyText={tx('Keine abrechenbaren Einträge gefunden. Buche zuerst Stunden mit „Abrechenbar".')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Step 5 — Nettobetrag & Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Gib Nettobetrag und Mehrwertsteuersatz ein. Der Gesamtbetrag wird automatisch berechnet.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="nettobetrag"
            hint={tx('In Euro, z. B. 2500')}
            placeholder="0"
          />
          <Bound
            form={flow.forms.rechnungen}
            name="mehrwertsteuer"
            hint={tx('Prozentwert, z. B. 19')}
            placeholder="19"
          />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Weitere Angaben')}
        />
      </WizardStep>

      {/* Step 6 — Fälligkeitsdatum & Notizen */}
      <WizardStep
        label={tx('Details')}
        description={tx('Optionales Fälligkeitsdatum und interne Notizen zur Rechnung.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
          <Bound form={flow.forms.rechnungen} name="notizen" rows={4} />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 7 — Prüfen & anlegen */}
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
              {
                key: 'rechnungsdatum',
                label: tx('Rechnungsdatum'),
                value: tx('Heute (wird automatisch gesetzt)'),
              },
            ]}
            whatHappensNext={tx(
              'Rechnungsnummer und Gesamtbetrag vergibt das System automatisch. Das PDF wird anschließend erzeugt.',
            )}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Rechnungsnummer und Gesamtbetrag wurden automatisch vergeben. Das Rechnungs-PDF wird im Hintergrund erzeugt.',
          )}
          next={[
            { label: tx('Weitere Rechnung erstellen'), onClick: flow.reset },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
