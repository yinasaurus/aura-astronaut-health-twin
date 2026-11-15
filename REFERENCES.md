# References

Used for the NASA Space Apps submission form. Versions match `package.json` / the installed lockfile at the time of this build. No paid asset, no downloaded 3D model, and no remote font is used. The body is procedural geometry in `src/components/BodyTwin.tsx`.

## Application libraries

| Name | Version | License | Project |
| --- | --- | --- | --- |
| react | 19.3.1 | MIT | https://github.com/react/react |
| react-dom | 19.3.1 | MIT | https://github.com/react/react |
| react-router-dom | 7.18.5 | MIT | https://github.com/remix-run/react-router |
| three | 0.187.0 | MIT | https://github.com/mrdoob/three.js |
| @react-three/fiber | 9.8.2 | MIT | https://github.com/pmndrs/react-three-fiber |
| @react-three/drei | 10.7.9 | MIT | https://github.com/pmndrs/drei |
| zustand | 5.1.0 | MIT | https://github.com/pmndrs/zustand |
| recharts | 3.10.1 | MIT | https://github.com/recharts/recharts |
| framer-motion | 14.14.0 | MIT | https://github.com/motiondivision/motion |
| lucide-react | 1.73.0 | ISC | https://github.com/lucide-icons/lucide |
| jspdf | 4.2.1 | MIT | https://github.com/parallax/jsPDF |

jsPDF’s install also brings these packages into the bundle. They are used only when a PDF is exported:

| Name | Version | License | Project |
| --- | --- | --- | --- |
| html2canvas | 1.4.1 | MIT | https://github.com/niklasvh/html2canvas |
| dompurify | 3.4.18 | MPL-2.0 OR Apache-2.0 | https://github.com/cure53/DOMPurify |
| fflate | 0.8.3 | MIT | https://github.com/101arrowz/fflate |
| fast-png | 6.4.0 | MIT | https://github.com/image-js/fast-png |

## Fonts

| Family | Package | Version | License | Copyright line in the package |
| --- | --- | --- | --- | --- |
| DM Sans | @fontsource/dm-sans | 5.3.0 | SIL Open Font License 1.1 | Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts) |
| Share Tech Mono | @fontsource/share-tech-mono | 5.3.0 | SIL Open Font License 1.1 | Copyright (c) 2012, Carrois Type Design, Ralph du Carrois, with Reserved Font Name "Share" |

The font files are bundled. The app does not request fonts from a network.

## Icons

Lucide icons from `lucide-react` (ISC): HeartPulse, Bone, Brain, Moon, Shield, Eye, Play, Pause, RadioTower, FileUp. No other icon set is used.

## 3D

No mesh file, texture, or scanned model. The figure is Three.js primitives (sphere, capsule, torus, ring) drawn in code.

## Tooling, not shipped in the UI

| Name | Version | License | Project |
| --- | --- | --- | --- |
| vite | 8.3.8 | MIT | https://github.com/vitejs/vite |
| @vitejs/plugin-react | 6.3.0 | MIT | https://github.com/vitejs/vite-plugin-react |
| typescript | 7.0.2 | Apache-2.0 | https://github.com/microsoft/TypeScript |
| tailwindcss | 4.3.5 | MIT | https://github.com/tailwindlabs/tailwindcss |
| @tailwindcss/vite | 4.3.5 | MIT | https://github.com/tailwindlabs/tailwindcss |
| vitest | 5.1.0 | MIT | https://github.com/vitest-dev/vitest |

## NASA and partner pages

These are the links in `data.txt`. They are context pages. No number in the simulation is taken from them. Full notes are in `SOURCES.md`.

- NASA Human Research Program, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, Ongoing HRP Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency, Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Canadian Space Agency, Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

## Not used

No music, no stock photography, no external 3D human model, and no analytics script.
