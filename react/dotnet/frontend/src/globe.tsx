'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import styles from './Globe.module.css';

declare global {
    interface Window {
        google: {
            maps: {
                importLibrary: (name: string) => Promise<any>;
            };
        };
    }
}

interface MapMarker {
    id: string;
    position: {
        lat: number;
        lng: number;
        altitude?: number;
    };
    label: string;
    icon?: {
        glyph: string;
        background: string;
        scale?: number;
        glyphColor?: string;
    };
    metadata?: Record<string, any>;
}

interface MapLayer {
    id: string;
    name: string;
    type: 'markers' | 'overlay' | 'data';
    visible: boolean;
    markers?: MapMarker[];
    style?: Record<string, any>;
    data?: any;
}

interface GlobeRef {
    isInitialized: () => boolean;
    panToLocation: (lat: number, lng: number, name: string) => Promise<void>;
    addMarker: (marker: MapMarker) => Promise<void>;
    removeMarker: (markerId: string) => Promise<void>;
    addLayer: (layer: MapLayer) => Promise<void>;
    removeLayer: (layerId: string) => Promise<void>;
    setLayerVisibility: (layerId: string, visible: boolean) => Promise<void>;
    clearAll: () => Promise<void>;
    getLayers: () => Promise<MapLayer[]>;
    getMarkers: () => Promise<{ id: string; data: MapMarker }[]>;
}

const defaultMapConfig = {
    mode: 'hybrid',
    defaultAltitude: 75,
    defaultRange: 1200,
    defaultTilt: 65,
    markerScale: 1.3
};

