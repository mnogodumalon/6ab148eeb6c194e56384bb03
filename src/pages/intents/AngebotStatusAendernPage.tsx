/**
 * Angebotsstatus ändern — 4-Schritt-Wizard.
 * Steps: 1) Angebot auswählen → 2) Neuen Angebotsstatus wählen →
 *        3) Optional: Projektstatus des verknüpften Projekts anpassen → 4) Prüfen & bestätigen.
 * Reads: angebote (angebotsnummer, angebotsstatus, angebotstyp, projekt, kostenbetrag), projekte.
 * Writes: angebote (angebotsstatus update), projekte (projektstatus update, optional).
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
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useAngebotStatusAendernFlow } from '@/lib/journey/flows/AngebotStatusAendern';
import { tx } from '@/i18n';

export default function AngebotStatusAendernPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotStatusAendernFlow({
    steps: {
      angebote: 1,
      angebotsstatus: 2,
      projekte: 3,
      projektstatus: 3,
    },
    items: {
      angebote: r => ({
        id: r.id,
        title: fieldText(r, 'angebotsnummer')
          ? tx`Angebot Nr. ${fieldNumber(r, 'angebotsnummer') ?? ''}`
          : tx('Angebot ohne Nummer'),
        subtitle: fieldLookup(r, 'angebotstyp')?.label,
        status: fieldLookup(r, 'angebotsstatus') ?? undefined,
        stats: fieldNumber(r, 'kostenbetrag') != null
          ? [{ label: tx('Betrag'), value: `${fieldNumber(r, 'kostenbetrag')?.toLocaleString('de-DE') ?? '—'} €` }]
          : [],
      }),
      projekte: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung') || tx('Unbenanntes Projekt'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
    },
  });

  // Whether the user has picked a project to update (optional step)
  const projektPicked = Boolean(flow.forms.projekte.get('projekte'));

  return (
    <IntentWizardShell
      title={tx('Angebotsstatus ändern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändere den Status eines bestehenden Angebots und passe optional den Projektstatus an.'),
        needs: [tx('Angebotsnummer oder Angebotstyp'), tx('Neuer Status')],
      }}
    >
      {/* Step 1 — Angebot auswählen */}
      <WizardStep
        label={tx('Angebot')}
        description={tx('Wähle das Angebot, dessen Status du ändern möchtest.')}
      >
        <EntitySelectStep
          {...flow.picks.angebote.select}
          {...flow.pick('angebote')}
          searchPlaceholder={tx('Angebotsnummer oder Typ …')}
          avatar="none"
          create={false}
          emptyText={tx('Keine Angebote vorhanden. Erstelle zunächst ein Angebot.')}
        />
      </WizardStep>

      {/* Step 2 — Neuen Angebotsstatus wählen */}
      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den neuen Status für dieses Angebot.')}
        needs={['angebote']}
      >
        <Bound
          form={flow.forms.angebote}
          name="angebotsstatus"
          hint={tx('Entwurf → Versendet → Angenommen oder Abgelehnt')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Projektstatus')}
        />
      </WizardStep>

      {/* Step 3 — Projektstatus anpassen (optional) */}
      <WizardStep
        label={tx('Projektstatus')}
        description={tx('Möchtest du auch den Status des verknüpften Projekts aktualisieren? Dieser Schritt ist optional.')}
        needs={['angebotsstatus']}
      >
        <div className="space-y-6">
          {/* Pick a project to update — optional */}
          <EntitySelectStep
            {...flow.picks.projekte.select}
            {...flow.pick('projekte')}
            searchPlaceholder={tx('Projekt suchen …')}
            avatar="none"
            create={false}
            emptyText={tx('Keine Projekte vorhanden.')}
          />

          {/* Once a project is picked, show the status choice */}
          {projektPicked && (
            <Bound
              form={flow.forms.projekte}
              name="projektstatus"
              hint={tx('Aktueller Status des verknüpften Projekts')}
            />
          )}
        </div>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 4 — Prüfen & bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Angebotsstatus wird sofort aktualisiert.')}
            confirmLabel={tx('Status aktualisieren')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          whatHappensNext={tx('Der neue Status ist ab sofort im Angebot sichtbar.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
