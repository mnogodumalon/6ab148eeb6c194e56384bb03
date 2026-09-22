/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart & Projektstart eingeben
 *         → 3) Projektleitung auswählen → 4) Ansprechpartner & letzter Schritt (optional) → 5) Prüfen & anlegen.
 * Reads: kunden (Kundenauswahl), berater (Projektleitung, nur aktive).
 * Writes: projekte (createProjekteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
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
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  // Kunden-Suche: kundenname, email
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email') || undefined,
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Berater-Suche: nur aktive
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Formular für projekte
  const projekt = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_jahr: 2,
      projektstart_monat: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
    },
    required: {
      // projektstatus wird per values gesetzt — nicht vom Nutzer eingegeben
      projektstatus: false,
      // projektkennung und projektnummer werden vom Tool vergeben
      projektkennung: false,
      projektnummer: false,
      // ansprechpartner_kunde und letzter_schritt sind optional in diesem Flow
      ansprechpartner_kunde: false,
      letzter_schritt: false,
    },
  });

  // Plan: ein Projekt anlegen, projektstatus auf 'akquise' setzen
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'projekt',
        entity: 'projekte',
        form: projekt,
        primary: true,
        values: { projektstatus: 'akquise' },
      },
    ],
    { draftKey: 'projekt-anlegen' },
  );

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      subtitle={tx('Neues Projekt für einen bestehenden Kunden erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[projekt]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Legt ein neues Projekt für einen bestehenden Kunden an.'),
        needs: [tx('Kundenname oder E-Mail'), tx('Projektart und Startdatum'), tx('Name der Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunde auswählen */}
      <WizardStep
        label={tx('Kunde')}
        heading={tx('Kunden auswählen')}
        description={tx('Wähle den Kunden, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={projekt.get('kunde') as string | null}
          onSelect={id => {
            projekt.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Nach Name oder E-Mail suchen …')}
          avatar="initials"
          columns={2}
          create={false}
          emptyText={tx('Kein Kunde gefunden. Bitte zuerst einen Kunden im System anlegen.')}
        />
      </WizardStep>

      {/* Schritt 2: Projektart und Projektstart */}
      <WizardStep
        label={tx('Projektdetails')}
        heading={tx('Projektart und Startdatum')}
        description={tx('Wähle die Projektart und gib das geplante Startdatum an.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={projekt} name="projektart" />
          <Bound form={projekt} name="projektstart_jahr" hint={tx('z. B. 2025')} />
          <Bound form={projekt} name="projektstart_monat" allowClear />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => projekt.validate(['projektart', 'projektstart_jahr'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Projektleitung auswählen */}
      <WizardStep
        label={tx('Projektleitung')}
        heading={tx('Projektleitung auswählen')}
        description={tx('Wähle den Berater, der die Projektleitung übernimmt.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={projekt.get('projektleitung') as string | null}
          onSelect={id => {
            projekt.set('projektleitung', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Nach Vor- oder Nachname suchen …')}
          avatar="initials"
          columns={2}
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden. Nur Berater mit Status „Aktiv" können die Projektleitung übernehmen.')}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextStepLabel={tx('Weitere Angaben')}
            nextLabel={tx('Überspringen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Ansprechpartner und letzter Schritt (optional) */}
      <WizardStep
        label={tx('Weitere Angaben')}
        heading={tx('Optionale Angaben')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Projektstand optional erfassen.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <div className="space-y-5">
          <Bound form={projekt} name="ansprechpartner_kunde" hint={tx('Name der zuständigen Person beim Kunden')} />
          <Bound form={projekt} name="letzter_schritt" rows={3} hint={tx('Aktueller Stand oder nächste Maßnahme')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextStepLabel={tx('Prüfen & anlegen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Prüfen & bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[projekt]}
            submit={submit}
            items={[
              {
                key: 'projektstatus',
                label: tx('Projektstatus'),
                value: tx('Akquise'),
              },
            ]}
            whatHappensNext={tx('Das Projekt wird angelegt. Projektkennung und -nummer werden automatisch vom System vergeben.')}
            confirmLabel={tx('Projekt anlegen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsbildschirm */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projekt]}
          submit={submit}
          whatHappensNext={tx('Jetzt kannst du ein Angebot für dieses Projekt erstellen.')}
          next={[
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            {
              label: tx('Weiteres Projekt anlegen'),
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
