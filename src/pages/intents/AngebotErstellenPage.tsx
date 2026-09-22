/**
 * Angebot erstellen — 3-Schritt-Wizard.
 * Steps: 1) Angebotstyp + Projekt wählen → 2) Berater + Zeitrahmen festlegen → 3) Kosten + Beschreibung → Prüfen & anlegen.
 * Reads: projekte (filter: in_bearbeitung|akquise), berater (filter: aktiv).
 * Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  todayIso,
  fieldText,
  fieldLookup,
  combineFilters,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { LOOKUP_OPTIONS } from '@/types/app';
import { DatePicker } from '@/components/DatePicker';
import { Input } from '@/components/ui/input';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const currentYear = new Date().getFullYear();

  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: combineFilters(tx('r.v_projektstatus == \'in_bearbeitung\''), tx('r.v_projektstatus == \'akquise\'')),
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'in_bearbeitung' || key === 'akquise';
    },
    searchFields: ['projektkennung', 'ansprechpartner_kunde'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldText(p, 'ansprechpartner_kunde') || undefined,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich') || undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const angebot = useStepForm('angebote', {
    steps: {
      angebotstyp: 1,
      angebotsnummer: 1,
      angebotsjahr: 1,
      projekt: 1,
      berater: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 3,
      kostenbetrag: 3,
      angebotsstatus: 3,
      beschreibung: 3,
    },
    initial: {
      angebotsjahr: currentYear,
      angebotsstatus: LOOKUP_OPTIONS['angebote']?.['angebotsstatus']?.find(o => o.key === 'entwurf')?.key ?? 'entwurf',
    },
    required: { zeitrahmen_ende: false, dauer: false, kostentyp: false, kostenbetrag: false, beschreibung: false, projekt: false },
  });

  const submit = useJourneySubmit(servicePort, [
    { key: 'angebot', entity: 'angebote', form: angebot, primary: true },
  ], { draftKey: 'angebot-erstellen' });

  const angebotstyp_options = LOOKUP_OPTIONS['angebote']?.['angebotstyp'] ?? [];
  const kostentyp_options = LOOKUP_OPTIONS['angebote']?.['kostentyp'] ?? [];
  const angebotsstatus_options = LOOKUP_OPTIONS['angebote']?.['angebotsstatus'] ?? [];

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Neues Angebot in 3 Schritten anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Ein neues Angebot anlegen und einem Projekt und Berater zuweisen.'),
        needs: [tx('Angebotstyp'), tx('Angebotsnummer'), tx('Zuständiger Berater')],
      }}
    >
      {/* Schritt 1: Angebotstyp + Projekt */}
      <WizardStep
        label={tx('Angebotstyp & Projekt')}
        description={tx('Wähle den Angebotstyp, vergib eine Nummer und weise optional ein aktives Projekt zu.')}
      >
        <div className="space-y-6">
          <Field form={angebot} name="angebotstyp">
            <ChoiceGroup {...angebot.choice('angebotstyp')} options={angebotstyp_options} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field form={angebot} name="angebotsnummer">
              <Input {...angebot.number('angebotsnummer')} placeholder={tx('z. B. 1042')} />
            </Field>
            <Field form={angebot} name="angebotsjahr">
              <Input {...angebot.number('angebotsjahr')} />
            </Field>
          </div>

          <div className="space-y-2">
            <EntitySelectStep
              {...projekte.select}
              selectedId={angebot.get('projekt') as string | null}
              onSelect={id => { angebot.set('projekt', id, projekte.labelOf(id)); }}
              emptyText={tx('Keine aktiven Projekte gefunden. Nur Projekte mit Status „In Bearbeitung" oder „Akquise" werden angezeigt.')}
              searchPlaceholder={tx('Projektkennung oder Ansprechpartner suchen…')}
              avatar="none"
              columns={2}
            />
          </div>

          <StepNav
            hideBack
            onNext={() => angebot.validate(['angebotstyp', 'angebotsnummer', 'angebotsjahr'])}
            nextStepLabel={tx('Berater & Zeitrahmen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: Berater + Zeitrahmen */}
      <WizardStep
        label={tx('Berater & Zeitrahmen')}
        description={tx('Wähle den zuständigen Berater und lege den Zeitrahmen des Angebots fest.')}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <EntitySelectStep
              {...berater.select}
              selectedId={angebot.get('berater') as string | null}
              onSelect={id => { angebot.set('berater', id, berater.labelOf(id)); }}
              emptyText={tx('Keine aktiven Berater gefunden.')}
              searchPlaceholder={tx('Vor- oder Nachname suchen…')}
              avatar="initials"
            />
          </div>

          <Field form={angebot} name="zeitrahmen_anfang">
            <DatePicker {...angebot.date('zeitrahmen_anfang')} />
          </Field>

          <Field form={angebot} name="zeitrahmen_ende" hint={tx('Kann leer bleiben, wenn noch kein Enddatum bekannt.')}>
            <DatePicker {...angebot.date('zeitrahmen_ende')} />
          </Field>

          <Bound form={angebot} name="dauer" placeholder={tx('z. B. 3 Monate, Q1 2027')} hint={tx('Freitextliche Beschreibung der Laufzeit')} />

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['berater', 'zeitrahmen_anfang'])}
            nextStepLabel={tx('Kosten & Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Kosten + Beschreibung */}
      <WizardStep
        label={tx('Kosten & Beschreibung')}
        description={tx('Kostentyp, Betrag, Angebotsstatus und Leistungsumfang eingeben.')}
      >
        <div className="space-y-6">
          <Field form={angebot} name="kostentyp">
            <ChoiceGroup {...angebot.choice('kostentyp')} options={kostentyp_options} allowClear />
          </Field>

          <Bound form={angebot} name="kostenbetrag" placeholder={tx('z. B. 12500')} hint={tx('Betrag in Euro')} />

          <Field form={angebot} name="angebotsstatus">
            <ChoiceGroup {...angebot.choice('angebotsstatus')} options={angebotsstatus_options} />
          </Field>

          <Bound form={angebot} name="beschreibung" rows={4} placeholder={tx('Leistungsumfang, Konditionen, Besonderheiten …')} />

          <StepNav
            onBack={() => setStep(2)}
            onNext={() => angebot.validate(['angebotsstatus'])}
            nextStepLabel={tx('Prüfen & anlegen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zusammenfassung */}
      <WizardStep label={tx('Prüfen & anlegen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            whatHappensNext={tx('Das Angebot wird sofort angelegt und ist in der Angebotsübersicht sichtbar.')}
            confirmLabel={tx('Angebot anlegen')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[angebot]}
            submit={submit}
            restartLabel={tx('Weiteres Angebot erstellen')}
            whatHappensNext={tx('Das Angebot kann jetzt weiter bearbeitet, versendet oder in eine Rechnung umgewandelt werden.')}
            next={[
              { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
              { label: tx('Zeit buchen'), href: '#/intents/zeiterfassung-buchen' },
              { label: tx('Zum Dashboard'), href: '#/' },
            ]}
          />
        )}
      </WizardStep>
    </IntentWizardShell>
  );
}
