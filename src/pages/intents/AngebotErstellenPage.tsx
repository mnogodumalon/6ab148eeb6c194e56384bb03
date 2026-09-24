/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp → 3) Zeitrahmen → 4) Kosten →
 *         5) Berater wählen → 6) Beschreibung → 7) Prüfen & anlegen.
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
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 3,
      kostentyp: 4,
      kostenbetrag: 4,
      berater: 5,
      beschreibung: 6,
    },
    items: {
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label,
        stats: [{ label: tx('Nr.'), value: String(r.fields.projektnummer ?? '—') }],
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
        description: tx('Neues Angebot zu einem bestehenden Projekt anlegen.'),
        needs: [tx('Projektkennung'), tx('Kostenrahmen'), tx('Zuständiger Berater')],
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Zu welchem Projekt gehört dieses Angebot?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Schritt 2: Angebotstyp */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Welche Art von Angebot soll erstellt werden?')}
        needs={['projekt']}
      >
        <Bound form={flow.forms.angebote} name="angebotstyp" />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Zeitrahmen')}
        />
      </WizardStep>

      {/* Schritt 3: Zeitrahmen */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Beginn, optionales Ende und Dauer des Angebots festlegen.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" hint={tx('Optional — leer lassen wenn kein festes Ende')} />
          <Bound form={flow.forms.angebote} name="dauer" hint={tx('z. B. „3 Monate" oder „laufend"')} />
        </div>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Kosten')}
        />
      </WizardStep>

      {/* Schritt 4: Kosten */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp und Betrag für das Angebot angeben.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound form={flow.forms.angebote} name="kostenbetrag" hint={tx('In Euro, z. B. 4500')} />
        </div>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Schritt 5: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['kostentyp', 'kostenbetrag']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 6: Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und Details des Angebots beschreiben.')}
        needs={['berater']}
      >
        <Bound form={flow.forms.angebote} name="beschreibung" rows={5} hint={tx('Leistungsumfang, Konditionen und besondere Hinweise')} />
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 7: Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Angebotsnummer und Jahr werden automatisch vergeben. Das Angebot startet als Entwurf.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Angebot kann jetzt weiterbearbeitet und versendet werden.')}
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
