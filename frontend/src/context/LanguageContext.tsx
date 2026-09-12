"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "@/lib/translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  fontSize: "normal" | "large" | "x-large";
  setFontSize: (size: "normal" | "large" | "x-large") => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [fontSize, setFontSizeState] = useState<"normal" | "large" | "x-large">("normal");
  const [highContrast, setHighContrastState] = useState<boolean>(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("agriquene_lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "hi")) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("agriquene_lang", newLang);
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[lang][key] || translations.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        fontSize,
        setFontSize: setFontSizeState,
        highContrast,
        setHighContrast: setHighContrastState,
      }}
    >
      <div
        className={`${highContrast ? "high-contrast-mode" : ""} ${
          fontSize === "large" ? "text-scale-large" : fontSize === "x-large" ? "text-scale-xlarge" : ""
        }`}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
