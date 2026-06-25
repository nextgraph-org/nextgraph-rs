import { Link, Route, Routes } from "react-router";
import SwitchComponent from "./components/switch2";

import "./App.css";
import { SyncedRouter } from "@ng-org/frontend/react/router";

function MainPage() {
  return (
    <div>
      <button className="btn btn-primary">No effect button</button>
    </div>
  );
}

function SwitchPage() {
  return (
    <div>
      <SwitchComponent />
    </div>
  );
}

function App() {
  return (
    <SyncedRouter>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <div>
          <h1>React Application 2</h1>
        </div>

        <div className="navbar bg-base-100 shadow-sm gap-4">
          <div>
            <Link className="btn" to="/">
              Main page
            </Link>
          </div>
          <div>
            <Link className="btn" to="/switch">
              Switch Component page
            </Link>
          </div>
        </div>

        <main>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/switch" element={<SwitchPage />} />
          </Routes>
        </main>
      </div>
    </SyncedRouter>
  );
}

export default App;
