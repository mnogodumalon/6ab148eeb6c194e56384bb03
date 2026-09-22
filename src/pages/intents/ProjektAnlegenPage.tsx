/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Details (Projektart, Start, Ansprechpartner) → 3) Projektleitung wählen → 4) Prüfen & anlegen.
 * Reads: kunden (kundenname, email, ort), berater (vorname, nachname, status — nur aktiv).
 * Writes: projekte (createProjekteEntry) — Kennung & Nummer werden vom Tool vergeben.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
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

  // Kunden-Suche: kundenname, email als Suchfelder; ort als Zusatzinfo
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: [fieldText(k, 'email'), fieldText(k, 'ort')].filter(Boolean).join(' · '),
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Berater-Suche: nur aktive Berater für Projektleitung
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: [fieldText(b, 'vorname'), fieldText(b, 'nachname')].filter(Boolean).join(' '),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Formular für projekte — felder nach Steps aufgeteilt
  const f = useStepForm('projekte', {
    fields: ['kunde', 'projektart', 'projektstart_monat', 'projektstart_jahr', 'ansprechpartner_kunde', 'projektleitung'],
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      ansprechpartner_kunde: 2,
      projektleitung: 3,
    },
    // projektstatus wird im Plan als fixed value 'akquise' gesetzt — kein Input nötig
    required: { projektkennung: false, projektnummer: false, projektstatus: false },
  });

  // Schreibplan: ein Projekt mit festem Status 'akquise'
  const submit = useJourneySubmit(servicePort, [
    {
      key: 'projekt',
      entity: 'projekte',
      form: f,
      primary: true,
      values: { projektstatus: 'akquise' },
    },
  ], { draftKey: 'projekt-anlegen' });

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      subtitle={tx('Neues Projekt in der Akquise-Phase erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Legt ein neues Projekt an und ordnet es einem Kunden sowie einer Projektleitung zu.'),
        needs: [tx('Kundendaten'), tx('Projektart und geplanter Start'), tx('Name der Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Den Kunden aus der Kundenliste auswählen, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string | null}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kundenname oder E-Mail suchen …')}
          emptyText={tx('Kein Kunde gefunden. Bitte den Kunden zuerst in der Kundenverwaltung anlegen.')}
          create={false}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 2: Projektdetails */}
      <WizardStep
        label={tx('Details')}
        description={tx('Projektart, geplanten Start und Ansprechpartner beim Kunden angeben.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={f} name="projektart" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="projektstart_monat" />
            <Bound form={f} name="projektstart_jahr" hint={tx('z. B. 2026')} />
          </div>
          <Bound
            form={f}
            name="ansprechpartner_kunde"
            hint={tx('Name der Person beim Kunden, die das Projekt begleitet')}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['projektart'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Projektleitung (Berater) wählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Den verantwortlichen Berater als Projektleitung auswählen — nur aktive Berater stehen zur Verfügung.')}
        needs={['projektart']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('projektleitung') as string | null}
          onSelect={id => {
            f.set('projektleitung', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Vorname oder Nachname suchen …')}
          emptyText={tx('Kein aktiver Berater gefunden. Bitte den Status des Beraters zuerst auf „Aktiv" setzen.')}
          create={false}
          avatar="initials"
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['projektleitung'])}
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
            whatHappensNext={tx('Das Projekt wird angelegt. Projektkennung und -nummer vergibt das System automatisch.')}
            confirmLabel={tx('Projekt anlegen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weiteres Projekt anlegen')}
          whatHappensNext={tx('Jetzt kann ein Angebot für dieses Projekt erstellt werden.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
