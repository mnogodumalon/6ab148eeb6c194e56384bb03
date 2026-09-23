/**
 * Projekt anlegen — 5-Schritt-Wizard.
 * Steps: 1) Projektart + Startmonat + Startjahr → 2) Kunden wählen →
 *        3) Ansprechpartner beim Kunden eingeben → 4) Projektleitung (Berater) wählen →
 *        5) Projektstatus (Standard: Akquise) setzen → Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry); projektstatus fixed = 'akquise'.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav,
 *           SummaryStep, SuccessStep.
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
      projektart: 1,
      projektstart_monat: 1,
      projektstart_jahr: 1,
      kunde: 2,
      ansprechpartner_kunde: 3,
      projektleitung: 4,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldLookup(r, 'kundentyp')?.label ?? '',
      }),
      projektleitung: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  const REVIEW_STEP = 6;

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neues Projekt anlegen, Kunden zuordnen und Projektleitung bestimmen.'),
        needs: [tx('Projektart'), tx('Kundenname'), tx('Projektleitung')],
      }}
    >
      {/* Step 1 — Projektart + Startmonat + Startjahr */}
      <WizardStep
        label={tx('Projektart')}
        description={tx('Welche Art von Projekt soll angelegt werden?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" allowClear />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Kunden wählen')}
          />
        </div>
      </WizardStep>

      {/* Step 2 — Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          avatar="none"
          searchPlaceholder={tx('Kundenname suchen …')}
          columns={2}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Ansprechpartner')}
        />
      </WizardStep>

      {/* Step 3 — Ansprechpartner beim Kunden */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Wer ist der Ansprechpartner beim Kunden für dieses Projekt?')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.projekte}
            name="ansprechpartner_kunde"
            placeholder={tx('Vor- und Nachname')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Projektleitung (Berater) wählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Welche Beraterin oder welcher Berater leitet das Projekt?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden. Bitte lege zuerst einen Berater an.')}
        />
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Status')}
        />
      </WizardStep>

      {/* Step 5 — Projektstatus (Standard: Akquise) */}
      <WizardStep
        label={tx('Status')}
        description={tx('Mit welchem Status soll das Projekt starten?')}
        needs={['kunde', 'projektleitung']}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tx('Der Status wird auf „Akquise" gesetzt — du kannst ihn jederzeit über den Ablauf „Projektstatus ändern" anpassen.')}
          </p>
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Prüfen & Anlegen */}
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
            whatHappensNext={tx('Projektkennung und Projektnummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Projektkennung und Projektnummer wurden automatisch vergeben.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
