/**
 * Angebot anlegen — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Berater auswählen → 3) Angebotstyp, Zeitrahmen und Kosten →
 *        4) Beschreibung und Leistungsumfang → 5) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde), berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsstatus fixed to 'entwurf'.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useAngebotAnlegenFlow } from '@/lib/journey/flows/AngebotAnlegen';
import { fieldText, fieldLookup } from '@/lib/journey';
import { tx } from '@/i18n';

export default function AngebotAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotAnlegenFlow({
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 3,
      kostentyp: 3,
      kostenbetrag: 3,
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
  });

  return (
    <IntentWizardShell
      title={tx('Angebot anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstellt ein neues Angebot und verknüpft es mit einem Projekt.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          create={false}
          emptyText={tx('Kein Projekt gefunden. Bitte zuerst ein Projekt anlegen.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
          emptyText={tx('Kein aktiver Berater gefunden.')}
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Kosten & Zeitrahmen')}
        description={tx('Angebotstyp, Laufzeit und Kostenrahmen festlegen.')}
        needs={['berater']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="angebotstyp" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound form={flow.forms.angebote} name="dauer" hint={tx('z. B. 3 Monate oder 120 Stunden')} />
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound form={flow.forms.angebote} name="kostenbetrag" hint={tx('In Euro, z. B. 12000')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Was umfasst das Angebot? Beschreibe den Leistungsumfang.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="beschreibung" rows={6} hint={tx('Leistungen, Umfang und besondere Konditionen')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'angebotsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Angebotsnummer und Angebotsjahr werden automatisch vom System vergeben.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Angebot startet im Status Entwurf. Du kannst es anschließend versenden oder den Status aktualisieren.')}
          next={[
            { label: tx('Weiteres Angebot anlegen') },
            { label: tx('Angebotsstatus aktualisieren'), href: '#/intents/angebotsstatus-aendern' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
