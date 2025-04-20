import { FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";


export const Header: FunctionComponent = () => {
  
  const { session, login, logout } = useNextGraphAuth();
  
  return (
    <div className="full-layout">
      
      {session.sessionId ? (
        // If the session is logged in
        <div className="p-1 text-white text-center fixed top-0 left-0 right-0" style={{zIndex:1000, height:'36px', backgroundColor:'rgb(73, 114, 165)'}}>
          You are logged in. <span className="font-bold clickable" onClick={logout}> Log out</span>
        </div>
      ) : (
        // If the session is not logged in
        <>
          <h1 className="text-2xl text-center mb-10">Welcome to your contact manager</h1>
          <div className="text-center text-xl p-1 text-white fixed top-0 left-0 right-0" style={{zIndex:1000, height:'36px', backgroundColor:'rgb(73, 114, 165)'}}>
            Please <span className="font-bold clickable" onClick={login}> Log in</span>
          </div>

          <div className="text-center max-w-6xl lg:px-8 mx-auto px-4 text-blue-800">
          
            <svg className="mt-10 h-16 w-16 mx-auto" data-slot="icon" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"></path>
            </svg>
            
            <button
                onClick={login}
                onKeyUp={login}
                className="select-none ml-0 mt-2 mb-10 text-white bg-blue-800 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
              Please Log in
            </button>
          </div>
        </>
      )}
    </div>
  );
};