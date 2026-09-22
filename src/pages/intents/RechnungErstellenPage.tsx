/**
 * Rechnung erstellen — 5-Schritt-Wizard.
 * Steps: 1) Kunde & Projekt wählen → 2) Zeiterfassungseinträge wählen →
 *        3) Rechnungsdaten eingeben → 4) Rechnungsmonat bestätigen → 5) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung. Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep,
 *           Bound, Field.
 */
import { useState } from 'react';
import { parseISO, getMonth, getYear } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldDate,
  fieldRef,
  refFilter,
  combineFilters,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

/** Maps a 0-based month index to the rechnungsmonat lookup key. */
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Kunden: all records qualify
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email') || undefined,
    }),
  });

  // Projekte: only in_bearbeitung
  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
      subtitle: fieldLookup(p, 'projektart')?.label || undefined,
    }),
  });

  // ONE form for rechnungen — steps map each field to its wizard step
  const rechnung = useStepForm('rechnungen', {
    fields: [
      'kunde', 'projekt',
      'zeiterfassungseintraege',
      'rechnungsdatum', 'faelligkeitsdatum', 'nettobetrag', 'mehrwertsteuer', 'notizen',
      'rechnungsmonat', 'rechnungsjahr',
    ],
    steps: {
      kunde: 1,
      projekt: 1,
      zeiterfassungseintraege: 2,
      rechnungsdatum: 3,
      faelligkeitsdatum: 3,
      nettobetrag: 3,
      mehrwertsteuer: 3,
      notizen: 3,
      rechnungsmonat: 4,
      rechnungsjahr: 4,
    },
    required: {
      // faelligkeitsdatum, notizen, mehrwertsteuer are optional
      faelligkeitsdatum: false,
      notizen: false,
      mehrwertsteuer: false,
      // rechnungsmonat & rechnungsjahr are derived — not asked
      rechnungsmonat: false,
      rechnungsjahr: false,
    },
    initial: { rechnungsdatum: todayIso() },
  });

  // The picked project id drives the zeiterfassung filter
  const pickedProjektId = rechnung.get('projekt') as string | null;

  // Zeiterfassung: only entries for the selected project that are billable
  const zeiterfassungFilter = pickedProjektId
    ? combineFilters(refFilter('projekt', pickedProjektId), tx('r.v_abrechenbar == True'))
    : undefined;

  const zeiterfassungen = useRecordSearch(servicePort, 'zeiterfassung', {
    filter: zeiterfassungFilter,
    where: r =>
      fieldRef(r, 'projekt') === pickedProjektId &&
      r.fields['abrechenbar'] === true,
    searchFields: ['taetigkeit'],
    toItem: z => ({
      id: z.id,
      title: fieldText(z, 'taetigkeit') || tx('Eintrag ohne Beschreibung'),
      subtitle: fieldDate(z, 'datum') || undefined,
    }),
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      values: (_ctx) => {
        // Derive rechnungsmonat and rechnungsjahr from rechnungsdatum
        const datumRaw = rechnung.get('rechnungsdatum') as string | null;
        let rechnungsmonat: string | undefined;
        let rechnungsjahr: number | undefined;
        if (datumRaw) {
          const d = parseISO(datumRaw);
          rechnungsmonat = MONTH_KEYS[getMonth(d)];
          rechnungsjahr = getYear(d);
        }

        // Derive berater from selected zeiterfassungseintraege
        const selectedZeitIds = (rechnung.get('zeiterfassungseintraege') as string[]) ?? [];
        const beraterIds: string[] = [];
        for (const zId of selectedZeitIds) {
          const zRec = zeiterfassungen.recordOf(zId);
          if (zRec) {
            const beraterId = fieldRef(zRec, 'berater');
            if (beraterId && !beraterIds.includes(beraterId)) {
              beraterIds.push(beraterId);
            }
          }
        }

        return {
          rechnungsstatus: 'entwurf',
          rechnungsmonat,
          rechnungsjahr,
          berater: beraterIds,
        };
      },
    },
  ], { draftKey: 'rechnung-erstellen' });

  const restart = () => {
    submit.reset();
    rechnung.reset();
    setStep(1);
  };

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstelle eine neue Rechnung zu einem Projekt und weise Zeiterfassungseinträge zu.'),
        needs: [tx('Kundendaten'), tx('Aktives Projekt'), tx('Abrechenbare Zeiteinträge')],
      }}
    >
      {/* Step 1: Kunde & Projekt */}
      <WizardStep
        label={tx('Kunde & Projekt')}
        description={tx('Wähle zuerst den Kunden, dann das Projekt, für das die Rechnung erstellt wird.')}
      >
        {!rechnung.get('kunde') ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">{tx('Schritt 1a: Kunden auswählen')}</p>
            <EntitySelectStep
              {...kunden.select}
              avatar="initials"
              searchPlaceholder={tx('Kunde suchen …')}
              onSelect={id => {
                rechnung.set('kunde', id, kunden.labelOf(id));
                // Reset projekt when customer changes
                rechnung.set('projekt', null as unknown as string, undefined);
              }}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-secondary">
              <div>
                <p className="text-xs text-muted-foreground">{tx('Kunde')}</p>
                <p className="font-medium">{rechnung.labels['kunde'] ?? tx('Ausgewählter Kunde')}</p>
              </div>
              <button
                type="button"
                className="text-sm text-primary underline"
                onClick={() => {
                  rechnung.set('kunde', null as unknown as string, undefined);
                  rechnung.set('projekt', null as unknown as string, undefined);
                  rechnung.set('zeiterfassungseintraege', [] as string[], undefined);
                }}
              >
                {tx('Ändern')}
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{tx('Schritt 1b: Projekt auswählen')}</p>
            <EntitySelectStep
              {...projekte.select}
              searchPlaceholder={tx('Projekt suchen …')}
              selectedId={rechnung.get('projekt') as string | null}
              emptyText={tx('Keine aktiven Projekte gefunden. Lege zuerst ein Projekt an.')}
              onSelect={id => {
                rechnung.set('projekt', id, projekte.labelOf(id));
                // Reset zeiterfassung picks when project changes
                rechnung.set('zeiterfassungseintraege', [] as string[], undefined);
                setStep(2);
              }}
            />
          </>
        )}
        {Boolean(rechnung.get('kunde')) && (
          <StepNav
            hideBack
            onNext={() => rechnung.validate(['kunde', 'projekt'])}
            nextStepLabel={tx('Zeiteinträge')}
          />
        )}
      </WizardStep>

      {/* Step 2: Zeiterfassungseinträge */}
      <WizardStep
        label={tx('Zeiteinträge')}
        description={tx('Wähle die abrechenbaren Zeiterfassungseinträge aus, die in diese Rechnung einfließen sollen.')}
        needs={['projekt']}
      >
        {pickedProjektId ? (
          <>
            <Field form={rechnung} name="zeiterfassungseintraege">
              <EntitySelectStep
                {...zeiterfassungen.select}
                {...rechnung.records('zeiterfassungseintraege', zeiterfassungen.labelOf)}
                searchPlaceholder={tx('Eintrag suchen …')}
                emptyText={tx('Keine abrechenbaren Zeiteinträge für dieses Projekt gefunden.')}
                create={false}
              />
            </Field>
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => rechnung.validate(['zeiterfassungseintraege'])}
              nextStepLabel={tx('Rechnungsdaten')}
            />
          </>
        ) : (
          <StepNav
            onBack={() => setStep(1)}
            nextDisabled
          >
            <p className="text-sm text-muted-foreground">{tx('Bitte zuerst ein Projekt in Schritt 1 auswählen.')}</p>
          </StepNav>
        )}
      </WizardStep>

      {/* Step 3: Rechnungsdaten */}
      <WizardStep
        label={tx('Rechnungsdaten')}
        description={tx('Gib Datum, Betrag und Mehrwertsteuer der Rechnung ein.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('Prozentwert, z. B. 19')} />
          <Bound form={rechnung} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => rechnung.validate(['rechnungsdatum', 'nettobetrag'])}
            nextStepLabel={tx('Rechnungsmonat')}
          />
        </div>
      </WizardStep>

      {/* Step 4: Rechnungsmonat bestätigen */}
      <WizardStep
        label={tx('Rechnungsmonat')}
        description={tx('Bestätige den Abrechnungsmonat. Dieser wird automatisch aus dem Rechnungsdatum abgeleitet.')}
        needs={['rechnungsdatum']}
      >
        {(() => {
          const datumRaw = rechnung.get('rechnungsdatum') as string | null;
          if (!datumRaw) {
            return (
              <StepNav onBack={() => setStep(3)} nextDisabled>
                <p className="text-sm text-muted-foreground">
                  {tx('Bitte zuerst ein Rechnungsdatum in Schritt 3 eingeben.')}
                </p>
              </StepNav>
            );
          }
          const d = parseISO(datumRaw);
          const monthKey = MONTH_KEYS[getMonth(d)];
          const year = getYear(d);
          const monthLabels: Record<string, string> = {
            januar: tx('Januar'), februar: tx('Februar'), maerz: tx('März'),
            april: tx('April'), mai: tx('Mai'), juni: tx('Juni'),
            juli: tx('Juli'), august: tx('August'), september: tx('September'),
            oktober: tx('Oktober'), november: tx('November'), dezember: tx('Dezember'),
          };
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">{tx('Abrechnungsmonat')}</p>
                <p className="text-2xl font-semibold">
                  {monthLabels[monthKey]} {year}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {tx('Abgeleitet aus dem Rechnungsdatum')} ({datumRaw})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge statusKey="entwurf" label={tx('Entwurf')} tone="neutral" />
                <span className="text-sm text-muted-foreground">
                  {tx('Rechnungsstatus wird automatisch auf „Entwurf" gesetzt.')}
                </span>
              </div>
              <StepNav
                onBack={() => setStep(3)}
                onNext={() => true}
                nextStepLabel={tx('Prüfen')}
              />
            </div>
          );
        })()}
      </WizardStep>

      {/* Step 5: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden anschließend automatisch durch das System vergeben.')}
            items={[
              {
                key: 'rechnungsstatus_fixed',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
            ]}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch durch das System vervollständigt.')}
          next={[
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
