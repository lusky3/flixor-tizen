import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import type { ReactNode } from "react";

export interface SettingsCardProps {
  title: string;
  children: ReactNode;
}

export function SettingsCard({ title, children }: SettingsCardProps) {
  const { ref, focusKey } = useFocusable({ trackChildren: true });

  return (
    <FocusContext.Provider value={focusKey}>
      <section ref={ref} className="settings-card">
        <h2 className="settings-card-title">{title}</h2>
        <div className="settings-card-body">{children}</div>
      </section>
    </FocusContext.Provider>
  );
}
