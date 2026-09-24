/**
 * Projektstatus aktualisieren — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Projektstatus setzen → 3) Letzten Stand eingeben → 4) Prüfen & speichern.
 * Reads: projekte (projektkennung, projektnummer, projektstatus, kunde, projektleitung).
 * Writes: projekte (projektstatus, letzter_schritt) — updates the picked record.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useProjektstatusAktualisierenFlow } from '@/lib/journey/flows/ProjektstatusAktualisieren';
import { tx } from '@/i18n';

export default function ProjektstatusAktualisierenPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektstatusAktualisierenFlow({
    steps: {
      projekte: 1,
      projektstatus: 2,
      letzter_schritt: 3,
    },
    items: {
      projekte: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldNumber(r, 'projektnummer') != null
          ? tx`Nr. ${String(fieldNumber(r, 'projektnummer'))}`
          : undefined,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projektstatus aktualisieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändert den Status eines Projekts und hält den letzten Stand fest.'),
        needs: [tx('Projektkennung oder Projektnummer'), tx('Neuer Status'), tx('Beschreibung des aktuellen Stands')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den aktuellen Projektstatus aus.')}
        needs={['projekte']}
      >
        <Bound form={flow.forms.projekte} name="projektstatus" />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Letzter Stand')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Letzter Stand')}
        description={tx('Beschreibe kurz den letzten Schritt oder den aktuellen Stand des Projekts.')}
        needs={['projekte']}
      >
        <Bound
          form={flow.forms.projekte}
          name="letzter_schritt"
          rows={5}
          hint={tx('Was wurde zuletzt gemacht? Was ist der aktuelle Stand?')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')} needs={['projekte']}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Projektstatus und der letzte Stand werden sofort aktualisiert.')}
            confirmLabel={tx('Speichern')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Der Projektstatus ist jetzt aktuell. Du kannst weitere Projekte aktualisieren oder ein Angebot erstellen.')}
          next={[
            { label: tx('Weiteres Projekt aktualisieren'), onClick: flow.reset },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          actions={{ copy: false, print: false }}
        />
      )}
    </IntentWizardShell>
  );
}
