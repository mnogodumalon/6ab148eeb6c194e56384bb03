/**
 * Stunden buchen — 4-Schritt-Wizard.
 * Steps: 1) Berater wählen (nur aktiv) → 2) Projekt wählen (nur in_bearbeitung)
 *        → 3) Leistung wählen + Datum/Stunden eingeben → 4) Tätigkeit & Abrechenbarkeit → 5) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog.
 * Writes: zeiterfassung (creates one entry with berater, projekt, leistung, datum, stunden, taetigkeit,
 *          abrechenbar, erfassungsmonat, erfassungsjahr).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { getMonth, getYear, parseISO } from 'date-fns';
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

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function erfassungsmonatKey(datumIso: string): string {
  const m = getMonth(parseISO(datumIso)); // 0-based
  return MONTH_KEYS[m];
}

function erfassungsjahrValue(datumIso: string): number {
  return getYear(parseISO(datumIso));
}

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const beraterSearch = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich') || undefined,
    }),
  });

  const projektSearch = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const leistungSearch = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label || undefined,
    }),
  });

  const f = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 3,
      stunden: 3,
      taetigkeit: 4,
      abrechenbar: 4,
    },
    initial: { datum: todayIso() },
    required: { erfassungsmonat: false, erfassungsjahr: false },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'eintrag',
      entity: 'zeiterfassung',
      form: f,
      primary: true,
      values: (ctx) => {
        const datumVal = ctx.done['eintrag']
          ? undefined
          : (() => {
              const d = f.get('datum') as string | null;
              if (!d) return {};
              return {
                erfassungsmonat: erfassungsmonatKey(d),
                erfassungsjahr: erfassungsjahrValue(d),
              };
            })();
        return datumVal ?? {};
      },
    },
  ], { draftKey: 'stunden-buchen' });

  // values for derived fields must be supplied at submit time, not in a run step
  // We use a wrapper to inject the computed values before submit
  const planWithDerived = submit.plan.map(s => {
    if (s.key === 'eintrag') {
      return {
        ...s,
        values: () => {
          const d = f.get('datum') as string | null;
          if (!d) return {};
          return {
            erfassungsmonat: erfassungsmonatKey(d),
            erfassungsjahr: erfassungsjahrValue(d),
          };
        },
      };
    }
    return s;
  });
  void planWithDerived; // computed above for reference; the submit already holds the plan

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      subtitle={tx('Geleistete Stunden auf ein Projekt buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-buchen"
      intro={{
        description: tx('Erfasse deine geleisteten Stunden für ein Projekt.'),
        needs: [tx('Dein Name als Berater'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Schritt 1: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater aus, dessen Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...beraterSearch.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, beraterSearch.labelOf(id));
            setStep(2);
          }}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          create={false}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, auf das die Stunden gebucht werden sollen.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projektSearch.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projektSearch.labelOf(id));
            setStep(3);
          }}
          emptyText={tx('Keine Projekte mit Status „In Bearbeitung" gefunden.')}
          create={false}
          avatar="none"
        />
      </WizardStep>

      {/* Schritt 3: Leistung, Datum und Stunden */}
      <WizardStep
        label={tx('Leistung & Zeit')}
        description={tx('Wähle die erbrachte Leistung und gib Datum sowie Stunden ein.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-6">
          <EntitySelectStep
            {...leistungSearch.select}
            selectedId={f.get('leistung') as string | null}
            onSelect={id => {
              f.set('leistung', id, leistungSearch.labelOf(id));
            }}
            avatar="none"
            create={false}
          />
          <div className="space-y-4 pt-2">
            <Bound form={f} name="datum" />
            <Bound form={f} name="stunden" hint={tx('Anzahl der geleisteten Stunden')} />
          </div>
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['leistung', 'datum', 'stunden'])}
            nextStepLabel={tx('Tätigkeit')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Tätigkeit und Abrechenbarkeit */}
      <WizardStep
        label={tx('Tätigkeit')}
        description={tx('Beschreibe die Tätigkeit und lege die Abrechenbarkeit fest.')}
        needs={['berater', 'projekt', 'datum', 'stunden']}
      >
        <div className="space-y-4">
          <Bound form={f} name="taetigkeit" rows={4} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['taetigkeit'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              ...((() => {
                const d = f.get('datum') as string | null;
                if (!d) return [];
                const monat = erfassungsmonatKey(d);
                const jahr = erfassungsjahrValue(d);
                return [
                  { key: 'erfassungsmonat', label: tx('Abrechnungsmonat'), value: `${monat.charAt(0).toUpperCase()}${monat.slice(1)} ${jahr}` },
                ];
              })()),
            ]}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert. Monat und Jahr werden automatisch aus dem Datum abgeleitet.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weitere Stunden buchen')}
          next={[
            { label: tx('Zum Dashboard'), href: '#/' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
          ]}
          whatHappensNext={tx('Die gebuchten Stunden sind jetzt im System erfasst und können für die Abrechnung verwendet werden.')}
        />
      )}
    </IntentWizardShell>
  );
}
