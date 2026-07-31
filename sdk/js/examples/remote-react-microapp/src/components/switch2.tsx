import { Switch } from "@ark-ui/react/switch";
import { useState } from "react";

export default function ReactSwitch2() {
  const [toggled2, setToggled2] = useState(false);

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-6">
          <h2 className="card-title text-base">React Switch Component 2</h2>
          <Switch.Root
            className="ark-switch"
            checked={toggled2}
            id={Math.random().toString()}
            onCheckedChange={(e) => setToggled2(e.checked)}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label>{toggled2 ? "Checked" : "Unchecked"}</Switch.Label>
            <Switch.HiddenInput />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
}
