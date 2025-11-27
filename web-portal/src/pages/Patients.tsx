import { useEffect, useState } from 'react';
import { Plus, Search, User } from 'lucide-react';
import { API_URLS } from '../config';

interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
}

export function Patients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Male' });

    const fetchPatients = async () => {
        try {
            const res = await fetch(`${API_URLS.PATIENT}/patients`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPatients(data);
            }
        } catch (error) {
            console.error('Failed to fetch patients', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URLS.PATIENT}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPatient.name,
                    age: parseInt(newPatient.age),
                    gender: newPatient.gender
                }),
            });

            if (res.ok) {
                setShowAddForm(false);
                setNewPatient({ name: '', age: '', gender: 'Male' });
                fetchPatients(); // Refresh list
            }
        } catch (error) {
            console.error('Failed to add patient', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Patients</h2>
                    <p className="text-zinc-400 mt-2">Manage patient records and history.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} />
                    Add Patient
                </button>
            </div>

            {showAddForm && (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold mb-4">New Patient Registration</h3>
                    <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                value={newPatient.name}
                                onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Age</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                value={newPatient.age}
                                onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Gender</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-blue-500"
                                value={newPatient.gender}
                                onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium">
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-950 text-zinc-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Patient ID</th>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Age</th>
                                <th className="px-6 py-3 font-medium">Gender</th>
                                <th className="px-6 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Loading patients...</td></tr>
                            ) : patients.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No patients found.</td></tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-zinc-500">{patient.id.substring(0, 8)}...</td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                <User size={14} />
                                            </div>
                                            <span className="font-medium text-zinc-200">{patient.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">{patient.age}</td>
                                        <td className="px-6 py-4 text-zinc-400">{patient.gender}</td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-400 hover:text-blue-300 font-medium text-xs">View History</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
