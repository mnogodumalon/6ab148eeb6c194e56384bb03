/**
 * Projekt anlegen — 5-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart & Startdaten & Kennung eingeben →
 *        3) Projektleitung (Berater) auswählen → 4) Ansprechpartner & letzten Stand →
 *        5) Prüfen & anlegen.
 * Reads: kunden (kundenname, email), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — setzt projektstatus='akquise' automatisch.
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
      projektstart_monat: 2,
      projektstart_jahr: 2,
      projektkennung: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
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
        description: tx('Neues Projekt mit Kunde, Projektleitung und Anfangsstatus anlegen.'),
        needs: [tx('Name des Kunden'), tx('Projektkennung'), tx('Name der Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird dieses Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projektart, Startdaten und Kennung eingeben */}
      <WizardStep
        label={tx('Projektdetails')}
        description={tx('Projektart, Startzeitraum und interne Kennung festlegen.')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektkennung" hint={tx('Z. B. PROJ-2026-001')} />
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" hint={tx('Z. B. 2026')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Projektleitung auswählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Welcher Berater leitet dieses Projekt?')}
        needs={['projektkennung', 'projektart']}
      >
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          searchPlaceholder={tx('Vor- oder Nachname …')}
          avatar="initials"
          create={false}
          emptyText={tx('Noch kein Berater angelegt — bitte zuerst einen Berater im System erfassen.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Ansprechpartner')}
        />
      </WizardStep>

      {/* Schritt 4: Ansprechpartner und letzter Stand */}
      <WizardStep
        label={tx('Ansprechpartner & Stand')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Stand eintragen.')}
        needs={['projektleitung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" hint={tx('Name der Kontaktperson beim Kunden')} />
          <Bound form={flow.forms.projekte} name="letzter_schritt" rows={4} hint={tx('Was wurde bisher besprochen oder vereinbart?')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Zusammenfassung & Bestätigen */}
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
            whatHappensNext={tx('Das Projekt wird mit dem Status „Akquise" angelegt und erscheint sofort in der Projektübersicht.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Jetzt ein Angebot erstellen oder Stunden auf dieses Projekt buchen.')}
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
