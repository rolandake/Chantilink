import React from 'react';
export default function CheckboxSections({ sections, setSections }) {
  // sections = { terrassement: true, fondation: false, ... }

  function toggleSection(name) {
    setSections((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  return (
    <fieldset
      style={{
        fontSize: "13px",
        maxWidth: "320px",
        padding: "6px",
        margin: "0 0 1rem 0",
        border: "1px solid #ccc",
        borderRadius: "6px",
      }}
    >
      <legend style={{ fontWeight: "600", fontSize: "14px", marginBottom: "6px" }}>
        Sections affichées
      </legend>

      {Object.entries(sections).map(([key, checked]) => (
        <label
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "4px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleSection(key)}
            style={{ marginRight: "6px", cursor: "pointer" }}
          />
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </label>
      ))}
    </fieldset>
  );
}

