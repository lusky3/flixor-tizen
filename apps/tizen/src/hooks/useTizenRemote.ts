import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useTizenRemote() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const tizen = (globalThis as any).tizen;
        let lastKeyTime = 0;

        const updateDebug = (msg: string) => {
            const el = document.getElementById('debug-overlay');
            if (el) {
                el.style.display = 'block';
                el.innerHTML = msg;
            }
        };

        if (tizen?.tvinputdevice) {
            try {
                const keys = ['Return', 'Exit', 'Left', 'Up', 'Right', 'Down', 'Enter', 'Menu', 'MediaPlayPause'];
                keys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
                        console.log(`[TizenRemote] Registered key: ${key}`);
                    } catch {
                        console.warn(`[TizenRemote] Could not register key: ${key}`);
                    }
                });
            } catch (err) {
                console.error('[TizenRemote] Failed to access tvinputdevice:', err);
            }
        }

        const handleTizenKeys = (e: KeyboardEvent) => {
            const now = Date.now();
            if (now - lastKeyTime < 150) return; // Prevent double-triggering
            lastKeyTime = now;

            const keyCode = e.keyCode || e.which;
            updateDebug(`Key: ${e.key} | Code: ${keyCode}`);
            console.log(`[TizenRemote] ${e.type} - Key: ${e.key}, Code: ${keyCode}`);

            // Manual Focus Mover
            const focusableElements = Array.from(document.querySelectorAll('button, [tabindex="0"]')) as HTMLElement[];
            const current = document.activeElement as HTMLElement;
            const currentIndex = focusableElements.indexOf(current);

            if (e.key === 'ArrowRight' || e.key === 'Right') {
                const next = focusableElements[currentIndex + 1];
                if (next) {
                    e.preventDefault();
                    next.focus();
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                const prev = focusableElements[currentIndex - 1];
                if (prev) {
                    e.preventDefault();
                    prev.focus();
                }
            } else if (e.key === 'ArrowDown' || e.key === 'Down') {
                const currentRect = current?.getBoundingClientRect();
                if (currentRect) {
                    const below = focusableElements.find(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.top > currentRect.bottom && Math.abs(rect.left - currentRect.left) < 300;
                    });
                    if (below) {
                        e.preventDefault();
                        below.focus();
                    }
                }
            } else if (e.key === 'ArrowUp' || e.key === 'Up') {
                 const currentRect = current?.getBoundingClientRect();
                 if (currentRect) {
                     // Find the closest element above
                     const above = focusableElements.filter(el => {
                         const rect = el.getBoundingClientRect();
                         return rect.bottom < currentRect.top && Math.abs(rect.left - currentRect.left) < 300;
                     }).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
                     
                     if (above) {
                         e.preventDefault();
                         above.focus();
                     }
                 }
            }

            // Return/Back
            if (keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (location.pathname !== '/' && location.pathname !== '/login') {
                    e.preventDefault();
                    navigate(-1);
                } else if (tizen) {
                    try {
                        tizen.application.getCurrentApplication().exit();
                    } catch { /* ignore */ }
                }
            }
        };

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            console.log('[TizenRemote] Focus GAINED:', target.tagName, target.className);
        };

        globalThis.addEventListener('keydown', handleTizenKeys);
        globalThis.addEventListener('focusin', handleFocusIn);
        
        return () => {
            globalThis.removeEventListener('keydown', handleTizenKeys);
            globalThis.removeEventListener('focusin', handleFocusIn);
        };
    }, [navigate, location.pathname]);
}

declare global {
    interface Window {
        tizen?: any;
    }
}
