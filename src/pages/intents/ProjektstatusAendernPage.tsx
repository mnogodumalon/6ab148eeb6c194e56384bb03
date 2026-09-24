/**
 * Projektstatus ändern — 3-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Status wählen & letzten Stand beschreiben → 3) Prüfen & speichern.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde, projektleitung).
 * Writes: projekte — aktualisiert projektstatus und letzter_schritt.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useProjektstatusAendernFlow } from '@/lib/journey/flows/ProjektstatusAendern';
import { tx } from '@/i18n';

export default function ProjektstatusAendernPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektstatusAendernFlow({
    steps: {
      projekte: 1,
      projektstatus: 2,
      letzter_schritt: 3,
    },
    items: {
      projekte: (r) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projektstatus ändern')}
      subtitle={tx('Status und letzten Stand aktuell halten')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändere den Status eines Projekts und halte den letzten Stand fest.'),
        needs: [tx('Projektkennung'), tx('Neuer Status'), tx('Kurze Beschreibung des Stands')],
      }}
    >
      {/* Schritt 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Bitte einen anderen Suchbegriff versuchen.')}
        />
      </WizardStep>

      {/* Schritt 2: Neuen Status wählen */}
      <WizardStep
        label={tx('Status')}
        description={tx('Wähle den neuen Projektstatus.')}
        needs={['projekte']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektstatus" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Letzter Stand')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Letzten Stand / aktuellen Stand beschreiben */}
      <WizardStep
        label={tx('Letzter Stand')}
        description={tx('Was ist der aktuelle Stand oder der letzte erledigte Schritt?')}
        needs={['projektstatus']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.projekte}
            name="letzter_schritt"
            rows={4}
            hint={tx('Kurze Beschreibung des aktuellen Stands oder des letzten Schritts.')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Prüfen & speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Projektstatus und der letzte Stand werden sofort aktualisiert.')}
            confirmLabel={tx('Status speichern')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          verb="updated"
          actions={{ copy: false, print: false }}
          whatHappensNext={tx('Der neue Status ist sofort in der Projektübersicht sichtbar.')}
          next={[
            { label: tx('Weiteres Projekt aktualisieren'), onClick: flow.reset },
            { label: tx('Stunden buchen'), href: '#/intents/zeit-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
