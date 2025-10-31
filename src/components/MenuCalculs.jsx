import React from "react";
import { Link } from "react-router-dom";

const MenuCalculs = () => {
  return (
    <nav style={{ marginBottom: 20 }}>
      {/* Ajoute ici tes autres liens */}
      <Link to="/calculs/synthese" style={{ marginLeft: 20, color: "#2980b9", textDecoration: "underline" }}>
        Synthèse des calculs
      </Link>
    </nav>
  );
};

export default MenuCalculs;
