import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/courtschedule/courtSchedule.css';
import '../../components/sideNavAdmin.js';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

doc.addEventListener('DOMContentLoaded', function () {
  const scheduleDisplay = getById('scheduleDisplay');
  const dateHeader = doc.createElement('h4');
  dateHeader.style.color = '#142850';
  scheduleDisplay.prepend(dateHeader);

  const schedules = {}; // Empty schedule data, to be filled dynamically

  const calendarEl = getById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [], // Start with an empty event list
    eventDidMount: function (info) {
      const eventEl = info.el;
      const name = info.event.title;
      const court = `Court ${info.event.extendedProps.court}`;

      eventEl.innerHTML = `<div>${name}</div><div>${court}</div>`;
    },
    dateClick: function (info) {
      showSchedule(info.dateStr);
      highlightDate(info.dateStr);
    }
  });

  calendar.render();

  let previouslySelectedDate = null;

  function highlightDate(selectedDate) {
    if (previouslySelectedDate) {
      const previouslySelectedElement = document.querySelector(`.fc-day[data-date="${previouslySelectedDate}"]`);
      if (previouslySelectedElement) {
        previouslySelectedElement.classList.remove('fc-selected');
      }
    }
    previouslySelectedDate = selectedDate;
    const newSelectedElement = document.querySelector(`.fc-day[data-date="${selectedDate}"]`);
    if (newSelectedElement) {
      newSelectedElement.classList.add('fc-selected');
    }
  }

  function showSchedule(selectedDate) {
    scheduleDisplay.innerHTML = '';

    const filteredSchedules = schedules[selectedDate];

    if (filteredSchedules) {
      filteredSchedules.forEach((schedule) => {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.innerHTML = `
                    <div class="schedule-header">
                        <h3>${schedule.name}</h3>
                        <span>Court ${schedule.court}</span>
                    </div>
                    <div class="schedule-details">
                        <span><i class="fas fa-calendar-alt"></i> Date Reserved: ${selectedDate}</span>
                        <span><i class="fas fa-clock"></i> Time: ${schedule.time}</span>
                    </div>
                `;
        scheduleDisplay.appendChild(card);
      });
    } else {
      scheduleDisplay.innerHTML = '<div>No schedules for this date.</div>';
    }

    dateHeader.innerHTML = `Schedule for ${selectedDate}`;
  }

  // Function to add new events dynamically to both the calendar and schedule display
  function addEvent(name, date, time, court) {
    // Add the new event to the 'schedules' object
    if (!schedules[date]) {
      schedules[date] = [];
    }
    schedules[date].push({ name, time, court });

    // Add the new event to the calendar
    const [startTime, endTime] = time.split(' - ');
    calendar.addEvent({
      title: name,
      start: `${date}T${convertTo24Hour(startTime)}`,
      end: `${date}T${convertTo24Hour(endTime)}`,
      extendedProps: { court: court }
    });

    // Refresh the calendar and schedule display for the selected date
    calendar.render();
    showSchedule(date); // Show updated schedule
  }

  // Helper function to convert 12-hour time to 24-hour format
  function convertTo24Hour(time) {
    const [hour, minute, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/).slice(1);
    let hours = parseInt(hour, 10);
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minute}`;
  }

  // Example of adding events dynamically (you can add events like this)
  addEvent('Charlie Brown', '2024-10-07', '2:00 PM - 3:00 PM', '1');
  addEvent('Lucy Van Pelt', '2024-10-07', '3:00 PM - 4:00 PM', '2');
});
