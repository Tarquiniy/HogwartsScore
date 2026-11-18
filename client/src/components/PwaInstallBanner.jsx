import { useEffect, useState } from 'react';
import '../styles/pwa-install.css';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

const DISMISS_KEY = 'hogwarts_pwa_install_dismissed';

export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;
    // Remembered for good: asking again on every visit covered the bottom row.
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return undefined;
    } catch { /* private mode: just show the banner */ }

    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch { /* private mode */ }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div className="pwa-install" role="dialog" aria-label="Установка приложения">
      <div className="pwa-install__text">
        <strong>Установить на телефон</strong>
        {showIosHint && !deferred ? (
          <p>
            Нажмите «Поделиться» → «На экран „Домой“», чтобы открывать Кубок домов как приложение.
          </p>
        ) : (
          <p>Добавьте ярлык на домашний экран — удобнее начислять баллы с телефона.</p>
        )}
      </div>
      <div className="pwa-install__actions">
        {deferred && (
          <button type="button" className="pwa-install__btn pwa-install__btn--primary" onClick={install}>
            Установить
          </button>
        )}
        <button type="button" className="pwa-install__btn" onClick={dismiss}>
          Позже
        </button>
      </div>
    </div>
  );
}
