import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';


const StaticParticles = React.memo(function StaticParticles() {
  const options = useMemo(() => ({
    fullScreen: { enable: false },
    background: { color: { value: '#0a1128' } }, // 다크 네이비
    particles: {
      number: { value: 60, density: { enable: true } },
      color: { value: '#ffffff' },
      opacity: { value: 0.5 },
      links: { enable: true, distance: 150, opacity: 0.3, color: '#ffffff' },
      move: { enable: true, speed: 1.2 },
    },
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'repulse' },
        resize: { enable: true },
      },
      modes: { repulse: { distance: 140, duration: 0.4, speed: 1 } },
    },
    detectRetina: true,
  }), []); // ← 옵션 참조 고정

  return <Particles id="tsparticles" options={options} className="canvas" />;
});


// API 기본 URL
const API_URL = '/api';
const TIME_SLOT_LIMIT = 10; // 타임당 예약 제한

// 타입
interface FormData {
  studentName: string;
  parentContact: string;
  schoolLevel: '초등학생' | '중학생' | '고등학생' | '';
  grade: string;
  interest: string;
}

// 시간 선택 버튼
type TimeSlotButtonProps = {
  time: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
};

const TimeSlotButton: React.FC<TimeSlotButtonProps> = ({ time, active, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`time-slot-btn ${active ? 'active' : ''}`}
    style={{ padding: '8px 12px', margin: 4, borderRadius: 8, border: '1px solid #dddddd', opacity: disabled ? 0.6 : 1 }}
  >
    {time} {disabled ? '(마감)' : ''}
  </button>
);

function App() {
  const [init, setInit] = useState(false);

  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    studentName: '',
    parentContact: '',
    schoolLevel: '',
    grade: '',
    interest: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // tsparticles 1회 초기화
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  // 예약 가능한 시간대
  const timeSlots = [
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00',
  ];

  // 오늘 날짜 예약 정보 로드
  useEffect(() => {
    // The backend is not available on GitHub Pages, so we don't fetch.
    // You can add mock data here if needed.
  }, [selectedDate]);

  // 폼 입력 핸들러
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setMessage({ type: 'danger', text: '예약할 시간을 선택해주세요.' });
      return;
    }

    const currentSlotReservationsCount = bookedTimes.filter((time) => time === selectedTime).length;
    if (currentSlotReservationsCount >= TIME_SLOT_LIMIT) {
      setMessage({ type: 'danger', text: `죄송합니다. ${selectedTime} 타임 예약이 모두 마감되었습니다.` });
      return;
    }

    const reservationData = {
      ...formData,
      date: selectedDate,
      time: selectedTime,
    };

    axios
      .post(`${API_URL}/reservations`, reservationData)
      .then(() => {
        setBookedTimes((prev) => [...prev, selectedTime]);
        setSelectedTime(null);
        setFormData({ studentName: '', parentContact: '', schoolLevel: '', grade: '', interest: '' });
        setMessage({ type: 'success', text: '예약이 성공적으로 완료되었습니다!' });
      })
      .catch((error) => {
        console.error('Error creating reservation:', error);
        if ((error as any).response && (error as any).response.status === 409) {
          setMessage({ type: 'danger', text: '이미 예약된 시간입니다. 다른 시간을 선택해주세요.' });
        } else {
          setMessage({ type: 'danger', text: '예약 중 오류가 발생했습니다.' });
        }
      });
  };

  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // 각 타임슬롯의 현재 예약 수 계산
  const countByTime = timeSlots.reduce<Record<string, number>>((acc, t) => {
    acc[t] = bookedTimes.filter((x) => x === t).length;
    return acc;
  }, {});

  return (
  <div className="app-wrap">
    {init && <StaticParticles />}





    <div className="app-inner">
      <header className="app-header">
        <h1 className="app-title">나니아랩 체험부스 예약신청</h1>
        <nav className="app-nav">
          <button type="button" className="btn" onClick={() => handleScrollTo('times')}>시간선택</button>
          <button type="button" className="btn" onClick={() => handleScrollTo('form')}>신청서</button>
        </nav>
      </header>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {message.text}
        </div>
      )}

      <section id="times" className="section">
        <h2>예약 가능 시간</h2>
        <div className="time-grid">
          {timeSlots.map((t) => {
            const isFull = (countByTime[t] ?? 0) >= TIME_SLOT_LIMIT;
            return (
              <TimeSlotButton
                key={t}
                time={t}
                active={selectedTime === t}
                disabled={isFull}
                onClick={() => setSelectedTime(t)}
              />
            );
          })}
        </div>
        <p style={{ color: '#666', marginTop: 8 }}>
          * 각 타임은 최대 {TIME_SLOT_LIMIT}명까지 예약할 수 있습니다. 현재 선택: {selectedTime ?? '없음'}
        </p>
      </section>

      <section id="form" className="section">
        <h2>신청서 작성</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="studentName">학생 이름</label>
              <input
                type="text"
                id="studentName"
                name="studentName"
                value={formData.studentName}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="parentContact">학부모 연락처</label>
              <input
                type="tel"
                id="parentContact"
                name="parentContact"
                value={formData.parentContact}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="schoolLevel">학교급</label>
              <select
                id="schoolLevel"
                name="schoolLevel"
                value={formData.schoolLevel}
                onChange={handleFormChange}
                required
              >
                <option value="">선택</option>
                <option value="초등학생">초등학생</option>
                <option value="중학생">중학생</option>
                <option value="고등학생">고등학생</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="grade">학년</label>
              <input
                type="text"
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="interest">상담 희망 분야</label>
              <input
                type="text"
                id="interest"
                name="interest"
                value={formData.interest}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>
          <button type="submit" className="submit" disabled={!selectedTime}>
            {selectedTime ? `${selectedTime} 예약하기` : '시간을 먼저 선택하세요'}
          </button>
        </form>
      </section>
    </div>
  </div>
);
}
export default App;