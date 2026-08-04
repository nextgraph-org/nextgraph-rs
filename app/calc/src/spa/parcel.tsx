import "../App.css";
import rootComponent from "../components/switch.tsx";
import { createComponentFactory } from "@ng-org/frontend/react";

const componentFactory = createComponentFactory({
  component: rootComponent,
  opts: {},
  cssEntryPoint: import.meta.url,
});

export default componentFactory;
