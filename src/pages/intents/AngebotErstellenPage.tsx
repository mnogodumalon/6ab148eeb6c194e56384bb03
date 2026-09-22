/**
 * Angebot erstellen — 4-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp, Zeitrahmen & Berater wählen
 *        → 3) Kosten & Beschreibung eingeben → 4) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (creates one AngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup,
 *           Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
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

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  // --- Projekt-Suche ---
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektstatus')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // --- Berater-Suche ---
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // --- Formular: ein StepForm für alle Angebot-Felder ---
  const f = useStepForm('angebote', {
    steps: {
      projekt: 1,
      angebotstyp: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      berater: 2,
      kostenbetrag: 3,
      kostentyp: 3,
      beschreibung: 3,
    },
    initial: {
      zeitrahmen_anfang: todayIso(),
    },
    required: {
      // angebotsnummer und angebotsjahr werden per Tool vergeben, nicht vom User
      angebotsnummer: false,
      angebotsjahr: false,
      // zeitrahmen_ende und kostentyp sind optional
      zeitrahmen_ende: false,
      kostentyp: false,
      kostenbetrag: false,
      dauer: false,
      beschreibung: false,
    },
  });

  // --- Submit-Plan ---
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'angebot',
        entity: 'angebote',
        form: f,
        primary: true,
        values: {
          angebotsstatus: 'entwurf',
          angebotsjahr: new Date().getFullYear(),
        },
      },
    ],
    { draftKey: 'angebot-erstellen' },
  );

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Neues Angebot zu einem Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem bestehenden Projekt.'),
        needs: [tx('Projektkennung'), tx('Angebotstyp und Zeitrahmen'), tx('Kostenbetrag')],
      }}
    >
      {/* ── Schritt 1: Projekt wählen ── */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Zu welchem Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          avatar="none"
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
        />
      </WizardStep>

      {/* ── Schritt 2: Angebotstyp, Zeitrahmen & Berater ── */}
      <WizardStep
        label={tx('Typ & Zeitrahmen')}
        description={tx('Angebotstyp, Beginn, Ende, Dauer und zuständigen Berater festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-5">
          <Bound form={f} name="angebotstyp" />
          <Bound form={f} name="zeitrahmen_anfang" />
          <Bound form={f} name="zeitrahmen_ende" />
          <Bound form={f} name="dauer" placeholder={tx('z. B. 3 Monate')} />

          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-3">
              {tx('Zuständiger Berater')}
            </p>
            <EntitySelectStep
              {...berater.select}
              selectedId={f.get('berater') as string}
              onSelect={id => {
                f.set('berater', id, berater.labelOf(id));
              }}
              avatar="initials"
              searchPlaceholder={tx('Berater suchen …')}
              create={false}
              emptyText={tx('Kein Berater gefunden.')}
            />
          </div>

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['angebotstyp', 'zeitrahmen_anfang', 'berater'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* ── Schritt 3: Kosten & Beschreibung ── */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostenbetrag, Kostentyp und Beschreibung des Leistungsumfangs eingeben.')}
        needs={['angebotstyp', 'berater']}
      >
        <div className="space-y-5">
          <Bound form={f} name="kostenbetrag" />
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="beschreibung" rows={4} />

          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['kostenbetrag', 'kostentyp', 'beschreibung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* ── Schritt 4: Zusammenfassung & Bestätigen ── */}
      <WizardStep label={tx('Prüfen')} needs={['angebotstyp', 'berater']}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus',
                label: tx('Angebotsstatus'),
                value: tx('Entwurf'),
              },
              {
                key: 'angebotsjahr',
                label: tx('Angebotsjahr'),
                value: String(new Date().getFullYear()),
              },
            ]}
            whatHappensNext={tx(
              'Nach dem Speichern wird automatisch eine Angebotsnummer vergeben und ein PDF aus dem Angebots-Template erzeugt.',
            )}
            confirmLabel={tx('Angebot anlegen')}
          />
        )}
      </WizardStep>

      {/* ── Erfolgsseite ── */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx(
            'Die Angebotsnummer wurde automatisch vergeben. Das PDF wird im Hintergrund erzeugt und als Anhang hinterlegt.',
          )}
          next={[
            {
              label: tx('Weiteres Angebot erstellen'),
            },
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
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
