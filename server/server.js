const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'reservations.json');

app.use(cors());
app.use(bodyParser.json());

// 예약 데이터를 읽는 함수
const readReservations = (callback) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return callback(null, []);
            }
            return callback(err);
        }
        try {
            const reservations = JSON.parse(data);
            callback(null, reservations);
        } catch (parseErr) {
            callback(parseErr);
        }
    });
};

// 예약 데이터를 쓰는 함수
const writeReservations = (reservations, callback) => {
    fs.writeFile(DB_FILE, JSON.stringify(reservations, null, 2), 'utf8', (err) => {
        callback(err);
    });
};

// 특정 날짜의 예약 목록 가져오기
app.get('/api/reservations', (req, res) => {
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date query parameter is required' });
    }

    readReservations((err, reservations) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading reservations data' });
        }
        const filteredReservations = reservations.filter(r => r.date === date);
        res.json(filteredReservations);
    });
});

// 새로운 예약 추가하기
app.post('/api/reservations', (req, res) => {
    const newReservation = req.body;

    if (!newReservation || !newReservation.date || !newReservation.time) {
        return res.status(400).json({ message: 'Invalid reservation data' });
    }

    readReservations((err, reservations) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading reservations data' });
        }

        // 시간 중복 확인
        const isTimeSlotTaken = reservations.some(r => r.date === newReservation.date && r.time === newReservation.time);
        if (isTimeSlotTaken) {
            return res.status(409).json({ message: 'This time slot is already taken' });
        }

        reservations.push(newReservation);

        writeReservations(reservations, (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ message: 'Error saving reservation' });
            }
            res.status(201).json(newReservation);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
