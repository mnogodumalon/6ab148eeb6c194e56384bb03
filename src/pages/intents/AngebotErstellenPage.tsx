/**
 * Angebot erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Angebotstyp, Beschreibung & Zeitrahmen → 3) Kostentyp & Betrag → 4) Berater auswählen → 5) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (via useAngebotErstellenFlow).
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
      beschreibung: 2,
      angebotsjahr: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 3,
      kostenbetrag: 3,
      berater: 4,
    },
    items: {
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldText(r, 'kunde'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
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
        description: tx('Erstellt ein neues Angebot für ein Projekt mit Zeitrahmen, Kosten und zuständigem Berater.'),
        needs: [tx('Projektkennung'), tx('Name des Beraters'), tx('Kostenbetrag')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Kunde suchen …')}
          avatar="none"
          create={{ fields: ['projektkennung', 'projektart', 'projektstatus'] }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Angebotsdetails')}
        description={tx('Typ, Beschreibung und Zeitrahmen des Angebots festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="angebotstyp" />
          <Bound form={flow.forms.angebote} name="beschreibung" rows={4} />
          <Bound form={flow.forms.angebote} name="angebotsjahr" hint={tx('z. B. 2026')} />
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound form={flow.forms.angebote} name="dauer" hint={tx('z. B. 3 Monate')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp und Betrag für dieses Angebot angeben.')}
        needs={['angebotstyp', 'zeitrahmen_anfang', 'dauer']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound form={flow.forms.angebote} name="kostenbetrag" hint={tx('In Euro, z. B. 5000')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['kostentyp', 'kostenbetrag']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Vor- oder Nachname suchen …')}
          avatar="initials"
          create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
          emptyText={tx('Kein Berater gefunden. Bitte einen neuen Berater anlegen.')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Die Angebotsnummer wird automatisch vergeben. Das Angebot wird als Entwurf gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Angebot kann jetzt bearbeitet, ergänzt und anschließend versendet werden.')}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
