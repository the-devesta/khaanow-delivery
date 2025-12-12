import React, { createContext, ReactNode, useContext, useState } from "react";

interface DockContextType {
  isDockVisible: boolean;
  setDockVisible: (visible: boolean) => void;
}

const DockContext = createContext<DockContextType | undefined>(undefined);

export const DockProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDockVisible, setDockVisible] = useState(true);

  return (
    <DockContext.Provider value={{ isDockVisible, setDockVisible }}>
      {children}
    </DockContext.Provider>
  );
};

export const useDock = (): DockContextType => {
  const context = useContext(DockContext);
  if (context === undefined) {
    throw new Error("useDock must be used within a DockProvider");
  }
  return context;
};
