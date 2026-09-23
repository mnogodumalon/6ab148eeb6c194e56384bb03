/**
 * Projektstatus ändern — 3-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Neuen Status + Stand beschreiben → 3) Prüfen & aktualisieren.
 * Reads: projekte (projektkennung, projektstatus — alle Records via useDashboardData).
 * Writes: projekte (projektstatus, letzter_schritt).
 * Composes: IntentWizardShell, EntitySelectStep (items from dashboard), Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useProjektstatusAendernFlow } from '@/lib/journey/flows/ProjektstatusAendern';
import { useDashboardData } from '@/hooks/useDashboardData';
import { tx } from '@/i18n';

export default function ProjektstatusAendernPage() {
  const [step, setStep] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = useDashboardData({ omit: [] });

  const flow = useProjektstatusAendernFlow({
    steps: { projektstatus: 2, letzter_schritt: 2 },
    messages: {
      projektstatus: tx('Bitte einen neuen Status für das Projekt wählen.'),
    },
  });

  const projektItems = (data.projekte ?? []).map(p => ({
    id: p.record_id,
    title: p.fields.projektkennung ?? p.record_id,
    subtitle: (p.fields.projektstatus as { label?: string } | null)?.label ?? undefined,
  }));

  const selectedProjekt = selectedId
    ? (data.projekte ?? []).find(p => p.record_id === selectedId)
    : null;

  return (
    <IntentWizardShell
      title={tx('Projektstatus ändern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändere den Status eines Projekts und halte den aktuellen Stand fest.'),
        needs: [tx('Projektkennung'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll aktualisiert werden?')}
      >
        <EntitySelectStep
          items={projektItems}
          loading={data.loading}
          error={data.error?.message ?? null}
          selectedId={selectedId}
          onSelect={id => {
            setSelectedId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Status & Stand')}
        description={tx('Neuen Status wählen und den aktuellen Projektstand festhalten.')}
      >
        {selectedId ? (
          <div className="space-y-6">
            {selectedProjekt && (
              <p className="text-sm text-muted-foreground">
                {tx('Projekt:')} <span className="font-medium text-foreground">{selectedProjekt.fields.projektkennung as string}</span>
              </p>
            )}
            <Bound form={flow.forms.projekte} name="projektstatus" />
            <Bound
              form={flow.forms.projekte}
              name="letzter_schritt"
              rows={4}
              hint={tx('Was wurde zuletzt gemacht? Was ist der nächste Schritt?')}
            />
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Bitte zuerst ein Projekt auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={
              selectedProjekt
                ? [
                    {
                      key: '_projekt',
                      label: tx('Projekt'),
                      value: selectedProjekt.fields.projektkennung as string,
                      step: 1,
                    },
                  ]
                : []
            }
            whatHappensNext={tx('Der neue Status ist sofort in der Projektübersicht sichtbar.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          verb="updated"
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weiteren Status ändern'), onClick: () => { flow.reset(); setSelectedId(null); setStep(1); } },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Der aktualisierte Stand ist für das gesamte Team sichtbar.')}
        />
      )}
    </IntentWizardShell>
  );
}
