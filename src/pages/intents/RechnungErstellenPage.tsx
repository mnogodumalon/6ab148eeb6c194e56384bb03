/**
 * Rechnung erstellen — 7-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projekt wählen (nur status in_bearbeitung, des gewählten Kunden)
 *        → 3) Rechnungsdatum & Fälligkeitsdatum → 4) Zeiterfassungseinträge wählen (abrechenbar, projekt)
 *        → 5) Nettobetrag & Mehrwertsteuer → 6) Beteiligte Berater wählen → 7) Notizen → 8) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Field, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, getMonth, getYear } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
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
  fieldNumber,
  fieldRef,
  combineFilters,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monthKeyFromDate(isoDate: string): string {
  // parse yyyy-MM-dd without Date constructor to avoid timezone shift
  const [, mm] = isoDate.split('-');
  const monthIndex = parseInt(mm, 10) - 1;
  return MONTH_KEYS[monthIndex] ?? 'januar';
}

function yearFromDate(isoDate: string): number {
  return parseInt(isoDate.split('-')[0], 10);
}

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

  // Step 2: Projekte — gefiltert nach Kunde (client-side) und Status in_bearbeitung
  const [kundeId, setKundeId] = useState<string | null>(null);
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung' &&
      (kundeId ? fieldRef(r, 'kunde') === kundeId : true),
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Step 4: Zeiterfassungseinträge — abrechenbar=true AND projekt = gewähltes Projekt
  const [projektId, setProjektId] = useState<string | null>(null);
  const zeitFilter = projektId
    ? combineFilters(tx('r.v_abrechenbar == True'), refFilter('projekt', projektId))
    : tx('r.v_abrechenbar == True');
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: ['taetigkeit'],
    filter: zeitFilter,
    where: r => {
      const abrechenbar = r.fields['abrechenbar'];
      const ab = abrechenbar === true || abrechenbar === 'True';
      const pRef = fieldRef(r, 'projekt');
      return ab && (projektId ? pRef === projektId : true);
    },
    toItem: (z, ctx) => ({
      id: z.id,
      title: fieldText(z, 'datum') || tx('Ohne Datum'),
      subtitle: (() => {
        const std = fieldNumber(z, 'stunden');
        const beraterName = ctx.ref('berater');
        return [beraterName, std != null ? `${std} h` : null].filter(Boolean).join(' · ') || undefined;
      })(),
    }),
  });

  // Step 6: Berater — nur status aktiv
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: (() => {
        const satz = fieldNumber(b, 'stundensatz');
        return satz != null ? `${satz} €/h` : undefined;
      })(),
    }),
  });

  // Form — alle Felder die der User eingibt
  const rechnung = useStepForm('rechnungen', {
    fields: ['kunde', 'projekt', 'rechnungsdatum', 'faelligkeitsdatum', 'zeiterfassungseintraege', 'nettobetrag', 'mehrwertsteuer', 'berater', 'notizen'],
    steps: {
      kunde: 1,
      projekt: 2,
      rechnungsdatum: 3,
      faelligkeitsdatum: 3,
      zeiterfassungseintraege: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      berater: 6,
      notizen: 7,
    },
    required: { faelligkeitsdatum: false, mehrwertsteuer: false, notizen: false },
    initial: { rechnungsdatum: todayIso() },
    messages: {
      kunde: tx('Bitte einen Kunden auswählen.'),
      projekt: tx('Bitte ein Projekt des gewählten Kunden auswählen.'),
      zeiterfassungseintraege: tx('Bitte mindestens einen abrechenbaren Zeiterfassungseintrag wählen.'),
      berater: tx('Bitte mindestens einen Berater auswählen.'),
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      values: (_ctx) => {
        const rd = rechnung.get('rechnungsdatum') as string | null;
        return {
          rechnungsstatus: 'entwurf',
          rechnungsmonat: rd ? monthKeyFromDate(rd) : 'januar',
          rechnungsjahr: rd ? yearFromDate(rd) : null,
        };
      },
    },
  ], { draftKey: 'rechnung-erstellen' });

  const restart = () => {
    submit.reset();
    rechnung.reset();
    setKundeId(null);
    setProjektId(null);
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
        description: tx('Neue Rechnung auf Basis eines Projekts anlegen und abrechenbare Stunden zuordnen.'),
        needs: [tx('Kundenname'), tx('Projektkennung'), tx('Rechnungsdatum'), tx('Nettobetrag')],
      }}
    >
      {/* Schritt 1: Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Den Kunden wählen, für den die Rechnung ausgestellt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={rechnung.get('kunde') as string | null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            setKundeId(id);
            // Projekt-Auswahl zurücksetzen wenn Kunde wechselt
            rechnung.set('projekt', null as unknown as string, undefined);
            setProjektId(null);
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Name oder E-Mail suchen')}
          create={false}
          emptyText={tx('Kein Kunde gefunden. Bitte Suche anpassen.')}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Nur Projekte des gewählten Kunden mit Status „In Bearbeitung" werden angezeigt.')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={rechnung.get('projekt') as string | null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setProjektId(id);
            // Zeiterfassungseinträge zurücksetzen wenn Projekt wechselt
            rechnung.set('zeiterfassungseintraege', [] as string[], undefined);
            setStep(3);
          }}
          avatar="none"
          searchPlaceholder={tx('Projektkennung suchen')}
          create={false}
          emptyText={tx('Keine Projekte in Bearbeitung für diesen Kunden gefunden.')}
        />
        <StepNav onBack={() => setStep(1)} />
      </WizardStep>

      {/* Schritt 3: Rechnungsdatum und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Rechnungsdatum und optionales Fälligkeitsdatum festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => rechnung.validate(['rechnungsdatum'])}
            nextStepLabel={tx('Zeiteinträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge wählen */}
      <WizardStep
        label={tx('Zeiteinträge')}
        description={tx('Abrechenbare Zeiterfassungseinträge des gewählten Projekts auswählen.')}
        needs={['rechnungsdatum']}
      >
        <Field form={rechnung} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...zeiterfassung.select}
            {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
            avatar="none"
            searchPlaceholder={tx('Tätigkeitsbeschreibung suchen')}
            emptyText={projektId
              ? tx('Keine abrechenbaren Einträge für dieses Projekt vorhanden.')
              : tx('Bitte zuerst ein Projekt wählen.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => rechnung.validate(['zeiterfassungseintraege'])}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Schritt 5: Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuersatz eingeben.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => rechnung.validate(['nettobetrag'])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Beteiligte Berater für diese Rechnung auswählen (nur aktive Berater).')}
        needs={['nettobetrag']}
      >
        <Field form={rechnung} name="berater">
          <EntitySelectStep
            {...berater.select}
            {...rechnung.records('berater', berater.labelOf)}
            avatar="initials"
            searchPlaceholder={tx('Vor- oder Nachname suchen')}
            create={false}
            emptyText={tx('Keine aktiven Berater gefunden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => rechnung.validate(['berater'])}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Schritt 7: Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Anmerkungen zur Rechnung erfassen.')}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="notizen" rows={4} hint={tx('Optional — z. B. Zahlungskonditionen, Projektreferenz')} />
          <StepNav
            onBack={() => setStep(6)}
            onNext={() => true}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 8: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
              {
                key: 'rechnungsmonat',
                label: tx('Abrechnungsmonat'),
                value: (() => {
                  const rd = rechnung.get('rechnungsdatum') as string | null;
                  if (!rd) return '—';
                  const [, mm] = rd.split('-');
                  const idx = parseInt(mm, 10) - 1;
                  const names = [
                    tx('Januar'), tx('Februar'), tx('März'), tx('April'),
                    tx('Mai'), tx('Juni'), tx('Juli'), tx('August'),
                    tx('September'), tx('Oktober'), tx('November'), tx('Dezember'),
                  ];
                  return `${names[idx] ?? '—'} ${yearFromDate(rd)}`;
                })(),
              },
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Die Rechnungsnummer wird automatisch vergeben.')}
            confirmLabel={tx('Rechnung anlegen')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          next={[
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die Rechnungsnummer wird vom System automatisch vergeben. Du findest die Rechnung in der Rechnungsübersicht.')}
        />
      )}
    </IntentWizardShell>
  );
}
