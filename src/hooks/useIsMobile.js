import { useState, useEffect } from 'react';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            // Check user agent for mobile devices
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileUA = /android|ipad|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

            // Check screen width (standard tablet/mobile breakpoint)
            const isSmallScreen = window.innerWidth < 768;

            setIsMobile(isMobileUA || isSmallScreen);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

export default useIsMobile;
