import React, { useEffect, useState } from 'react';

interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
}

export const PatientList: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);

    useEffect(() => {
        fetch('http://affd9b1a639494e95993c023569d1b3e-1503211187.us-east-1.elb.amazonaws.com/patients')
            .then((res) => res.json())
            .then((data) => setPatients(data))
            .catch((err) => console.error('Failed to fetch patients', err));
    }, []);

    return (
        <div className="bg-zinc-900 p-6 rounded-lg shadow-lg border border-zinc-800">
            <h2 className="text-2xl font-bold mb-4 text-zinc-100">Patients</h2>
            <div className="space-y-3">
                {patients.length === 0 ? (
                    <p className="text-zinc-500">No patients found.</p>
                ) : (
                    patients.map((patient) => (
                        <div key={patient.id} className="p-4 bg-zinc-800 rounded flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-zinc-200">{patient.name}</p>
                                <p className="text-sm text-zinc-400">Age: {patient.age} | {patient.gender}</p>
                            </div>
                            <span className="text-xs text-zinc-500 font-mono">{patient.id.slice(0, 8)}...</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
