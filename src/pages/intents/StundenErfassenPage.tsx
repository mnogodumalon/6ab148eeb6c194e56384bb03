/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen (nur in_bearbeitung) → 3) Datum & Stunden →
 *        4) Leistung aus Katalog wählen (optional) → 5) Tätigkeit & Abrechenbarkeit → Prüfen & anlegen.
 * Reads: berater (alle), projekte (nur status in_bearbeitung), leistungskatalog (alle).
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep, Bound, Field, ChoiceGroup.
 */
import { useState } from 'react';
import { getMonth, getYear, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
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

/** Maps a JS month index (0–11) to the German lookup key for erfassungsmonat. */
function monthKey(monthIndex: number): string {
  const keys = [
    'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'dezember',
  ];
  return keys[monthIndex] ?? 'januar';
}

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  // --- Record searches (all hooks before any early return) ---
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
    }),
  });

  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label ?? undefined,
    }),
  });

  // --- Forms ---
  const ze = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      datum: 3,
      stunden: 3,
      leistung: 4,
      taetigkeit: 5,
      abrechenbar: 5,
    },
    initial: { datum: todayIso() },
    required: { leistung: false },
  });

  // --- Submit plan ---
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'zeiterfassung',
        entity: 'zeiterfassung',
        form: ze,
        primary: true,
        values: (ctx) => {
          // Derive erfassungsmonat and erfassungsjahr from datum at submit time
          const datumRaw = ctx.done['zeiterfassung']
            ? undefined // already written — values() called before write
            : ze.get('datum');
          const datumStr = typeof datumRaw === 'string' ? datumRaw : null;
          if (!datumStr) return {};
          const d = parseISO(datumStr);
          return {
            erfassungsmonat: monthKey(getMonth(d)),
            erfassungsjahr: getYear(d),
          };
        },
      },
    ],
    { draftKey: 'stunden-erfassen' },
  );

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      subtitle={tx('Arbeitszeit auf ein Projekt buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[ze]}
      draftKey="stunden-erfassen"
      intro={{
        description: tx('Bucht Arbeitsstunden eines Beraters auf ein aktives Projekt.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Step 1 — Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater, dessen Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={ze.get('berater') as string | null}
          onSelect={id => {
            ze.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Berater suchen …')}
          avatar="initials"
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Nur Projekte mit Status „In Bearbeitung" erscheinen hier.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={ze.get('projekt') as string | null}
          onSelect={id => {
            ze.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Kein Projekt mit Status „In Bearbeitung" gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Step 3 — Datum & Stunden */}
      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('Gib Datum und Anzahl der geleisteten Stunden ein.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={ze} name="datum" />
          <Bound form={ze} name="stunden" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => ze.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Leistung')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Leistung wählen (optional) */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Optional: Wähle eine Leistungsart aus dem Katalog.')}
        needs={['datum', 'stunden']}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...leistungen.select}
            selectedId={ze.get('leistung') as string | null}
            onSelect={id => {
              ze.set('leistung', id, leistungen.labelOf(id));
              setStep(5);
            }}
            searchPlaceholder={tx('Leistung suchen …')}
            create={false}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => { setStep(5); }}
            nextStepLabel={tx('Tätigkeit')}
            nextLabel={tx('Überspringen')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Tätigkeit & Abrechenbarkeit */}
      <WizardStep
        label={tx('Tätigkeit')}
        description={tx('Beschreibe die Tätigkeit und markiere, ob sie abrechenbar ist.')}
        needs={['datum', 'stunden']}
      >
        <div className="space-y-4">
          <Bound form={ze} name="taetigkeit" rows={4} />
          <Bound form={ze} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => ze.validate(['taetigkeit'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Zusammenfassung & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[ze]}
            submit={submit}
            whatHappensNext={tx('Die Stunden werden dem Projekt zugebucht und erscheinen in der Zeiterfassung.')}
            confirmLabel={tx('Stunden erfassen')}
          />
        )}
      </WizardStep>

      {/* Success screen */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[ze]}
          submit={submit}
          restartLabel={tx('Weitere Stunden erfassen')}
          next={[
            { label: tx('Zum Dashboard'), href: '#/' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
          ]}
          whatHappensNext={tx('Die erfassten Stunden können später für eine Rechnung verwendet werden.')}
        />
      )}
    </IntentWizardShell>
  );
}
