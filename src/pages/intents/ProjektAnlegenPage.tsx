/**
 * Projekt anlegen — 6-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projektart wählen → 3) Projektstart (Jahr, Monat) →
 *        4) Ansprechpartner und Projektleitung → 5) Letzter Schritt → 6) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry). projektstatus ist fix „akquise".
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useProjektAnlegenFlow } from '@/lib/journey/flows/ProjektAnlegen';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektAnlegenFlow({
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_jahr: 3,
      projektstart_monat: 3,
      ansprechpartner_kunde: 4,
      projektleitung: 4,
      letzter_schritt: 5,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldLookup(r, 'kundentyp')?.label,
      }),
      projektleitung: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neues Projekt anlegen, Kunden zuordnen und Projektleitung bestimmen.'),
        needs: [tx('Name des Kunden'), tx('Projektart'), tx('Projektleitung (Berater)')],
      }}
    >
      {/* Step 1 — Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          avatar="none"
          searchPlaceholder={tx('Kundenname suchen …')}
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
        />
      </WizardStep>

      {/* Step 2 — Projektart wählen */}
      <WizardStep
        label={tx('Projektart')}
        description={tx('Um welche Art von Projekt handelt es sich?')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektart" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Projektstart')}
          />
        </div>
      </WizardStep>

      {/* Step 3 — Projektstart */}
      <WizardStep
        label={tx('Projektstart')}
        description={tx('In welchem Jahr und Monat startet das Projekt?')}
        needs={['projektart']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.projekte}
            name="projektstart_jahr"
            hint={tx('Z. B. 2026')}
          />
          <Bound form={flow.forms.projekte} name="projektstart_monat" allowClear />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Ansprechpartner und Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Ansprechpartner und Projektleitung */}
      <WizardStep
        label={tx('Ansprechpartner und Projektleitung')}
        description={tx('Ansprechpartner beim Kunden und zuständigen Berater festlegen.')}
        needs={['projektstart_jahr']}
      >
        <div className="space-y-6">
          <Bound
            form={flow.forms.projekte}
            name="ansprechpartner_kunde"
            hint={tx('Name der Kontaktperson beim Kunden')}
          />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              {tx('Projektleitung (Berater)')}
            </p>
            <EntitySelectStep
              {...flow.picks.projektleitung.select}
              {...flow.pick('projektleitung')}
              avatar="initials"
              searchPlaceholder={tx('Berater suchen …')}
              create={false}
            />
          </div>
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Aktueller Stand')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Letzter Schritt / aktueller Stand (optional) */}
      <WizardStep
        label={tx('Aktueller Stand')}
        description={tx('Optional: Stand der Akquise oder erste Schritte notieren.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.projekte}
            name="letzter_schritt"
            rows={4}
            hint={tx('Kann jederzeit ergänzt werden.')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Zusammenfassung und Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'projektstatus',
                label: tx('Projektstatus'),
                value: tx('Akquise'),
              },
            ]}
            whatHappensNext={tx(
              'Projektnummer und Projektkennung werden automatisch vom System vergeben.'
            )}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Das Projekt ist angelegt. Als nächstes kannst du ein Angebot erstellen oder Zeit erfassen.'
          )}
          next={[
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            {
              label: tx('Zeit erfassen'),
              href: '#/intents/zeit-erfassen',
            },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
