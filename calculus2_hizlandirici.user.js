// ==UserScript==
// @name         Calculus 2 Portal - 3x Hızlandırıcı
// @namespace    https://buders-calculus2.portal
// @version      1.0
// @description  Calculus 2 Portalındaki gömülü YouTube videolarına 2.5x, 3x ve 4x hızlandırma desteği sağlar.
// @author       Calculus 2 Portal
// @match        https://www.youtube.com/embed/*
// @match        https://www.youtube-nocookie.com/embed/*
// @all-frames   true
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let targetSpeed = 1.0;

    function applySpeed(speed) {
        if (!speed || isNaN(speed)) return;
        targetSpeed = parseFloat(speed);
        const video = document.querySelector('video');
        if (video) {
            video.playbackRate = targetSpeed;
            // Also update defaultPlaybackRate so it persists on play/pause
            video.defaultPlaybackRate = targetSpeed;
        }
    }

    // Continuously ensure target speed is kept (YouTube internal player sometimes resets rate on quality change)
    setInterval(() => {
        if (targetSpeed > 2.0 || targetSpeed < 1.0) {
            const video = document.querySelector('video');
            if (video && Math.abs(video.playbackRate - targetSpeed) > 0.05) {
                video.playbackRate = targetSpeed;
            }
        }
    }, 400);

    // Listen for speed override messages from the parent Calculus 2 Portal
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'CALCULUS_SPEED_OVERRIDE') {
            applySpeed(event.data.speed);
        }
    });

    // Send handshake ping to parent frame every second until acknowledged
    const pingInterval = setInterval(() => {
        try {
            window.parent.postMessage({ type: 'CALCULUS_TAMPERMONKEY_READY' }, '*');
        } catch(e) {}
    }, 1000);

    // Stop pinging after 10 seconds
    setTimeout(() => clearInterval(pingInterval), 10000);

})();
