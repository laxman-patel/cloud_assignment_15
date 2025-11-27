import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { API_URLS } from '../config';

interface Invoice {
    id: string;
    patientId: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
    date: string;
}

export function Billing() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await fetch(`${API_URLS.BILLING}/invoices`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setInvoices(data);
                }
            } catch (error) {
                console.error('Failed to fetch invoices', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'text-emerald-500 bg-emerald-500/10';
            case 'PENDING': return 'text-amber-500 bg-amber-500/10';
            case 'OVERDUE': return 'text-red-500 bg-red-500/10';
            default: return 'text-zinc-500 bg-zinc-500/10';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return CheckCircle;
            case 'PENDING': return Clock;
            case 'OVERDUE': return AlertCircle;
            default: return AlertCircle;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>
                <p className="text-zinc-400 mt-2">Track payments and outstanding balances.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <p className="text-sm text-zinc-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">$12,450</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <p className="text-sm text-zinc-400">Pending Payments</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1">$3,200</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <p className="text-sm text-zinc-400">Overdue</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">$850</p>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-950 text-zinc-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Invoice ID</th>
                                <th className="px-6 py-3 font-medium">Patient ID</th>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Amount</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading invoices...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No invoices found.</td></tr>
                            ) : (
                                invoices.map((inv) => {
                                    const StatusIcon = getStatusIcon(inv.status);
                                    return (
                                        <tr key={inv.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-zinc-500">#{inv.id}</td>
                                            <td className="px-6 py-4 text-zinc-300">{inv.patientId}</td>
                                            <td className="px-6 py-4 text-zinc-400">{inv.date}</td>
                                            <td className="px-6 py-4 font-medium text-zinc-200">${inv.amount.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                                                    <StatusIcon size={12} />
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button className="text-blue-400 hover:text-blue-300 font-medium text-xs">Download PDF</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
