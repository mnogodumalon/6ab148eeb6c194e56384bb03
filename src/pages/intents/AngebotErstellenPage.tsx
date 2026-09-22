/**
 * Angebot erstellen — 4-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp, Zeitrahmen & Kosten → 3) Berater wählen → 4) Prüfen & anlegen.
 * Reads: projekte (bevorzugt in_bearbeitung/akquise), berater (nur aktiv).
 * Writes: angebote (creates one record with projekt, berater, angebotstyp, angebotsstatus=entwurf,
 *   zeitrahmen_anfang, zeitrahmen_ende, dauer, kostentyp, kostenbetrag, angebotsjahr, beschreibung).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
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
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Projekt — bevorzugt in_bearbeitung oder akquise, aber alle wählbar
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektstatus asc', 'r.v_projektkennung asc'],
  });

  // Step 3: Berater — nur aktive
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label ?? undefined,
    }),
  });

  // One form for the angebote entity — fields bound to their steps
  const angebot = useStepForm('angebote', {
    steps: {
      // Step 1: record picks handled via useRecordSearch + f.set
      projekt: 1,
      // Step 2: angebotstyp, zeitrahmen, kosten, beschreibung optional
      angebotstyp: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 2,
      kostenbetrag: 2,
      // Step 3: berater record pick
      berater: 3,
      // Step 4: beschreibung (optional ergänzen — on summary step; but we ask it at step 2 inline)
      beschreibung: 2,
    },
    // angebotsnummer and anhang are owned by tools — not asked, not required here
    required: {
      angebotsnummer: false,
      angebotsjahr: false,
      angebotsstatus: false,
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
      subtitle={tx('Neues Angebot zu einem bestehenden Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot und verknüpft es mit dem zugehörigen Projekt.'),
        needs: [tx('Projektkennung'), tx('Angebotstyp und Zeitrahmen'), tx('Verantwortlicher Berater')],
      }}
    >
      {/* Step 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das du ein Angebot erstellen möchtest.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={angebot.get('projekt') as string | null}
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Kein Projekt gefunden. Zuerst ein Projekt anlegen.')}
          create={false}
          avatar="none"
        />
      </WizardStep>

      {/* Step 2: Angebotstyp, Zeitrahmen und Kostendetails */}
      <WizardStep
        label={tx('Details')}
        description={tx('Angebotstyp, Zeitrahmen und Kosten festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-5">
          <Bound form={angebot} name="angebotstyp" />
          <Bound form={angebot} name="zeitrahmen_anfang" />
          <Bound form={angebot} name="zeitrahmen_ende" />
          <Bound form={angebot} name="dauer" placeholder={tx('z. B. 3 Monate')} />
          <Bound form={angebot} name="kostentyp" />
          <Bound form={angebot} name="kostenbetrag" />
          <Bound form={angebot} name="beschreibung" rows={4} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['angebotstyp', 'zeitrahmen_anfang'])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Step 3: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Verantwortlichen Berater für dieses Angebot auswählen.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string | null}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Name suchen …')}
          emptyText={tx('Kein aktiver Berater gefunden.')}
          create={false}
          avatar="initials"
        />
      </WizardStep>

      {/* Step 4: Prüfen & bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus_fix',
                label: tx('Angebotsstatus'),
                value: tx('Entwurf'),
              },
              {
                key: 'angebotsjahr_fix',
                label: tx('Jahr'),
                value: String(new Date().getFullYear()),
              },
            ]}
            whatHappensNext={tx('Das Angebot wird als Entwurf angelegt. Die Angebotsnummer vergibt das System, das PDF wird automatisch erzeugt.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          whatHappensNext={tx('Die Angebotsnummer wird vom System vergeben und das PDF automatisch erzeugt.')}
          next={[
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
            },
            {
              label: tx('Stunden buchen'),
              href: '#/intents/stunden-buchen',
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
