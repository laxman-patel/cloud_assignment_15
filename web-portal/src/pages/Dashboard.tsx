import { useEffect, useState } from 'react';
import { Users, Calendar, CreditCard, Activity } from 'lucide-react';
import { API_URLS } from '../config';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-zinc-400">{title}</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                    <Icon className={color} size={24} />
                </div>
            </div>
        </div>
    );
}

export function Dashboard() {
    const [stats, setStats] = useState({
        patients: 0,
        appointments: 0,
        revenue: 0,
        activeDoctors: 12,
        popularDoctor: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            let patientCount = 0;
            let appointmentCount = 0;
            let revenue = 0;

            try {
                // 1. Fetch Patients
                try {
                    const patientsRes = await fetch(`${API_URLS.PATIENT}/patients`);
                    if (patientsRes.ok) {
                        const patientsData = await patientsRes.json();
                        console.log('Patients Data:', patientsData);
                        if (Array.isArray(patientsData)) {
                            patientCount = patientsData.length;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch patients:", e);
                }

                // 2. Fetch Appointments
                try {
                    const appointmentsRes = await fetch(`${API_URLS.APPOINTMENT}/appointments`);
                    if (appointmentsRes.ok) {
                        const appointmentsData = await appointmentsRes.json();
                        console.log('Appointments Data:', appointmentsData);
                        if (Array.isArray(appointmentsData)) {
                            appointmentCount = appointmentsData.length;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch appointments:", e);
                }

                // 3. Fetch Revenue
                try {
                    const billingRes = await fetch(`${API_URLS.BILLING}/invoices`);
                    if (billingRes.ok) {
                        const billingData = await billingRes.json();
                        console.log('Billing Data:', billingData);
                        if (Array.isArray(billingData)) {
                            revenue = billingData.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch invoices:", e);
                }
            } catch (error) {
                console.error("Error in fetchStats:", error);
            } finally {
                // Always update stats and set loading to false
                setStats({
                    patients: patientCount,
                    appointments: appointmentCount,
                    revenue,
                    activeDoctors: 12,
                    popularDoctor: stats.popularDoctor
                });
                setLoading(false);
            }
        };

        fetchStats();

        // Real-time updates via WebSocket
        const ws = new WebSocket(API_URLS.WS_APPOINTMENT);

        ws.onopen = () => {
            console.log('Connected to Analytics Stream');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'analytics-update') {
                    console.log('Real-time update:', data);
                    setStats(prev => ({
                        ...prev,
                        appointments: data.totalAppointments || prev.appointments,
                        popularDoctor: data.popularDoctor || prev.popularDoctor,
                    }));
                }
            } catch (e) {
                console.error('Failed to parse WS message:', e);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-zinc-400 mt-2">Real-time overview of healthcare operations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Patients"
                    value={loading ? "..." : stats.patients.toString()}
                    icon={Users}
                    color="text-blue-500"
                />
                <StatCard
                    title="Appointments"
                    value={loading ? "..." : stats.appointments.toString()}
                    icon={Calendar}
                    color="text-emerald-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={loading ? "..." : `$${stats.revenue.toLocaleString()}`}
                    icon={CreditCard}
                    color="text-violet-500"
                />
                <StatCard
                    title="Popular Doctor"
                    value={stats.popularDoctor || "N/A"}
                    icon={Activity}
                    color="text-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <div>
                                    <p className="text-sm font-medium">New patient registered</p>
                                    <p className="text-xs text-zinc-500">2 minutes ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">System Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-400">Auth Service</span>
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded">Operational</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-400">Patient Database</span>
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded">Operational</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-400">Analytics Engine</span>
                            <span className="px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-500 rounded">Degraded</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
