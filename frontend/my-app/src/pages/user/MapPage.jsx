import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer, IconLayer } from 'deck.gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapPage.scss';
import carIcon from '../../assets/images/sport-car.png';

const MAPTILER_KEY = process.env.REACT_APP_MAPTILER_KEY || 'Rj8HkToJPiBRBBCx1LUs';

const MapPage = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const navigate = useNavigate();

  const [trucks, setTrucks] = useState([
    {
      id: 1,
      name: 'Truck A',
      color: [0, 128, 255],
      route: [
        [106.78612625903145, 20.82921572628767],
        [106.78544276149665, 20.828349582322915],
        [106.78610946976517, 20.827888075225474],
        [106.78635703178998, 20.8277252489937],
        [106.78730026442884, 20.828558600967497],
        [106.78610968841014, 20.82922235714487],
      ],
      status: 'Đang giao hàng',
      orderStatus: 'Đơn hàng #A1245 — Đang kiểm tra nhiệt độ hàng',
      progress: 0,
    },
    {
      id: 2,
      name: 'Truck B',
      color: [34, 197, 94],
      route: [
        [106.78612625903145, 20.82921572628767],
        [106.78544276149665, 20.828349582322915],
        [106.78635703178998, 20.8277252489937],
        [106.78702792990578, 20.828220686254056],
        [106.78730026442884, 20.828558600967497],
      ],
      status: 'Đang di chuyển',
      orderStatus: 'Đơn hàng #B2147 — Đang vận chuyển đến khách hàng',
      progress: 0,
    },
    {
      id: 3,
      name: 'Truck C',
      color: [255, 165, 0],
      route: [
        [106.78612625903145, 20.82921572628767],
        [106.78544276149665, 20.828349582322915],
        [106.78635703178998, 20.8277252489937],
        [106.78702792990578, 20.828220686254056],
        [106.78730026442884, 20.828558600967497],
      ],
      status: 'Đang giao hàng',
      orderStatus: 'Đơn hàng #C3358 — Đang đến điểm giao tiếp theo',
      progress: 0,
    },
  ]);

  // --- Khởi tạo bản đồ ---
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`,
      center: [106.7861, 20.8289],
      zoom: 15.8,
      pitch: 45,
      bearing: -17,
    });
    mapRef.current = map;

    const overlay = new MapboxOverlay({ interleaved: true });
    map.addControl(overlay);
    overlayRef.current = overlay;

    return () => map.remove();
  }, []);

  // --- Cập nhật tiến độ di chuyển ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks((prev) =>
        prev.map((truck) => ({
          ...truck,
          progress: (truck.progress + 0.005) % 1,
        }))
      );
    }, 130);
    return () => clearInterval(interval);
  }, []);

  // --- Render layer ---
  useEffect(() => {
    if (!overlayRef.current) return;

    const layers = [];

    trucks.forEach((truck) => {
      const coordsList = truck.route;
      const index = Math.floor(truck.progress * (coordsList.length - 1));
      const nextIndex = (index + 1) % coordsList.length;
      const [lon1, lat1] = coordsList[index];
      const [lon2, lat2] = coordsList[nextIndex];
      const t = (truck.progress * (coordsList.length - 1)) % 1;
      const currentPos = [lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t];

      // Đường đi
      layers.push(
        new PathLayer({
          id: `path-${truck.id}`,
          data: [coordsList],
          getPath: (d) => d,
          getColor: truck.color,
          getWidth: 3,
        })
      );

      // Biểu tượng xe
      layers.push(
        new IconLayer({
          id: `icon-${truck.id}`,
          data: [{ position: currentPos }],
          pickable: true,
          iconAtlas: carIcon,
// icon xe tải
          iconMapping: {
            marker: { x: 0, y: 0, width: 512, height: 512, mask: true },
          },
          getIcon: () => 'marker',
          sizeScale: 6,
          getSize: () => 4,
          getPosition: (d) => d.position,
          onClick: () => setSelectedTruck(truck),
        })
      );
    });

    overlayRef.current.setProps({ layers });
  }, [trucks]);

  return (
    <div className="map-page">
      <div ref={mapContainer} className="map-container" />

      {selectedTruck && (
        <div className="truck-info">
          <h4>🚚 {selectedTruck.name}</h4>
          <p><strong>Trạng thái xe:</strong> {selectedTruck.status}</p>
          <p><strong>Tuyến đường:</strong></p>
          <ul>
            {selectedTruck.route.map((p, i) => (
              <li key={i}>{p[0].toFixed(6)}, {p[1].toFixed(6)}</li>
            ))}
          </ul>
          <p><strong>Đơn hàng:</strong> {selectedTruck.orderStatus}</p>

          <button className="btn-order" onClick={() => navigate('/temp-monitor')}>
            🔍 Xem trạng thái đơn hàng
          </button>
          <button className="close-btn" onClick={() => setSelectedTruck(null)}>
            Đóng
          </button>
        </div>
      )}
    </div>
  );
};

export default MapPage;
