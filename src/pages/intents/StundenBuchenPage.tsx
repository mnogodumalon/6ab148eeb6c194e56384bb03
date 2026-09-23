/**
 * Stunden buchen — 6-Schritt-Wizard.
 * Steps: 1) Berater:in auswählen → 2) Projekt auswählen → 3) Leistung auswählen
 *        → 4) Datum & Stunden → 5) Abrechnungsdetails → 6) Prüfen & speichern.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (via useStundenBuchenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, todayIso } from '@/lib/journey';
import { useStundenBuchenFlow } from '@/lib/journey/flows/StundenBuchen';
import { tx } from '@/i18n';

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useStundenBuchenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 4,
      erfassungsmonat: 5,
      erfassungsjahr: 5,
      abrechenbar: 5,
    },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
      }),
    },
    initial: {
      datum: todayIso(),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Geleistete Stunden auf ein Projekt und eine Leistung buchen.'),
        needs: [tx('Name der Berater:in'), tx('Projektkennung'), tx('Erbrachte Leistung')],
      }}
    >
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Wer hat die Stunden erbracht?')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Vor- oder Nachname …')}
          onSelect={id => { flow.pick('berater').onSelect(id); setStep(2); }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung …')}
          onSelect={id => { flow.pick('projekt').onSelect(id); setStep(3); }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname …')}
          onSelect={id => { flow.pick('leistung').onSelect(id); setStep(4); }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('Datum, Anzahl Stunden und Tätigkeitsbeschreibung eingeben.')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('Dezimalzahl, z. B. 1.5 für 1 Stunde 30 Minuten')} />
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={4} hint={tx('Kurze Beschreibung der erbrachten Tätigkeit')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Abrechnung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Abrechnung')}
        description={tx('Abrechnungsmonat und -jahr sowie Abrechenbar-Flag setzen.')}
        needs={['datum']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="erfassungsmonat" />
          <Bound form={flow.forms.zeiterfassung} name="erfassungsjahr" hint={tx('z. B. 2026')} />
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert und steht für die Abrechnung zur Verfügung.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Der Eintrag erscheint in der Zeiterfassung und kann für Rechnungen verwendet werden.')}
          next={[
            { label: tx('Weitere Stunden buchen'), onClick: flow.reset },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
