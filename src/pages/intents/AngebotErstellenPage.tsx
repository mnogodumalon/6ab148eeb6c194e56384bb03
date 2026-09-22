/**
 * Angebot erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt wählen (status in_bearbeitung|akquise) → 2) Angebotstyp & Zeitrahmen →
 *        3) Kosten erfassen → 4) Berater wählen (status aktiv) → 5) Beschreibung & Prüfen.
 * Reads: projekte (filter: status in_bearbeitung|akquise), berater (filter: status aktiv).
 * Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'in_bearbeitung' || key === 'akquise';
    },
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

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
    initial: { zeitrahmen_anfang: todayIso() },
    required: { angebotsnummer: false, angebotsjahr: false },
  });

  const submit = useJourneySubmit(
    servicePort,
    [
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
    ],
    { draftKey: 'angebot-erstellen' },
  );

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem bestehenden Projekt.'),
        needs: [tx('Projekt'), tx('Angebotstyp'), tx('Zeitrahmen'), tx('Kostenbetrag'), tx('Zuständiger Berater')],
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
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Keine Projekte mit Status „In Bearbeitung" oder „Akquise" gefunden.')}
          create={false}
          avatar="none"
        />
      </WizardStep>

      {/* Schritt 2: Angebotstyp & Zeitrahmen */}
      <WizardStep
        label={tx('Typ & Zeitrahmen')}
        description={tx('Angebotstyp und den geplanten Leistungszeitraum angeben.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="angebotstyp" />
          <Bound form={angebot} name="zeitrahmen_anfang" />
          <Bound form={angebot} name="zeitrahmen_ende" />
          <Bound form={angebot} name="dauer" hint={tx('z. B. „3 Monate", „laufend"')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['angebotstyp', 'zeitrahmen_anfang'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Kosten */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp und den Betrag für dieses Angebot erfassen.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="kostentyp" allowClear />
          <Bound form={angebot} name="kostenbetrag" hint={tx('Betrag in Euro')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => angebot.validate([])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Den zuständigen Berater für dieses Angebot auswählen.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(5);
          }}
          searchPlaceholder={tx('Berater suchen …')}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          create={false}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 5: Beschreibung & Prüfen */}
      <WizardStep
        label={tx('Beschreibung & Prüfen')}
        description={tx('Optional eine Beschreibung ergänzen und das Angebot prüfen.')}
        needs={['berater']}
      >
        {!submit.done ? (
          <div className="space-y-4">
            <Bound form={angebot} name="beschreibung" rows={4} />
            <SummaryStep
              forms={[angebot]}
              submit={submit}
              items={[
                { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
                { key: 'angebotsjahr', label: tx('Jahr'), value: String(new Date().getFullYear()) },
              ]}
              whatHappensNext={tx('Das Angebot wird als Entwurf angelegt. Die Angebotsnummer und das PDF werden automatisch vergeben.')}
            />
          </div>
        ) : null}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          whatHappensNext={tx('Die Angebotsnummer wird automatisch vergeben und das Angebots-PDF wird erzeugt.')}
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
