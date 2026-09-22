/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projekt auswählen (gefiltert nach Kunde) →
 *        3) Zeiterfassungseinträge auswählen (optional, gefiltert nach Projekt) →
 *        4) Beträge & Datum eingeben → 5) Berater:innen auswählen → 6) Prüfen & anlegen.
 * Reads: kunden, projekte (filtered by customer), zeiterfassung (filtered by project), berater.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Textarea } from '@/components/ui/textarea';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldNumber,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monthKeyFromDateStr(dateStr: string): string {
  // date-fns getMonth returns 0-based index
  const parts = dateStr.split('-');
  const monthIdx = parseInt(parts[1] ?? '1', 10) - 1;
  return MONTH_KEYS[monthIdx] ?? 'januar';
}

function yearFromDateStr(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Kunde auswählen — all customers qualify
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
      status: fieldLookup(k, 'kundentyp') ?? undefined,
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Step 2: Projekt auswählen — only projects for selected customer
  const [kundeId, setKundeId] = useState<string | null>(null);
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: kundeId ? refFilter('kunde', kundeId) : undefined,
    where: kundeId ? r => {
      const ref = r.fields['kunde'];
      if (typeof ref === 'string') return ref.includes(kundeId);
      return false;
    } : undefined,
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // Step 3: Zeiterfassungseinträge auswählen — only entries for selected project (optional)
  const [projektId, setProjektId] = useState<string | null>(null);
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: [],
    filter: projektId ? refFilter('projekt', projektId) : tx('r.v_abrechenbar == True'),
    where: projektId ? r => {
      const ref = r.fields['projekt'];
      if (typeof ref === 'string') return ref.includes(projektId);
      return false;
    } : r => {
      const abrechenbar = r.fields['abrechenbar'];
      return Boolean(abrechenbar);
    },
    toItem: (z, _ctx) => ({
      id: z.id,
      title: fieldText(z, 'datum'),
      subtitle: tx`${fieldText(z, 'datum')} · ${fieldNumber(z, 'stunden') ?? 0} Std.`,
    }),
  });

  // Step 5: Berater auswählen — all consultants qualify
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
    }),
    orderby: ['r.v_nachname asc'],
  });

  // ONE form for rechnungen
  const rechnung = useStepForm('rechnungen', {
    steps: {
      kunde: 1,
      projekt: 2,
      zeiterfassungseintraege: 3,
      rechnungsdatum: 4,
      faelligkeitsdatum: 4,
      nettobetrag: 4,
      mehrwertsteuer: 4,
      berater: 5,
      notizen: 6,
    },
    required: {
      zeiterfassungseintraege: false,
      notizen: false,
      faelligkeitsdatum: false,
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
        return {
          rechnungsstatus: 'entwurf',
          rechnungsmonat: rechnungsdatum ? monthKeyFromDateStr(rechnungsdatum) : 'januar',
          rechnungsjahr: rechnungsdatum ? yearFromDateStr(rechnungsdatum) : new Date().getFullYear(),
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
      subtitle={tx('Neue Rechnung zu einem Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstelle eine Rechnung für einen Kunden und ein Projekt.'),
        needs: [tx('Kundendaten'), tx('Projektzuordnung'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Schritt 1: Kunde auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden aus, dem die Rechnung gestellt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={rechnung.get('kunde') as string | null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            // Reset downstream selections when customer changes
            if (id !== kundeId) {
              rechnung.set('projekt', null as unknown as string, undefined);
              rechnung.set('zeiterfassungseintraege', [] as string[], undefined);
              setProjektId(null);
            }
            setKundeId(id);
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Kunden suchen…')}
          columns={2}
        />
      </WizardStep>

      {/* Schritt 2: Projekt auswählen (gefiltert nach Kunde) */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt aus, auf das sich die Rechnung bezieht.')}
        needs={['kunde']}
      >
        {rechnung.get('kunde') ? (
          <EntitySelectStep
            {...projekte.select}
            selectedId={rechnung.get('projekt') as string | null}
            onSelect={id => {
              rechnung.set('projekt', id, projekte.labelOf(id));
              // Reset zeiterfassung when project changes
              if (id !== projektId) {
                rechnung.set('zeiterfassungseintraege', [] as string[], undefined);
              }
              setProjektId(id);
              setStep(3);
            }}
            emptyText={tx('Diesem Kunden sind noch keine Projekte zugeordnet.')}
            searchPlaceholder={tx('Projekt suchen…')}
            columns={2}
          />
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Bitte zuerst einen Kunden auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      {/* Schritt 3: Zeiterfassungseinträge auswählen (optional) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle optional Zeiterfassungseinträge aus, die mit dieser Rechnung verknüpft werden sollen.')}
        needs={['projekt']}
      >
        {rechnung.get('projekt') ? (
          <>
            <Field form={rechnung} name="zeiterfassungseintraege" hint={tx('Optional — du kannst auch ohne Einträge fortfahren.')}>
              <EntitySelectStep
                {...zeiterfassung.select}
                {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
                emptyText={tx('Für dieses Projekt wurden noch keine Zeiterfassungseinträge angelegt.')}
                searchPlaceholder={tx('Einträge suchen…')}
                columns={1}
                create={false}
              />
            </Field>
            <StepNav
              onBack={() => setStep(2)}
              onNext={() => { setStep(4); }}
              nextStepLabel={tx('Beträge & Datum')}
            />
          </>
        ) : (
          <StepNav onBack={() => setStep(2)} nextDisabled>
            {tx('Bitte zuerst ein Projekt auswählen.')}
          </StepNav>
        )}
      </WizardStep>

      {/* Schritt 4: Rechnungsdatum, Fälligkeitsdatum, Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge & Datum')}
        description={tx('Gib Datum und Beträge für die Rechnung ein.')}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <Bound form={rechnung} name="nettobetrag" />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('Mehrwertsteuersatz in Prozent, z. B. 19')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => rechnung.validate(['rechnungsdatum', 'nettobetrag', 'mehrwertsteuer'])}
            nextStepLabel={tx('Berater:innen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Beteiligte Berater:innen auswählen */}
      <WizardStep
        label={tx('Berater:innen')}
        description={tx('Wähle die an der Rechnung beteiligten Berater:innen aus.')}
      >
        <Field form={rechnung} name="berater" hint={tx('Optional — mehrere Berater:innen möglich.')}>
          <EntitySelectStep
            {...berater.select}
            {...rechnung.records('berater', berater.labelOf)}
            avatar="initials"
            searchPlaceholder={tx('Berater:in suchen…')}
            columns={2}
            create={{ fields: ['vorname', 'nachname'] }}
          />
        </Field>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => { setStep(6); }}
          nextStepLabel={tx('Prüfen & Anlegen')}
        />
      </WizardStep>

      {/* Schritt 6: Notizen und Prüfen */}
      <WizardStep
        label={tx('Notizen & Prüfen')}
        description={tx('Ergänze optionale Notizen und prüfe alle Angaben.')}
      >
        {!submit.done && (
          <>
            <div className="space-y-4 mb-6">
              <Field form={rechnung} name="notizen" hint={tx('Optional')}>
                <Textarea {...rechnung.field('notizen')} rows={3} />
              </Field>
            </div>
            <SummaryStep
              forms={[rechnung]}
              submit={submit}
              items={[
                {
                  key: '_status',
                  label: tx('Rechnungsstatus'),
                  value: tx('Entwurf'),
                },
              ]}
              whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.')}
              confirmLabel={tx('Rechnung anlegen')}
            />
          </>
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
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch berechnet und eingetragen.')}
        />
      )}
    </IntentWizardShell>
  );
}
