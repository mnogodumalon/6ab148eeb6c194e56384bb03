/**
 * Zeit erfassen — 4-Schritt-Wizard.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Leistung auswählen → 4) Details eingeben → 5) Prüfen & anlegen.
 * Reads: berater, projekte (filter: in_bearbeitung), leistungskatalog.
 * Writes: zeiterfassung (creates one entry with berater, projekt, leistung, datum, stunden, taetigkeit, abrechenbar, erfassungsmonat, erfassungsjahr).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import {
  useRecordSearch,
  useStepForm,
  useJourneySubmit,
  fieldText,
  fieldLookup,
  fieldNumber,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS: Record<number, string> = {
  1: 'januar', 2: 'februar', 3: 'maerz', 4: 'april',
  5: 'mai', 6: 'juni', 7: 'juli', 8: 'august',
  9: 'september', 10: 'oktober', 11: 'november', 12: 'dezember',
};

export default function ZeitErfassenPage() {
  const [step, setStep] = useState(1);

  const beraterSearch = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const projekteSearch = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label ?? undefined,
    }),
  });

  const leistungSearch = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label ?? undefined,
      stats: fieldNumber(l, 'kostenvoranschlag') != null
        ? [{ label: tx('KVA'), value: `${fieldNumber(l, 'kostenvoranschlag')} €` }]
        : [],
    }),
  });

  const today = todayIso();
  const todayDate = new Date(today);
  const monatKey = MONTH_KEYS[todayDate.getMonth() + 1];
  const jahr = todayDate.getFullYear();

  const zeitForm = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      stunden: 4,
      taetigkeit: 4,
      abrechenbar: 4,
    },
    initial: { datum: today },
    required: { leistung: false },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'eintrag',
      entity: 'zeiterfassung',
      form: zeitForm,
      primary: true,
      values: {
        datum: today,
        erfassungsmonat: monatKey,
        erfassungsjahr: jahr,
      },
    },
  ], { draftKey: 'zeit-erfassen' });

  return (
    <IntentWizardShell
      title={tx('Zeit erfassen')}
      subtitle={tx('Arbeitsstunden auf ein Projekt buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[zeitForm]}
      draftKey="zeit-erfassen"
      intro={{
        description: tx('Arbeitsstunden eines Beraters auf ein aktives Projekt und eine Leistung buchen.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung')],
        estimatedMinutes: 2,
      }}
    >
      {/* Step 1: Berater */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater aus, dessen Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...beraterSearch.select}
          selectedId={zeitForm.get('berater') as string}
          onSelect={id => {
            zeitForm.set('berater', id, beraterSearch.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Vorname oder Nachname suchen…')}
          avatar="initials"
        />
      </WizardStep>

      {/* Step 2: Projekt */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle ein aktives Projekt — nur Projekte in Bearbeitung sind wählbar.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekteSearch.select}
          selectedId={zeitForm.get('projekt') as string}
          onSelect={id => {
            zeitForm.set('projekt', id, projekteSearch.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projektkennung suchen…')}
          emptyText={tx('Keine aktiven Projekte gefunden. Lege zuerst ein Projekt an.')}
          avatar="none"
          create={false}
        />
      </WizardStep>

      {/* Step 3: Leistung */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Wähle die erbrachte Leistung aus dem Katalog — optional.')}
        needs={['berater', 'projekt']}
      >
        <EntitySelectStep
          {...leistungSearch.select}
          selectedId={zeitForm.get('leistung') as string}
          onSelect={id => {
            zeitForm.set('leistung', id, leistungSearch.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Leistung suchen…')}
          avatar="none"
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => { setStep(4); }}
          nextStepLabel={tx('Details')}
        />
      </WizardStep>

      {/* Step 4: Details */}
      <WizardStep
        label={tx('Details')}
        description={tx('Anzahl der Stunden, Tätigkeitsbeschreibung und Abrechenbarkeit angeben.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-5">
          <Bound form={zeitForm} name="stunden" hint={tx('Dezimalzahl, z. B. 1.5 für 1 Stunde 30 Minuten')} />
          <Bound form={zeitForm} name="taetigkeit" rows={4} placeholder={tx('Kurze Beschreibung der erbrachten Tätigkeit…')} />
          <Bound form={zeitForm} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => zeitForm.validate(['stunden', 'taetigkeit'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Prüfen & bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[zeitForm]}
            submit={submit}
            items={[
              { key: 'datum', label: tx('Datum'), value: format(todayDate, 'dd.MM.yyyy') },
              { key: 'monat', label: tx('Abrechnungsmonat'), value: `${monatKey.charAt(0).toUpperCase()}${monatKey.slice(1)} ${jahr}` },
            ]}
            whatHappensNext={tx('Der Zeiteintrag wird sofort in der Zeiterfassung gespeichert und ist für die Abrechnung verfügbar.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[zeitForm]}
          submit={submit}
          next={[
            { label: tx('Weitere Zeit erfassen'), onClick: () => { submit.reset(); zeitForm.reset(); setStep(1); } },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die Stunden fließen in die Projektabrechnung ein und können für eine Rechnung verwendet werden.')}
        />
      )}
    </IntentWizardShell>
  );
}
