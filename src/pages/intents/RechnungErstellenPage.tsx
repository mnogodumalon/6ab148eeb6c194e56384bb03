/**
 * Rechnung erstellen — 9-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projekt wählen → 3) Beteiligte Berater wählen →
 *        4) Zeiterfassungseinträge wählen → 5) Rechnungs- und Fälligkeitsdatum →
 *        6) Abrechnungsmonat und -jahr → 7) Nettobetrag und Mehrwertsteuer →
 *        8) Notizen → 9) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (useRechnungErstellenFlow — sets rechnungsstatus:'entwurf' itself).
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
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { fieldText, fieldDate, fieldNumber, todayIso } from '@/lib/journey';
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
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldText(r, 'projektart'),
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: tx`${fieldDate(r, 'datum') ?? tx('Kein Datum')} — ${fieldNumber(r, 'stunden') ?? '?'} Std.`,
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
        description: tx('Erstellt eine neue Rechnung für einen Kunden und ein Projekt.'),
        needs: [tx('Kundenname'), tx('Projektzuordnung'), tx('Nettobetrag und Mehrwertsteuer')],
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
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          onSelect={id => {
            const onSel = flow.pick('kunde').onSelect;
            onSel(id);
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welchem Projekt wird diese Rechnung zugeordnet?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung …')}
          avatar="none"
          onSelect={id => {
            const onSel = flow.pick('projekt').onSelect;
            onSel(id);
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Schritt 3 — Berater wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle alle beteiligten Berater aus.')}
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

      {/* Schritt 4 — Zeiterfassungseinträge wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge sollen abgerechnet werden?')}
        needs={['berater']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            avatar="none"
            searchPlaceholder={tx('Datum oder Tätigkeit …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Datumsangaben')}
        />
      </WizardStep>

      {/* Schritt 5 — Rechnungsdatum und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datumsangaben')}
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
          nextStepLabel={tx('Abrechnungszeitraum')}
        />
      </WizardStep>

      {/* Schritt 6 — Abrechnungsmonat und -jahr */}
      <WizardStep
        label={tx('Abrechnungszeitraum')}
        description={tx('Für welchen Monat und welches Jahr wird abgerechnet?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
          <Bound form={flow.forms.rechnungen} name="rechnungsjahr" hint={tx('Vierstellige Jahreszahl, z. B. 2026')} />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Schritt 7 — Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuersatz eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" hint={tx('Prozentwert, z. B. 19')} />
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
        description={tx('Optionale Hinweise zur Rechnung.')}
      >
        <Bound form={flow.forms.rechnungen} name="notizen" rows={4} />
        <StepNav
          onBack={() => setStep(7)}
          onNext={() => flow.validateStep(8)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 9 — Prüfen & anlegen */}
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
            whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden vom System vergeben.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung befindet sich im Status „Entwurf". Stunden dafür können mit „Zeit buchen" erfasst werden.')}
          next={[
            {
              label: tx('Weitere Rechnung erstellen'),
            },
            {
              label: tx('Zeit buchen'),
              href: '#/intents/zeit-buchen',
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
