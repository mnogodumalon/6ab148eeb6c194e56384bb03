/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projekt auswählen → 3) Zeiterfassungseinträge wählen
 *        → 4) Rechnungsdaten (Datum, Fälligkeit) → 5) Beträge (Netto, MwSt)
 *        → 6) Berater & Notizen → 7) Prüfen & erstellen.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Field, Bound,
 *            StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldRef,
  refFilter,
  combineFilters,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEY_MAP: Record<number, string> = {
  1: 'januar', 2: 'februar', 3: 'maerz', 4: 'april',
  5: 'mai', 6: 'juni', 7: 'juli', 8: 'august',
  9: 'september', 10: 'oktober', 11: 'november', 12: 'dezember',
};

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // --- Suchindexe ---
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
    }),
  });

  const [kundeId, setKundeId] = useState<string | null>(null);

  const projekteFilter = kundeId
    ? combineFilters(tx('r.v_projektstatus == \'in_bearbeitung\''), refFilter('kunde', kundeId))
    : tx('r.v_projektstatus == \'in_bearbeitung\'');
  const projekteWhere = (r: import('@/lib/journey').JourneyRecord) => {
    const statusKey = fieldLookup(r, 'projektstatus')?.key;
    if (statusKey !== 'in_bearbeitung') return false;
    if (!kundeId) return true;
    return fieldRef(r, 'kunde') === kundeId;
  };

  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: projekteFilter,
    where: projekteWhere,
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const [projektId, setProjektId] = useState<string | null>(null);

  const zeitFilter = projektId
    ? combineFilters(tx('r.v_abrechenbar == True'), refFilter('projekt', projektId))
    : tx('r.v_abrechenbar == True');
  const zeitWhere = (r: import('@/lib/journey').JourneyRecord) => {
    const abrechenbar = r.fields['abrechenbar'];
    if (!abrechenbar) return false;
    if (!projektId) return true;
    return fieldRef(r, 'projekt') === projektId;
  };

  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: [],
    filter: zeitFilter,
    where: zeitWhere,
    toItem: (z, _ctx) => ({
      id: z.id,
      title: _ctx.ref('berater') ?? tx('Unbekannter Berater'),
      subtitle: fieldText(z, 'taetigkeit') || undefined,
      stats: [
        { label: tx('Datum'), value: z.fields['datum'] as string ?? '—' },
        { label: tx('Stunden'), value: String(z.fields['stunden'] ?? '—') },
      ],
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
    }),
  });

  // --- Form ---
  const rechnung = useStepForm('rechnungen', {
    fields: [
      'kunde', 'projekt', 'zeiterfassungseintraege',
      'rechnungsdatum', 'faelligkeitsdatum',
      'nettobetrag', 'mehrwertsteuer',
      'berater', 'notizen',
    ],
    steps: {
      kunde: 1,
      projekt: 2,
      zeiterfassungseintraege: 3,
      rechnungsdatum: 4,
      faelligkeitsdatum: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      berater: 6,
      notizen: 6,
    },
    required: {
      rechnungsdatum: true,
      nettobetrag: true,
      mehrwertsteuer: true,
      faelligkeitsdatum: false,
      notizen: false,
    },
  });

  // --- Plan ---
  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      values: (_ctx: import('@/lib/journey').PlanContext) => {
        // rechnungsstatus ist immer 'entwurf'
        // rechnungsmonat und rechnungsjahr aus rechnungsdatum ableiten
        const datumStr = rechnung.get('rechnungsdatum') as string | null;
        let rechnungsmonat: string | undefined;
        let rechnungsjahr: number | undefined;
        if (datumStr) {
          const d = new Date(datumStr + 'T00:00:00');
          const month = d.getMonth() + 1;
          const year = d.getFullYear();
          rechnungsmonat = MONTH_KEY_MAP[month];
          rechnungsjahr = year;
        }
        return {
          rechnungsstatus: 'entwurf',
          ...(rechnungsmonat ? { rechnungsmonat } : {}),
          ...(rechnungsjahr ? { rechnungsjahr } : {}),
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
      subtitle={tx('Neue Rechnung für Projekt und Kunde anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstellt eine neue Rechnung auf Basis von Zeiterfassungseinträgen.'),
        needs: [tx('Kundendaten'), tx('Projekt'), tx('Abrechenbare Zeiteinträge'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden aus, für den die Rechnung ausgestellt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={rechnung.get('kunde') as string | null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            setKundeId(id);
            // Wenn Kunde wechselt, Projekt zurücksetzen
            if (rechnung.get('projekt')) {
              rechnung.set('projekt', null as unknown as string, undefined);
              setProjektId(null);
            }
            setStep(2);
          }}
          avatar="initials"
          create={false}
          emptyText={tx('Kein Kunde gefunden. Bitte die Suche anpassen.')}
        />
      </WizardStep>

      {/* Schritt 2: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt in Bearbeitung, für das die Rechnung erstellt wird.')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={rechnung.get('projekt') as string | null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setProjektId(id);
            setStep(3);
          }}
          create={false}
          emptyText={
            kundeId
              ? tx('Kein Projekt in Bearbeitung für diesen Kunden gefunden.')
              : tx('Kein Projekt mit Status „In Bearbeitung" gefunden.')
          }
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => rechnung.validate(['projekt'])}
          nextStepLabel={tx('Zeiterfassungseinträge')}
        />
      </WizardStep>

      {/* Schritt 3: Zeiterfassungseinträge auswählen */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle die abrechenbaren Zeiterfassungseinträge für dieses Projekt.')}
        needs={['projekt']}
      >
        <Field form={rechnung} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...zeiterfassung.select}
            {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
            create={false}
            emptyText={
              projektId
                ? tx('Keine abrechenbaren Zeiterfassungseinträge für dieses Projekt gefunden.')
                : tx('Bitte zuerst ein Projekt auswählen.')
            }
            searchPlaceholder={tx('Einträge durchsuchen …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => {
            // Zeiterfassungseinträge sind optional — direkt weiter
            setStep(4);
          }}
          nextStepLabel={tx('Rechnungsdaten')}
        />
      </WizardStep>

      {/* Schritt 4: Rechnungsdatum und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Rechnungsdaten')}
        description={tx('Gib das Rechnungsdatum und das Fälligkeitsdatum ein.')}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => rechnung.validate(['rechnungsdatum'])}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Gib den Nettobetrag und den Mehrwertsteuersatz ein.')}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('in Prozent, z. B. 19')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => rechnung.validate(['nettobetrag', 'mehrwertsteuer'])}
            nextStepLabel={tx('Berater & Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Berater zuweisen und Notizen */}
      <WizardStep
        label={tx('Berater & Notizen')}
        description={tx('Weise beteiligte Berater zu und ergänze optionale Notizen.')}
      >
        <div className="space-y-6">
          <Field form={rechnung} name="berater">
            <EntitySelectStep
              {...berater.select}
              {...rechnung.records('berater', berater.labelOf)}
              avatar="initials"
              create={false}
              emptyText={tx('Kein Berater gefunden.')}
              searchPlaceholder={tx('Berater suchen …')}
            />
          </Field>
          <Bound form={rechnung} name="notizen" rows={4} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => {
              setStep(7);
            }}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Zusammenfassung und Bestätigung */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.')}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
            ]}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden vom System automatisch berechnet und hinterlegt.')}
          next={[
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
