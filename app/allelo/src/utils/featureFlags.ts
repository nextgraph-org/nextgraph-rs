export const getFeatureFlags = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    useNextGraph: true
  };
};

export const isNextGraphEnabled = (): boolean => {
  return getFeatureFlags().useNextGraph;
};