/**
 * Rechnung erstellen — 4-Schritt-Wizard (inkl. Prüfen).
 * Steps: 1) Kunde + Projekt wählen → 2) Zeiterfassungseinträge + Berater → 3) Beträge & Metadaten → 4) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung, berater. Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Field, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
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
import { LOOKUP_OPTIONS } from '@/types/app';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Kunden-Suche — alle Kunden sind erlaubt
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
    }),
  });

  // Step 1: Projekte — nur in_bearbeitung oder abgeschlossen
  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['in_bearbeitung', 'abgeschlossen']",
    where: r => {
      const s = fieldLookup(r, 'projektstatus')?.key;
      return s === 'in_bearbeitung' || s === 'abgeschlossen';
    },
    searchFields: ['projektkennung', 'ansprechpartner_kunde'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektstatus')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Step 2: Zeiterfassungseinträge — nur abrechenbar=true
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    filter: "r.v_abrechenbar == True",
    where: r => r.fields['abrechenbar'] === true,
    searchFields: ['taetigkeit'],
    toItem: z => ({
      id: z.id,
      title: fieldText(z, 'taetigkeit') || tx('Ohne Beschreibung'),
      subtitle: fieldText(z, 'datum'),
    }),
  });

  // Step 2: Berater-Suche
  const beraterSearch = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich'),
    }),
  });

  // Formular für rechnungen — alle Felder mit ihrer jeweiligen Schritt-Zuordnung
  const f = useStepForm('rechnungen', {
    steps: {
      kunde: 1,
      projekt: 1,
      zeiterfassungseintraege: 2,
      berater: 2,
      rechnungsnummer: 3,
      rechnungsdatum: 3,
      faelligkeitsdatum: 3,
      rechnungsmonat: 3,
      rechnungsjahr: 3,
      nettobetrag: 3,
      mehrwertsteuer: 3,
      gesamtbetrag: 3,
      rechnungsstatus: 3,
      notizen: 3,
    },
    initial: {
      rechnungsdatum: todayIso(),
      rechnungsstatus:
        (LOOKUP_OPTIONS['rechnungen']?.['rechnungsstatus'] ?? [])[0]?.key ?? 'entwurf',
    },
  });

  const submit = useJourneySubmit(
    servicePort,
    [{ key: 'rechnung', entity: 'rechnungen', form: f, primary: true }],
    { draftKey: 'rechnung-erstellen' }
  );

  const rechnungsstatusOptionen =
    LOOKUP_OPTIONS['rechnungen']?.['rechnungsstatus'] ?? [];

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      subtitle={tx('Neue Rechnung in 3 Schritten anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Kunden und Projekt festlegen, Zeiteinträge zuordnen, Beträge und Status erfassen.'),
        needs: [tx('Kundendaten'), tx('Projektkürzel'), tx('Rechnungsnummer')],
      }}
    >
      {/* ─── Schritt 1: Kunde + Projekt ─── */}
      <WizardStep
        label={tx('Kunde & Projekt')}
        description={tx('Wähle den Kunden und das zugehörige Projekt für diese Rechnung.')}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">{tx('Kunde')}</p>
            <EntitySelectStep
              {...kunden.select}
              selectedId={f.get('kunde') as string | null}
              onSelect={id => f.set('kunde', id, kunden.labelOf(id))}
              searchPlaceholder={tx('Name oder E-Mail suchen…')}
              avatar="initials"
              columns={2}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">{tx('Projekt')}</p>
            <EntitySelectStep
              {...projekte.select}
              selectedId={f.get('projekt') as string | null}
              onSelect={id => f.set('projekt', id, projekte.labelOf(id))}
              searchPlaceholder={tx('Projektkennung oder Ansprechpartner…')}
              emptyText={tx('Kein aktives oder abgeschlossenes Projekt gefunden.')}
              columns={2}
            />
          </div>

          <StepNav
            hideBack
            onNext={() => f.validate(['kunde', 'projekt'])}
            nextStepLabel={tx('Zeiteinträge & Berater')}
          />
        </div>
      </WizardStep>

      {/* ─── Schritt 2: Zeiterfassungseinträge + Berater ─── */}
      <WizardStep
        label={tx('Zeiteinträge & Berater')}
        description={tx('Abrechenbare Zeiteinträge und beteiligte Berater für diese Rechnung auswählen.')}
        needs={['kunde', 'projekt']}
      >
        <div className="space-y-6">
          <Field form={f} name="zeiterfassungseintraege">
            <EntitySelectStep
              {...zeiterfassung.select}
              {...f.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
              searchPlaceholder={tx('Tätigkeit suchen…')}
              emptyText={tx('Keine abrechenbaren Zeiteinträge vorhanden.')}
              columns={2}
              create={false}
            />
          </Field>

          <Field form={f} name="berater">
            <EntitySelectStep
              {...beraterSearch.select}
              {...f.records('berater', beraterSearch.labelOf)}
              searchPlaceholder={tx('Berater nach Name suchen…')}
              avatar="initials"
              columns={2}
            />
          </Field>

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['zeiterfassungseintraege', 'berater'])}
            nextStepLabel={tx('Beträge & Metadaten')}
          />
        </div>
      </WizardStep>

      {/* ─── Schritt 3: Beträge + Metadaten ─── */}
      <WizardStep
        label={tx('Beträge & Metadaten')}
        description={tx('Rechnungsnummer, Datum, Beträge und Status festhalten.')}
        needs={['kunde', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsnummer" placeholder={tx('z. B. RE-2026-001')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="rechnungsdatum" />
            <Bound form={f} name="faelligkeitsdatum" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="rechnungsmonat" />
            <Bound form={f} name="rechnungsjahr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Bound form={f} name="nettobetrag" />
            <Bound form={f} name="mehrwertsteuer" hint={tx('Prozent, z. B. 19')} />
            <Bound form={f} name="gesamtbetrag" />
          </div>

          <Field form={f} name="rechnungsstatus">
            <ChoiceGroup {...f.choice('rechnungsstatus')} options={rechnungsstatusOptionen} />
          </Field>

          <Bound form={f} name="notizen" rows={3} />

          <StepNav
            onBack={() => setStep(2)}
            onNext={() =>
              f.validate(['rechnungsnummer', 'rechnungsdatum', 'rechnungsstatus'])
            }
            nextStepLabel={tx('Prüfen & anlegen')}
          />
        </div>
      </WizardStep>

      {/* ─── Schritt 4: Zusammenfassung ─── */}
      <WizardStep label={tx('Prüfen & anlegen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            confirmLabel={tx('Rechnung anlegen')}
            whatHappensNext={tx(
              'Die Rechnung wird sofort angelegt. Zeiterfassungseinträge und Berater sind direkt verknüpft.'
            )}
          />
        )}
      </WizardStep>

      {/* ─── Erfolgsmeldung ─── */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          whatHappensNext={tx(
            'Du kannst direkt weitere Zeit buchen oder ein neues Angebot erstellen.'
          )}
          next={[
            {
              label: tx('Zeit buchen'),
              href: '#/intents/zeiterfassung-buchen',
            },
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
