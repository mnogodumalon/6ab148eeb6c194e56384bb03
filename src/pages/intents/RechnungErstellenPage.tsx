/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Berater wählen → 4) Zeiterfassungseinträge wählen → 5) Rechnungsdetails → 6) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung (abrechenbar=true). Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep, Bound, Field.
 */
import { useState } from 'react';
import { getMonth, parseISO, getYear } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldDate,
  fieldNumber,
  fieldLookup,
  refFilter,
  combineFilters,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function rechnungsmonatKey(isoDate: string): string {
  const m = getMonth(parseISO(isoDate)); // 0-based
  return MONTH_KEYS[m];
}

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1 — Kunden
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: `${fieldText(k, 'email')} · ${fieldText(k, 'ort')}`,
    }),
  });

  // Step 2 — Projekte (filtered by selected kunde once known)
  const [selectedKundeId, setSelectedKundeId] = useState<string | null>(null);
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: selectedKundeId ? combineFilters(refFilter('kunde', selectedKundeId)) : undefined,
    where: selectedKundeId
      ? r => {
          const raw = r.fields['kunde'];
          if (!raw) return false;
          return typeof raw === 'string' && raw.includes(selectedKundeId);
        }
      : undefined,
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Step 3 — Berater (multipleapplookup)
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  // Step 4 — Zeiterfassungseinträge (abrechenbar = true, multipleapplookup)
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: ['taetigkeit'],
    filter: "r.v_abrechenbar == True",
    where: r => r.fields['abrechenbar'] === true,
    toItem: z => ({
      id: z.id,
      title: fieldText(z, 'taetigkeit') || fieldDate(z, 'datum') || z.id,
      subtitle: (() => {
        const datum = fieldDate(z, 'datum');
        const stunden = fieldNumber(z, 'stunden');
        return [datum, stunden != null ? `${stunden} h` : null].filter(Boolean).join(' · ');
      })(),
    }),
  });

  // Main form for rechnungen
  const rechnung = useStepForm('rechnungen', {
    fields: [
      'kunde', 'projekt', 'berater', 'zeiterfassungseintraege',
      'rechnungsdatum', 'faelligkeitsdatum', 'nettobetrag', 'mehrwertsteuer', 'notizen',
    ],
    steps: {
      kunde: 1,
      projekt: 2,
      berater: 3,
      zeiterfassungseintraege: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      notizen: 5,
    },
    required: {
      faelligkeitsdatum: false,
      mehrwertsteuer: false,
      notizen: false,
      zeiterfassungseintraege: false,
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      values: (_ctx) => {
        const rechnungsdatum = rechnung.get('rechnungsdatum') as string | null;
        const rechnungsmonat = rechnungsdatum ? rechnungsmonatKey(rechnungsdatum) : undefined;
        const rechnungsjahr = rechnungsdatum ? getYear(parseISO(rechnungsdatum)) : undefined;
        return {
          rechnungsstatus: 'entwurf',
          ...(rechnungsmonat ? { rechnungsmonat } : {}),
          ...(rechnungsjahr ? { rechnungsjahr } : {}),
        };
      },
    },
  ], { draftKey: 'rechnung-erstellen' });

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Neue Rechnung zu einem Projekt anlegen und Zeiterfassungseinträge verknüpfen.'),
        needs: [tx('Kundendaten'), tx('Zugehöriges Projekt'), tx('Nettobetrag')],
      }}
    >
      {/* Step 1 — Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird diese Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={rechnung.get('kunde') as string | null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            setSelectedKundeId(id);
            // Reset projekt selection when kunde changes
            rechnung.set('projekt', null as unknown as string, undefined);
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Kunde suchen …')}
          create={false}
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll abgerechnet werden?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={rechnung.get('projekt') as string | null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          emptyText={
            selectedKundeId
              ? tx('Keine Projekte für diesen Kunden gefunden.')
              : tx('Bitte zuerst einen Kunden wählen.')
          }
          searchPlaceholder={tx('Projekt suchen …')}
          create={false}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => rechnung.validate(['projekt'])}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Step 3 — Berater wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater sind an dieser Rechnung beteiligt?')}
        needs={['projekt']}
      >
        <Field form={rechnung} name="berater">
          <EntitySelectStep
            {...berater.select}
            {...rechnung.records('berater', berater.labelOf)}
            avatar="initials"
            searchPlaceholder={tx('Berater suchen …')}
            create={false}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => rechnung.validate(['berater'])}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Step 4 — Zeiterfassungseinträge wählen (multipleapplookup, optional) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Abrechenbare Zeiterfassungseinträge auswählen, die auf der Rechnung erscheinen sollen.')}
        needs={['projekt']}
      >
        <Field form={rechnung} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...zeiterfassung.select}
            {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
            emptyText={tx('Keine abrechenbaren Zeiterfassungseinträge vorhanden.')}
            searchPlaceholder={tx('Tätigkeit oder Datum suchen …')}
            create={false}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => true}
          nextStepLabel={tx('Rechnungsdetails')}
        />
      </WizardStep>

      {/* Step 5 — Rechnungsdetails */}
      <WizardStep
        label={tx('Rechnungsdetails')}
        description={tx('Datum, Betrag und Mehrwertsteuer erfassen.')}
        needs={['kunde', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('In Prozent, z. B. 19')} />
          <Bound form={rechnung} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => rechnung.validate(['rechnungsdatum', 'nettobetrag'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            items={[
              {
                key: 'rechnungsstatus_fixed',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Die Rechnungsnummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          whatHappensNext={tx('Die Rechnung ist als Entwurf angelegt. Sie kann jetzt geprüft und versendet werden.')}
          next={[
            {
              label: tx('Weitere Rechnung erstellen'),
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
        />
      )}
    </IntentWizardShell>
  );
}
