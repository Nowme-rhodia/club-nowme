import React from 'react';
import { Link } from 'react-router-dom';

export function Logo({ className = "h-8" }: { className?: string }) {
    return (
        <Link to="/">
            <img
                src="https://i.imgur.com/or3q8gE.png"
                alt="NowMe Logo"
                className={`${className} w-auto`}
            />
        </Link>
    );
}
