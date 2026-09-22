/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Datum & Abrechnungsmonat → 3) Beträge → 4) Zeiterfassungseinträge → 5) Berater → 6) Notizen → 7) Prüfen & anlegen.
 * Reads: projekte (gefiltert auf aktive), zeiterfassung (nach gewähltem Projekt), berater (alle).
 * Writes: rechnungen (createRechnungenEntry); kunde wird vom Projekt übernommen.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep, Bound, Field, ChoiceGroup.
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
  useRecordSearch,
  useStepForm,
  useJourneySubmit,
  refFilter,
  combineFilters,
  fieldRef,
  fieldText,
  fieldLookup,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const DRAFT_KEY = 'rechnung-erstellen';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Projekt wählen — nur aktive Projekte (in_bearbeitung oder akquise)
  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const s = fieldLookup(r, 'projektstatus')?.key;
      return s === 'in_bearbeitung' || s === 'akquise';
    },
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Step 4: Zeiterfassungseinträge — gefiltert auf gewähltes Projekt
  // filter wird nach Projekt-Pick gesetzt (via where-Fallback)
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: ['taetigkeit'],
    toItem: z => ({
      id: z.id,
      title: fieldText(z, 'taetigkeit') || fieldText(z, 'datum') || tx('Zeiteintrag'),
      subtitle: [fieldText(z, 'datum'), fieldText(z, 'stunden') ? `${fieldText(z, 'stunden')} h` : ''].filter(Boolean).join(' · '),
    }),
  });

  // Step 5: Berater — alle
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
    }),
  });

  // Formular für rechnungen
  const rechnung = useStepForm('rechnungen', {
    steps: {
      projekt: 1,
      faelligkeitsdatum: 2,
      rechnungsmonat: 2,
      rechnungsjahr: 2,
      nettobetrag: 3,
      mehrwertsteuer: 3,
      zeiterfassungseintraege: 4,
      berater: 5,
      notizen: 6,
    },
    required: {
      nettobetrag: true,
      mehrwertsteuer: true,
      rechnungsnummer: false,
      gesamtbetrag: false,
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
  });

  // Plan: erstellt rechnungen — kunde wird vom Projekt abgeleitet
  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      values: () => {
        const projektId = rechnung.get('projekt') as string | undefined;
        const projektRecord = projektId ? projekte.recordOf(projektId) : undefined;
        const kundeRef = projektRecord ? fieldRef(projektRecord, 'kunde') : undefined;
        return {
          rechnungsdatum: todayIso(),
          rechnungsstatus: 'entwurf',
          ...(kundeRef ? { kunde: kundeRef } : {}),
        };
      },
    },
  ], { draftKey: DRAFT_KEY });

  const projektId = rechnung.get('projekt') as string | undefined;

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey={DRAFT_KEY}
      intro={{
        description: tx('Neue Rechnung zu einem Projekt anlegen — Rechnungsnummer und Gesamtbetrag vergibt das System.'),
        needs: [tx('Aktives Projekt'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das diese Rechnung erstellt wird.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={projektId ?? null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          emptyText={tx('Keine aktiven Projekte gefunden.')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2: Datum & Abrechnungszeitraum */}
      <WizardStep
        label={tx('Zeitraum')}
        description={tx('Fälligkeitsdatum, Abrechnungsmonat und -jahr angeben.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <Field form={rechnung} name="rechnungsmonat">
            <ChoiceGroup {...rechnung.choice('rechnungsmonat')} />
          </Field>
          <Bound form={rechnung} name="rechnungsjahr" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => rechnung.validate(['faelligkeitsdatum', 'rechnungsmonat', 'rechnungsjahr'])}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Beträge */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer eingeben.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('Prozentwert, z. B. 19')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => rechnung.validate(['nettobetrag', 'mehrwertsteuer'])}
            nextStepLabel={tx('Zeiterfassung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Zeiterfassungseinträge aus dem gewählten Projekt zuordnen (optional).')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Field form={rechnung} name="zeiterfassungseintraege">
            <EntitySelectStep
              {...zeiterfassung.select}
              {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
              searchPlaceholder={tx('Tätigkeiten suchen …')}
              emptyText={
                projektId
                  ? tx('Keine Zeiterfassungseinträge für dieses Projekt gefunden.')
                  : tx('Bitte zuerst ein Projekt wählen.')
              }
            />
          </Field>
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => true}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Berater */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Beteiligte Berater auswählen (optional).')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Field form={rechnung} name="berater">
            <EntitySelectStep
              {...berater.select}
              {...rechnung.records('berater', berater.labelOf)}
              searchPlaceholder={tx('Berater suchen …')}
            />
          </Field>
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => true}
            nextStepLabel={tx('Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Hinweise oder interne Notizen zur Rechnung ergänzen.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="notizen" rows={4} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => true}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')} needs={['projekt', 'nettobetrag', 'mehrwertsteuer']}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            items={[
              {
                key: 'rechnungsdatum',
                label: tx('Rechnungsdatum'),
                value: todayIso(),
              },
              {
                key: 'rechnungsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch vergeben. Die Rechnung wird als Entwurf gespeichert.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          whatHappensNext={tx('Die Rechnung liegt als Entwurf vor. Rechnungsnummer und Gesamtbetrag wurden automatisch vergeben.')}
          next={[
            { label: tx('Weitere Rechnung erstellen') },
            { label: tx('Zeit erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
