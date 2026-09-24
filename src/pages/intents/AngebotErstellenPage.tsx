/**
 * Angebot erstellen — 8-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Berater auswählen → 3) Angebotstyp wählen →
 *        4) Zeitrahmen eingeben → 5) Dauer eingeben → 6) Kosten eingeben →
 *        7) Leistungsbeschreibung → 8) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde),
 *        berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — status 'entwurf', angebotsjahr computed.
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
import { useAngebotErstellenFlow } from '@/lib/journey/flows/AngebotErstellen';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotErstellenFlow({
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 4,
      zeitrahmen_ende: 4,
      dauer: 5,
      kostentyp: 6,
      kostenbetrag: 6,
      beschreibung: 7,
    },
    items: {
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
    compute: {
      angebotsjahr: () => new Date().getFullYear(),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem bestehenden Projekt.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater')],
      }}
    >
      {/* Schritt 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Zu welchem Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          create={false}
          emptyText={tx('Kein Projekt gefunden. Zuerst ein Projekt anlegen.')}
        />
      </WizardStep>

      {/* Schritt 2: Berater auswählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name des Beraters suchen …')}
          avatar="initials"
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden.')}
        />
      </WizardStep>

      {/* Schritt 3: Angebotstyp wählen */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Um welche Art von Angebot handelt es sich?')}
        needs={['berater']}
      >
        <Bound form={flow.forms.angebote} name="angebotstyp" />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeitrahmen')}
        />
      </WizardStep>

      {/* Schritt 4: Zeitrahmen eingeben */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Beginn und optionales Ende des Angebotszeitraums angeben.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" allowClear />
        </div>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Dauer')}
        />
      </WizardStep>

      {/* Schritt 5: Dauer eingeben */}
      <WizardStep
        label={tx('Dauer')}
        description={tx('Wie lange dauert das Angebot? (z. B. „3 Monate", „unbefristet")')}
        needs={['zeitrahmen_anfang']}
      >
        <Bound
          form={flow.forms.angebote}
          name="dauer"
          hint={tx('Freitext, z. B. „6 Monate" oder „unbefristet"')}
        />
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Kosten')}
        />
      </WizardStep>

      {/* Schritt 6: Kosten eingeben */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Welche Kosten und welchen Abrechnungstyp hat das Angebot?')}
        needs={['dauer']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" allowClear />
          <Bound
            form={flow.forms.angebote}
            name="kostenbetrag"
            hint={tx('Betrag in Euro')}
          />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Leistungsbeschreibung')}
        />
      </WizardStep>

      {/* Schritt 7: Leistungsbeschreibung eingeben */}
      <WizardStep
        label={tx('Leistungsbeschreibung')}
        description={tx('Was wird im Rahmen dieses Angebots geleistet?')}
        needs={['kostenbetrag']}
      >
        <Bound
          form={flow.forms.angebote}
          name="beschreibung"
          rows={5}
          hint={tx('Kurze Beschreibung des Leistungsumfangs')}
        />
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 8: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Angebotsnummer und Jahr vergibt das System automatisch. Das Angebot startet als Entwurf.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Den Status des Angebots kannst du jederzeit über „Angebotsstatus ändern" anpassen.')}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Angebotsstatus ändern'), href: '#/intents/angebot-status-aendern' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
