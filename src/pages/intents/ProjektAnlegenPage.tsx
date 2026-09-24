/**
 * Projekt anlegen — 7-Schritt-Wizard.
 * Steps: 1) Projektart wählen → 2) Startmonat & Startjahr → 3) Kunden auswählen
 *        → 4) Ansprechpartner beim Kunden → 5) Projektleitung auswählen
 *        → 6) Letzter Schritt notieren → 7) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektstatus fixed to 'akquise'.
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
      projektstart_monat: 2,
      projektstart_jahr: 2,
      kunde: 3,
      ansprechpartner_kunde: 4,
      projektleitung: 5,
      letzter_schritt: 6,
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
        description: tx('Neues Projekt anlegen, Kunden zuordnen und Projektleitung festlegen.'),
        needs: [tx('Name des Kunden'), tx('Projektart'), tx('Projektleitung (Berater)')],
      }}
    >
      {/* Schritt 1: Projektart wählen */}
      <WizardStep
        label={tx('Projektart')}
        description={tx('Um welche Art von Projekt handelt es sich?')}
      >
        <Bound form={flow.forms.projekte} name="projektart" />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Startdatum')}
        />
      </WizardStep>

      {/* Schritt 2: Startmonat und Startjahr */}
      <WizardStep
        label={tx('Startdatum')}
        description={tx('Wann beginnt das Projekt voraussichtlich?')}
      >
        <Bound form={flow.forms.projekte} name="projektstart_monat" />
        <Bound
          form={flow.forms.projekte}
          name="projektstart_jahr"
          hint={tx('z. B. 2026')}
        />
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
          searchPlaceholder={tx('Name oder Firmenname …')}
          avatar="none"
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
        />
      </WizardStep>

      {/* Schritt 4: Ansprechpartner beim Kunden */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Wer ist der Ansprechpartner beim Kunden für dieses Projekt?')}
        needs={['kunde']}
      >
        <Bound
          form={flow.forms.projekte}
          name="ansprechpartner_kunde"
          hint={tx('Name der Person, die beim Kunden als Kontakt dient')}
        />
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Projektleitung')}
        />
      </WizardStep>

      {/* Schritt 5: Projektleitung (Berater) auswählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Welcher Berater übernimmt die Projektleitung?')}
      >
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          searchPlaceholder={tx('Vor- oder Nachname …')}
          avatar="initials"
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden. Bitte zuerst einen Berater anlegen.')}
        />
      </WizardStep>

      {/* Schritt 6: Letzter Schritt / aktueller Stand */}
      <WizardStep
        label={tx('Aktueller Stand')}
        description={tx('Optional: Was ist der aktuelle Stand oder der nächste Schritt?')}
      >
        <Bound
          form={flow.forms.projekte}
          name="letzter_schritt"
          rows={4}
          hint={tx('Freitext — kann später jederzeit ergänzt werden')}
        />
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 7: Zusammenfassung & Bestätigen */}
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
              'Projektkennung und Projektnummer werden automatisch durch ein Werkzeug vergeben.'
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
            'Das Projekt befindet sich im Status „Akquise". Erstelle als nächstes ein Angebot oder buche erste Zeiten.'
          )}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zeit buchen'), href: '#/intents/zeit-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
