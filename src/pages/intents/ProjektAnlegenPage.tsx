/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Projektart auswählen → 2) Startjahr und Startmonat → 3) Kunde auswählen → 4) Ansprechpartner & Projektleitung → 5) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektkennung und projektnummer werden automatisch vergeben.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
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
      projektstart_jahr: 2,
      projektstart_monat: 2,
      kunde: 3,
      ansprechpartner_kunde: 4,
      projektleitung: 4,
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
        subtitle: fieldLookup(r, 'status')?.label,
      }),
    },
    messages: {
      kunde: tx('Bitte einen Kunden für dieses Projekt auswählen.'),
      projektleitung: tx('Bitte eine Projektleitung (Berater) auswählen.'),
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
        description: tx('Neues Projekt anlegen und mit Kunde sowie Projektleitung verknüpfen.'),
        needs: [tx('Projektart'), tx('Startjahr'), tx('Kundenname')],
      }}
    >
      {/* Schritt 1: Projektart */}
      <WizardStep
        label={tx('Projektart')}
        description={tx('Um welche Art von Projekt handelt es sich?')}
      >
        <Bound form={flow.forms.projekte} name="projektart" />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Startjahr')}
        />
      </WizardStep>

      {/* Schritt 2: Startjahr und Startmonat */}
      <WizardStep
        label={tx('Zeitplan')}
        description={tx('Wann startet das Projekt?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektstart_jahr" hint={tx('z. B. 2026')} />
          <Bound form={flow.forms.projekte} name="projektstart_monat" allowClear />
        </div>
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Kunde')}
        />
      </WizardStep>

      {/* Schritt 3: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt durchgeführt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Kundenname suchen …')}
          avatar="none"
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
          emptyText={tx('Noch kein Kunde angelegt — über „Kunden anlegen" einen Kunden erstellen.')}
        />
      </WizardStep>

      {/* Schritt 4: Ansprechpartner und Projektleitung */}
      <WizardStep
        label={tx('Projektteam')}
        description={tx('Ansprechpartner beim Kunden und Projektleitung (Berater) festlegen.')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Bound
            form={flow.forms.projekte}
            name="ansprechpartner_kunde"
            hint={tx('Name der Ansprechperson beim Kunden')}
          />
          <EntitySelectStep
            {...flow.picks.projektleitung.select}
            {...flow.pick('projektleitung')}
            searchPlaceholder={tx('Berater suchen …')}
            avatar="initials"
            create={false}
            emptyText={tx('Kein aktiver Berater gefunden — bitte zuerst einen Berater anlegen.')}
          />
        </div>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 5: Zusammenfassung und Anlegen */}
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
            whatHappensNext={tx('Projektnummer und Projektkennung werden automatisch vom System vergeben.')}
            confirmLabel={tx('Projekt anlegen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Projektnummer und Projektkennung wurden automatisch vergeben.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
