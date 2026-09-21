/**
 * Angebot erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp & Zeitrahmen → 3) Kosten → 4) Berater wählen → 5) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektstatus), berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsnummer vergeben durch Tool, Status startet als entwurf.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
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

  // Projekte — Schritt 1
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // Berater — Schritt 4 (nur aktive)
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Formular für angebote
  const angebot = useStepForm('angebote', {
    fields: [
      'projekt',
      'angebotstyp',
      'zeitrahmen_anfang',
      'zeitrahmen_ende',
      'dauer',
      'kostentyp',
      'kostenbetrag',
      'beschreibung',
      'angebotsjahr',
      'berater',
    ],
    steps: {
      projekt: 1,
      angebotstyp: 2,
      zeitrahmen_anfang: 2,
      zeitrahmen_ende: 2,
      dauer: 2,
      kostentyp: 3,
      kostenbetrag: 3,
      beschreibung: 3,
      angebotsjahr: 3,
      berater: 4,
    },
    initial: {
      zeitrahmen_anfang: todayIso(),
      angebotsjahr: new Date().getFullYear(),
    },
    // angebotsstatus wird im Plan als 'entwurf' gesetzt — nicht hier gezeigt
    required: { zeitrahmen_ende: false, dauer: false, kostentyp: false, kostenbetrag: false, beschreibung: false, angebotsjahr: false, berater: false },
  });

  // Plan — ein Datensatz anlegen, angebotsstatus fest auf 'entwurf'
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'angebot',
        entity: 'angebote',
        form: angebot,
        primary: true,
        values: { angebotsstatus: 'entwurf' },
      },
    ],
    { draftKey: 'angebot-erstellen' },
  );

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Nummeriertes Angebot zu einem Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstelle ein nummeriertes Angebot zu einem bestehenden Projekt — die Angebotsnummer vergibt das System automatisch.'),
        needs: [tx('Projektnamen'), tx('Angebotstyp und Zeitraum'), tx('Kostenbetrag'), tx('Name des zuständigen Beraters')],
      }}
    >
      {/* Schritt 1 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das du das Angebot erstellen möchtest.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={angebot.get('projekt') as string | null}
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          avatar="none"
          searchPlaceholder={tx('Projektkennung suchen …')}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2 — Angebotstyp & Zeitrahmen */}
      <WizardStep
        label={tx('Angebotstyp & Zeitrahmen')}
        description={tx('Wähle den Angebotstyp und lege den Zeitrahmen fest.')}
        needs={['projekt']}
      >
        <div className="space-y-5">
          <Bound form={angebot} name="angebotstyp" />
          <Bound form={angebot} name="zeitrahmen_anfang" />
          <Bound form={angebot} name="zeitrahmen_ende" />
          <Bound form={angebot} name="dauer" placeholder={tx('z. B. 3 Monate')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['angebotstyp', 'zeitrahmen_anfang'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3 — Kosten */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Gib Kostentyp, Betrag und weitere Details zum Angebot ein.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <div className="space-y-5">
          <Bound form={angebot} name="kostentyp" />
          <Bound form={angebot} name="kostenbetrag" />
          <Bound form={angebot} name="angebotsjahr" />
          <Bound form={angebot} name="beschreibung" rows={4} placeholder={tx('Leistungsumfang, Konditionen …')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => angebot.validate([])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4 — Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den verantwortlichen Berater für dieses Angebot.')}
        needs={['angebotstyp', 'zeitrahmen_anfang']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string | null}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(5);
          }}
          avatar="initials"
          searchPlaceholder={tx('Berater suchen …')}
          emptyText={tx('Kein aktiver Berater gefunden.')}
          create={false}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => angebot.validate([])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5 — Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus_fix',
                label: tx('Angebotsstatus'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Das Angebot wird als Entwurf angelegt — die Angebotsnummer vergibt das System automatisch.')}
            confirmLabel={tx('Angebot anlegen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          restartLabel={tx('Weiteres Angebot erstellen')}
          whatHappensNext={tx('Das Angebot liegt jetzt als Entwurf vor. Du kannst es auf der Plattform weiter bearbeiten und versenden.')}
          next={[
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
