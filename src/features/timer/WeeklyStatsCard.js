import React, { useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { formatSmartDuration, getWeekRange, getLocalizedShortWeekdays } from '../../utils/timerHelpers';

function WeeklyStatsCard({ sessionsData, topics, sessions, t, i18n }) {
  const { t: t2 } = useTranslation();
  // Tab view state: 'week', 'today', or 'daily'
  const [viewMode, setViewMode] = useState("week");
  const tabs = ["today", "week", "daily"];
  const tabIndex = tabs.indexOf(viewMode);

  // Prepare display data for different view modes
  let displayData = {};
  if (viewMode === "week") {
    // Week view uses aggregated data passed as sessionsData.
    displayData = sessionsData;
  } else if (viewMode === "today") {
    // Aggregate today's sessions by subject.
    const todayStr = new Date().toISOString().split("T")[0];
    sessions.forEach((s) => {
      if (s.startTime.split("T")[0] === todayStr) {
        displayData[s.subject] = (displayData[s.subject] || 0) + s.durationSeconds;
      }
    });
  }
  
  // Calculate total duration and subject list (for week and today views)
  const subjects = Object.keys(displayData);
  const totalDuration = subjects.reduce((sum, subj) => sum + displayData[subj], 0);

  // Doughnut chart data (for 'week' and 'today' views)
  const doughnutChartData = {
    labels: subjects,
    datasets: [
      {
        data: subjects.map((subj) => displayData[subj]),
        backgroundColor: subjects.map((subj) => {
          const topic = topics.find((t) => t.name === subj);
          return topic ? topic.color : '#ccc';
        }),
        borderWidth: 0
      }
    ]
  };

  const doughnutChartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    maintainAspectRatio: false,
    responsive: true,
    cutout: '60%'
  };

  // Daily view: Prepare data for a stacked bar chart
  let dailyChartData = null;
  let dailyChartOptions = null;
  if (viewMode === "daily") {
    // Create arrays of ISO day keys and labels for the current week.
    const { monday, sunday } = getWeekRange(new Date());
    const dayKeys = [];
    const dayLabels = [];
    const currentDate = new Date(monday);
    const localizedShortWeekdays = getLocalizedShortWeekdays(t2); // [So, Mo, ...] or [Sun, Mon, ...]
    let weekdayIdx = currentDate.getDay();
    while (currentDate <= sunday) {
      const isoDate = currentDate.toISOString().split("T")[0];
      dayKeys.push(isoDate);
      // Use localized short weekday name, e.g. 'Mo 8 Jul'
      const label = `${localizedShortWeekdays[weekdayIdx]} ${currentDate.getDate()}.${currentDate.getMonth()+1}`;
      dayLabels.push(label);
      currentDate.setDate(currentDate.getDate() + 1);
      weekdayIdx = (weekdayIdx + 1) % 7;
    }
    
    // Build datasets: one per topic with durations per day.
    const datasets = topics.map(topic => {
      const data = dayKeys.map(dayKey => {
        let sum = 0;
        sessions.forEach(s => {
          if (s.subject === topic.name && s.startTime.startsWith(dayKey)) {
            sum += s.durationSeconds;
          }
        });
        return sum;
      });
      return {
        label: topic.name,
        data,
        backgroundColor: topic.color
      };
    });
    
    dailyChartData = { labels: dayLabels, datasets };
    
    dailyChartOptions = {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatSmartDuration(value, t2, i18n)}`;
            }
          }
        }
      },
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { 
          stacked: true,
          ticks: { callback: (value) => formatSmartDuration(value, t2, i18n) }
        }
      }
    };
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        {/* Tab Navigation */}
        <div className='tabs-wrapper'>
          <div className="view-tabs">
            {tabs.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`tab-button ${viewMode === mode ? 'active' : ''} button-pop`}
              >
                {t(`dashboard.${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
              </button>
            ))}
            <div
              className="tab-indicator"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
            />
          </div>
        </div> 
      </div>
      
      {viewMode === "daily" ? (
        // Render Daily Stacked Bar Chart
        <div className="stats-card-content" style={{ height: "300px" }}>
          {dailyChartData && (
            <Bar data={dailyChartData} options={dailyChartOptions} />
          )}
        </div>
      ) : (
        // Render Doughnut chart and list summary for 'week' and 'today' views.
        <div className="stats-card-content">
          {subjects.length > 0 ? (
            <>
              <div className="stats-chart" style={{ height: "220px" }}>
                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
              </div>
              <div className="stats-details">
                <div className="total-study-time">
                  {t('dashboard.total')} {formatSmartDuration(totalDuration, t2, i18n)}
                </div>
                <ul className="stats-topics">
                  {subjects.map((subj) => (
                    <li key={subj} className="topic-line">
                      <span className="dot" style={{ backgroundColor: topics.find((t) => t.name === subj)?.color || 'var(--accent-color)' }}></span>
                      <span className="topic-name">{subj}</span>
                      <span className="topic-time">{formatSmartDuration(displayData[subj], t2, i18n)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="stats-no-sessions-message">{t('dashboard.noSessionsRecorded')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default WeeklyStatsCard; 