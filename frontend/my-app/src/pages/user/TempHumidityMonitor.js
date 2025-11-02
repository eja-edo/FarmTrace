// 📦 Import các thư viện React và component cần thiết
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'; // Thư viện vẽ biểu đồ
import { AlertTriangle, CheckCircle, ThermometerSun, Droplets } from 'lucide-react'; // Icon gọn nhẹ
import './TempHumidityMonitor.scss'; // File CSS/SCSS để tạo giao diện

// 🧠 Component chính
export default function TempHumidityMonitor() {
  // Khai báo các state (biến lưu trữ trong component)
  const [data, setData] = useState([]); // Dữ liệu nhiệt độ & độ ẩm
  const [tempThreshold, setTempThreshold] = useState({ min: 15, max: 30 }); // Ngưỡng nhiệt độ
  const [humidityThreshold, setHumidityThreshold] = useState({ min: 40, max: 80 }); // Ngưỡng độ ẩm
  const [alerts, setAlerts] = useState([]); // Danh sách cảnh báo
  const [status, setStatus] = useState('normal'); // Trạng thái tổng thể (bình thường / nóng / lạnh)

  // 🔄 useEffect() để mô phỏng dữ liệu thời gian thực (mỗi giây cập nhật 1 lần)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      // Tạo dữ liệu ngẫu nhiên cho nhiệt độ & độ 
      const temp = 10 + Math.random() * 0.1; // 10–11°C
      const humidity = 30 + Math.random() * 0.3; // 10–13%

      // Gói dữ liệu vào một object
      const newPoint = {
        time: now.toLocaleTimeString('vi-VN'), // Giờ hiện tại dạng chuỗi
        temp: parseFloat(temp.toFixed(1)), // Làm tròn 1 chữ số thập phân
        humidity: parseFloat(humidity.toFixed(1)),
        timestamp: now.getTime() // Dạng mili-giây để so sánh thời gian
      };

      // Cập nhật dữ liệu: chỉ giữ 20 điểm gần nhất
      setData(prev => [...prev.slice(-20), newPoint]);

      // Kiểm tra xem có vượt ngưỡng cảnh báo không
      checkThreshold(newPoint);
    }, 5000); // Cập nhật mỗi 1 giây

    // Dọn dẹp khi component bị hủy
    return () => clearInterval(interval);
  }, [tempThreshold, humidityThreshold]); // Khi ngưỡng thay đổi thì reset vòng lặp

  // ⚠️ Hàm kiểm tra ngưỡng cảnh báo
  const checkThreshold = (point) => {
    const now = Date.now();
    let newStatus = 'normal';

    // Kiểm tra nhiệt độ vượt ngưỡng
    if (point.temp < tempThreshold.min) {
      newStatus = 'cold';
      addAlert('Nhiệt độ quá thấp!', point.temp);
    } else if (point.temp > tempThreshold.max) {
      newStatus = 'hot';
      addAlert('Nhiệt độ quá cao!', point.temp);
    }

    // Cập nhật trạng thái tổng thể
    setStatus(newStatus);

    // Kiểm tra xem 20 phút qua có nhiều lần vượt ngưỡng không
    const twentyMinAgo = now - 20 * 60 * 1000; // 20 phút trước
    const recentViolations = data.filter(d =>
      d.timestamp > twentyMinAgo &&
      (d.temp < tempThreshold.min || d.temp > tempThreshold.max)
    );

    // Nếu vượt ngưỡng hơn 5 lần trong 20 phút thì cảnh báo nghiêm trọng
    if (recentViolations.length > 5) {
      addAlert('⚠️ CẢNH BÁO: Nhiệt độ vượt ngưỡng nhiều lần trong 20 phút!', point.temp);
    }
  };

  // 🧾 Hàm thêm cảnh báo mới vào danh sách
  const addAlert = (message, value) => {
    const newAlert = {
      id: Date.now(), // ID duy nhất
      message, // Nội dung cảnh báo
      value, // Giá trị thực tế
      time: new Date().toLocaleTimeString('vi-VN') // Thời điểm tạo cảnh báo
    };

    // Giữ tối đa 4 cảnh báo gần nhất
    setAlerts(prev => [newAlert, ...prev.slice(0, 2)]);
  };

  // 🟢 Hàm trả về chữ hiển thị theo trạng thái
  const getStatusText = () => {
    switch (status) {
      case 'hot': return 'Quá Nóng';
      case 'cold': return 'Quá Lạnh';
      default: return 'Bình Thường';
    }
  };

  // 🖥️ Giao diện hiển thị chính
  return (
    <div className="app-container">
      <div className="dashboard">

        {/* 🧭 Phần tiêu đề */}
        <div className="header">
          <h1>Container Monitoring System</h1>
          <p>Real-time Temperature & Humidity Dashboard</p>
        </div>

        {/* 🔔 Thẻ trạng thái tổng thể */}
        <div className="status-card">
          <div className="left">
            <div className="icon">
              {/* Hiển thị icon khác nhau theo trạng thái */}
              {status === 'normal'
                ? <CheckCircle size={40} color="#22c55e" /> // Xanh - bình thường
                : <AlertTriangle size={40} color="#ef4444" />}  {/* Đỏ - cảnh báo */}
            </div>
            <div className="info">
              <h2>Trạng thái: {getStatusText()}</h2>
              <p>
                {/* Hiển thị giá trị nhiệt độ và độ ẩm hiện tại */}
                {data.length > 0 && (
                  <>
                    Nhiệt độ: {data[data.length - 1].temp}°C | Độ ẩm: {data[data.length - 1].humidity}%
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 🌡 Biểu đồ nhiệt độ */}
        <div className="chart-card">
          <h3><ThermometerSun /> Biểu đồ Nhiệt Độ</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" /> {/* Lưới */}
              <XAxis dataKey="time" stroke="#cbd5e1" /> {/* Trục X */}
              <YAxis stroke="#cbd5e1" /> {/* Trục Y */}
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
              <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} dot={false} /> {/* Đường nhiệt độ */}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 💧 Biểu đồ độ ẩm */}
        <div className="chart-card">
          <h3><Droplets /> Biểu đồ Độ Ẩm</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }} />
              <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} dot={false} /> {/* Đường độ ẩm */}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ⚙️ Phần cài đặt ngưỡng nhiệt độ & độ ẩm */}
        <div className="threshold-settings">
          <h3>Cài Đặt Ngưỡng</h3>
          <div className="grid">

            {/* Cài đặt ngưỡng nhiệt độ */}
            <div>
              <label>Nhiệt độ (°C)</label>
              <input
                type="number"
                value={tempThreshold.min}
                onChange={(e) => setTempThreshold({ ...tempThreshold, min: parseFloat(e.target.value) })}
              />
              <span>Tối thiểu</span>
              <input
                type="number"
                value={tempThreshold.max}
                onChange={(e) => setTempThreshold({ ...tempThreshold, max: parseFloat(e.target.value) })}
              />
              <span>Tối đa</span>
            </div>

            {/* Cài đặt ngưỡng độ ẩm */}
            <div>
              <label>Độ ẩm (%)</label>
              <input
                type="number"
                value={humidityThreshold.min}
                onChange={(e) => setHumidityThreshold({ ...humidityThreshold, min: parseFloat(e.target.value) })}
              />
              <span>Tối thiểu</span>
              <input
                type="number"
                value={humidityThreshold.max}
                onChange={(e) => setHumidityThreshold({ ...humidityThreshold, max: parseFloat(e.target.value) })}
              />
              <span>Tối đa</span>
            </div>
          </div>
        </div>

        {/* 🚨 Danh sách cảnh báo gần nhất */}
        {alerts.length > 0 && (
          <div className="alerts">
            <h3>Cảnh Báo</h3>
            {alerts.map(alert => (
              <div key={alert.id} className="alert">
                <div className="message">
                  <AlertTriangle size={20} color="#ef4444" />
                  {alert.message}
                </div>
                <div className="time">{alert.time}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
