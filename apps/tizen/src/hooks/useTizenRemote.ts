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

        // Register Tizen TV input device keys
        if (tizen?.tvinputdevice) {
            try {
                const keys = ['Return', 'Exit', 'Left', 'Up', 'Right', 'Down', 'Enter', 'Menu', 'MediaPlayPause'];
                keys.forEach(key => {
                    try {
                        tizen.tvinputdevice.registerKey(key);
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
            if (now - lastKeyTime < 150) return;
            lastKeyTime = now;

            const keyCode = e.keyCode || e.which;
            updateDebug(`Key: ${e.key} | Code: ${keyCode}`);

            // Return/Back key handling
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

            // MediaPlayPause key handling
            if (keyCode === 10252 || e.key === 'MediaPlayPause') {
                e.preventDefault();
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) {
                        video.play().catch(() => { /* ignore autoplay errors */ });
                    } else {
                        video.pause();
                    }
                }
            }
        };

        // Focus debugging
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            console.log('[TizenRemote] Focus GAINED:', target.tagName, target.className);
        };

        // Tizen lifecycle events — pause/resume video on visibility change
        const handleVisibilityChange = () => {
            const video = document.querySelector('video');
            if (!video) return;

            if (document.hidden) {
                if (!video.paused) {
                    video.pause();
                    video.dataset.wasPlaying = 'true';
                }
            } else {
                if (video.dataset.wasPlaying === 'true') {
                    video.play().catch(() => { /* ignore autoplay errors */ });
                    delete video.dataset.wasPlaying;
                }
            }
        };

        globalThis.addEventListener('keydown', handleTizenKeys);
        globalThis.addEventListener('focusin', handleFocusIn);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            globalThis.removeEventListener('keydown', handleTizenKeys);
            globalThis.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [navigate, location.pathname]);
}

declare global {
    interface Window {
        tizen?: any;
    }
}
