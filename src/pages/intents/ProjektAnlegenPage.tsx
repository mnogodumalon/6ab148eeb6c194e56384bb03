/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart, Startmonat und Startjahr eingeben
 *        → 3) Ansprechpartner und Projektleitung festlegen → 4) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp, email), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektstatus wird automatisch auf 'akquise' gesetzt.
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
      ansprechpartner_kunde: 3,
      projektleitung: 3,
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
        description: tx('Neues Projekt anlegen, Kunden zuordnen und Projektleitung bestimmen.'),
        needs: [tx('Kundenname'), tx('Projektart'), tx('Startjahr')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird dieses Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="initials"
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projektart, Startmonat und Startjahr */}
      <WizardStep
        label={tx('Projektdetails')}
        description={tx('Projektart und geplanten Startmonat bzw. Startjahr angeben.')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Ansprechpartner & Leitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Ansprechpartner beim Kunden und Projektleitung */}
      <WizardStep
        label={tx('Ansprechpartner & Leitung')}
        description={tx('Ansprechpartner beim Kunden nennen und Projektleitung auswählen.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" />
          <Bound form={flow.forms.projekte} name="letzter_schritt" rows={3} />
        </div>
        <div className="mt-6">
          <EntitySelectStep
            {...flow.picks.projektleitung.select}
            {...flow.pick('projektleitung')}
            searchPlaceholder={tx('Name …')}
            avatar="initials"
            create={false}
          />
        </div>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 4: Zusammenfassung und Anlegen */}
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
            whatHappensNext={tx('Projektkennung und Projektnummer vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Projekt ist angelegt — du kannst jetzt ein Angebot erstellen oder Stunden buchen.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden buchen'), href: '#/intents/zeit-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
