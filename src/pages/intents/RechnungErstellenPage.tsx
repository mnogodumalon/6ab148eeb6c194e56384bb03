/**
 * Rechnung erstellen — 7-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projekt wählen → 3) Berater wählen →
 *        4) Zeiterfassungseinträge zuweisen → 5) Datum & Fälligkeit →
 *        6) Beträge → 7) Notizen → 8) Prüfen & anlegen.
 * Reads: kunden, projekte (filter: in_bearbeitung), berater, zeiterfassung.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav,
 *           SummaryStep, SuccessStep, Bound, Field, DatePicker.
 */
import { useState } from 'react';
import { parseISO, format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { DatePicker } from '@/components/DatePicker';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldDate,
  refFilter,
  combineFilters,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Kunden
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
    }),
  });

  // Step 3: Berater (multiple)
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  // ONE form for rechnungen
  const f = useStepForm('rechnungen', {
    steps: {
      kunde: 1,
      projekt: 2,
      berater: 3,
      zeiterfassungseintraege: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      nettobetrag: 6,
      mehrwertsteuer: 6,
      notizen: 7,
    },
    required: {
      // rechnungsnummer is set by tool — not asked here
      rechnungsnummer: false,
      // faelligkeitsdatum is required per brief
      faelligkeitsdatum: true,
    },
  });

  const kundeId = f.get('kunde') as string | undefined;
  const projektId = f.get('projekt') as string | undefined;

  // Projekte filtered by picked customer on the client side
  const projekteForKunde = useRecordSearch(servicePort, 'projekte', {
    filter: kundeId
      ? combineFilters(tx('r.v_projektstatus == \'in_bearbeitung\''), refFilter('kunde', kundeId))
      : tx('r.v_projektstatus == \'in_bearbeitung\''),
    where: p => fieldLookup(p, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? '',
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Zeiterfassung filtered by picked project
  const zeiterfassungFuerProjekt = useRecordSearch(servicePort, 'zeiterfassung', {
    filter: projektId ? refFilter('projekt', projektId) : undefined,
    where: _r => true,
    searchFields: ['taetigkeit'],
    toItem: ze => ({
      id: ze.id,
      title: fieldText(ze, 'taetigkeit') || ze.id,
      subtitle: fieldDate(ze, 'datum') ?? '',
    }),
  });

  // Derived values computed from rechnungsdatum
  function deriveMonthAndYear(rechnungsdatum: string): { rechnungsmonat: string; rechnungsjahr: number } {
    const d = parseISO(rechnungsdatum);
    const monthIndex = d.getMonth(); // 0-based
    const rechnungsmonat = MONTH_KEYS[monthIndex];
    const rechnungsjahr = parseInt(format(d, 'yyyy'), 10);
    return { rechnungsmonat, rechnungsjahr };
  }

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: f,
      primary: true,
      values: (_ctx) => {
        const rechnungsdatum = f.get('rechnungsdatum') as string | undefined;
        const derived = rechnungsdatum ? deriveMonthAndYear(rechnungsdatum) : {};
        return {
          rechnungsstatus: 'entwurf',
          ...derived,
        };
      },
    },
  ], { draftKey: 'rechnung-erstellen' });

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      subtitle={tx('Neue Rechnung auf Basis eines Projekts anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstelle eine neue Rechnung mit Projekt, Beratern und Zeiterfassungseinträgen.'),
        needs: [tx('Kundendaten'), tx('Projektnummer'), tx('Rechnungs- und Fälligkeitsdatum'), tx('Nettobetrag und MwSt.')],
      }}
    >
      {/* Schritt 1: Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden aus, für den die Rechnung erstellt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string | null}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            // Reset project and downstream if customer changes
            f.set('projekt', null as unknown as string, undefined);
            f.set('zeiterfassungseintraege', [] as string[], undefined);
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Kunde suchen …')}
          create={{ fields: ['kundenname', 'email', 'kundentyp', 'anlagedatum'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt aus — nur laufende Projekte des gewählten Kunden werden angezeigt.')}
        needs={['kunde']}
      >
        {f.get('kunde') ? (
          <EntitySelectStep
            {...projekteForKunde.select}
            selectedId={f.get('projekt') as string | null}
            onSelect={id => {
              f.set('projekt', id, projekteForKunde.labelOf(id));
              // Reset zeiterfassungseintraege when project changes
              f.set('zeiterfassungseintraege', [] as string[], undefined);
              setStep(3);
            }}
            emptyText={tx('Für diesen Kunden gibt es keine laufenden Projekte.')}
            searchPlaceholder={tx('Projekt suchen …')}
            create={false}
          />
        ) : (
          <StepNav
            onBack={() => setStep(1)}
            nextDisabled
          >
            {tx('Bitte zuerst einen Kunden auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      {/* Schritt 3: Berater wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle alle beteiligten Berater für diese Rechnung.')}
        needs={['projekt']}
      >
        {f.get('projekt') ? (
          <>
            <Field form={f} name="berater">
              <EntitySelectStep
                {...berater.select}
                {...f.records('berater', berater.labelOf)}
                avatar="initials"
                searchPlaceholder={tx('Berater suchen …')}
                create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
              />
            </Field>
            <StepNav
              onBack={() => setStep(2)}
              onNext={() => f.validate(['berater'])}
              nextStepLabel={tx('Zeiterfassung')}
            />
          </>
        ) : (
          <StepNav onBack={() => setStep(2)} nextDisabled>
            {tx('Bitte zuerst ein Projekt auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge zuweisen (multipleapplookup) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle die Zeiterfassungseinträge des Projekts, die abgerechnet werden sollen.')}
        needs={['projekt']}
      >
        {f.get('projekt') ? (
          <>
            <Field form={f} name="zeiterfassungseintraege">
              <EntitySelectStep
                {...zeiterfassungFuerProjekt.select}
                {...f.records('zeiterfassungseintraege', zeiterfassungFuerProjekt.labelOf)}
                searchPlaceholder={tx('Eintrag suchen …')}
                emptyText={tx('Für dieses Projekt gibt es noch keine Zeiterfassungseinträge.')}
                emptyIcon={undefined}
              />
            </Field>
            <StepNav
              onBack={() => setStep(3)}
              onNext={() => f.validate(['zeiterfassungseintraege'])}
              nextStepLabel={tx('Datum & Fälligkeit')}
            />
          </>
        ) : (
          <StepNav onBack={() => setStep(2)} nextDisabled>
            {tx('Bitte zuerst ein Projekt auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      {/* Schritt 5: Rechnungsdatum und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Gib das Rechnungsdatum und das Fälligkeitsdatum ein.')}
      >
        <div className="space-y-4">
          <Field form={f} name="rechnungsdatum">
            <DatePicker {...f.date('rechnungsdatum')} />
          </Field>
          <Field form={f} name="faelligkeitsdatum">
            <DatePicker {...f.date('faelligkeitsdatum')} />
          </Field>
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => f.validate(['rechnungsdatum', 'faelligkeitsdatum'])}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Nettobetrag und MwSt. */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Gib Nettobetrag und Mehrwertsteuersatz ein.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="nettobetrag" hint={tx('In Euro, z. B. 1500')} />
          <Bound form={f} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => f.validate(['nettobetrag', 'mehrwertsteuer'])}
            nextStepLabel={tx('Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Notizen (optional) */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Anmerkungen zur Rechnung.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="notizen" rows={4} />
          <StepNav
            onBack={() => setStep(6)}
            onNext={() => true}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 8: Zusammenfassung & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.')}
            confirmLabel={tx('Rechnung erstellen')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          whatHappensNext={tx('Der Gesamtbetrag wird automatisch berechnet. Die Rechnungsnummer wird vom System vergeben.')}
          next={[
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
