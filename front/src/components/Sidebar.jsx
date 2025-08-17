import { 
    HospitalFill, HouseHeartFill, 
    PeopleFill, GearFill, Search, 
    BookFill, FileTextFill,
    BarChartFill, List, CreditCard,
    PersonCircle, BoxArrowRight, CashCoin,
    Receipt, People, JournalBookmarkFill,
    Clipboard2PlusFill,
    ClipboardCheckFill,
    QrCodeScan,
    Calendar,
    Archive,
    FolderFill,
} from 'react-bootstrap-icons'
import logo from '../images/logo.png'
import { useAuth } from '../hooks/useAuth';
import { useSchool } from '../contexts/SchoolContext';
import { useEffect, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function Sidebar({ isCollapsed, onToggle, isOpen, setIsOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user, isAuthenticated, logout: authLogout, isLoading } = useAuth();
  const { schoolSettings, getLogoUrl } = useSchool();
  const { primaryColor, darkenColor, lightenColor, hexToRgba } = useTheme();


  // Debug pour le logo
  const getLogoSrc = () => {
    const logoUrl = getLogoUrl();
    console.log("School logo path:", schoolSettings.school_logo);
    console.log("Generated logo URL:", logoUrl);
    return logoUrl || logo;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Les données utilisateur sont directement disponibles via le hook useAuth

  // Navigation sections based on user role
  const getNavigationSections = () => {
    if (!user || !user.role) {
      return [];

    }

    const userRole = user.role;

    if (userRole === "admin") {
      return [
        {
          title: "Gestion Académique",
          items: [
            { name: "Années Scolaires", href: "/school-years", icon: <Calendar /> },
            { name: "Sections", href: "/sections", icon: <HospitalFill /> },
            { name: "Niveaux", href: "/levels", icon: <BookFill /> },
            {
              name: "Classes",
              href: "/school-classes",
              icon: <HouseHeartFill />,
            },
            {
              name: "Matières",
              href: "/subjects",
              icon: <JournalBookmarkFill />,
            },
            {
              name: "Configuration Série-Matières",
              href: "/series-subject-configuration",
              icon: <JournalBookmarkFill />,
            },
            { name: "Enseignants", href: "/teachers", icon: <PeopleFill /> },
            { name: "Affectations & Prof. Principaux", href: "/teacher-assignments", icon: <PeopleFill /> },
            {
              name: "Tranches Paiement",
              href: "/payment-tranches",
              icon: <CreditCard />,
            },
          ],
        },
        {
          title: "Outils",
          items: [
            { name: "Inventaire", href: "/inventory", icon: <Archive /> },
            { name: "Documents", href: "/documents", icon: <FolderFill /> },
            { name: "Rechercher", href: "/search", icon: <Search /> },
            { name: "Statistiques", href: "/stats", icon: <BarChartFill /> },
          ],
        },
        {
          title: "Administration",
          items: [
            { name: "Gestion des Besoins", href: "/needs-management", icon: <ClipboardCheckFill /> },
            { name: "Mes Besoins", href: "/my-needs", icon: <Clipboard2PlusFill /> },
            { name: 'Utilisateurs', href: '/user-management', icon: <People/> },
            { name: 'Surveillants Généraux', href: '/supervisor-assignments', icon: <PersonCircle/> },
            { name: "Profil", href: "/profile", icon: <PersonCircle /> },
            { name: "Paramètres", href: "/settings", icon: <GearFill /> },
          ],
        },
      ];
    } else if (userRole === "accountant" || userRole === "comptable_superieur") {
      return [
        {
          title: "Comptabilité",
          items: [
            { name: "Classes", href: "/class-comp", icon: <HouseHeartFill /> },
            { name: "Statistiques", href: "/stats", icon: <BarChartFill /> },
            { name: "Rechercher", href: "/search", icon: <Search /> },
          ],
        },
        {
          title: "Outils",
          items: [
            { name: "Inventaire", href: "/inventory", icon: <Archive /> },
            { name: "Documents", href: "/documents", icon: <FolderFill /> },
          ],
        },
        {
          title: "Paiements",
          items: [
            {
              name: "États de Paiements",
              href: "/payment-reports",
              icon: <Receipt />,
            },
          ],
        },
        {
          title: "Rapports",
          items: [
            {
              name: "Rapports Financiers",
              href: "/reports",
              icon: <FileTextFill />,
            },
            {
              name: "Détail Paiements Scolarité",
              href: "/reports/school-fee-payment-details",
              icon: <Receipt />,
            },
            {
              name: "Encaissement Détaillé Période",
              href: "/reports/detailed-collection",
              icon: <CashCoin />,
            },
            {
              name: "Paiement Frais par Classe",
              href: "/reports/class-school-fees",
              icon: <Receipt />,
            },
          ],
        },
        {
          title: "Compte",
          items: [
            { name: "Mes Besoins", href: "/my-needs", icon: <Clipboard2PlusFill /> },
            ...(userRole === "comptable_superieur" ? [
              { name: "Gestion des Besoins", href: "/needs-management", icon: <ClipboardCheckFill /> }
            ] : []),
            { name: "Profil", href: "/profile", icon: <PersonCircle /> }
          ],
        },
      ];
    } else if (userRole === "surveillant_general") {
      return [
        {
          title: "Surveillance",
          items: [
            { name: "Scanner QR Étudiants", href: "/attendance", icon: <QrCodeScan /> },
            { name: "Scanner Offline+", href: "/attendance-offline", icon: <QrCodeScan /> },
            { name: "Scanner QR Enseignants", href: "/teacher-attendance-scanner", icon: <PeopleFill /> },
            { name: "Stats Détaillées Enseignants", href: "/teacher-detailed-stats", icon: <BarChartFill /> },
            { name: "Rapports", href: "/attendance-reports", icon: <FileTextFill /> },
          ],
        },
        {
          title: "Outils",
          items: [
            { name: "Documents", href: "/documents", icon: <FolderFill /> },
          ],
        },
        {
          title: "Compte",
          items: [
            { name: "Mes Besoins", href: "/my-needs", icon: <Clipboard2PlusFill /> },
            { name: "Profil", href: "/profile", icon: <PersonCircle /> },
          ],
        },
      ];
    } else {
      return [
        {
          title: "Enseignement",
          items: [
            {
              name: "Élèves",
              href: "/students/" + (user.class_id || "1"),
              icon: <PeopleFill />,
            },
            { name: "Séquences", href: "/seqs", icon: <List /> },
            { name: "Trimestres", href: "/trims", icon: <BookFill /> },
          ],
        },
        {
          title: "Outils",
          items: [
            { name: "Documents", href: "/documents", icon: <FolderFill /> },
            { name: "Mes Besoins", href: "/my-needs", icon: <Clipboard2PlusFill /> },
            { name: "Rechercher", href: "/search", icon: <Search /> },
            { name: "Profil", href: "/profile", icon: <PersonCircle /> },
          ],
        },
      ];
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Force logout même en cas d'erreur
      navigate("/login");
    }
  };

  const getUserDisplayName = () => {
    if (isLoading || !user) return "";

    if (user.role === "admin" || user.role === "accountant" || user.role === "comptable_superieur") {
      return user.username || user.name || "";
    } else {
      return user.name || "";
    }
  };

  const getUserRole = () => {
    if (isLoading || !user) return "";

    switch (user.role) {
      case "admin":
        return "Administrateur";
      case "accountant":
        return "Comptable";
      case "comptable_superieur":
        return "Comptable Supérieur";
      case "teacher":
        return "Enseignant";
      case "surveillant_general":
        return "Surveillant Général";
      default:
        return "Utilisateur";
    }
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (!name) return "U";

    const words = name.split(" ").filter((word) => word.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleLinkClick = (href) => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const navigationSections = getNavigationSections();

  // Render the sidebar with proper styling
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${
          isMobile && isOpen ? "mobile-open" : ""
        }`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: isCollapsed && !isMobile ? "80px" : "280px",
          height: "100vh",
          backgroundColor: darkenColor(primaryColor, 40),
          color: "white",
          zIndex: 1000,
          transition: "width 0.3s ease",
          transform:
            isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
          boxShadow: `2px 0 10px ${hexToRgba(primaryColor, 0.2)}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: `1px solid ${hexToRgba(primaryColor, 0.3)}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <img
            src={getLogoSrc()}
            alt={`${schoolSettings.school_name || "CPBD"} Logo`}
            style={{
              width: "40px",
              height: "40px",
              objectFit: "contain",
            }}
            onError={(e) => {
              // En cas d'erreur de chargement, utiliser le logo par défaut
              e.target.src = logo;
            }}
          />
          {(!isCollapsed || isMobile) && (
            <div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: primaryColor }}>
                {schoolSettings.school_name
                  ?.split(" ")
                  .map((word) => word.charAt(0))
                  .join("") || "CPBD"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: lightenColor(primaryColor, 30),
                }}
              >
                {schoolSettings.school_name ||
                  "College Polyvalent Bilingue de Douala"}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: "20px 0", overflowY: "auto" }}>
          {navigationSections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ marginBottom: "30px" }}>
              {(!isCollapsed || isMobile) && (
                <div
                  style={{
                    padding: "0 20px 10px",
                    fontSize: "12px",
                    color: lightenColor(primaryColor, 20),
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  {section.title}
                </div>
              )}
              {section.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  to={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 20px",
                    color:
                      location.pathname === item.href
                        ? primaryColor
                        : "rgba(0,0,0,0.6)",
                    backgroundColor:
                      location.pathname === item.href
                        ? hexToRgba(primaryColor, 0.2)
                        : "transparent",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    borderLeft:
                      location.pathname === item.href
                        ? `3px solid ${primaryColor}`
                        : "3px solid transparent",
                  }}
                  onClick={() => handleLinkClick(item.href)}
                  onMouseEnter={(e) => {
                    if (location.pathname !== item.href) {
                      e.target.style.backgroundColor = hexToRgba(
                        primaryColor,
                        0.15
                      );
                      e.target.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (location.pathname !== item.href) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.color = "rgba(0,0,0,0.6)";
                    }
                  }}
                >
                  <div style={{ fontSize: "18px", minWidth: "18px" }}>
                    {item.icon}
                  </div>
                  {(!isCollapsed || isMobile) && (
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                      {item.name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div
          style={{
            padding: "20px",
            borderTop: `1px solid ${hexToRgba(primaryColor, 0.3)}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: primaryColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            {getUserInitials()}
          </div>
          {(!isCollapsed || isMobile) && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: primaryColor }}>
                {getUserDisplayName()}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: lightenColor(primaryColor, 30),
                }}
              >
                {getUserRole()}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Se déconnecter"
            style={{
              background: "transparent",
              border: "none",
              color: lightenColor(primaryColor, 20),
              padding: "8px",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "16px",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = hexToRgba(primaryColor, 0.2);
              e.target.style.color = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = lightenColor(primaryColor, 20);
            }}
          >
            <BoxArrowRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default Sidebar;