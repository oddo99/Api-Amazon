'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function SupabaseTest() {
    const [status, setStatus] = useState<string>('Testing connection...')
    const [users, setUsers] = useState<any[]>([])

    useEffect(() => {
        async function testConnection() {
            try {
                const supabase = createClient()

                // Test query - get users (if any exist)
                const { data, error } = await supabase
                    .from('User')
                    .select('id, email, name')
                    .limit(5)

                if (error) {
                    setStatus(`Error: ${error.message}`)
                    console.error('Supabase error:', error)
                } else {
                    setStatus('Connected successfully! ✅')
                    setUsers(data || [])
                }
            } catch (err: any) {
                setStatus(`Connection failed: ${err.message}`)
            }
        }

        testConnection()
    }, [])

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

            <div className={`p-4 rounded-md mb-6 ${status.includes('Error') || status.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {status}
            </div>

            {users.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {status.includes('Connected') && users.length === 0 && (
                <p className="text-gray-500 italic">Connected, but no users found in the database.</p>
            )}
        </div>
    )
}
