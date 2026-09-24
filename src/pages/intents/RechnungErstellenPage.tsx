/**
 * Rechnung erstellen — 8-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projekt auswählen → 3) Zeiterfassungseinträge auswählen
 *        → 4) Berater auswählen → 5) Beträge eingeben → 6) Abrechnungszeitraum & Fälligkeit
 *        → 7) Notizen → 8) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (via useRechnungErstellenFlow).
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
      zeiterfassungseintraege: 3,
      berater: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      gesamtbetrag: 5,
      rechnungsmonat: 6,
      rechnungsjahr: 6,
      faelligkeitsdatum: 6,
      notizen: 7,
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
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: (() => {
          const dat = fieldDate(r, 'datum') ?? '';
          const std = fieldNumber(r, 'stunden');
          return tx`${dat} — ${std != null ? std : '?'} Std.`;
        })(),
        subtitle: ctx.ref('berater'),
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
    initial: {},
  });

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstelle eine Rechnung auf Basis von Zeiterfassungseinträgen, Projekt und Kunde.'),
        needs: [tx('Kundendaten'), tx('Projektzuordnung'), tx('Zeiterfassungseinträge'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Step 1: Kunde */}
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

      {/* Step 2: Projekt */}
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
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
        />
      </WizardStep>

      {/* Step 3: Zeiterfassungseinträge */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle die abzurechnenden Zeiterfassungseinträge aus.')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            searchPlaceholder={tx('Datum oder Stunden …')}
            avatar="none"
            emptyText={tx('Keine Zeiterfassungseinträge gefunden. Buche zuerst Zeit für dieses Projekt.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Step 4: Berater */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Projekt beteiligt?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            searchPlaceholder={tx('Name …')}
            avatar="initials"
            emptyText={tx('Keine Berater gefunden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Step 5: Beträge */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag, Mehrwertsteuer und Gesamtbetrag eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" hint={tx('In Prozent, z. B. 19')} />
          <Bound form={flow.forms.rechnungen} name="gesamtbetrag" hint={tx('Nettobetrag + Mehrwertsteuer')} />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Zeitraum')}
        />
      </WizardStep>

      {/* Step 6: Abrechnungszeitraum & Fälligkeit */}
      <WizardStep
        label={tx('Zeitraum')}
        description={tx('Abrechnungsmonat, -jahr und Fälligkeitsdatum festlegen.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
          <Bound form={flow.forms.rechnungen} name="rechnungsjahr" hint={tx('z. B. 2026')} />
          <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Step 7: Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Anmerkungen zur Rechnung.')}
      >
        <Bound form={flow.forms.rechnungen} name="notizen" rows={4} />
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 8: Prüfen & Bestätigen */}
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
                value: todayIso(),
              },
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Datum werden automatisch vergeben.')}
          />
        )}
      </WizardStep>

      {/* Erfolg */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung kann jetzt geprüft und versendet werden.')}
          next={[
            { label: tx('Weitere Rechnung erstellen') },
            { label: tx('Zeit buchen'), href: '#/intents/zeit-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
