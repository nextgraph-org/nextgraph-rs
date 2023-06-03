// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import React, { useState } from "react";
import ReactDOM from "react-dom";
import { createRoot } from 'react-dom/client';
import Test from "./test";

const ng_sdk = import("ng-app-js-sdk");

ng_sdk.then((ng) => {
    const App = () => {
      const [name, setName] = useState("");
      const handleChange = (e) => {
        setName(ng.change(e.target.value));
      };
      const handleClick = () => {
        ng.test();
        ng.start();
      };
  
      return (
        <>
          <div>
            I say: {name}<br/>
            <input type="text" onChange={handleChange} />
            <button onClick={handleClick}>Say hello!</button>
            <Test/>
          </div>
        </>
      );
    };
  
    //ReactDOM.render(<App />, document.getElementById("root"));
    const domNode = document.getElementById('root');
    const root = createRoot(domNode);
    root.render(<App />);
  });