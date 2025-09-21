import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faChartLine, 
  faExclamationTriangle, 
  faWater, 
  faBuilding, 
  faShieldAlt, 
  faDollarSign, 
  faDatabase, 
  faCog,
  faSignOutAlt,
  faShield,
  faCalculator,
  faFileAlt,
  faCogs,
  faUsers,
  faChartBar,
  faCog as faSettings,
  faChevronDown,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ open, setOpen }) => {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({});
  const [mobileExpandedSections, setMobileExpandedSections] = useState({});

  const toggleSection = (heading) => {
    setExpandedSections((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }));
  };

  const toggleMobileSection = (heading) => {
    setMobileExpandedSections((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }));
  };

  const menuStructure = [
    {
      heading: "ECL Calculation",
      icon: faCalculator,
      items: [
        {
          path: "/ecl-calculation",
          label: "ECL Calculation",
        },
        {
          path: "/ecl-results",
          label: "ECL Results",
        },
      ],
    },
    {
      heading: "Data Configuration",
      icon: faDatabase,
      items: [
        {
          path: "/view-loaded-data",
          label: "Input Data",
        },
        {
          path: "/product-configuration",
          label: "Product Configuration",
        },
      ],
    },
    {
      heading: "Classification",
      icon: faShield,
      items: [
        {
          path: "/classification-measurement",
          label: "Classification & Measurement",
        },
      ],
    },
    {
      heading: "Staging",
      icon: faCogs,
      items: [
        {
          path: "/staging-config",
          label: "Staging Config",
        },
        {
          path: "/stage-reassignment",
          label: "Stage Reassignment",
        },
        
      ],
    },
    {
      heading: "Cashflows",
      icon: faDollarSign,
      items: [
        {
          path: "/upload-cashflows",
          label: "Upload Cashflows",
        },
        {
          path: "/cashflows",
          label: "Generate Cashflows",
        },
        {
          path: "/cashflows-config",
          label: "Cashflows Configuration",
        },
      ],
    },
    {
      heading: "Credit Risk Models",
      icon: faShieldAlt,
      items: [
        {
          subheading: "PD Config",
          subitems: [
            {
              path: "/pd-config",
              label: "PD Configuration",
            },
            {
              path: "/pd-methodology",
              label: "PD Methodology",
            },
          ],
        },
        {
          subheading: "LGD Config",
          subitems: [
            {
              path: "/lgd-config",
              label: "LGD Configuration",
            },
            {
              path: "/lgd-methodology",
              label: "LGD Methodology",
            },
          ],
        },
      ],
    },
  ];

  return (
    <>
      <style>
        {`
          .scrollbar-thin {
            scrollbar-width: thin;
            scrollbar-color: #9ca3af #e5e7eb;
          }
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: #e5e7eb;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #9ca3af;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}
      </style>
      {/* Mobile sidebar */}
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/80 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-56 bg-gray-200/30 lg:hidden">
            <div className="flex grow flex-col gap-y-4 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      {/* Header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/50">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">I</span>
                  </div>
                  <h1 className="text-sm font-bold text-gray-900">IFRS9</h1>
                </div>
        <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-300"
                >
                  <span className="text-gray-600 text-lg font-bold">×</span>
        </button>
      </div>

      {/* Navigation */}
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {/* Dashboard Link */}
                      <li>
                        <NavLink
                          to="/dashboard"
                          className={({ isActive }) =>
                            `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                              isActive
                                ? 'bg-gray-50 text-blue-600'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                            }`
                          }
                          onClick={() => setOpen(false)}
                        >
                          <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faTachometerAlt} className="text-sm" />
                          </div>
                          Dashboard
                        </NavLink>
                      </li>

                      {/* Reports Link */}
                      <li>
                        <NavLink
            to="/reports"
                          className={({ isActive }) =>
                            `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                              isActive
                                ? 'bg-gray-50 text-blue-600'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                            }`
                          }
                          onClick={() => setOpen(false)}
                        >
                          <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faChartBar} className="text-sm" />
        </div>
                          Reports
                        </NavLink>
                      </li>

                      {/* Menu Sections */}
        {menuStructure.map((section, index) => (
                        <li key={index}>
                          <div className="space-y-1">
            <button
                              onClick={() => toggleMobileSection(section.heading)}
                              className="w-full flex items-center justify-between gap-x-3 rounded-md p-2 text-xs leading-5 font-medium text-gray-700 border-b border-gray-200/30 hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-x-3">
                                <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                                  <FontAwesomeIcon icon={section.icon} className="text-sm" />
                                </div>
                                {section.heading}
                              </div>
                              <FontAwesomeIcon 
                                icon={mobileExpandedSections[section.heading] ? faChevronDown : faChevronRight} 
                                className="text-xs text-gray-500" 
                              />
            </button>
                            {mobileExpandedSections[section.heading] && (
                              <ul className="space-y-1 pl-6">
                  {section.heading === "Credit Risk Models"
                    ? section.items.map((item, idx) => (
                        item.subheading && item.subitems ? (
                          <li key={item.subheading}>
                                        <div className="text-xs font-medium text-gray-500 mb-1">{item.subheading}</div>
                                        <ul className="space-y-1 pl-2">
                              {item.subitems.map((subitem) => (
                                <li key={subitem.path}>
                                              <NavLink
                                    to={subitem.path}
                                                className={({ isActive }) =>
                                                  `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium ${
                                                    isActive
                                                      ? 'bg-gray-50 text-blue-600'
                                                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                                  }`
                                                }
                                                onClick={() => setOpen(false)}
                                              >
                                                <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5"></div>
                                                {subitem.label}
                                              </NavLink>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : null
                      ))
                    : section.items.map((item) => (
                        <li key={item.path}>
                                      <NavLink
                            to={item.path}
                                        className={({ isActive }) =>
                                          `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium ${
                                            isActive
                                              ? 'bg-gray-50 text-blue-600'
                                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                          }`
                                        }
                                        onClick={() => setOpen(false)}
                                      >
                                        <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5"></div>
                                        {item.label}
                                      </NavLink>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                        </li>
                      ))}

                      {/* Users Link */}
                      <li>
                        <NavLink
                          to="/users"
                          className={({ isActive }) =>
                            `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                              isActive
                                ? 'bg-gray-50 text-blue-600'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                            }`
                          }
                          onClick={() => setOpen(false)}
                        >
                          <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faUsers} className="text-sm" />
                          </div>
                          Users
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-x-3 rounded-md p-2 text-xs leading-5 font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 border-t border-gray-200/50"
                    >
                      <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                        <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                      </div>
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-4 overflow-y-auto border-r border-gray-200 bg-gray-200/30 px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <div className="flex h-14 shrink-0 items-center border-b border-gray-200/50">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <h1 className="text-sm font-bold text-gray-900">IFRS9</h1>
            </div>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {/* Dashboard Link */}
                  <li>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                          isActive
                            ? 'bg-gray-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                        <FontAwesomeIcon icon={faTachometerAlt} className="text-sm" />
                      </div>
                      Dashboard
                    </NavLink>
                  </li>

                  {/* Reports Link */}
                  <li>
                    <NavLink
                      to="/reports"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                          isActive
                            ? 'bg-gray-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                        <FontAwesomeIcon icon={faChartBar} className="text-sm" />
                      </div>
                      Reports
                    </NavLink>
                  </li>

                  {/* Menu Sections */}
                  {menuStructure.map((section, index) => (
                    <li key={index}>
                      <div className="space-y-1">
                        <button
                          onClick={() => toggleSection(section.heading)}
                          className="w-full flex items-center justify-between gap-x-3 rounded-md p-2 text-xs leading-5 font-medium text-gray-700 border-b border-gray-200/30 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-x-3">
                            <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                              <FontAwesomeIcon icon={section.icon} className="text-sm" />
                            </div>
                            {section.heading}
                          </div>
                          <FontAwesomeIcon 
                            icon={expandedSections[section.heading] ? faChevronDown : faChevronRight} 
                            className="text-xs text-gray-500" 
                          />
                        </button>
                        {expandedSections[section.heading] && (
                          <ul className="space-y-1 pl-6">
                          {section.heading === "Credit Risk Models"
                            ? section.items.map((item, idx) => (
                                item.subheading && item.subitems ? (
                                  <li key={item.subheading}>
                                    <div className="text-xs font-medium text-gray-500 mb-1">{item.subheading}</div>
                                    <ul className="space-y-1 pl-2">
                                      {item.subitems.map((subitem) => (
                                        <li key={subitem.path}>
                                          <NavLink
                                            to={subitem.path}
                                            className={({ isActive }) =>
                                              `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium ${
                                                isActive
                                                  ? 'bg-gray-50 text-blue-600'
                                                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                              }`
                                            }
                                          >
                                            <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5"></div>
                                            {subitem.label}
                                          </NavLink>
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                ) : null
                              ))
                            : section.items.map((item) => (
                                <li key={item.path}>
                                  <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                      `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium ${
                                        isActive
                                          ? 'bg-gray-50 text-blue-600'
                                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                                      }`
                                    }
                                  >
                                    <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5"></div>
                                    {item.label}
                                  </NavLink>
                                </li>
                                ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}

                  {/* Users Link */}
                  <li>
                    <NavLink
            to="/users"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-xs leading-5 font-medium border-b border-gray-200/30 ${
                          isActive
                            ? 'bg-gray-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUsers} className="text-sm" />
                      </div>
                      Users
                    </NavLink>
                  </li>
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-x-3 rounded-md p-2 text-xs leading-5 font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 border-t border-gray-200/50"
                >
                  <div className="h-5 w-5 shrink-0 text-gray-600 flex items-center justify-center">
                    <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
                  </div>
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;