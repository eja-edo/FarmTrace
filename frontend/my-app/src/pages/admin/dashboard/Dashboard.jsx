import React, { useState } from 'react';
import { Table, Button, Modal, Card, Row, Col } from 'react-bootstrap';
import { FaThermometerHalf, FaTint, FaMapMarkerAlt, FaSync, FaSearch, FaFilter } from 'react-icons/fa';
import TempHumidityMonitor from '../../user/TempHumidityMonitor';
import './Dashboard.scss';

const mockDevices = [
  { id: 1, name: 'Sensor A1', temp: 22.4, humidity: 55, position: 'Field 1', lat: 20.8289, lon: 106.7861, status: 'active' },
  { id: 2, name: 'Sensor B2', temp: 31.2, humidity: 72, position: 'Warehouse 3', lat: 20.8292, lon: 106.7854, status: 'active' },
  { id: 3, name: 'Sensor C3', temp: 14.8, humidity: 38, position: 'Truck #B2147', lat: 20.8277, lon: 106.7863, status: 'warning' },
  { id: 4, name: 'Sensor D4', temp: 25.6, humidity: 45, position: 'Greenhouse 2', lat: 20.8284, lon: 106.7870, status: 'active' },
];

const statsData = {
  totalDevices: 4,
  activeDevices: 3,
  averageTemp: 23.5,
  averageHumidity: 52.5
};

const TempBadge = ({ value, min = 15, max = 30 }) => {
  const ok = value >= min && value <= max;
  return <span className={`status-badge ${ok ? 'success' : 'danger'}`}>
    <FaThermometerHalf /> {value}°C
  </span>;
};

const HumidityBadge = ({ value, min = 40, max = 80 }) => {
  const ok = value >= min && value <= max;
  return <span className={`status-badge ${ok ? 'success' : 'danger'}`}>
    <FaTint /> {value}%
  </span>;
};

const StatsCard = ({ icon: Icon, title, value, color }) => (
  <Card className={`stats-card ${color}`}>
    <Card.Body>
      <div className="stats-icon">
        <Icon />
      </div>
      <div className="stats-info">
        <h6>{title}</h6>
        <h3>{value}</h3>
      </div>
    </Card.Body>
  </Card>
);

const AdminDashboard = () => {
  const [devices] = useState(mockDevices);
  const [selected, setSelected] = useState(null);
  const [show, setShow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const openDevice = (device) => {
    setSelected(device);
    setShow(true);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>System Overview</h1>
          <p className="subtitle">Real-time monitoring of agricultural IoT devices</p>
        </div>
        <div className="dashboard-actions">
          <Button variant="light" className="refresh-btn">
            <FaSync /> Refresh Data
          </Button>
        </div>
      </div>

      <Row className="stats-row">
        <Col md={3}>
          <StatsCard 
            icon={FaThermometerHalf}
            title="Average Temperature"
            value={`${statsData.averageTemp}°C`}
            color="blue"
          />
        </Col>
        <Col md={3}>
          <StatsCard 
            icon={FaTint}
            title="Average Humidity"
            value={`${statsData.averageHumidity}%`}
            color="green"
          />
        </Col>
        <Col md={3}>
          <StatsCard 
            icon={FaMapMarkerAlt}
            title="Total Devices"
            value={statsData.totalDevices}
            color="purple"
          />
        </Col>
        <Col md={3}>
          <StatsCard 
            icon={FaSync}
            title="Active Devices"
            value={statsData.activeDevices}
            color="orange"
          />
        </Col>
      </Row>

      <Card className="table-card">
        <Card.Header>
          <div className="table-header">
            <h5>Device Management</h5>
            <div className="table-actions">
              <div className="search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="light" className="filter-btn">
                <FaFilter /> Filter
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <Table hover responsive className="device-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Name</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className={d.status === 'warning' ? 'warning-row' : ''}>
                  <td><strong>#{d.id}</strong></td>
                  <td>{d.name}</td>
                  <td><TempBadge value={d.temp} /></td>
                  <td><HumidityBadge value={d.humidity} /></td>
                  <td>
                    <div className="location-cell">
                      <FaMapMarkerAlt className="location-icon" />
                      <span>{d.position}</span>
                      <small className="coord">({d.lat.toFixed(4)}, {d.lon.toFixed(4)})</small>
                    </div>
                  </td>
                  <td>
                    <span className={`status-indicator ${d.status}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <Button variant="primary" size="sm" className="action-button" onClick={() => openDevice(d)}>
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)} size="lg" className="device-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaThermometerHalf className="modal-icon" />
            Device Details: {selected?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <div className="device-info">
              <Row className="mb-4">
                <Col md={6}>
                  <div className="info-item">
                    <label>Location</label>
                    <p>{selected.position}</p>
                  </div>
                  <div className="info-item">
                    <label>Coordinates</label>
                    <p>{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="info-item">
                    <label>Status</label>
                    <span className={`status-indicator ${selected.status}`}>
                      {selected.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Last Updated</label>
                    <p>2 minutes ago</p>
                  </div>
                </Col>
              </Row>
            </div>
          )}
          <TempHumidityMonitor />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
