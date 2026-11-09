import type { Dispatch, SetStateAction } from "react";
import Astronautmodel from "../components/astronautmodel";
import './Bodypage.css';

export type Status = "green" | "amber" | "red";
export type DomainName =
  | "Cardiovascular" | "Immune" | "Sleep" | "Cognition"
  | "Behavioral" | "Bone/Muscle" | "Radiation" | "Environment" | "Digestive";

export interface DomainState {
  status: Status;
  score: number;
  drivers?: string[]; // e.g. ["HRV -1.8σ", "Sleep -1.4σ"]
}
export type DomainMap = Record<DomainName, DomainState>;

const demo: DomainMap = {
  Cardiovascular: { status: "green", score: 0.3, drivers: ["Resting HR +0.4σ"] },
  Immune: { status: "amber", score: 1.4, drivers: ["HRV −1.8σ", "Sleep −1.4σ", "Temp +1.1σ"] },
  Sleep: { status: "red", score: 2.3, drivers: ["Sleep duration −2.6σ", "Efficiency −2.0σ"] },
  Cognition: { status: "amber", score: 1.2, drivers: ["PVT lapses +1.5σ"] },
  Behavioral: { status: "green", score: 0.6, drivers: ["Mood −0.5σ"] },
  "Bone/Muscle": { status: "green", score: 0.2, drivers: ["Exercise compliance −0.2σ"] },
  Radiation: { status: "green", score: 0.1, drivers: ["Cumulative 12% of budget"] },
  Environment: { status: "green", score: 0.4, drivers: ["CO2 +0.7σ"] },
  Digestive: { status: "green", score: 0.3, drivers: ["Digestive markers within baseline"] },
};

const BodyPage = ({ suitVisible, setSuitVisible }: {
  suitVisible: boolean;
  setSuitVisible: Dispatch<SetStateAction<boolean>>;
}) => (
    <main className="app-shell">
      <Astronautmodel domains={demo} showSuit={suitVisible} />
      <aside className="dashboard-panel">
        <button
          type="button"
          className="suit-toggle"
          aria-pressed={suitVisible}
          onClick={() => setSuitVisible((visible) => !visible)}
        >
          {suitVisible ? "Remove suit" : "Show suit"}
        </button>
      </aside>
    </main>
);

export default BodyPage;