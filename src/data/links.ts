/** Resource links copied from the local file data.txt. None of them supply a number used in the simulation. */
export interface ResourceLink {
  id: string;
  title: string;
  publisher: string;
  url: string;
  about: string;
}

export const RESOURCE_LINKS: ResourceLink[] = [
  {
    id: "hrp-hazards",
    title: "5 Hazards of Human Spaceflight",
    publisher: "NASA Human Research Program",
    url: "https://www.nasa.gov/hrp/hazards/",
    about:
      "Background on the main hazards that affect humans on space missions, with links to NASA articles. Used here as context only.",
  },
  {
    id: "hrp-risks",
    title: "Risks of Human Spaceflight",
    publisher: "NASA Human Research Program",
    url: "https://www.nasa.gov/hrp/risks/",
    about:
      "Background on the main risks faced by humans on space missions. Used here as context only.",
  },
  {
    id: "hrp-ongoing",
    title: "Ongoing HRP Research in Space",
    publisher: "NASA Human Research Program",
    url: "https://www.nasa.gov/hrp/ongoing-hrp-research/",
    about: "Articles from ongoing Human Research Program work. No measurement from this page is used.",
  },
  {
    id: "csa-radiation",
    title: "Monitoring Radiation for Astronaut Health",
    publisher: "Canadian Space Agency",
    url: "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
    about:
      "Describes Canadian work to measure radiation exposure and study its effects. No dose value from this page is used.",
  },
  {
    id: "csa-science",
    title: "Why Do We Conduct Science Experiments in Space?",
    publisher: "Canadian Space Agency",
    url: "https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp",
    about:
      "Explains why research is done in space, including human health. It does not provide an indicator baseline.",
  },
];
