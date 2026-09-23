/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart & Startdatum → 3) Projektleitung & Details → 4) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp, email), berater (vorname, nachname, status — nur aktiv).
 * Writes: projekte (createProjekteEntry) — projektstatus wird vom Hook auf 'akquise' gesetzt.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useProjektAnlegenFlow } from '@/lib/journey/flows/ProjektAnlegen';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektAnlegenFlow({
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 3,
      letzter_schritt: 3,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'kundentyp') ?? undefined,
      }),
      projektleitung: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neues Projekt anlegen, Kunden zuweisen und Projektleitung bestimmen.'),
        needs: [tx('Name des Kunden'), tx('Projektart'), tx('Startjahr')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projektart & Startdatum */}
      <WizardStep
        label={tx('Projektdetails')}
        description={tx('Projektart und geplantes Startdatum eingeben.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" allowClear />
          <Bound
            form={flow.forms.projekte}
            name="projektstart_jahr"
            hint={tx('Vierstellige Jahreszahl, z. B. 2026')}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Projektleitung & optionale Details */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Zuständige Berater:in und optionale Zusatzinfos erfassen.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <div className="space-y-5">
          <EntitySelectStep
            {...flow.picks.projektleitung.select}
            {...flow.pick('projektleitung')}
            searchPlaceholder={tx('Berater:in suchen …')}
            avatar="initials"
            emptyText={tx('Nur aktive Berater:innen stehen zur Auswahl.')}
            create={false}
          />
          <Bound
            form={flow.forms.projekte}
            name="ansprechpartner_kunde"
            hint={tx('Name der Kontaktperson beim Kunden (optional)')}
          />
          <Bound
            form={flow.forms.projekte}
            name="letzter_schritt"
            rows={3}
            hint={tx('Aktueller Stand oder letzter besprochener Schritt (optional)')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'projektstatus',
                label: tx('Projektstatus'),
                value: tx('Akquise'),
              },
            ]}
            whatHappensNext={tx(
              'Projektkennung und Projektnummer vergibt das System automatisch nach dem Anlegen.',
            )}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Das Projekt ist jetzt im Status „Akquise". Erstelle als nächstes ein Angebot.',
          )}
          next={[
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
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
