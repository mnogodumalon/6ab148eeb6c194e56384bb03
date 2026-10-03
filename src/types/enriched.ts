import type { Angebote, Berater, Leistungskatalog, Projekte, Rechnungen, Zeiterfassung } from './app';

export type EnrichedBerater = Berater & {
  leistungenName: string;
  zugewiesene_projekteName: string;
};

export type EnrichedLeistungskatalog = Leistungskatalog & {
  ausfuehrende_beraterName: string;
};

export type EnrichedProjekte = Projekte & {
  kundeName: string;
  projektleitungName: string;
};

export type EnrichedAngebote = Angebote & {
  projektName: string;
  beraterName: string;
};

export type EnrichedZeiterfassung = Zeiterfassung & {
  beraterName: string;
  projektName: string;
  leistungName: string;
};

export type EnrichedRechnungen = Rechnungen & {
  kundeName: string;
  projektName: string;
  beraterName: string;
  zeiterfassungseintraegeName: string;
};
