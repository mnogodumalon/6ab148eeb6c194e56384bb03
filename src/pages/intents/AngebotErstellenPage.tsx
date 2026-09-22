/**
 * Angebot erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Berater wählen → 3) Angebotstyp & Zeitrahmen →
 *        4) Beschreibung & Kosten → 5) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup,
 *           Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { getYear, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useRecordSearch,
  useStepForm,
  useJourneySubmit,
  fieldText,
  fieldLookup,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  const f = useStepForm('angebote', {
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 3,
      beschreibung: 4,
      kostentyp: 4,
      kostenbetrag: 4,
    },
    required: {
      zeitrahmen_ende: false,
      dauer: false,
      kostentyp: false,
      kostenbetrag: false,
      beschreibung: false,
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'angebot',
      entity: 'angebote',
      form: f,
      primary: true,
      values: (_ctx) => {
        const anfang = f.get('zeitrahmen_anfang') as string | null;
        return {
          angebotsstatus: 'entwurf',
          angebotsjahr: anfang ? getYear(parseISO(anfang)) : new Date().getFullYear(),
        };
      },
    },
  ], { draftKey: 'angebot-erstellen' });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot für ein Projekt und setzt es auf den Status Entwurf.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater'), tx('Zeitraum und Angebotstyp')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Projekt auswählen, für das das Angebot erstellt wird.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen…')}
          avatar="none"
        />
      </WizardStep>

      <WizardStep
        label={tx('Berater')}
        description={tx('Verantwortlichen Berater für dieses Angebot wählen.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Name suchen…')}
          emptyText={tx('Kein aktiver Berater gefunden.')}
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Zeitrahmen & Typ')}
        description={tx('Angebotstyp, Beginn, Ende und Dauer des Projekts eingeben.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={f} name="angebotstyp" />
          <Bound form={f} name="zeitrahmen_anfang" />
          <Bound form={f} name="zeitrahmen_ende" />
          <Bound form={f} name="dauer" hint={tx('z. B. „3 Monate" oder „6 Wochen"')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['angebotstyp', 'zeitrahmen_anfang'])}
            nextStepLabel={tx('Kosten & Beschreibung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kosten & Beschreibung')}
        description={tx('Kostentyp, Betrag und Leistungsumfang des Angebots erfassen.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="kostenbetrag" />
          <Bound form={f} name="beschreibung" rows={4} hint={tx('Leistungsumfang und Bedingungen')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate([])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Das Angebot wird als Entwurf angelegt. Die Angebotsnummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weiteres Angebot')}
          whatHappensNext={tx('Das Angebot kann jetzt bearbeitet und versendet werden. Die PDF wird über das Werkzeug „Angebot-PDF generieren" erzeugt.')}
          next={[
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
