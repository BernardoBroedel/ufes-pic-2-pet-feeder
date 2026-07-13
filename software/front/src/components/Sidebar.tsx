import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Cat,
  Calendar,
  Video,
  Activity,
  History,
  Settings
} from "lucide-react";
import "./Sidebar.css";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <Cat size={28} />
          <h2>PetFeeder</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <LayoutDashboard size={20} />
          <span>Painel</span>
        </NavLink>
        <NavLink to="/meus-pets" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Cat size={20} />
          <span>Meus Pets</span>
        </NavLink>
        <NavLink to="/agenda" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Calendar size={20} />
          <span>Agenda</span>
        </NavLink>
        <NavLink to="/camera" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Video size={20} />
          <span>Câmera ao Vivo</span>
        </NavLink>
        <NavLink to="/sensores" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Activity size={20} />
          <span>Sensores</span>
        </NavLink>

        <div className="nav-divider" />
        <NavLink to="/operacional" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <Settings size={20} />
          <span>Operacional</span>
        </NavLink>
      </nav>

    </aside>
  );
}
