
import React, { FunctionComponent } from 'react';
import { Header } from './Header';
import { Contacts } from './Contacts';
import { BrowserNGLdoProvider } from './reactMethods';

import './App.css'
import "../../../../../app/ui-common/src/styles.css";

const App: FunctionComponent = () => {

  return (
    <div className="App">
      <BrowserNGLdoProvider>
        <Header />
        <Contacts />      
      </BrowserNGLdoProvider>
    </div>
  );
}

export default App
