/**
 * Stunden buchen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen → 3) Leistung wählen
 *        → 4) Details (Datum, Stunden, Tätigkeit, Abrechenbar) → 5) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog.
 * Writes: zeiterfassung (creates one entry; erfassungsmonat + erfassungsjahr are derived from datum).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { parseISO, getMonth, getYear } from 'date-fns';
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

/** Month index (0-based) → lookup key for erfassungsmonat */
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Berater — alle aktiven Berater (alle sind wählbar laut Brief)
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Step 2: Projekte — bevorzugt in_bearbeitung, aber alle wählbar
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektstatus asc', 'r.v_projektkennung asc'],
  });

  // Step 3: Leistungskatalog — alle Leistungen
  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      status: fieldLookup(l, 'leistungstyp') ?? undefined,
    }),
  });

  // One form for zeiterfassung — all fields the flow asks for
  const f = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 4,
      abrechenbar: 4,
    },
    required: {
      // leistung is not marked required in the entity — the flow does not force it
      leistung: false,
      taetigkeit: false,
      abrechenbar: false,
    },
    initial: {
      abrechenbar: true,
      datum: todayIso(),
    },
  });

  // Derive erfassungsmonat and erfassungsjahr from the entered datum
  const datumValue = f.get('datum') as string | null | undefined;
  let erfassungsmonat: string | undefined;
  let erfassungsjahr: number | undefined;
  if (datumValue) {
    try {
      const parsed = parseISO(datumValue);
      erfassungsmonat = MONTH_KEYS[getMonth(parsed)];
      erfassungsjahr = getYear(parsed);
    } catch {
      // invalid date — leave undefined
    }
  }

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'eintrag',
      entity: 'zeiterfassung',
      form: f,
      primary: true,
      values: {
        erfassungsmonat,
        erfassungsjahr,
      },
    },
  ], { draftKey: 'stunden-buchen' });

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      subtitle={tx('Geleistete Stunden auf ein Projekt erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-buchen"
      intro={{
        description: tx('Erfasse geleistete Stunden eines Beraters auf ein Projekt und eine Leistung.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Step 1 — Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        heading={tx('Berater auswählen')}
        description={tx('Wähle den Berater aus, dessen Stunden erfasst werden sollen.')}
      >
        <EntitySelectStep
          {...berater.select}
          avatar="initials"
          selectedId={f.get('berater') as string}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Berater suchen …')}
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        heading={tx('Projekt auswählen')}
        description={tx('Wähle das Projekt, auf das die Stunden gebucht werden sollen. Projekte in Bearbeitung werden zuerst angezeigt.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          avatar="none"
          selectedId={f.get('projekt') as string}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projekt suchen …')}
        />
      </WizardStep>

      {/* Step 3 — Leistung wählen */}
      <WizardStep
        label={tx('Leistung')}
        heading={tx('Leistung aus dem Katalog wählen')}
        description={tx('Wähle die erbrachte Leistung aus dem Katalog. Dieser Schritt ist optional.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...leistungen.select}
          avatar="none"
          selectedId={f.get('leistung') as string | null}
          onSelect={id => {
            f.set('leistung', id, leistungen.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Leistung suchen …')}
          emptyText={tx('Keine Leistungen im Katalog gefunden.')}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => { setStep(4); }}
            nextLabel={tx('Überspringen')}
            backLabel={tx('Zurück')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Details */}
      <WizardStep
        label={tx('Details')}
        heading={tx('Details erfassen')}
        description={tx('Gib Datum, Stundenanzahl und Tätigkeitsbeschreibung ein.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={3} placeholder={tx('Was wurde getan? (optional)')} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Zusammenfassung & Bestätigung */}
      <WizardStep
        label={tx('Prüfen')}
        needs={['datum', 'stunden']}
      >
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              ...(erfassungsmonat
                ? [{
                    key: 'erfassungsmonat',
                    label: tx('Abrechnungsmonat'),
                    value: `${erfassungsmonat.charAt(0).toUpperCase()}${erfassungsmonat.slice(1)} ${erfassungsjahr ?? ''}`.trim(),
                  }]
                : []),
            ]}
            whatHappensNext={tx('Der Zeiteintrag wird sofort angelegt. Monat und Jahr werden automatisch aus dem Datum abgeleitet.')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Du kannst weitere Stunden buchen oder ein neues Angebot oder eine Rechnung erstellen.')}
            next={[
              { label: tx('Weiteres Projekt anlegen'), href: '#/intents/projekt-anlegen' },
              { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
              { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
              { label: tx('Zum Dashboard'), href: '#/' },
            ]}
          />
        )}
      </WizardStep>
    </IntentWizardShell>
  );
}
