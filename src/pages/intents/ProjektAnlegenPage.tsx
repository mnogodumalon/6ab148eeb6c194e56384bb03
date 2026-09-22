/**
 * Projekt anlegen — 3-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart, Startjahr/-monat & Projektleitung → 3) Ansprechpartner & letzter Schritt (optional).
 * Reads: kunden (kundenname, email), berater (vorname, nachname, status=aktiv).
 * Writes: projekte (createProjekteEntry) — projektkennung/projektnummer sind Tool-owned und werden NICHT geschrieben.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useStepForm, useJourneySubmit, useRecordSearch, fieldText, fieldLookup } from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  // Kunden suchen — nach Name und E-Mail
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
    }),
  });

  // Berater suchen — nur aktive Berater
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
  });

  // Formular für projekte — nur die Felder, die dieser Ablauf abfragt
  const f = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_jahr: 2,
      projektstart_monat: 2,
      projektleitung: 2,
      ansprechpartner_kunde: 3,
      letzter_schritt: 3,
    },
    required: {
      // projektstatus wird per values gesetzt — nicht vom Benutzer eingegeben
      projektstatus: false,
      // projektkennung und projektnummer gehören dem Tool
      projektkennung: false,
      projektnummer: false,
      // letzter_schritt und ansprechpartner_kunde sind optional in diesem Ablauf
      ansprechpartner_kunde: false,
      letzter_schritt: false,
    },
  });

  // Plan: nur projekte anlegen; projektstatus fix auf 'akquise'
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
    { draftKey: 'projekt-anlegen' }
  );

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Neues Projekt anlegen, Kunden zuweisen und Projektleitung festlegen.'),
        needs: [tx('Kundenname oder E-Mail'), tx('Projektart und Startjahr'), tx('Name der Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden aus, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string | null}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kundenname oder E-Mail suchen …')}
          avatar="initials"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projektart, Startjahr/-monat, Projektleitung */}
      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Projektart, Startjahr und Projektleitung eingeben.')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Bound form={f} name="projektart" />
          <Bound form={f} name="projektstart_jahr" hint={tx('z. B. 2026')} />
          <Bound form={f} name="projektstart_monat" allowClear />

          <div className="pt-2">
            <p className="text-sm font-medium text-foreground mb-3">{tx('Projektleitung')}</p>
            <EntitySelectStep
              {...berater.select}
              selectedId={f.get('projektleitung') as string | null}
              onSelect={id => {
                f.set('projektleitung', id, berater.labelOf(id));
              }}
              searchPlaceholder={tx('Beraterin oder Berater suchen …')}
              avatar="initials"
              emptyText={tx('Keine aktiven Beraterinnen oder Berater gefunden.')}
              create={false}
            />
          </div>

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['kunde', 'projektart', 'projektstart_jahr'])}
            nextStepLabel={tx('Weitere Angaben')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Ansprechpartner und letzter Schritt (optional) */}
      <WizardStep
        label={tx('Weitere Angaben')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Stand optional erfassen.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_kunde" hint={tx('Optional — Name der Ansprechperson beim Kunden')} />
          <Bound form={f} name="letzter_schritt" rows={4} hint={tx('Optional — aktueller Stand oder letzter Schritt im Akquiseprozess')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['ansprechpartner_kunde', 'letzter_schritt'])}
            nextStepLabel={tx('Prüfen & anlegen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zusammenfassung & Bestätigen */}
      <WizardStep label={tx('Prüfen & anlegen')}>
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
            whatHappensNext={tx('Das Projekt wird im Status „Akquise" angelegt. Projektkennung und -nummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          submit={submit}
          forms={[f]}
          whatHappensNext={tx('Jetzt kannst du ein Angebot für das neue Projekt erstellen.')}
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
