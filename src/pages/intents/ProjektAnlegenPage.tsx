/**
 * Projekt anlegen — 5-Schritt-Wizard.
 * Steps: 1) Kunde auswählen → 2) Projektart & Startdaten → 3) Projektleitung auswählen
 *        → 4) Ansprechpartner & sonstige Angaben → 5) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp, email), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektstatus wird automatisch auf "akquise" gesetzt;
 *         projektkennung und projektnummer werden automatisch vergeben.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
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
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
      projektkennung: 4,
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
        description: tx('Ein neues Projekt für einen Kunden anlegen und die Projektleitung zuweisen.'),
        needs: [tx('Kundendaten'), tx('Projektart und Startdatum'), tx('Name der Projektleitung')],
      }}
    >
      {/* Step 1 — Kunde auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail des Kunden …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
      </WizardStep>

      {/* Step 2 — Projektart & Startdaten */}
      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Art des Projekts und gewünschten Startmonat/-jahr angeben.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Step 3 — Projektleitung auswählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Welche Beraterin oder welcher Berater leitet dieses Projekt?')}
        needs={['projektart']}
      >
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          searchPlaceholder={tx('Name der Projektleitung …')}
          avatar="initials"
          emptyText={tx('Keine Berater:innen gefunden. Bitte zunächst eine Person im System anlegen.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Weitere Angaben')}
        />
      </WizardStep>

      {/* Step 4 — Ansprechpartner & sonstige Angaben */}
      <WizardStep
        label={tx('Weitere Angaben')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Stand optional festhalten.')}
        needs={['projektleitung']}
      >
        <div className="space-y-5">
          <Bound
            form={flow.forms.projekte}
            name="projektkennung"
            hint={tx('Wird automatisch aus Startjahr, Projektart-Kürzel und Projektnummer zusammengesetzt, kann aber angepasst werden.')}
          />
          <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" />
          <Bound form={flow.forms.projekte} name="letzter_schritt" rows={3} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'projektstatus', label: tx('Projektstatus'), value: tx('Akquise') },
            ]}
            whatHappensNext={tx('Projektkennung und Projektnummer werden automatisch vergeben.')}
          />
        )}
      </WizardStep>

      {/* Success screen */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Projekt erscheint jetzt in der Projektübersicht und kann mit Angeboten und Zeiterfassungen verknüpft werden.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
