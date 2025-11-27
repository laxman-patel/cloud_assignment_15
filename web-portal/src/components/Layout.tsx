import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, CreditCard, FileText, BarChart3, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Patients', path: '/patients' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
    { icon: FileText, label: 'Lab Results', path: '/lab-results' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
];

export function Layout() {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
                <div className="p-6 border-b border-zinc-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        MediFlow
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">Healthcare Admin</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400"
                                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-zinc-950">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
