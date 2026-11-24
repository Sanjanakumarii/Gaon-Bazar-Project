"use client";
import { useEffect, useRef, useState } from "react";
import { Languages, X, Check, Search, Type } from "lucide-react";
import {
  availableLanguages,
  languages,
  setLanguage,
  useLanguage,
} from "../lib/language";

export default function LanguagePanel() {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [large, setLarge] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem("gb-large-text") === "1";
      setLarge(value);
      document.documentElement.classList.toggle("large-text", value);
    } catch {}
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const hindi = language === "hi";
  return (
    <>
      <button
        className="language-launcher"
        aria-label="Choose language / भाषा चुनें"
        onClick={() => setOpen(true)}
      >
        <Languages size={19} />
        <span>
          {language === "hi"
            ? "हिन्दी"
            : language === "hinglish"
              ? "Hinglish"
              : "English"}
        </span>
      </button>
      <dialog
        className="language-panel"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">YOUR LANGUAGE · आपकी भाषा</span>
            <h2>{hindi ? "अपनी भाषा चुनें" : "Make yourself at home"}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close language panel"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <p className="muted">
          {hindi
            ? "आपकी पसंद इस डिवाइस पर सेव रहेगी।"
            : "Your preference is saved on this device."}
        </p>
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search languages"
            placeholder="Search language / भाषा खोजें"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="language-list">
          {languages
            .filter(([, name]) =>
              name.toLowerCase().includes(query.toLowerCase()),
            )
            .map(([code, name]) => (
              <button
                key={code}
                className={
                  code === language
                    ? "language-option chosen"
                    : "language-option"
                }
                disabled={!availableLanguages.has(code)}
                onClick={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
              >
                <span>{name}</span>
                {code === language ? (
                  <Check size={18} />
                ) : !availableLanguages.has(code) ? (
                  <small>{hindi ? "अनुवाद बाकी" : "Translation pending"}</small>
                ) : null}
              </button>
            ))}
        </div>
        <p className="small muted">
          {hindi
            ? "अभी English, हिन्दी और Hinglish उपलब्ध हैं। भारत की अन्य 21 अनुसूचित भाषाओं के पूरे अनुवाद अभी बाकी हैं।"
            : "English, Hindi and Hinglish are ready. Full translations for the other 21 scheduled Indian languages are pending."}
        </p>
        <button
          className="secondary full"
          aria-pressed={large}
          onClick={() => {
            const value = !large;
            setLarge(value);
            document.documentElement.classList.toggle("large-text", value);
            try {
              localStorage.setItem("gb-large-text", value ? "1" : "0");
            } catch {}
          }}
        >
          <Type size={18} />
          {hindi ? "बड़ा अक्षर" : "Larger text"} {large && <Check size={16} />}
        </button>
      </dialog>
    </>
  );
}
