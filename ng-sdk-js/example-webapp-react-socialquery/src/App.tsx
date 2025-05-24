
import React, { FunctionComponent } from 'react';
import { Header } from './Header';
import { Contacts } from './Contacts';
import  Query  from './Query';
import { BrowserNGLdoProvider } from './reactMethods';
import { BrowserRouter, Routes, Route } from "react-router";

import './App.css'
import "../../../common/src/styles.css";

const App: FunctionComponent = () => {

  return (
    <div className="App">
      <BrowserNGLdoProvider>
        <Header />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Contacts />} />
            <Route path="/query" element={<Query />} />
          </Routes>
        </BrowserRouter>
      </BrowserNGLdoProvider>
    </div>
  );
}

export default App
