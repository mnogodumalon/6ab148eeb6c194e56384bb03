/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart, Startmonat/-jahr & Projektleitung →
 *        3) Ansprechpartner & letzter Schritt (optional) → 4) Prüfen & anlegen.
 * Reads: kunden (kundenname, email, ansprechpartner_vorname/nachname), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektnummer/projektkennung vergeben das Tool.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav,
 *            SummaryStep, SuccessStep.
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

  // Kunden-Suche
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email', 'ansprechpartner_vorname', 'ansprechpartner_nachname'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: [
        fieldText(k, 'ansprechpartner_vorname'),
        fieldText(k, 'ansprechpartner_nachname'),
      ].filter(Boolean).join(' ') || fieldText(k, 'email'),
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Berater-Suche (nur aktive)
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Formular für projekte — steps-Map steuert, auf welchem Schritt ein Feld sitzt
  const f = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      projektleitung: 2,
      ansprechpartner_kunde: 3,
      letzter_schritt: 3,
    },
    required: {
      // Felder, die das Tool nachträglich vergeben — hier nicht abfragen
      projektkennung: false,
      projektnummer: false,
      // Optionale Felder in Schritt 3
      ansprechpartner_kunde: false,
      letzter_schritt: false,
      // Projektleitung optional halten (kein required! in Schema)
      projektleitung: false,
      // Startmonat/-jahr optional
      projektstart_monat: false,
      projektstart_jahr: false,
    },
  });

  // Plan: ein Datensatz in projekte; projektstatus fest auf 'akquise'
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'projekt',
        entity: 'projekte',
        form: f,
        primary: true,
        values: { projektstatus: 'akquise' },
      },
    ],
    { draftKey: 'projekt-anlegen' },
  );

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Neues Projekt anlegen, Kunden und Projektleitung zuweisen.'),
        needs: [tx('Kundenname'), tx('Projektart'), tx('Name der Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden aus, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kunde suchen …')}
          create={{ fields: ['kundenname', 'email', 'kundentyp', 'anlagedatum'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projektart, Startmonat/-jahr & Projektleitung */}
      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Projektart, geplanten Start und Projektleitung festlegen.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={f} name="projektart" />
          <Bound form={f} name="projektstart_monat" />
          <Bound form={f} name="projektstart_jahr" />

          {/* Projektleitung — EntitySelectStep */}
          <div className="space-y-1">
            <p className="text-sm font-medium">{tx('Projektleitung')}</p>
            <EntitySelectStep
              {...berater.select}
              selectedId={f.get('projektleitung') as string}
              onSelect={id => {
                f.set('projektleitung', id, berater.labelOf(id));
              }}
              searchPlaceholder={tx('Berater suchen …')}
              emptyText={tx('Kein aktiver Berater gefunden.')}
              create={false}
              avatar="initials"
            />
          </div>

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['projektart'])}
            nextStepLabel={tx('Ansprechpartner')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Ansprechpartner beim Kunden und letzter Schritt (optional) */}
      <WizardStep
        label={tx('Weitere Angaben')}
        description={tx('Ansprechpartner und aktuellen Stand optional erfassen.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={f} name="ansprechpartner_kunde" />
          <Bound form={f} name="letzter_schritt" rows={4} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => true}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zusammenfassung & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              {
                key: 'projektstatus',
                label: tx('Projektstatus'),
                value: tx('Akquise'),
              },
            ]}
            whatHappensNext={tx(
              'Das Projekt wird angelegt. Projektnummer und Kennung werden automatisch vergeben.',
            )}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx(
            'Jetzt kannst du ein Angebot zum Projekt erstellen.',
          )}
          next={[
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