const Globe = (_: {}, ref: React.ForwardedRef<GlobeRef>) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map3D, setMap3D] = useState<any>(null);
    const [layers, setLayers] = useState<MapLayer[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const markersRef = useRef<Map<string, any>>(new Map());

    useEffect(() => {
        // Load Google Maps script
        const loadGoogleMapsScript = () => {
            return new Promise<void>((resolve, reject) => {
                if (typeof window !== 'undefined') {
                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDK7BXtZz4ypjq0yr-7FrrAcl3oCoPpxK8&v=beta&libraries=marker,maps3d`;
                    script.async = true;
                    script.defer = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
                    document.head.appendChild(script);
                }
            });
        };

        const loadGoogleMaps = async () => {
            if (typeof window !== 'undefined') {
                if (!window.google) {
                    await loadGoogleMapsScript();
                }

                try {
                    const { Map3DElement, MapMode, Marker3DInteractiveElement } = await window.google.maps.importLibrary("maps3d");
                    const { PinElement } = await window.google.maps.importLibrary('marker');

                    const map = new Map3DElement({
                        mode: MapMode.HYBRID,
                    });

                    setMap3D(map);
                    setIsInitialized(true);

                    // Group countries by region
                    // Initialize the map without any markers
                    mapRef.current?.append(map);
                    mapRef.current?.append(map);

                } catch (error) {
                    console.error("Error loading Google Maps:", error);
                }
            }
        };

        loadGoogleMaps();
    }, []);

    // Function to create a marker from MapMarker interface
    const createMarker = useCallback(async (markerData: MapMarker) => {
        if (!map3D) return null;

        const [markerLib, maps3dLib] = await Promise.all([
            window.google.maps.importLibrary('marker'),
            window.google.maps.importLibrary('maps3d')
        ]);

        const { PinElement } = markerLib;
        const { Marker3DInteractiveElement } = maps3dLib;

        const marker = new Marker3DInteractiveElement({
            position: {
                lat: markerData.position.lat,
                lng: markerData.position.lng,
                altitude: markerData.position.altitude || defaultMapConfig.defaultAltitude
            },
            label: markerData.label,
            altitudeMode: 'ABSOLUTE',
            extruded: true,
        });

        if (markerData.icon) {
            const pin = new PinElement({
                background: markerData.icon.background,
                glyph: markerData.icon.glyph,
                scale: markerData.icon.scale || defaultMapConfig.markerScale,
                glyphColor: markerData.icon.glyphColor || '#fff'
            });
            marker.append(pin);
        }

        marker.addEventListener('gmp-click', () => {
            map3D.flyCameraTo({
                endCamera: {
                    center: marker.position,
                    tilt: defaultMapConfig.defaultTilt,
                    range: defaultMapConfig.defaultRange,
                    heading: 0,
                },
                durationMillis: 2500,
            });
        });

        map3D.append(marker);
        return marker;
    }, [map3D]);

    useImperativeHandle(ref, () => ({
        isInitialized: () => isInitialized,
        panToLocation: async (lat: number, lng: number, name: string) => {
            if (!map3D) return;

            map3D.flyCameraTo({
                endCamera: {
                    center: { lat, lng, altitude: 0 },
                    tilt: defaultMapConfig.defaultTilt,
                    range: defaultMapConfig.defaultRange,
                    heading: 0,
                },
                durationMillis: 2000,
            });

            // Find the closest marker if it exists
            const markerEntry = Array.from(markersRef.current.values())
                .find(m => Math.abs(m.data.position.lat - lat) < 0.1 && Math.abs(m.data.position.lng - lng) < 0.1);

            if (markerEntry) {
                setTimeout(() => {
                    markerEntry.element.dispatchEvent(new Event('gmp-click'));
                }, 2100);
            }
        },
        addMarker: async (marker: MapMarker) => {
            const mapMarker = createMarker(marker);
            if (mapMarker) {
                markersRef.current.set(marker.id, { element: mapMarker, data: marker });
            }
        },
        removeMarker: async (markerId: string) => {
            const marker = markersRef.current.get(markerId);
            if (marker) {
                marker.element.setMap(null);
                markersRef.current.delete(markerId);
            }
        },
        addLayer: async (layer: MapLayer) => {
            setLayers(prev => [...prev, layer]);
            if (layer.markers) {
                layer.markers.forEach(marker => {
                    const mapMarker = createMarker(marker);
                    if (mapMarker) {
                        markersRef.current.set(marker.id, {
                            element: mapMarker,
                            data: marker,
                            layerId: layer.id
                        });
                    }
                });
            }
        },
        removeLayer: async (layerId: string) => {
            setLayers(prev => prev.filter(l => l.id !== layerId));
            // Remove all markers associated with this layer
            Array.from(markersRef.current.entries())
                .filter(([_, value]) => value.layerId === layerId)
                .forEach(([id, value]) => {
                    value.element.setMap(null);
                    markersRef.current.delete(id);
                });
        },
        setLayerVisibility: async (layerId: string, visible: boolean) => {
            setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible } : l));
            // Update visibility of all markers in the layer
            Array.from(markersRef.current.entries())
                .filter(([_, value]) => value.layerId === layerId)
                .forEach(([_, value]) => {
                    value.element.setMap(visible ? map3D : null);
                });
        },
        clearAll: async () => {
            setLayers([]);
            Array.from(markersRef.current.values()).forEach(marker => {
                marker.element.setMap(null);
            });
            markersRef.current.clear();
        },
        getLayers: async () => {
            return layers;
        },
        getMarkers: async () => {
            return Array.from(markersRef.current.entries()).map(([id, value]) => ({
                id,
                data: value.data
            }));
        }
    }), [map3D, isInitialized, createMarker, layers]);

    return (
        <>
            <div className={styles.flexContainer}>
                <div className={styles.mapContainer}>
                    <div ref={mapRef} className={styles.globeContainer} id="globe-container" />
                </div>
            </div>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Last Maintenance</th>
                    <th>Battery Level (%)</th>
                    <th>Location</th>
                    <th>Sensors</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>101</td>
                    <td>Atlas</td>
                    <td>Active</td>
                    <td>5/26/2024</td>
                    <td>85</td>
                    <td>Warehouse A</td>
                    <td>
                        <ul>
                            <li>Temperature: 36°C</li>
                            <li>Proximity: Clear</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td>102</td>
                    <td>Spot</td>
                    <td>Maintenance</td>
                    <td>6/5/2024</td>
                    <td>60</td>
                    <td>Workshop</td>
                    <td>
                        <ul>
                            <li>Temperature: 40°C</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td>103</td>
                    <td>Pepper</td>
                    <td>Active</td>
                    <td>5/21/2024</td>
                    <td>90</td>
                    <td>Lobby</td>
                    <td>
                        <ul>
                            <li>Humidity: 45%</li>
                        </ul>
                    </td>
                </tr>
                <tr>
                    <td>104</td>
                    <td>Nao</td>
                    <td>Inactive</td>
                    <td>5/1/2024</td>
                    <td>40</td>
                    <td>Storage</td>
                    <td>
                        <span>No Data</span>
                    </td>
                </tr>
                </tbody>
            </table>
        </>
    );
};

export default forwardRef(Globe);