'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <h1 className="text-9xl font-bold text-orange-600">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-900 mt-4">Pagina Non Trovata</h2>
                    <p className="text-gray-600 mt-2">
                        La pagina che stai cercando non esiste o è stata spostata.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Torna alla Home
                </Link>
            </div>
        </div>
    );
}
