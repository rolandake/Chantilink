// src/components/MobileInputWrapper.jsx
// Composant pour garantir la visibilité des inputs sur mobile
import React, { useEffect, useRef } from "react";

/**
 * Wrapper pour les zones de saisie qui doivent rester visibles
 * même quand le clavier virtuel est ouvert
 */
export const MobileInputWrapper = ({ children, className = "" }) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleFocus = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
      ) {
        // Attendre que le clavier soit ouvert
        setTimeout(() => {
          e.target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 300);
      }
    };

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener("focusin", handleFocus);
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener("focusin", handleFocus);
      }
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`mobile-input-wrapper ${className}`}>
      {children}
    </div>
  );
};

/**
 * Input optimisé pour mobile
 */
export const MobileInput = React.forwardRef(({ 
  className = "", 
  onFocus,
  ...props 
}, ref) => {
  const handleFocus = (e) => {
    // Scroll automatique vers l'input
    setTimeout(() => {
      e.target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    // Appeler le callback si fourni
    onFocus?.(e);
  };

  return (
    <input
      ref={ref}
      {...props}
      onFocus={handleFocus}
      className={`
        ${className}
        focus:outline-none 
        focus:ring-2 
        focus:ring-orange-500 
        transition-all
        touch-manipulation
      `}
      style={{
        fontSize: "16px", // Empêche le zoom sur iOS
        ...props.style,
      }}
    />
  );
});

MobileInput.displayName = "MobileInput";

/**
 * Textarea optimisé pour mobile
 */
export const MobileTextarea = React.forwardRef(({ 
  className = "", 
  onFocus,
  ...props 
}, ref) => {
  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    onFocus?.(e);
  };

  return (
    <textarea
      ref={ref}
      {...props}
      onFocus={handleFocus}
      className={`
        ${className}
        focus:outline-none 
        focus:ring-2 
        focus:ring-orange-500 
        transition-all
        touch-manipulation
        resize-none
      `}
      style={{
        fontSize: "16px",
        ...props.style,
      }}
    />
  );
});

MobileTextarea.displayName = "MobileTextarea";

/**
 * Hook pour détecter le clavier virtuel
 */
export const useVirtualKeyboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  useEffect(() => {
    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        const keyboardOpen = window.innerHeight - visualViewport.height > 150;
        setIsKeyboardOpen(keyboardOpen);
        setKeyboardHeight(window.innerHeight - visualViewport.height);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
};

/**
 * Composant pour ajuster le padding quand le clavier est ouvert
 */
export const KeyboardAvoidingView = ({ children, className = "" }) => {
  const { isKeyboardOpen, keyboardHeight } = useVirtualKeyboard();

  return (
    <div
      className={className}
      style={{
        paddingBottom: isKeyboardOpen ? `${keyboardHeight}px` : undefined,
        transition: "padding-bottom 0.2s ease-out",
      }}
    >
      {children}
    </div>
  );
};

export default MobileInputWrapper;