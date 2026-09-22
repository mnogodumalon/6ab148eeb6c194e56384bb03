/**
 * Angebot erstellen — 4-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp, Zeitrahmen, Kostentyp & Kostenbetrag → 3) Berater:in wählen → 4) Beschreibung + Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
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
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektstatus')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const currentYear = new Date().getFullYear();

  const f = useStepForm('angebote', {
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
    required: {
      zeitrahmen_ende: true,
      dauer: true,
      kostentyp: true,
      kostenbetrag: true,
      beschreibung: true,
    },
    initial: {
      zeitrahmen_anfang: todayIso(),
    },
    messages: {
      projekt: tx('Bitte ein Projekt für dieses Angebot auswählen.'),
      berater: tx('Bitte eine verantwortliche Berater:in auswählen.'),
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'angebot',
      entity: 'angebote',
      form: f,
      primary: true,
      values: {
        angebotsjahr: currentYear,
        angebotsstatus: 'entwurf',
      },
    },
  ], { draftKey: 'angebot-erstellen' });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Angebot zu einem bestehenden Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein Angebot zu einem bestehenden Projekt — das System vergibt automatisch die Angebotsnummer und erzeugt ein PDF.'),
        needs: [tx('Projektkennung'), tx('Angebotstyp und Kostenbetrag'), tx('Zuständige Berater:in')],
      }}
    >
      {/* Step 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, zu dem dieses Angebot gehört.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Keine Projekte gefunden. Zuerst ein Projekt anlegen.')}
          create={false}
          avatar="none"
        />
      </WizardStep>

      {/* Step 2: Angebotstyp, Zeitrahmen, Kostentyp & Kostenbetrag */}
      <WizardStep
        label={tx('Konditionen')}
        description={tx('Angebotstyp, Zeitrahmen und Kosten festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-5">
          <Bound form={f} name="angebotstyp" />
          <Bound form={f} name="zeitrahmen_anfang" />
          <Bound form={f} name="zeitrahmen_ende" />
          <Bound form={f} name="dauer" placeholder={tx('z. B. 3 Monate, 6 Wochen …')} />
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="kostenbetrag" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['angebotstyp', 'zeitrahmen_anfang', 'zeitrahmen_ende', 'dauer', 'kostentyp', 'kostenbetrag'])}
            nextStepLabel={tx('Berater:in')}
          />
        </div>
      </WizardStep>

      {/* Step 3: Berater:in auswählen */}
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Verantwortliche Berater:in für dieses Angebot auswählen.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Name suchen …')}
          emptyText={tx('Keine aktiven Berater:innen gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Step 4: Beschreibung + Prüfen */}
      <WizardStep
        label={tx('Prüfen')}
        description={tx('Beschreibung ergänzen und alle Angaben prüfen.')}
        needs={['berater']}
      >
        {!submit.done ? (
          <div className="space-y-5">
            <Bound form={f} name="beschreibung" rows={4} placeholder={tx('Leistungsumfang und Details zum Angebot …')} />
            <SummaryStep
              forms={[f]}
              submit={submit}
              items={[
                { key: 'angebotsjahr', label: tx('Angebotsjahr'), value: String(currentYear) },
                { key: 'angebotsstatus', label: tx('Angebotsstatus'), value: tx('Entwurf') },
              ]}
              whatHappensNext={tx('Das System vergibt automatisch die Angebotsnummer und erzeugt ein PDF aus den Angebotsdaten.')}
              confirmLabel={tx('Angebot anlegen')}
            />
          </div>
        ) : null}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          facts={[
            {
              label: tx('Angebotsnummer'),
              value: submit.result.primary.fields.angebotsnummer != null
                ? String(submit.result.primary.fields.angebotsnummer)
                : tx('wird vergeben'),
            },
            {
              label: tx('Angebotsstatus'),
              value: tx('Entwurf'),
            },
          ]}
          whatHappensNext={tx('Die Angebotsnummer wird vom System vergeben und ein PDF automatisch erzeugt.')}
          next={[
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
            },
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
          restartLabel={tx('Weiteres Angebot erstellen')}
        />
      )}
    </IntentWizardShell>
  );
}
