import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  Bot,
  FileText,
  FolderOpen,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Stethoscope,
  Bell,
  Star,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/assistant', icon: Bot, label: 'Assistant IA' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/favorites', icon: Star, label: 'Favoris' },
    { to: '/categories', icon: FolderOpen, label: 'Catégories' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Utilisateurs' }] : []),
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const roleLabels = {
    admin: 'Administrateur',
    direction: 'Direction',
    personnel_soignant: 'Personnel Soignant',
  };

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'glass-sidebar border-r border-sidebar-border flex flex-col h-screen transition-all duration-300 relative',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-semibold text-foreground">Assistant IA</h1>
            <p className="text-xs text-muted-foreground">Médical v2.0</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.to.slice(1)}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-primary/10 hover:text-primary',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground'
                )
              }
            >
              <div className="relative">
                <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="animate-fade-in flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Theme Toggle */}
      <div className={cn('px-4 py-3', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          {isDark ? (
            <Moon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Sun className="w-4 h-4 text-muted-foreground" />
          )}
          {!collapsed && (
            <>
              <span className="text-sm text-muted-foreground flex-1">Mode sombre</span>
              <Switch
                data-testid="theme-toggle"
                checked={isDark}
                onCheckedChange={toggleTheme}
              />
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* User Info */}
      <div className={cn('p-4', collapsed && 'p-2')}>
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[user?.role] || user?.role}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        <Button
          data-testid="logout-btn"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            collapsed && 'px-2'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-background border shadow-sm hover:bg-muted"
        data-testid="sidebar-toggle"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </aside>
  );
};

export default Sidebar;
