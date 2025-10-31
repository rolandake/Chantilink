import React, { createContext, useContext, useState } from "react";

const ProjectsContext = createContext();

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  const fetchProjects = async (token) => {
    try {
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProjects(data.projets || data.projects);
    } catch (e) {
      console.error("Erreur chargement projets :", e);
    }
  };

  const addProject = (project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const setActiveProject = (project) => {
    setCurrentProject(project);
  };

  const resetActiveProject = () => {
    setCurrentProject(null);
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        currentProject,
        fetchProjects,
        addProject,
        setActiveProject,
        resetActiveProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectsContext);
}
