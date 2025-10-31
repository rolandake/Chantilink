import React, { useRef, useEffect, useCallback } from "react";
import { useVirtual } from "@tanstack/react-virtual";
import { useCalculation } from "../context/CalculationContext";
import { useDebouncedCallback } from "use-debounce";

export default function CalculationsList() {
  const {
    savedCalculations,
    fetchSavedCalculations,
    loading,
    currentProjectType
  } = useCalculation();

  const parentRef = useRef();

  // 🧭 DEBUG INITIAL
  useEffect(() => {
    console.group("%c[CalculationsList MOUNT]", "color: cyan");
    console.log("currentProjectType:", currentProjectType);
    console.log("savedCalculations (init):", savedCalculations);
    console.groupEnd();
  }, []);

  // 🧮 Virtualisation setup
  const rowVirtualizer = useVirtual({
    size: savedCalculations.length,
    parentRef,
    estimateSize: useCallback(() => 60, []),
    overscan: 10
  });

  // ⚡ Debounced fetch
  const debouncedFetch = useDebouncedCallback(() => {
    console.log("%c[DebouncedFetch Triggered]", "color: orange");
    console.log("Fetching with offset:", savedCalculations.length);
    fetchSavedCalculations({ projectType: currentProjectType, offset: savedCalculations.length });
  }, 200);

  // 🌀 Scroll listener
  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading) {
        console.log("%c[Scroll trigger fetch]", "color: yellow");
        debouncedFetch();
      }
    };

    parent.addEventListener("scroll", handleScroll);
    return () => parent.removeEventListener("scroll", handleScroll);
  }, [debouncedFetch, loading, savedCalculations.length, currentProjectType]);

  // 🔁 Recharger quand le type de projet change
  useEffect(() => {
    console.group("%c[Fetching Calculations - useEffect]", "color: lightgreen");
    console.log("projectType:", currentProjectType);
    console.log("offset: 0");
    console.groupEnd();

    fetchSavedCalculations({ projectType: currentProjectType, offset: 0 });
  }, [currentProjectType, fetchSavedCalculations]);

  // 🧩 Log à chaque changement de calculs
  useEffect(() => {
    console.log("%c[SavedCalculations Updated]", "color: lightblue");
    console.log("Count:", savedCalculations.length);
    console.log("Data sample:", savedCalculations[0]);
  }, [savedCalculations]);

  return (
    <div
      ref={parentRef}
      style={{ height: "600px", overflow: "auto", border: "1px solid #ddd", borderRadius: "4px" }}
    >
      {savedCalculations.length === 0 && !loading && (
        <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
          Aucun calcul disponible
        </div>
      )}
      <div style={{ height: rowVirtualizer.totalSize, position: "relative" }}>
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const calc = savedCalculations[virtualRow.index];
          if (!calc) return null;

          return (
            <div
              key={calc._id || virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                padding: "10px",
                borderBottom: "1px solid #eee",
                background: virtualRow.index % 2 === 0 ? "#fafafa" : "#fff",
              }}
            >
              <strong>{calc.calculationType}</strong> – {calc.projectType} –{" "}
              {new Date(calc.savedAt).toLocaleString()}
            </div>
          );
        })}

        {loading && (
          <div
            style={{
              position: "sticky",
              bottom: 0,
              width: "100%",
              textAlign: "center",
              padding: "10px",
              background: "#fff",
            }}
          >
            Chargement...
          </div>
        )}
      </div>
    </div>
  );
}
