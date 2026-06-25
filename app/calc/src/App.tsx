import "./App.css";

import { useEffect, useRef, useState } from "react";
import type { IronCalcHandle } from "@ironcalc/workbook";
// From IronCalc
import { IronCalc, IronCalcIcon, init, Model } from "@ironcalc/workbook";
//import "@ironcalc/workbook/style.css";

function App() {

  const [model, setModel] = useState<Model | null>(null);
  const ironCalcRef = useRef<IronCalcHandle>(null);

  useEffect(() => {
    async function start() {
      await init();
      
      //const language = "en-US";
      const languageId = "en";
      // If there is a model name ?model=modelHash we try to load it
      // if there is not, or the loading failed we load an empty model
      let loadedModel: Model | null = null;
      const name = "template";
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        loadedModel = new Model(name, languageId, tz);
      } catch (e) {
        console.warn("Failed to get timezone, defaulting to UTC", e);
        loadedModel = new Model(name, languageId, "UTC");
      }
      setModel(loadedModel);

    }
    start();
  }, []);

  if (!model) {
    return (
      <div className="app-ic-loading">
        <IronCalcIcon style={{ width: 24, height: 24, marginBottom: 16 }} />
        <div>Loading...</div>
      </div>
    );
  }

  return  <div><h1>calc</h1><IronCalc model={model} ref={ironCalcRef} /></div>;

}

export default App;
