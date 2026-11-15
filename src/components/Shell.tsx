import { NavLink, Outlet } from "react-router-dom";
import { DISCLAIMER } from "../engine/packet";

const LINKS = [
  { to: "/", label: "Mission" },
  { to: "/demo", label: "Demo" },
  { to: "/validation", label: "Validation" },
  { to: "/sources", label: "Sources" },
  { to: "/limitations", label: "Limitations" },
];

export function Shell() {
  return (
    <div className="min-h-screen">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-[#8ef6ff] focus:px-3 focus:py-2 focus:text-[#04202a]" href="#main">
        Skip to content
      </a>
      <header className="border-b border-[#245066]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <NavLink to="/" className="font-mono text-lg tracking-[0.22em]">
            AURA
          </NavLink>
          <nav className="flex flex-wrap gap-2" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${isActive ? "bg-[#123246] text-[#8ef6ff]" : "text-[#d5e7f4]"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <p className="bg-[#102536] px-4 py-1 text-center text-xs leading-5 text-[#e8f6ff]">{DISCLAIMER}</p>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-3">
        <Outlet />
      </main>
    </div>
  );
}
