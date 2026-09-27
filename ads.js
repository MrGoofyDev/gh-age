document.addEventListener('DOMContentLoaded', () => {
    const bannerWidth = 728;
    const bannerHeight = 90;
    const slots = document.querySelectorAll('.ad-banner-slot');

    slots.forEach((slot) => {
        const fitBanner = () => {
            const iframe = slot.querySelector('iframe');
            if (!iframe) return;

            const scale = Math.min(1, slot.clientWidth / bannerWidth);
            iframe.style.setProperty('position', 'absolute', 'important');
            iframe.style.setProperty('top', '0', 'important');
            iframe.style.setProperty('left', '0', 'important');
            iframe.style.setProperty('width', `${bannerWidth}px`, 'important');
            iframe.style.setProperty('max-width', 'none', 'important');
            iframe.style.setProperty('height', `${bannerHeight}px`, 'important');
            iframe.style.setProperty('transform-origin', 'top left', 'important');
            iframe.style.setProperty('transform', `scale(${scale})`, 'important');
        };

        new ResizeObserver(fitBanner).observe(slot);
        new MutationObserver(fitBanner).observe(slot, { childList: true, subtree: true });
        fitBanner();
    });
});
