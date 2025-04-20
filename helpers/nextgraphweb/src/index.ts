// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { createAsyncProxy } from "async-proxy";
import { RemoteReadableStream } from 'remote-web-streams';

let initialized: null | Window = null;

const css = `.nextgraph-auth-modal {
  visibility: hidden;
  background-color: rgba(0, 0, 0, 0.4);

  display: grid;
  place-items: center;

  height: 100vh;
  width: 100vw;
  
  position: fixed;
  left: 0;
  top: 0;
}

.nextgraph-auth-modal.nextgraph-auth-modal--fade {
  opacity: 0;
  transition: 0.2s;
}

.nextgraph-auth-modal.nextgraph-auth-modal--active {
  visibility: visible;
  z-index: 9999;
  opacity: 1;
}

.nextgraph-auth-modal__content {
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.nextgraph-auth-modal.nextgraph-auth-modal--active.nextgraph-auth-modal--fade {
	opacity: 1;
	animation-name: fadeInOpacity;
	animation-iteration-count: 1;
	animation-timing-function: ease-in;
	animation-duration: 0.5s;
}

@keyframes fadeInOpacity {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}`;

const html = `
<div id="nextgraph-auth" class="nextgraph-auth-modal nextgraph-auth-modal--fade">
    <div class="nextgraph-auth-modal__content">
        <iframe id="nextgraph-auth-iframe" scrolling="auto" frameborder="0"
            style="position: relative; height: 100%; width: 100%; overflow:auto;">
        </iframe>
    </div>
</div>`;

// const javascript = `
// `;

function addTags() {
    const style = window.document.createElement('style');
    style.textContent = css;
    window.document.head.append(style);

    let body = document.getElementsByTagName("body")[0];
    body.insertAdjacentHTML("afterbegin", html);

    // const js = window.document.createElement('script');
    // js.type = "text/javascript";
    // js.textContent = javascript;
    // body.append(js);
}

const iframe_config = import.meta.env.NG_DEV ? {src:"http://localhost:1421/auth.html?o=", origin: "http://localhost:1421"} : {src:"https://nextgraph.net/auth/?o=", origin: "https://nextgraph.net"} ;
// when developing net-auth
//const iframe_config = {src:"http://localhost:14402/?o=", origin: "http://localhost:14402"};
// to test ngnet
//const iframe_config = {src:"http://127.0.0.1:3033/auth/?o=", origin: "http://127.0.0.1:3033"}; 

export const init = async function(callback:Function, singleton:boolean, access_requests:any) {
  if (initialized === null) {
    if (!window) throw new Error("init(callback,..) can only be called from a browser's window");
    let origin = location.origin;
    let encoded_origin = encodeURIComponent(origin);
    addTags();
    let iframe: HTMLIFrameElement = <HTMLIFrameElement>window.document.getElementById('nextgraph-auth-iframe');
    if (iframe) {
      return new Promise(async (resolve) => {
        iframe.addEventListener("load", async function() {
          initialized = this.contentWindow;
          const { readable, writablePort } = new RemoteReadableStream();
          initialized?.postMessage({ method: "init", singleton, access_requests, port: writablePort }, iframe_config.origin, [writablePort]);
          const reader = readable.getReader();
          resolve(true);
          for (var msg; msg = await reader.read(); ) {
            if (msg.done) break;
            if (msg.value.status == "error") {
              console.error(msg.value.error);
            } else if ( msg.value.status == "cancelled") {
              hide_nextgraph_auth();
            } else if (msg.value.status == "loggedin") {
              hide_nextgraph_auth();
            }
            await (callback)(msg.value);
          }
        });
        iframe.src = `${iframe_config.src}${encoded_origin}`;
      });
    }
  }
}

function show_nextgraph_auth() {
  window.document.getElementById("nextgraph-auth")?.classList.add('nextgraph-auth-modal--active');
}

function hide_nextgraph_auth() {
  window.document.getElementById("nextgraph-auth")?.classList.remove('nextgraph-auth-modal--active');
} 

async function rpc( method:string, args?: any) : Promise<any> {
  const { readable, writablePort } = new RemoteReadableStream();
  initialized?.postMessage({ method, args, port: writablePort }, iframe_config.origin, [writablePort]);
  const reader = readable.getReader();
  let ret = await reader.read();
  console.log(ret)
  await reader.read(); // the close
  if (ret.value.ok) 
    return ret.value.ret;
  else
    throw new Error(ret.value.ret);
}

const handler = {
  async apply(_target: object, path: PropertyKey[], _caller: any, args?: any) :Promise<any> {
    if (initialized === null) {
      throw new Error("you must call init() first (and once)");
    }
    if (path[0] === "login") {
      if (await rpc("login") !== true) {
        show_nextgraph_auth();
        return false;
      } else {
        return true;
      }
    } else {
      return await rpc(<string>path[0], args);
    }
  }
};

const api = createAsyncProxy({}, handler);
export default api;