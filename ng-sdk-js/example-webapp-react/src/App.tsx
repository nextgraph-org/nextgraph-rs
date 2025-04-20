import { useState } from 'react'
import React, { FunctionComponent } from 'react';
import { Header } from './Header';
import { Contact } from './Contact';
import { BrowserNGLdoProvider, useNextGraphAuth } from './reactMethods';

import './App.css'

import "../../../common/src/styles.css";

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
//       <h1 className="text-4xl font-bold text-blue-600">Hello, Tailwind!</h1>
//       <p className="mt-4 text-gray-700">Tailwind CSS is working in Vite!</p>
//     </div>
//   )
// }

const App: FunctionComponent = () => {
  //const { session } = useNextGraphAuth();

  return (
    <div className="App">
      <BrowserNGLdoProvider>
        <Header />

        <Contact />
        
      </BrowserNGLdoProvider>
    </div>
  );
}

export default App
