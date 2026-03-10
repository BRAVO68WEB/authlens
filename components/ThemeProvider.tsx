'use client';

import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
    const darkMode = useStore((state) => state.darkMode);
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;
        const body = window.document.body;

        if (darkMode) {
            root.classList.add('dark');
            body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            body.classList.remove('dark');
        }
    }, [darkMode, mounted]);

    // Prevent flash by not rendering children until mounted if we were to do something else here,
    // but for a theme wrapper, we just want to ensure classes are applied accurately.
    // Actually, we should render children immediately to avoid blocking the whole app, 
    // but the theme application happens in the effect.

    return <>{children}</>;
}
