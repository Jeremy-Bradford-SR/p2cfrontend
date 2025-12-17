import React, { useRef } from 'react';
import MapView from './MapView';

const SplitView = ({
    mapPoints,
    mapHeight,
    setMapHeight,
    children,
    mapChildren, // New prop for map overlays
    mapRef,
    onFitMarkers,
    onCenterDubuque
}) => {
    const dragging = useRef(false)
    const startY = useRef(0)
    const startHeight = useRef(mapHeight)

    function onMouseDown(e) {
        dragging.current = true
        startY.current = e.clientY
        startHeight.current = mapHeight
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    function onMouseMove(e) {
        if (!dragging.current) return
        const dy = e.clientY - startY.current
        const newH = Math.max(120, startHeight.current + dy)
        setMapHeight(newH)
    }

    function onMouseUp() {
        dragging.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }

    return (
        <div>
            <section className="map-section" style={{ height: mapHeight }}>
                <div className="map-container">
                    <MapView
                        ref={mapRef}
                        points={mapPoints}
                        zoomTo={pos => {
                            if (mapRef.current && mapRef.current.flyTo) mapRef.current.flyTo(pos, 14);
                        }}
                    >
                        {mapChildren}
                    </MapView>
                </div>
            </section>

            <div className="map-controls" style={{ padding: '8px', display: 'flex', gap: '8px', justifyContent: 'center', background: '#f0f0f0' }}>
                {onFitMarkers && <button onClick={onFitMarkers}>Fit All Markers</button>}
                {onCenterDubuque && <button onClick={onCenterDubuque}>Center on Dubuque</button>}
            </div>

            <div className="splitter" onMouseDown={onMouseDown} style={{ height: 8, cursor: 'row-resize', background: '#eee' }} />

            <section className="results-section">
                {children}
            </section>
        </div>
    );
};

export default SplitView;
