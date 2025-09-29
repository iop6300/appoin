import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Container, Engine } from "@tsparticles/engine";
import { loadSlim } from "tsparticles-slim";

// API 기본 URL 설정
const API_URL = 'http://localhost:3001/api';
const DAILY_LIMIT = 10; // 일일 예약 제한

// 폼 데이터 타입을 정의합니다。
interface FormData {
  studentName: string;
  parentContact: string;
  schoolLevel: '초등학생' | '중학생' | '고등학생' | '';
  grade: string;
  interest: string;
}

// 시간 선택 버튼을 위한 작은 컴포넌트
const TimeSlotButton = ({ time, active, disabled, onClick }: { time: string, active: boolean, disabled: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`time-slot-btn ${active ? 'active' : ''}`}>
    {time} {disabled ? '(마감)' : ''}
  </button>
);

function App() {
  const [init, setInit] = useState(false);
  // 상태 변수들을 정의합니다。
  const [selectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [reservationsCount, setReservationsCount] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    studentName: '',
    parentContact: '',
    schoolLevel: '',
    grade: '',
    interest: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
      // this loads the tsparticles package bundle, it's a sample, you can load any other bundle too
      // for example: await loadFull(engine);
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container) => {
    console.log(container);
  };

  // 예약 가능한 시간대 목록
  const timeSlots = [
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00'
  ];

  // 컴포넌트가 마운트될 때 오늘 날짜의 예약 정보를 가져옵니다.
  useEffect(() => {
    axios.get(`${API_URL}/reservations?date=${selectedDate}`)
      .then(response => {
        const reservations = response.data;
        setReservationsCount(reservations.length);
        setBookedTimes(reservations.map((r: any) => r.time));
      })
      .catch(error => {
        console.error('Error fetching reservations:', error);
        setMessage({ type: 'danger', text: '예약 정보를 불러오는 데 실패했습니다.' });
      });
  }, [selectedDate]);

  // 폼 입력값이 변경될 때 호출되는 함수입니다.
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 예약 폼을 제출할 때 호출되는 함수입니다.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setMessage({ type: 'danger', text: '예약할 시간을 선택해주세요.' });
      return;
    }

    if (reservationsCount >= DAILY_LIMIT) {
      setMessage({ type: 'danger', text: '죄송합니다. 금일 예약이 모두 마감되었습니다.' });
      return;
    }

    const reservationData = {
      ...formData,
      date: selectedDate,
      time: selectedTime,
    };

    axios.post(`${API_URL}/reservations`, reservationData)
      .then(response => {
        setBookedTimes(prev => [...prev, selectedTime]);
        setReservationsCount(prev => prev + 1);
        setSelectedTime(null);
        setFormData({ studentName: '', parentContact: '', schoolLevel: '', grade: '', interest: '' });
        setMessage({ type: 'success', text: '예약이 성공적으로 완료되었습니다!' });
      })
      .catch(error => {
        console.error('Error creating reservation:', error);
        if (error.response && error.response.status === 409) {
          setMessage({ type: 'danger', text: '이미 예약된 시간입니다. 다른 시간을 선택해주세요.' });
        } else {
          setMessage({ type: 'danger', text: '예약 중 오류가 발생했습니다.' });
        }
      });
  };

  const handleScrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isFullyBooked = reservationsCount >= DAILY_LIMIT;

  if (init) {
    return (
      <>
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={{
            background: {
              color: {
                value: "transparent",
              },
            },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: {
                  enable: true,
                  mode: "push",
                },
                onHover: {
                  enable: true,
                  mode: "repulse",
                },
              },
              modes: {
                push: {
                  quantity: 4,
                },
                repulse: {
                  distance: 200,
                  duration: 0.4,
                },
              },
            },
            particles: {
              color: {
                value: "#E6E6E9",
              },
              links: {
                color: "#66FFCC",
                distance: 150,
                enable: true,
                opacity: 0.5,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                },
                value: 80,
              },
              opacity: {
                value: 0.5,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 5 },
              },
            },
            detectRetina: true,
          }}
        />
        <nav className="nav" aria-label="주요 메뉴">
          <a href="#reservation">예약하기</a>
          <a href="#about">소개</a>
        </nav>

        <main className="hero">
          <div>
            <h1>울산수학체험한마당 나니아랩</h1>
            <p>선착순 예약 시스템입니다. 아래에서 원하시는 시간을 선택하고 정보를 입력해주세요. (일일 10명 한정)</p>
            <button className="cta" onClick={() => handleScrollTo('reservation')}>지금 예약하기</button>
          </div>
        </main>

        <section id="reservation">
          {message && (
            <div className="card" style={{ maxWidth: '1000px', margin: '-40px auto 40px', textAlign: 'center', borderColor: message.type === 'danger' ? '#dc3545' : 'var(--accent)' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>{message.text}</p>
            </div>
          )}

          {isFullyBooked ? (
            <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h3>금일 예약이 모두 마감되었습니다.</h3>
              <p>총 {reservationsCount}명의 예약이 완료되었습니다. 내일 다시 시도해주세요.</p>
            </div>
          ) : (
            <div className="grid">
              <div className="card">
                <h3>1. 시간 선택 <small className="muted">(남은 예약: {DAILY_LIMIT - reservationsCount}명)</small></h3>
                <div className="time-slots-container">
                  {timeSlots.map(time => (
                    <TimeSlotButton
                      key={time}
                      time={time}
                      active={selectedTime === time}
                      disabled={bookedTimes.includes(time)}
                      onClick={() => {
                        if (!bookedTimes.includes(time)) {
                          setSelectedTime(time);
                          setMessage(null);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {selectedTime && (
                <div className="card form-card">
                  <h3>2. 정보 입력 <small className="muted">({selectedTime})</small></h3>
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="studentName">학생 이름</label>
                      <input id="studentName" type="text" name="studentName" value={formData.studentName} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="parentContact">보호자 연락처</label>
                      <input id="parentContact" type="tel" name="parentContact" value={formData.parentContact} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="schoolLevel">학교 구분</label>
                      <select id="schoolLevel" name="schoolLevel" value={formData.schoolLevel} onChange={handleFormChange} required>
                        <option value="">선택하세요</option>
                        <option value="초등학생">초등학생</option>
                        <option value="중학생">중학생</option>
                        <option value="고등학생">고등학생</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="grade">학년</label>
                      <input id="grade" type="number" name="grade" value={formData.grade} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="interest">관심 분야</label>
                      <input id="interest" type="text" name="interest" value={formData.interest} onChange={handleFormChange} required />
                    </div>
                    <button type="submit" className="cta" style={{ width: '100%', marginTop: '1rem' }}>
                      {selectedTime}에 예약하기
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </section>

        <section id="about">
          <div className="grid">
            <div className="card"><h3>가벼움</h3><p>CDN 한 줄로 빠르게 적용. JS 옵션 몇 개로 커스터마이즈.</p></div>
            <div className="card"><h3>반응형</h3><p>화면 크기에 맞춰 자연스럽게 확장되는 배경.</p></div>
            <div className="card"><h3>브랜드 컬러 연동</h3><p>CSS 변수로 포인트 컬러만 바꿔도 전체 톤 변경.</p></div>
          </div>
        </section>

        <footer id="contact">© 2025 울산수학체험한마당 나니아랩</footer>
      </>
    );
  }

  return (
    <>
      <nav className="nav" aria-label="주요 메뉴">
        <a href="#reservation">예약하기</a>
        <a href="#about">소개</a>
      </nav>

      <main className="hero">
        <div>
          <h1>울산수학체험한마당 나니아랩</h1>
          <p>선착순 예약 시스템입니다. 아래에서 원하시는 시간을 선택하고 정보를 입력해주세요. (일일 10명 한정)</p>
          <button className="cta" onClick={() => handleScrollTo('reservation')}>지금 예약하기</button>
        </div>
      </main>

      <section id="reservation">
        {message && (
          <div className="card" style={{ maxWidth: '1000px', margin: '-40px auto 40px', textAlign: 'center', borderColor: message.type === 'danger' ? '#dc3545' : 'var(--accent)' }}>
            <p style={{ margin: 0, fontWeight: '600' }}>{message.text}</p>
          </div>
        )}

        {isFullyBooked ? (
          <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h3>금일 예약이 모두 마감되었습니다.</h3>
            <p>총 {reservationsCount}명의 예약이 완료되었습니다. 내일 다시 시도해주세요.</p>
          </div>
        ) : (
          <div className="grid">
            <div className="card">
              <h3>1. 시간 선택 <small className="muted">(남은 예약: {DAILY_LIMIT - reservationsCount}명)</small></h3>
              <div className="time-slots-container">
                {timeSlots.map(time => (
                  <TimeSlotButton
                    key={time}
                    time={time}
                    active={selectedTime === time}
                    disabled={bookedTimes.includes(time)}
                    onClick={() => {
                      if (!bookedTimes.includes(time)) {
                        setSelectedTime(time);
                        setMessage(null);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {selectedTime && (
              <div className="card form-card">
                <h3>2. 정보 입력 <small className="muted">({selectedTime})</small></h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="studentName">학생 이름</label>
                    <input id="studentName" type="text" name="studentName" value={formData.studentName} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="parentContact">보호자 연락처</label>
                    <input id="parentContact" type="tel" name="parentContact" value={formData.parentContact} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="schoolLevel">학교 구분</label>
                    <select id="schoolLevel" name="schoolLevel" value={formData.schoolLevel} onChange={handleFormChange} required>
                      <option value="">선택하세요</option>
                      <option value="초등학생">초등학생</option>
                      <option value="중학생">중학생</option>
                      <option value="고등학생">고등학생</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="grade">학년</label>
                    <input id="grade" type="number" name="grade" value={formData.grade} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="interest">관심 분야</label>
                    <input id="interest" type="text" name="interest" value={formData.interest} onChange={handleFormChange} required />
                  </div>
                  <button type="submit" className="cta" style={{ width: '100%', marginTop: '1rem' }}>
                    {selectedTime}에 예약하기
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      <section id="about">
        <div className="grid">
          <div className="card"><h3>가벼움</h3><p>CDN 한 줄로 빠르게 적용. JS 옵션 몇 개로 커스터마이즈.</p></div>
          <div className="card"><h3>반응형</h3><p>화면 크기에 맞춰 자연스럽게 확장되는 배경.</p></div>
          <div className="card"><h3>브랜드 컬러 연동</h3><p>CSS 변수로 포인트 컬러만 바꿔도 전체 톤 변경.</p></div>
        </div>
      </section>

      <footer id="contact">© 2025 울산수학체험한마당 나니아랩</footer>
    </>
  );
}

export default App;
