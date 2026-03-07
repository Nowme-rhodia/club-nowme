import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProHeader } from '../components/pro/ProHeader';
import { ProFooter } from '../components/pro/ProFooter';

export function ProLayout() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <ProHeader />
            <main className="flex-1">
                <Outlet />
            </main>
            <ProFooter />
        </div>
    );
}
