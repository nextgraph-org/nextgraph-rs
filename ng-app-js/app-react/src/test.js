import React, { useState, useEffect } from "react";


function Test() {
    useEffect(() => {
      ;(async () => {
        try {
          const ng = await import('ng-app-js-sdk');
          ng.test();
        } catch (e) {
          console.error(e)
        }
      })()
    }, [])
    return (
        <>
          
        </>
      );
}


export default Test;