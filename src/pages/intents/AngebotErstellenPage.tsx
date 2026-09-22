/**
 * Angebot erstellen — 6-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp & Zeitrahmen → 3) Kosten → 4) Berater wählen → 5) Beschreibung → 6) Prüfen & anlegen.
 * Reads: projekte (gefiltert: in_bearbeitung|akquise), berater. Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, StepNav, SummaryStep, SuccessStep, Bound, Field.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldLookup,
  fieldText,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  // Projekte: nur aktive (in_bearbeitung oder akquise)
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'in_bearbeitung' || key === 'akquise';
    },
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Alle Berater
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  // Formular für angebote
  const angebot = useStepForm('angebote', {
    steps: {
      projekt: 1,
      angebotstyp: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 3,
      kostenbetrag: 3,
      berater: 4,
      beschreibung: 5,
    },
    required: {
      zeitrahmen_ende: false,
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'angebot',
      entity: 'angebote',
      form: angebot,
      primary: true,
      values: {
        angebotsstatus: 'entwurf',
        angebotsjahr: new Date().getFullYear(),
      },
    },
  ], { draftKey: 'angebot-erstellen' });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem aktiven Projekt.'),
        needs: [tx('Projektkennung'), tx('Angebotstyp'), tx('Kostenbetrag')],
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das das Angebot erstellt wird.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={angebot.get('projekt') as string}
          emptyText={tx('Keine aktiven Projekte gefunden. Nur Projekte mit Status „In Bearbeitung" oder „Akquise" können angeboten werden.')}
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2: Angebotstyp & Zeitrahmen */}
      <WizardStep
        label={tx('Typ & Zeitrahmen')}
        description={tx('Wähle den Angebotstyp und gib den Zeitrahmen an.')}
        needs={['projekt']}
      >
        <div className="space-y-6">
          <Field form={angebot} name="angebotstyp">
            <ChoiceGroup {...angebot.choice('angebotstyp')} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={angebot} name="zeitrahmen_anfang" />
            <Bound form={angebot} name="zeitrahmen_ende" />
          </div>
          <Bound form={angebot} name="dauer" hint={tx('z. B. „6 Monate" oder „unbefristet"')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['angebotstyp', 'zeitrahmen_anfang', 'dauer'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Kosten */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Lege Kostentyp und Betrag für das Angebot fest.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-6">
          <Field form={angebot} name="kostentyp">
            <ChoiceGroup {...angebot.choice('kostentyp')} />
          </Field>
          <Bound form={angebot} name="kostenbetrag" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => angebot.validate(['kostentyp', 'kostenbetrag'])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den zuständigen Berater für dieses Angebot.')}
        needs={['kostentyp']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(5);
          }}
        />
      </WizardStep>

      {/* Schritt 5: Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Beschreibe den Leistungsumfang des Angebots.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="beschreibung" rows={5} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => angebot.validate(['beschreibung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
              { key: 'angebotsjahr', label: tx('Angebotsjahr'), value: String(new Date().getFullYear()) },
            ]}
            whatHappensNext={tx('Das Angebot wird mit Status „Entwurf" angelegt. Die Angebotsnummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          whatHappensNext={tx('Nach der Freigabe kann das Angebot als PDF generiert und versendet werden.')}
          next={[
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zeit erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
