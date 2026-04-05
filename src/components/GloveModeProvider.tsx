'use client'

import * as React from 'react'

type GloveModeContextType = {
  isGloveMode: boolean;
  toggleGloveMode: () => void;
};

const GloveModeContext = React.createContext<GloveModeContextType | undefined>(undefined);

export function GloveModeProvider({ children }: { children: React.ReactNode }) {
  const [isGloveMode, setIsGloveMode] = React.useState(false);

  React.useEffect(() => {
    // Read directly from DOM to sync with script
    if (document.documentElement.classList.contains('glove-mode')) {
      setIsGloveMode(true);
    }
  }, []);

  const toggleGloveMode = React.useCallback(() => {
    setIsGloveMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('glove-mode');
        localStorage.setItem('glove-mode', 'true');
      } else {
        document.documentElement.classList.remove('glove-mode');
        localStorage.setItem('glove-mode', 'false');
      }
      return next;
    });
  }, []);

  return (
    <GloveModeContext.Provider value={{ isGloveMode, toggleGloveMode }}>
      {children}
    </GloveModeContext.Provider>
  );
}

export function useGloveMode() {
  const context = React.useContext(GloveModeContext);
  if (context === undefined) {
    throw new Error('useGloveMode must be used within a GloveModeProvider');
  }
  return context;
}

export function GloveModeScript() {
  const codeToRunOnClient = `
    (function() {
      try {
        var saved = localStorage.getItem('glove-mode');
        if (saved === 'true') {
          document.documentElement.classList.add('glove-mode');
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: codeToRunOnClient }} />;
}
