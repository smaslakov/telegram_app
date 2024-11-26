import React, { useEffect, useRef, useState } from 'react';
import './Map.css';
import mapboxgl from 'mapbox-gl';
mapboxgl.accessToken =process.env.VITE_MAPBOX_TOKEN;

const Map = () => {
    const mapContainerRef = useRef(null);
    const [map, setMap] = useState(null);
    const [stories, setStories] = useState([]);

    useEffect(() => {
        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/avendum/cm2givqhs00cx01ph9xfsesvd',
            center: [30.514, 50.445],
            zoom: 8,
        });

        setMap(mapInstance);

        mapInstance.on('load', () => {
            const fetchStories = async () => {
                try {
                    const response = await fetch('http://localhost:3001/stories');
                    const data = await response.json();
                    console.log(`Data: ${data}`)
                    setStories(data);
                    // Добавление маркеров на карту
                    data.forEach(story => {
                        const longitude = parseFloat(story.longitude);
                        const latitude = parseFloat(story.latitude);
                        console.log([longitude, latitude]);

                        if (!isNaN(longitude) && !isNaN(latitude)) {
                            new mapboxgl.Marker()
                                .setLngLat([longitude, latitude])
                                .setPopup(new mapboxgl.Popup().setHTML(`
                                  <div>
                                        <img src="${story.photoPath}" alt="Story" style="width: 100px; height: 100px;" />
                                        <p>${story.description}</p> 
                                  </div>
                             `))
                                .addTo(mapInstance);
                        } else {
                            console.error('Invalid coordinates:', story);
                        }
                    });
                } catch (error) {
                    console.error('Error fetching stories:', error);
                }
            };

            fetchStories();
        });
        return () => mapInstance.remove();
    }, []);
    return (
        <div
            ref={mapContainerRef}
            className="map-container"
        />
    );
};

export default Map;