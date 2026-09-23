/**
 * Angebot erstellen — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Typ, Zeitrahmen & Kosten → 3) Berater auswählen → 4) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde), berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsstatus fixed 'entwurf', angebotsjahr computed.
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
      angebotstyp: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 2,
      kostenbetrag: 2,
      berater: 3,
      beschreibung: 4,
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
        description: tx('Neues Angebot zu einem Projekt anlegen und direkt einem Berater zuordnen.'),
        needs: [tx('Projektkürzel'), tx('Angebotstyp und Zeitrahmen'), tx('Kostenbetrag')],
      }}
    >
      {/* Schritt 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung eingeben …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Schritt 2: Angebotstyp, Zeitrahmen & Kosten */}
      <WizardStep
        label={tx('Details')}
        description={tx('Typ, Zeitrahmen und Kostenrahmen des Angebots festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="angebotstyp" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound form={flow.forms.angebote} name="dauer" hint={tx('z. B. „3 Monate" oder „12 Wochen"')} />
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound form={flow.forms.angebote} name="kostenbetrag" hint={tx('Betrag in Euro')} />
        </div>
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Schritt 3: Berater auswählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist verantwortlich für dieses Angebot?')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
          create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
          emptyText={tx('Keine aktiven Berater gefunden.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Beschreibung')}
        />
      </WizardStep>

      {/* Schritt 4: Beschreibung ergänzen + Prüfen */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Optionale Beschreibung des Leistungsumfangs ergänzen.')}
        needs={['berater']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="beschreibung" rows={4} hint={tx('Leistungsumfang, Besonderheiten …')} />
        </div>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 5: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Die Angebotsnummer wird automatisch vergeben. Anschließend kann ein PDF erstellt werden.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Über die Werkzeuge kann jetzt ein PDF aus dem Angebot erzeugt werden.')}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Rechnung anlegen'), href: '#/intents/rechnung-anlegen' },
            { label: tx('Zeit erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
