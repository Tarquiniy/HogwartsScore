import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HOUSES } from '../constants';
import HouseCard from './HouseCard';
import ScoreModal from './ScoreModal';
import LogPanel from './LogPanel';
import DashboardMenu from './DashboardMenu';
import UsersAdminPanel from './UsersAdminPanel';
import { api } from '../api';
import { Ornament, ScrollIcon } from './Icons';
import '../styles/dashboard.css';

export default function Dashboard({
  userKey,
  userFio,
  isAdmin,
  scores,
  log,
  onScoresUpdate,
  onLogUpdate,
  onLogout,
}) {
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  const maxScore = Math.max(...HOUSES.map((h) => scores[h] || 0));
  // A draw means nobody leads: picking the single top house keeps the crown from
  // defaulting to whichever faculty comes first in the list.
  const topHouses = HOUSES.filter((h) => (scores[h] || 0) === maxScore);
  const leaderHouse = maxScore > 0 && topHouses.length === 1 ? topHouses[0] : null;

  const handleSuccess = async (result) => {
    setSelectedHouse(null);
    onScoresUpdate(result.scores);
    const newLog = await api.getLog();
    onLogUpdate(newLog);
  };

  const handleReset = async () => {
    if (!window.confirm('Обнулить баллы всех факультетов? История начислений сохранится.')) return;
    const newScores = await api.resetScores();
    onScoresUpdate(newScores);
  };

  const handleClearLog = async () => {
    const newLog = await api.clearLog();
    onLogUpdate(newLog);
  };

  const openLog = async () => {
    const newLog = await api.getLog();
    onLogUpdate(newLog);
    setShowLog(true);
  };

  return (
    <div className="dashboard">
      {/* On phones this whole block becomes one sticky row: title left, icons right. */}
      <div className="dashboard__top">
        <motion.header
          className="dashboard__header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="dashboard__title">Кубок домов Хогвартс</h1>
          <Ornament className="dashboard__ornament" />
          <p className="dashboard__greeting">
            Приветствую, {userFio}
            {isAdmin ? ' · администратор' : ''}
          </p>
        </motion.header>

        <div className="dashboard__toolbar">
          <button
            type="button"
            className="dashboard__btn dashboard__btn--history"
            onClick={openLog}
            aria-label="История"
            title="История"
          >
            <ScrollIcon />
            <span className="dashboard__btn-label">История</span>
          </button>
          <DashboardMenu
            userFio={userFio}
            isAdmin={isAdmin}
            onManageUsers={() => setShowUsers(true)}
            onResetScores={handleReset}
            onClearLog={async () => {
              if (!window.confirm('Очистить всю историю начислений? Это действие нельзя отменить.')) {
                return;
              }
              await handleClearLog();
            }}
            onLogout={onLogout}
          />
        </div>
      </div>

      <div className="houses-grid">
        {HOUSES.map((house, i) => (
          <HouseCard
            key={house}
            house={house}
            score={scores[house] || 0}
            known={Object.prototype.hasOwnProperty.call(scores, house)}
            maxScore={maxScore}
            isLeader={house === leaderHouse}
            onClick={setSelectedHouse}
            index={i}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedHouse && (
          <ScoreModal
            house={selectedHouse}
            userFio={userFio}
            onClose={() => setSelectedHouse(null)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLog && (
          <LogPanel
            log={log}
            onClose={() => setShowLog(false)}
            onClearLog={handleClearLog}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUsers && (
          <UsersAdminPanel
            adminKey={userKey}
            adminFio={userFio}
            onClose={() => setShowUsers(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
