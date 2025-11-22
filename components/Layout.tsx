import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, Settings, LogOut, Menu, X, Bell, ChevronRight, 
  Command, ChevronsLeft, ChevronsRight 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="h-screen w-full bg-blue-900 flex overflow-hidden font-sans p-2 lg:p-4 gap-4 relative">
      {/* Background Abstract Shapes (Same as Login) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/40 rounded-full blur-[100px] transform rotate-12"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-500/30 rounded-full blur-[100px]"></div>
          <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[80px]"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/50 to-slate-900/80 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Floating Glass Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 
        bg-slate-900/90 backdrop-blur-xl border-r border-white/10 lg:border-0 lg:bg-slate-900/40 lg:backdrop-blur-md lg:rounded-2xl lg:shadow-xl
        transition-all duration-300 ease-in-out flex flex-col lg:h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        w-72
      `}>
        {/* Logo Area */}
        <div className={`h-20 flex items-center border-b border-white/10 flex-shrink-0 transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6 justify-between'}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div 
                className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50 flex-shrink-0 cursor-pointer hover:bg-blue-500 transition-colors" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? "Expand Sidebar" : ""}
              >
                <Command className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                  <span className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
                  MERLIN <span className="text-blue-300 font-normal">Lite</span>
                  </span>
              )}
            </div>
            
            {/* Close X for Mobile */}
            <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>

            {/* Collapse Chevron for Desktop (Only visible when open) */}
            {!isCollapsed && (
                <button className="hidden lg:block text-slate-400 hover:text-white" onClick={() => setIsCollapsed(true)} title="Collapse Sidebar">
                  <ChevronsLeft className="w-5 h-5" />
                </button>
            )}
        </div>
        
        {/* Expand Button if Collapsed */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-white/5">
                <button className="text-slate-400 hover:text-white p-1" onClick={() => setIsCollapsed(false)} title="Expand">
                  <ChevronsRight className="w-4 h-4" />
                </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            {!isCollapsed && (
                <h2 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 animate-in fade-in">
                Main Menu
                </h2>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    title={isCollapsed ? item.label : ''}
                    className={`
                      group flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                      <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full p-3 rounded-xl hover:bg-white/10 transition-all group text-left`}>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-inner border border-white/20 flex-shrink-0">
              JD
            </div>
            {!isCollapsed && (
                <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">John Doe</p>
                <p className="text-xs text-slate-400 truncate group-hover:text-slate-300">Program Manager</p>
                </div>
            )}
          </button>
          
          <button 
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className={`mt-3 flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-center space-x-2'} px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper - The "Card" */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 rounded-2xl shadow-2xl relative z-10">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Breadcrumb */}
            <div className="hidden md:flex items-center text-sm text-slate-500">
               <span className="font-medium text-slate-900">Organization</span>
               <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
               <span className="hover:text-blue-600 transition-colors cursor-pointer">Global Programs</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
